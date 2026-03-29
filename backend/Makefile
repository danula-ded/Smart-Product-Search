.PHONY: help install run test lint format clean

# Default target
help:
	@echo "Available commands:"
	@echo "  install    Install dependencies"
	@echo "  run        Run the development server"
	@echo "  test       Run tests"
	@echo "  lint       Run linter (ruff)"
	@echo "  format     Format code (black)"
	@echo "  check      Run all checks (lint + format + test)"
	@echo "  clean      Clean up cache files"

# Install dependencies
install:
	pip install -r requirements.txt
	pre-commit install

# Run development server
run:
	python app/main.py

# Run tests
test:
	pytest tests/ -v

# Run linter
lint:
	ruff check .

# Format code
format:
	black .

# Run all checks
check: lint format test

# Clean up
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +