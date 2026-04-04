"""Local provider for a file-based Qwen2.5 model directory."""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from app.domain import ParsedQuery
from app.prompts.query_parsing_prompt import get_query_parsing_prompt
from app.services.llm.base import LLMProvider, LLMResponseError, LLMUnavailableError
from app.utils.json_parsing import (
    safe_parse_json,
    schema_to_domain_parsed_query,
    validate_parsed_query_json,
)

logger = logging.getLogger(__name__)

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class LocalQwenProvider(LLMProvider):
    """Load Qwen only from a local model directory provided by LLM_MODEL_PATH."""

    provider_name = "local_qwen"

    def __init__(
        self,
        model_path: Optional[str],
        device: str = "cpu",
        max_new_tokens: int = 256,
        temperature: float = 0.1,
    ):
        self.model_path = model_path
        self.device = device
        self.max_new_tokens = max_new_tokens
        self.temperature = temperature
        self.model = None
        self.tokenizer = None
        self._available = False
        self._resolved_model_path: Optional[Path] = None
        self.cache_dir = Path(__file__).resolve().parents[3] / ".hf_cache"

        self._initialize()

    def _initialize(self):
        """Load tokenizer and model from a local filesystem path."""
        if not TRANSFORMERS_AVAILABLE:
            logger.warning(
                "transformers and torch are not installed, local_qwen provider is unavailable"
            )
            return

        model_dir = self._resolve_model_path()
        if model_dir is None:
            return

        self.cache_dir.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("TRANSFORMERS_CACHE", str(self.cache_dir))

        self._ensure_sharded_index(model_dir)
        if not self._has_required_files(model_dir):
            logger.warning(
                "Model directory is missing required local files: %s", model_dir
            )
            return

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                str(model_dir),
                local_files_only=True,
                trust_remote_code=False,
                cache_dir=str(self.cache_dir),
            )
            self.model = AutoModelForCausalLM.from_pretrained(
                str(model_dir),
                local_files_only=True,
                trust_remote_code=False,
                cache_dir=str(self.cache_dir),
            )
            self.model = self.model.to(self.device)
            self.model.eval()
            self._resolved_model_path = model_dir
            self._available = True
            logger.info("Loaded local Qwen model from %s", model_dir)
        except Exception as exc:
            logger.warning("Failed to load local model from %s: %s", model_dir, exc)
            self.model = None
            self.tokenizer = None
            self._available = False

    def _resolve_model_path(self) -> Optional[Path]:
        if not self.model_path:
            logger.warning("LLM_MODEL_PATH is not configured")
            return None

        path = Path(self.model_path).expanduser()
        if not path.is_absolute():
            path = (Path(__file__).resolve().parents[3] / path).resolve()

        if not path.exists() or not path.is_dir():
            logger.warning("Configured local model path does not exist: %s", path)
            return None

        return path

    def _has_required_files(self, model_dir: Path) -> bool:
        has_config = (model_dir / "config.json").exists()
        has_tokenizer = (model_dir / "tokenizer.json").exists() or (
            model_dir / "tokenizer_config.json"
        ).exists()
        has_weights = (
            (model_dir / "model.safetensors").exists()
            or (model_dir / "model.safetensors.index.json").exists()
            or bool(list(model_dir.glob("model-*.safetensors")))
        )
        return has_config and has_tokenizer and has_weights

    def _ensure_sharded_index(self, model_dir: Path):
        """Create a local safetensors index when shard files exist without one."""
        index_path = model_dir / "model.safetensors.index.json"
        shard_paths = sorted(model_dir.glob("model-*.safetensors"))

        if index_path.exists() or len(shard_paths) < 2:
            return

        try:
            from safetensors import safe_open
        except ImportError:
            logger.warning(
                "safetensors is not installed, cannot build a local shard index for %s",
                model_dir,
            )
            return

        try:
            weight_map = {}
            total_size = 0

            for shard_path in shard_paths:
                total_size += shard_path.stat().st_size
                with safe_open(str(shard_path), framework="pt", device="cpu") as handle:
                    for key in handle.keys():
                        weight_map[key] = shard_path.name

            if not weight_map:
                logger.warning(
                    "No tensor keys found while building shard index for %s", model_dir
                )
                return

            index_payload = {
                "metadata": {"total_size": total_size},
                "weight_map": weight_map,
            }
            index_path.write_text(
                json.dumps(index_payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            logger.info("Generated local safetensors index: %s", index_path)
        except Exception as exc:
            logger.warning(
                "Failed to build local safetensors index for %s: %s", model_dir, exc
            )

    def is_available(self) -> bool:
        return self._available and self.model is not None and self.tokenizer is not None

    def parse_query(
        self, query: str, catalog_context: Optional[dict] = None
    ) -> ParsedQuery:
        if not self.is_available():
            raise LLMUnavailableError("Local Qwen provider is unavailable")

        system_prompt, user_prompt = get_query_parsing_prompt(
            query, catalog_context=catalog_context
        )
        prompt_text = self._render_prompt(system_prompt, user_prompt)

        try:
            model_inputs = self.tokenizer(prompt_text, return_tensors="pt")
            model_inputs = {
                key: value.to(self.device) for key, value in model_inputs.items()
            }

            generation_kwargs = {
                "max_new_tokens": self.max_new_tokens,
                "do_sample": self.temperature > 0,
                "pad_token_id": self.tokenizer.eos_token_id,
            }
            if self.temperature > 0:
                generation_kwargs["temperature"] = self.temperature
                generation_kwargs["top_p"] = 0.9

            with torch.no_grad():
                generated_ids = self.model.generate(**model_inputs, **generation_kwargs)

            prompt_length = model_inputs["input_ids"].shape[-1]
            new_tokens = generated_ids[0][prompt_length:]
            response_text = self.tokenizer.decode(
                new_tokens, skip_special_tokens=True
            ).strip()

            logger.debug("Raw local_qwen response: %s", response_text[:300])
            payload = safe_parse_json(response_text, fallback_value=None)
            if payload is None:
                raise LLMResponseError("Provider returned non-JSON output")

            validated_payload = validate_parsed_query_json(payload)
            if validated_payload is None:
                raise LLMResponseError("Provider returned invalid parsed-query JSON")

            return schema_to_domain_parsed_query(validated_payload)
        except LLMResponseError:
            raise
        except Exception as exc:
            raise LLMResponseError(f"Local Qwen query parsing failed: {exc}") from exc

    def _render_prompt(self, system_prompt: str, user_prompt: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        if hasattr(self.tokenizer, "apply_chat_template"):
            return self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )

        return f"System:\n{system_prompt}\n\nUser:\n{user_prompt}\n\nAssistant:\n"

    def generate_explanation(
        self, original_query: str, product_title: str, match_type: str
    ) -> str:
        explanations = {
            "brand": "Совпадение по бренду",
            "model": "Совпадение по модели",
            "category": "Совпадение по категории",
            "attributes": "Совпадение по характеристике",
            "numeric": "Совпадение по числовому ограничению",
            "text": "Найдено по тексту запроса",
        }
        return explanations.get(match_type, "Найдено релевантное совпадение")
