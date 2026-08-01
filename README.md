# SentinelOps - Intelligence Operations Management Platform

A comprehensive intelligence operations management platform featuring AI-powered document processing, mission tracking, and secure access control.

## Index
1. [Project Overview](#project-overview)
2. [Installation](#installation)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Usage](#usage)
9. [Configuration](#configuration)
10. [Contributing](#contributing)
11. [License](#license)
12. [Acknowledgments](#acknowledgments)

---

## Project Overview

SentinelOps is an enterprise-grade intelligence operations management system designed to streamline mission planning, document intelligence, knowledge management, and facility operations. Built with security and scalability in mind, it combines modern AI capabilities with robust access control and real-time collaboration features.

The platform serves as a centralized hub for intelligence teams, enabling:
- AI-powered document analysis and intelligent search
- Mission planning and tracking with Kanban-style boards
- Multi-factor authentication with biometric support
- Knowledge base management with vector-based semantic search
- Facility operations and issue tracking
- Real-time analytics and reporting

---

## Installation

### Preinstallation Steps
Before you begin, ensure you have the following installed on your system:
- Python 3.11 or higher
- Node.js 18+ and npm/yarn
- MongoDB (local instance or MongoDB Atlas account)
- Git
- Ollama (for local LLM support, install from ollama.com)

### Backend Setup

1. Clone the repository
```bash
git clone https://github.com/Abhay030405/sentinelops-nexus.git
cd sentinelops-nexus/backend
```

2. Create virtual environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Configure environment variables
Copy `.env.example` to `.env` and fill in your settings.
```env
# MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=sentinel_ops_nexus

# AI Provider
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# JWT
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

5. Install and Run Ollama Models
```bash
# Pull the standard language model
ollama pull llama3.2:3b

# Pull the embeddings model required for ChromaDB
ollama pull nomic-embed-text

# Start the Ollama server
ollama serve
```

6. Initialize Admin User
```bash
python create_admin.py
```

7. Run the backend
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API Documentation is available at: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory
```bash
cd ../frontend
```

2. Install dependencies
```bash
npm install
```

3. Configure API endpoint
Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:8000
```

4. Run the frontend
```bash
npm run dev
```
Frontend will be available at: `http://localhost:3000`

---

## Features

### Identity Vault (Authentication & Authorization)
- Multi-Role System: Admin, Agent, and Technician roles
- JWT-based Authentication
- User Management
- Password Security
- Multi-factor authentication (TOTP, SMS, Email)
- Biometric support endpoints
- QR Code Generation for agent login

### Ops Planner (Mission Board)
- Kanban Board
- Agent Assignment and Workload Tracking
- Agent Scoring System (Score adjustments on success/failure)
- Real-time Updates via WebSockets
- Activity Logging

### Facility Ops Hub (Issue Tracking)
- Issue Management and Technician Assignment
- Status Workflow
- Priority Levels and Categories
- Outcome Reporting and Admin Oversight
- Technician Workload Tracking

### Knowledge Crystal (AI Knowledge Base)
- Multi-format Support (PDFs, images, text files)
- AI-Powered Processing and Summarization
- Intelligent Chat using RAG
- Content Management with Vector Embeddings
- Role-based Access (Agent vs Technician)
- Country-specific and Tag-based Content Filter

### Analytics Dashboard
- User Activity Metrics
- Document Analytics
- Mission Analytics
- Time-range Filtering

### Notifications System
- Priority Levels
- System, mission updates, and issue notifications
- Read/Unread Tracking
- Batch Operations

---

## Tech Stack

### Backend
- Framework: FastAPI (Python 3.11+)
- Database: MongoDB Atlas
- AI Framework: LangChain, Ollama (Llama 3.2, Nomic)
- Vector DB: ChromaDB

### Frontend
- Framework: React 19.2
- Build Tool: Vite 7.2
- Routing: React Router DOM 7.10
- State Management: React Context API
- HTTP Client: Axios

---

## Architecture

### System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite)                                             │  │
│  │  - Admin Dashboard    - Agent Dashboard    - Technician UI    │  │
│  │  - Login/Auth         - Doc-Sage           - Knowledge Base   │  │
│  │  - Mission Board      - Facility Ops       - Analytics        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               ▼ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  FastAPI Application                                          │  │
│  │  - CORS Middleware    - JWT Authentication                    │  │
│  │  - Request Validation - Error Handling                        │  │
│  │  - Rate Limiting      - WebSocket Manager                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                   │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────────┐ │
│  │ Identity    │ Knowledge   │ Analytics   │ Ops Planner         │ │
│  │ Vault (Auth,│ Crystal     │ Service     │ Service             │ │
│  │ MFA, Bio)   │ Service     │             │                     │ │
│  ├─────────────┼─────────────┼─────────────┼─────────────────────┤ │
│  │ Facility Ops Service      │ Notification Service              │ │
│  ├─────────────┴─────────────┴─────────────┴─────────────────────┤ │
│  │ Data Export Service                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                      │
│  ┌──────────────────┬──────────────────┬─────────────────────────┐ │
│  │  MongoDB Atlas   │  ChromaDB        │  File Storage           │ │
│  │                  │                  │                         │ │
│  │  - users         │  - Embeddings    │  - Documents            │ │
│  │  - missions      │  - KB Chunks     │  - Evidence Photos      │ │
│  │  - issues        │                  │                         │ │
│  │  - analytics     │                  │                         │ │
│  │  - notifications │                  │                         │ │
│  └──────────────────┴──────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI/ML LAYER                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  AI Processing Pipeline                                       │  │
│  │                                                               │  │
│  │  ┌─────────────┐                                           │  │
│  │  │   Ollama    │                                           │  │
│  │  │   (Local)   │                                           │  │
│  │  │             │                                           │  │
│  │  │ Llama 3.2   │                                           │  │
│  │  │ Nomic       │                                           │  │
│  │  └─────────────┘                                           │  │
│  │                                                               │  │
│  │  LangChain Framework: RAG, Embeddings, Document Processing   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Module Architecture

```text
backend/
├── app/
│   ├── analytics/           # Analytics, system metrics, and report endpoints
│   ├── config/              # Application environment and global settings
│   ├── data_export/         # Data models and structures for CSV/Excel exporting
│   ├── database/            # MongoDB connection handlers and database logic
│   ├── facility_ops/        # HQ issue tracking, technician assignment, and outcome reporting
│   ├── identity_vault/      # Core authentication (JWT, MFA, Biometrics), RBAC, user management
│   ├── knowledge_crystal/   # RAG-based knowledge base, document intelligence, ChromaDB integration
│   ├── main.py              # Main FastAPI application entry point and router aggregator
│   ├── notifications/       # Multi-channel notification delivery and management
│   ├── ops_planner/         # Kanban board operations, mission lifecycles, and Websocket streaming
│   └── utils/               # Common utilities (dependencies, RBAC helpers, security hashing)

frontend/
├── src/
│   ├── App.jsx              # Root component orchestrating context providers
│   ├── components/          # Reusable UI components (buttons, modals, navigation, Kanban cards)
│   ├── context/             # Global React state (e.g., AuthContext)
│   ├── hooks/               # Custom React hooks for data fetching and logic isolation
│   ├── index.css            # Global styling definitions
│   ├── main.jsx             # React DOM rendering entry point
│   ├── pages/               # Top-level page views (Admin Dashboard, Doc-Sage, Facility Ops, etc.)
│   ├── router/              # Client-side routing configuration via React Router DOM
│   └── services/            # Axios API client integrations mapped to backend endpoints
```

### Data Flow

#### Knowledge Crystal (RAG) Flow
```text
[ User Query ]
        │
        ▼
[ Generate Query Embedding (Nomic) ]
        │
        ▼
[ Vector Search in ChromaDB ]
        │
        ▼
[ Retrieve Relevant Chunks ]
        │
        ▼
[ Build Context Prompt ]
        │
        ▼
[ Send to LLM (Ollama) ]
        │
        ▼
[ Return Response with Sources ]
```

#### Authentication Flow
```text
[ User Login Request ]
        │
        ▼
[ Verify Credentials in MongoDB ]
        │
        ▼
[ Check MFA Status ]
   │            │
Enabled      Disabled
   │            │
   ▼            ▼
[ 2FA Code ]  [ Generate JWT Token ]
   │            │
   ▼            ▼
[ Verify ]    [ Return Access/Refresh Token ]
```

---

## Database Schema

### users
```javascript
{
  _id: ObjectId,
  email: String,
  full_name: String,
  age: Number,
  marital_status: String,
  role: String,
  status: String,
  criminal_record: Boolean,
  health_issues: Boolean,
  created_at: DateTime,
  last_login: DateTime
}
```


### missions
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  difficulty: String,
  status: String,
  created_by: String,
  assigned_agent_id: String,
  due_date: DateTime,
  tags: Array,
  created_at: DateTime,
  updated_at: DateTime,
  documents: Array
}
```

### issues
```javascript
{
  _id: ObjectId,
  issue_number: Number,
  title: String,
  description: String,
  priority: String,
  category: String,
  status: String,
  created_by: String,
  assigned_to: String,
  activity_log: Array
}
```

### knowledge_pages
```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  category: String,
  mission_id: String,
  country: String,
  tags: Array,
  visibility: String,
  author: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

### ChromaDB (Vector Storage)
Used by Doc-Sage and Knowledge Crystal for semantic search and RAG.
```json
{
  "embeddings": [0.12, 0.45, -0.9, ...],
  "metadatas": {
    "document_id": "String",
    "page_number": "Integer",
    "chunk_index": "Integer",
    "category": "String"
  },
  "documents": "String (Text chunk content)"
}
```

---

## API Endpoints

### Identity Vault & Auth (includes MFA & Biometrics)
- `POST /auth/login`
- `POST /auth/ranger/login`
- `POST /auth/scan`
- `GET /admin/users`
- `POST /admin/create-user`
- `POST /api/mfa/setup/totp`
- `POST /api/mfa/verify`
- `POST /api/biometrics/enroll`
- `POST /api/biometrics/verify`

### Knowledge Crystal
- `POST /kb/create`
- `GET /kb/pages`
- `GET /kb/page/{page_id}`
- `PUT /kb/page/{page_id}`
- `DELETE /kb/page/{page_id}`
- `POST /kb/query`
- `POST /kb/chat`
- `GET /kb/search`

### Ops Planner
- `POST /api/ops-planner/missions`
- `GET /api/ops-planner/missions`
- `POST /api/ops-planner/missions/{id}/assign`
- `PATCH /api/ops-planner/missions/{id}/status`
- `GET /api/ops-planner/board`
- `GET /api/ops-planner/agents/available`
- `GET /api/ops-planner/my-work`
- `POST /api/ops-planner/missions/{id}/documents`

### Facility Ops
- `POST /api/facility-ops/issues`
- `GET /api/facility-ops/issues`
- `POST /api/facility-ops/issues/{id}/assign`
- `POST /api/facility-ops/issues/{id}/outcome`
- `PATCH /api/facility-ops/issues/{id}/status`

### Notifications
- `GET /api/notifications`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/mark-all-read`

### Analytics
- `GET /api/analytics/report`
- `GET /api/analytics/login`
- `GET /api/analytics/users`
- `GET /api/analytics/documents`
- `GET /api/analytics/security`
- `GET /api/analytics/anomalies`
- `GET /api/analytics/dashboard-stats`
- `GET /api/analytics/ranger-stats`

---

## Usage

### Admin Workflow
1. Login with admin credentials
2. Create Users (Agents & Technicians) in the Identity Vault
3. Create Missions in Ops Planner and Assign to agents
4. Monitor Analytics dashboard and Facility issues

### Agent Workflow
1. Login via QR or credentials
2. View assigned missions
3. Upload Evidence to Knowledge Crystal/Missions
4. Search Knowledge Base for protocols

### Technician Workflow
1. Login and view assigned facility issues
2. Access Technical Documentation in Knowledge Base
3. Submit Outcome Reports on Facility Ops Hub

---

## Configuration

### File Upload Limits
```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=[".pdf", ".jpg", ".jpeg", ".png", ".txt"]
```

### Security Settings
```env
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
QR_TOKEN_LENGTH=32
```

---

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [LangChain](https://python.langchain.com/)
- [Ollama](https://ollama.ai/)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database)
- [ChromaDB](https://www.trychroma.com/)
