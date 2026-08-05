# SentinelOps Nexus

> Enterprise-grade intelligence operations management with secure, locally-executed AI document analysis.

![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)
![React 19](https://img.shields.io/badge/React-19.2-cyan)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange)
![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-black)

## Table of Contents
- [Background](#background)
- [Architecture](#architecture)
- [Key Design Decisions](#key-design-decisions)
- [Install](#install)
- [Usage](#usage)
- [Testing](#testing)
- [API](#api)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Background

Modern intelligence units lack a unified platform that combines secure mission planning with intelligent document retrieval. SentinelOps was built to solve critical industry pain points:
- **Cloud Security Risks**: Existing AI solutions expose classified operational data to external cloud providers. SentinelOps solves this by delivering a completely air-gapped, local [Retrieval-Augmented Generation (RAG)](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) pipeline.
- **Weak Access Controls**: Standard vector databases fail to enforce strict [Role-Based Access Controls (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control) at the search layer. SentinelOps enforces role-aware isolation before the LLM even sees the data.
- **Fragmented Tools**: Teams juggle separate tools for task management and document search. SentinelOps integrates intelligent retrieval seamlessly into a comprehensive [Kanban](https://en.wikipedia.org/wiki/Kanban_(development))-style mission planner.

## Architecture

SentinelOps is built using a modern, scalable stack split across three distinct layers:

1. **Client Layer (Frontend)**: A React Single Page Application (SPA) built with Vite, utilizing React Context for global state and React Router for role-based dashboard routing (Admin, Agent, Technician).
2. **Gateway & Service Layer (Backend)**: A FastAPI application running on Python 3.11+. It handles JWT authentication via a unified RBAC system (`app/utils/dependencies.py`), robust request validation, WebSocket broadcasting for real-time mission updates with automatic reconnection rehydration, and orchestrates business logic across domains (Identity, Ops Planner, Facility Ops).
3. **Data & AI Layer**:
   - **MongoDB**: Primary document store for users, missions, and facility issues.
   - **ChromaDB**: In-memory vector database storing document chunk embeddings.
   - **Ollama**: Local execution environment running `llama3.2:1b` for rapid generation and `nomic-embed-text` for semantic vectors.

## Key Design Decisions

- **Zero-Trust AI Retrieval**: Instead of relying on the LLM to filter sensitive information, strict RBAC metadata filters are enforced at the [ChromaDB](https://www.trychroma.com/) query level. Out-of-category documents are mathematically rejected before the LLM ever sees them.
- **Aggressive Hallucination Prevention**: The RAG pipeline enforces a strict similarity threshold (`score < 0.5`). If a query doesn't semantically align with available documents, the system instantly short-circuits to a fallback response, saving CPU cycles and preventing hallucinations.
- **Pre-computed Semantic Context**: During ingestion via our Large-Codebase Chunking Controller, metadata (`mission_id`, `title`, `category`) is injected directly into the raw text chunks. This avoids the O(N) anti-pattern of running secondary LLM calls to summarize points during real-time retrieval.
- **Local AI Execution**: All embeddings and generative models run locally via [Ollama](https://ollama.ai/), ensuring classified operational data never traverses the public internet.

## Install

### Prerequisites
- Python 3.11 or higher
- Node.js 18+ and npm
- MongoDB (local instance or MongoDB Atlas)
- Ollama installed and running locally

### Environment Variables
Create a `.env` file in the `backend/` directory. **Never commit real secrets.** Use the following `.env.example` as a template:

```env
# backend/.env.example
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/
MONGODB_DB_NAME=sentinel_ops_nexus

# AI Provider Settings
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# JWT Authentication
SECRET_KEY=generate_a_secure_random_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Default Admin Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=change_this_immediately
```

### Installation Steps

1. **Clone and Backend Setup**:
```bash
git clone https://github.com/fo56/sentinelops-nexus.git
cd sentinelops-nexus/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Start Ollama & Pull Models**:
```bash
ollama serve
ollama pull llama3.2:1b
ollama pull nomic-embed-text
```

3. **Frontend Setup**:
```bash
cd ../frontend
npm install
```

## Usage

Start both the backend and frontend development servers.

**Run the Backend**:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Run the Frontend**:
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:3000` to access the application. Log in with the default admin credentials configured in your `.env` file to begin provisioning Agents and Technicians.

## Testing

SentinelOps includes an adversarial stress-testing suite to validate the integrity of the RAG RBAC filters.

Run the knowledge crystal stress test:
```bash
cd backend
python -m tests.knowledge_crystal.stress_test_rag
```
This script seeds synthetic documents across multiple categories and attempts cross-category leak queries, outputting a verification report confirming the vector isolation boundaries.

## API

The backend provides extensive RESTful endpoints. A full interactive OpenAPI specification is available at `http://localhost:8000/docs` when the server is running. 

### Identity Vault
- `POST /auth/login` - Unified JWT login
- `GET /auth/validate` - Validate current token session
- `GET /auth/me` - Fetch authenticated user profile
- `POST /admin/create-user` - Provision new users (Admin only)
- `PUT /admin/users/{user_id}/suspend` - Suspend a user

### Knowledge Crystal (RAG)
- `POST /kb/upload-document` - Process and embed a new document
- `POST /kb/chat` - Streaming natural language query against the vector store (unified RAG + chat endpoint)
- `GET /kb/search` - Semantic search with role-based filtering
- `GET /kb/pages` - List stored knowledge pages
- `DELETE /kb/page/{page_id}` - Wipe a document and its embeddings

### Ops Planner
- `POST /api/ops-planner/missions` - Create a new mission
- `PATCH /api/ops-planner/missions/{id}/status` - Update Kanban state (broadcasts via WebSockets)
- `GET /api/ops-planner/my-work` - Fetch missions assigned to the current user
- `WS /api/ops-planner/ws` - Real-time WebSocket with mission room subscriptions (`join_mission`/`leave_mission`)

### Facility Ops
- `POST /facility-ops/issues` - Report a facility issue
- `POST /facility-ops/issues/{id}/outcome` - Submit work completion notes


## Limitations

- **CPU Latency**: Embedding large documents or executing complex LLM queries relies entirely on local compute. Without a dedicated GPU, initial document ingestion and RAG answers may take 10-15 seconds.
- **In-Memory Vectors**: The ChromaDB implementation persists to disk via SQLite (`./vector_db`), but modifying document chunking logic requires a complete teardown and re-indexing of the entire vector store.

## Contributing

Questions, issues, and pull requests are welcome! Please open an issue on GitHub to discuss proposed changes before submitting a PR.
Ensure that any new endpoints include appropriate RBAC guards via `Depends(get_current_admin)` or `Depends(require_role(...))` from `app/utils/dependencies.py`.

## License

UNLICENSED
