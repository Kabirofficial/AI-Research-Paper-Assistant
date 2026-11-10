# AI Research Paper Assistant — Frontend 📄💻

A high-performance, modern, responsive academic research interface built with React, Vite, and Tailwind CSS. Connects to the local-first FastAPI backend for full PDF document ingestion, FAISS dense vector search, grounded RAG research chat with page-level citations, structured paper summarization, and multi-document comparative analysis.

---

## 🚀 Tech Stack

- **Framework**: React 18 (Functional components & custom hooks)
- **Bundler & Tooling**: Vite 6
- **Language**: JavaScript (ES Modules)
- **Routing**: React Router DOM v6
- **Styling & Design System**: Neo-Brutalist design language with bold 2px borders, tactile click states, hard offset box shadows, monospaced technical accents, and a distinctive **Cloudy Blue (`#38BDF8` / `#0284C7`)** and **Reddish Crimson (`#E11D48` / `#FB7185`)** palette on crisp paper white and dark ink surfaces.
- **Icons**: Lucide React
- **API Communication**: Axios with centralized error normalization and upload progress tracking
- **AI Text Rendering**: React Markdown with GitHub Flavored Markdown (`remark-gfm`)

---

## 📁 Architecture & File Structure

```text
frontend/
├── public/                 # Static assets
├── src/
│   ├── api/                # Centralized API service layer
│   │   ├── axios.js        # Axios instance, baseURL, and error normalizer
│   │   ├── documents.js    # Upload, list, details, page text, chunks, download, delete
│   │   ├── chat.js         # Conversations, messages, citations retrieval
│   │   ├── papers.js       # Academic summaries and multi-paper comparisons
│   │   ├── search.js       # Semantic search and FAISS index maintenance
│   │   └── settings.js     # Runtime provider configuration and latency diagnostics
│   ├── components/
│   │   ├── common/         # Button, Badge, Card, Modal, ConfirmationModal, Skeleton
│   │   ├── layout/         # Responsive Sidebar, Header, AppLayout
│   │   └── documents/      # UploadModal (drag-and-drop, progress, validation)
│   ├── context/
│   │   ├── ThemeContext.jsx          # Dark / Light theme persistence
│   │   ├── BackendStatusContext.jsx  # Live FastAPI connection monitoring
│   │   └── ToastContext.jsx          # Notification system (no browser alert popups)
│   ├── pages/
│   │   ├── Dashboard.jsx        # Real metrics, recent papers, diagnostics
│   │   ├── Library.jsx          # Document repository, search, filters, grid/table view
│   │   ├── DocumentDetails.jsx  # Page-by-page text reader, chunks, metadata
│   │   ├── Chat.jsx             # Grounded AI conversation thread with citations
│   │   ├── Analysis.jsx         # Structured academic paper breakdown
│   │   ├── Comparison.jsx       # Multi-paper comparative analysis
│   │   └── Settings.jsx         # Ollama / OpenAI configuration & vector stats
│   ├── utils/
│   │   └── formatters.js   # File size bytes, timestamps, dates
│   ├── App.jsx             # Route definitions and context providers
│   ├── index.css           # Tailwind directives and custom scrollbars
│   └── main.jsx            # Application entry point
├── .env                    # Runtime environment configuration
├── .env.example            # Example configuration template
├── package.json            # Scripts and dependencies
├── tailwind.config.js      # Palette and typography configuration
└── vite.config.js          # Vite plugins, path aliases, vendor code-splitting
```

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js `v18.0+` or `v20.0+` (Tested on Node `v24.x`)
- Running FastAPI backend on `http://127.0.0.1:8000`

### 2. Install Dependencies
```bash
cd ai-research-assistant/frontend
npm install
```

### 3. Configure Environment
Copy the example environment file if not already present:
```bash
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your running backend:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Production Build
To create an optimized production build:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## 🎯 Features Implemented

1. **Dashboard**:
   - Live metrics derived directly from real backend document data (Total Papers, Processed Papers, Total Pages, Active LLM Provider).
   - Quick navigation shortcuts.
   - Recent research uploads table with status badges.
   - Real-time backend connectivity and vector storage health diagnostics.

2. **Research Library**:
   - Drag-and-drop PDF uploader with progress tracking and 50 MB client-side limit check.
   - SHA-256 duplicate detection feedback with conflict messaging.
   - Real-time client-side search across titles, filenames, and authors.
   - Status filtering (`all`, `completed`, `processing`, `pending`, `failed`).
   - Sorting by newest, oldest, title (A-Z), and file size.
   - Grid and List (table) view toggles.
   - Per-paper actions: View text, Download original PDF, Reprocess embeddings, Delete with confirmation dialog.

3. **Document Details & Text Viewer**:
   - Page-by-page extracted text viewer with previous/next controls, jump-to-page dropdown, and character count counters.
   - Deep-linking support (`/documents/:id?page=X`) allowing citations from AI chat to jump straight to the exact cited page.
   - Chunk inspection tab: view all semantic chunks, token counts, and section headings stored in the FAISS index.
   - Technical metadata view (internal UUID, SHA-256 checksum, timestamps).

4. **AI Research Chat**:
   - Grounded RAG multi-turn conversations scoped to the whole library or a specific paper.
   - Conversation history sidebar with session creation and deletion.
   - Assistant responses formatted with clean Markdown, code highlighting, and verified source citations.
   - Interactive citations: clicking any citation opens the document on that exact page.
   - Enter to send, Shift+Enter for new line, with active loading/thinking indicator.

5. **Paper Analysis**:
   - Select any uploaded paper and choose depth (`brief`, `detailed`, or `comprehensive`).
   - Structured breakdown: Executive Summary, Research Problem, Primary Contributions, Methodology, Architecture, Datasets, Results, Limitations, and Future Work.

6. **Paper Comparison**:
   - Multi-select 2 to 10 research papers.
   - Generates side-by-side technical comparison of motivations, methodologies, system architectures, evaluation benchmarks, strengths/weaknesses trade-offs, and open research gaps.

7. **Settings & Maintenance**:
   - Light / Dark theme persistence.
   - Switch active LLM provider (`ollama` or `openai`) dynamically at runtime without restarting the server.
   - Live connection and latency testing for both Ollama and OpenAI.
   - Masked API key display.
   - Token chunk size and overlap sliders.
   - Vector database health metrics and one-click FAISS index rebuilding.

---

## ☕ Support

If you enjoy using this frontend interface, consider supporting ongoing development:

<a href="https://www.buymeacoffee.com/JinggXD"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a book&emoji=📖&slug=JinggXD&button_colour=5F7FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a book" /></a>

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).

