# Smart Product Search Backend

Stage 3 adds a local LLM parsing layer to the existing Stage 1 and Stage 2 backend.

Current scope:
- backend only
- no frontend
- no auth-service
- no docker-compose
- no Elasticsearch or vector DB
- no microservices
- no full personalization

## Stage 3 Summary

The backend now:
- parses the incoming search query into a structured object
- returns `parsedQuery` in `POST /search`
- uses parsed brand, model, category, attributes, and numeric constraints during ranking
- returns a short deterministic `explanation` for each result
- keeps working when the LLM is disabled or unavailable

The search flow is now:
1. normalize the incoming query
2. parse it with the configured provider
3. fall back to a rule-based parser if the provider is disabled, missing, or invalid
4. score products using both free text and structured fields
5. return ranked results plus `parsedQuery`

## Local Model Requirements

The backend only loads a model from `LLM_MODEL_PATH`.

It does not:
- use a Hugging Face model id
- download weights from the internet
- call `from_pretrained` with a remote name
- call any external API

Expected model directory shape:

```text
models/qwen2.5-3b-instruct/
  config.json
  generation_config.json
  tokenizer.json
  tokenizer_config.json
  model.safetensors
```

Sharded weights are also supported:

```text
models/qwen2.5-3b-instruct/
  config.json
  tokenizer.json
  tokenizer_config.json
  model-00001-of-00002.safetensors
  model-00002-of-00002.safetensors
```

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust the values.

Relevant environment variables:

```env
CATALOG_PATH=./data/sample_catalog.csv
HOST=0.0.0.0
PORT=8000
DEBUG=true
LLM_ENABLED=false
LLM_PROVIDER=local_qwen
LLM_MODEL_PATH=../models/qwen2.5-3b-instruct
LLM_DEVICE=cpu
LLM_MAX_NEW_TOKENS=256
LLM_TEMPERATURE=0.1
```

Notes:
- `LLM_ENABLED=false` forces the rule-based fallback parser.
- `LLM_PROVIDER=local_qwen` is the only real model-backed provider in Stage 3.
- `LLM_MODEL_PATH` must point to a local directory on disk.
- Relative paths are resolved from the `backend` directory.

## Dependencies

Install the Python dependencies:

```bash
python -m pip install -r requirements.txt
```

For real local inference you also need a `torch` build that matches your platform and hardware.

Examples:
- CPU-only environments usually need a CPU wheel.
- NVIDIA GPU environments usually need a CUDA wheel that matches the installed CUDA runtime.
- Apple Silicon environments need a compatible macOS build.

If `torch` or `transformers` is missing, the backend will still start and will fall back to the rule-based parser.

## Running the Backend

From the `backend` directory:

```bash
python app/main.py
```

Or:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Search Response Changes

`POST /search` now returns:
- `parsedQuery`
- `explanation` inside each result item

Example shape:

```json
{
  "results": [
    {
      "product": {
        "id": "prod_001",
        "title": "Шина Superguider SKS-1",
        "manufacturer": "Superguider",
        "model": "SKS-1",
        "category_id": "cat_001",
        "category_name": "Шины",
        "image_url": "",
        "country_origin": "",
        "attributes": [
          {"name": "Тип", "value": "Бескамерная"},
          {"name": "Диаметр", "value": "16.5"}
        ],
        "created_at": "2024-01-01T00:00:00"
      },
      "relevance_score": 1.0,
      "match_reasons": [
        "Совпадение по бренду: Superguider",
        "Совпадение по характеристике: Тип=Бескамерная"
      ],
      "explanation": "Совпадение по бренду: Superguider; Совпадение по характеристике: Тип=Бескамерная"
    }
  ],
  "total_count": 1,
  "query": "бескамерная шина superguider 16.5",
  "limit": 20,
  "offset": 0,
  "parsedQuery": {
    "originalQuery": "бескамерная шина superguider 16.5",
    "detectedCategory": "шина",
    "detectedBrand": "Superguider",
    "detectedModel": null,
    "detectedAttributes": {
      "Тип": "Бескамерная"
    },
    "numericConstraints": {
      "Диаметр": "16.5"
    },
    "freeText": "бескамерная шина"
  }
}
```

## Fallback Behavior

The backend falls back to the lightweight rule-based parser when:
- `LLM_ENABLED=false`
- `LLM_MODEL_PATH` is empty
- the model directory does not exist
- required local files are missing
- `transformers` or `torch` is not installed
- the provider returns invalid JSON
- the provider raises an inference error

The backend does not crash in these cases. It continues to serve `POST /search`.

## What Uses the LLM in Stage 3

Implemented now:
- structured query parsing
- structured ranking boosts
- deterministic search explanations
- response-level `parsedQuery`

Not implemented yet:
- frontend integration
- auth-service
- Docker Compose
- Elasticsearch
- vector search
- RAG
- remote model hosting
- provider switching to remote APIs
- advanced personalization

## Tests

Run tests from the `backend` directory:

```bash
python -m pytest tests/ -v
```

Stage 3 tests cover:
- rule-based fallback parser
- parsed-query schema validation
- `/search` with a mock LLM provider
- disabled LLM fallback
- missing local model path fallback
- invalid provider response fallback

## Project Notes

Key Stage 3 modules:
- `app/services/llm/base.py`
- `app/services/llm/local_qwen_provider.py`
- `app/services/llm/mock_provider.py`
- `app/services/llm/fallback_parser.py`
- `app/services/llm/service.py`
- `app/services/search_service.py`
- `app/prompts/query_parsing_prompt.py`
- `app/utils/json_parsing.py`

The repository layer stays in-memory and modular, and the search flow now depends on a provider abstraction instead of embedding model logic directly in the endpoint.
