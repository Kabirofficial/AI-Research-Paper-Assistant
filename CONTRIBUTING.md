# Contributing to AI Research Paper Assistant 📄🤝

Thank you for your interest in contributing to **AI Research Paper Assistant**! We welcome contributions of all kinds: bug reports, documentation improvements, feature additions, and pull requests.

---

## 🧭 Code of Conduct

Please be respectful, collaborative, and considerate in all issues, pull requests, and discussions.

---

## 🏗️ Repository Architecture

This project is organized as a monorepo containing two primary applications:

```text
ai-research-assistant/
├── backend/          # FastAPI Python application (REST API, RAG, FAISS, SQLite)
├── frontend/         # React 18 + Vite + Tailwind CSS Single Page Application
├── .github/          # GitHub Actions CI workflows, issue and PR templates, funding
├── LICENSE           # MIT License
└── README.md         # Project documentation & quickstart
```

---

## 🛠️ Local Development Setup

### Prerequisites

- **Python**: 3.11, 3.12, or 3.13
- **Node.js**: v18.0+ or v20.0+ (and `npm`)
- **Git**
- *(Optional but recommended)* **Ollama**: For 100% local, offline LLM inference ([ollama.com](https://ollama.com))

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install pytest pytest-asyncio ruff
   ```

4. **Initialize environment file**:
   ```bash
   cp .env.example .env
   ```

5. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   - API Root: `http://127.0.0.1:8000/`
   - Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
   - ReDoc Documentation: `http://127.0.0.1:8000/redoc`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_BASE_URL` is set to `http://127.0.0.1:8000`.

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🧪 Testing & Quality Checks

### Backend
- Run automated tests:
  ```bash
  cd backend
  pytest
  ```
- Code formatting & linting:
  ```bash
  ruff check app/ tests/
  ruff format --check app/ tests/
  ```

### Frontend
- Validate production build:
  ```bash
  cd frontend
  npm run build
  ```

---

## 🔀 Submitting a Pull Request

1. **Fork the repository** on GitHub.
2. **Create a topic branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Commit your changes** with a concise, descriptive message:
   ```bash
   git commit -m "feat: add support for arXiv paper ID ingestion"
   ```
4. **Push your branch** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch using the provided PR template.

---

## ☕ Support the Project

If you find this project helpful, consider supporting future development:

<a href="https://www.buymeacoffee.com/JinggXD"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a book&emoji=📖&slug=JinggXD&button_colour=5F7FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00" /></a>
