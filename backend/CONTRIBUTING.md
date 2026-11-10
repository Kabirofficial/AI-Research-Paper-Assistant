# Contributing to AI Research Paper Assistant

Thank you for your interest in contributing to the **AI Research Paper Assistant**! This document provides guidelines for setting up your development environment, writing code, and submitting contributions.

---

## Code of Conduct

Please be respectful, constructive, and collaborative in all issues, pull requests, and discussions.

---

## Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Kabirofficial/AI-Research-Paper-Assistant.git
cd AI-Research-Paper-Assistant/backend
```

### 2. Create and Activate Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- **Linux / macOS**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
pip install pytest pytest-asyncio ruff
```

### 4. Configure Environment
```bash
cp .env.example .env
```

---

## Running the Development Server

Start the FastAPI application with live reload:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Running the Test Suite

Run all automated unit and integration tests:
```bash
pytest -v
```

Before submitting a pull request, ensure **all tests pass**.

---

## Coding Standards

1. **Type Hints**: All functions, methods, and classes must include Python type annotations.
2. **Pydantic Validation**: Use Pydantic schemas for all request/response models.
3. **No Unnecessary External Dependencies**: Maintain the local-first, zero-cloud requirement. Do not add cloud services as mandatory dependencies.
4. **Error Handling**: Use the domain exception classes in `app.core.exceptions` (`AppError`, `DocumentNotFoundError`, etc.). Never leak internal stack traces or API keys in response payloads.
5. **No Authentication**: The application is strictly designed for local, single-user operation. Do not introduce authentication unless explicitly scoped.

---

## Submitting Pull Requests

1. Fork the repository and create a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes with clear, descriptive commit messages.
3. Add unit tests in `tests/` covering new features or bug fixes.
4. Verify that `pytest` passes with 100% success.
5. Push to your fork and submit a Pull Request with a clear description of changes.

