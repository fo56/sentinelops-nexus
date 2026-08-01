# 🎯 Command Nest - Intelligence Operations Management Platform

<div align="center">

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**A comprehensive intelligence operations management platform featuring AI-powered document processing, mission tracking, and secure access control.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Installation](#-installation)

</div>

---

## 📖 Project Overview

**Command Nest** is an enterprise-grade intelligence operations management system designed to streamline mission planning, document intelligence, knowledge management, and facility operations. Built with security and scalability in mind, it combines modern AI capabilities with robust access control and real-time collaboration features.

The platform serves as a centralized hub for intelligence teams, enabling:
- 🤖 **AI-powered document analysis** and intelligent search
- 📋 **Mission planning and tracking** with Kanban-style boards
- 🔐 **Multi-factor authentication** with biometric support
- 📚 **Knowledge base management** with vector-based semantic search
- 🏢 **Facility operations** and issue tracking
- 📊 **Real-time analytics** and reporting

---

## ✨ Features

### 🔐 **Identity Vault (Authentication & Authorization)**
- **Multi-Role System**: Admin, Agent, and Technician roles with granular permissions
- **JWT-based Authentication**: Secure token-based authentication with refresh tokens
- **User Management**: Complete CRUD operations for user accounts
- **Profile Management**: User profile with personal and professional information
- **Password Security**: Argon2 hashing with secure password policies
- **QR Code Generation**: Secure ranger ID cards with embedded QR codes
  
### 📋 **Ops Planner (Mission Board)**
- **Kanban Board**: Visual mission management with drag-and-drop interface
- **Mission Lifecycle**: PENDING → IN_PROGRESS → REVIEW → COMPLETED workflow
- **Agent Assignment**: Assign missions to specific field agents
- **Document Attachments**: Link evidence and documents to missions
- **Agent Scoring**: Track agent performance and mission completion rates
- **Real-time Updates**: WebSocket-based live mission status updates
- **Activity Logging**: Complete audit trail of mission activities
- **Due Date Tracking**: Monitor mission deadlines and overdue tasks
- **Difficulty Levels**: Categorize missions (search, hard, insane)

### 🏢 **Facility Ops Hub (Issue Tracking)**
- **Issue Management**: Create, assign, and track facility issues
- **Technician Assignment**: Route issues to appropriate technical staff
- **Status Workflow**: NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
- **Evidence Upload**: Attach photos and documents to issues
- **Outcome Reporting**: Record resolution details and solutions applied
- **Priority Levels**: LOW, MEDIUM, HIGH, CRITICAL priority classification
- **Issue Categories**: Electrical, plumbing, HVAC, security, maintenance, IT, other
- **Technician Workload**: Track assigned issues per technician
- **Admin Oversight**: Monitor facility operations dashboard
  
### 📄 **Doc-Sage (AI Document Intelligence)**
- **Multi-format Support**: Process PDFs, images (JPG, PNG), and text files
- **AI-Powered Processing**: Automatic text extraction and content analysis
- **Intelligent Chat**: Ask questions about uploaded documents using RAG (Retrieval-Augmented Generation)
- **Mission-based Access**: Associate documents with missions and control access
- **Vector Search**: Semantic search across document content using embeddings
- **Document Metadata**: Track upload history, processing status, and access logs
- **OCR Support**: Extract text from images using Tesseract
- **Chat History**: Maintain conversation context for better Q&A

### 🔮 **Knowledge Crystal (Knowledge Base)**
- **Content Management**: Create, update, and organize knowledge articles
- **Role-based Access**: Separate content for agents and technicians
- **Vector Embeddings**: Generate semantic embeddings for intelligent search
- **RAG-powered Q&A**: Answer questions using retrieved knowledge context
- **Category System**: Organize content by missions, protocols, and technical guides
- **Country-specific Content**: Filter agent documents by geographical region
- **Tag-based Organization**: Multi-dimensional content categorization
- **Chat Interface**: Interactive knowledge base queries with context awareness

### 📊 **Analytics Dashboard**
- **User Activity Metrics**: Login patterns, active users, session analytics
- **Document Analytics**: Upload trends, processing statistics
- **Security Monitoring**: Failed login attempts, suspicious activities
- **Mission Analytics**: Completion rates, agent performance
- **Anomaly Detection**: Identify unusual patterns and security threats
- **Time-range Filtering**: Analyze data across different periods (24h, 7d, 30d, custom)
- **Visual Reports**: Charts and graphs for data visualization

### 🔔 **Notifications System**
- **Multi-channel Delivery**: In-app, email, SMS, and push notifications
- **Priority Levels**: INFO, WARNING, ERROR, CRITICAL
- **Notification Types**: System, mission updates, security alerts, facility issues
- **User Preferences**: Customize notification channels and frequencies
- **Read/Unread Tracking**: Manage notification states
- **Batch Operations**: Mark multiple notifications as read
- **Real-time Delivery**: Instant notification push using WebSockets

### 📤 **Data Export**
- **Multiple Formats**: Export data as JSON, CSV, or Excel (XLSX)
- **Filtered Exports**: Export specific date ranges or filtered datasets
- **Report Generation**: Generate comprehensive system reports
- **Scheduled Exports**: Automate regular data exports
- **Audit Exports**: Complete activity and access logs

---

## 🛠️ Tech Stack

### **Backend**
- **Framework**: FastAPI (Python 3.11+)
- **Web Server**: Uvicorn ASGI server
- **Database**: MongoDB Atlas (NoSQL document database)
- **Async HTTP**: httpx for API calls

### **AI & ML**
- **LLM Framework**: LangChain for AI orchestration
- **AI Providers**: 
  - Ollama (local LLM - Llama 3.2:3b)
  - Google Gemini 1.5 Flash (cloud option)
- **Vector Database**: ChromaDB for semantic search
- **Embeddings**: Sentence transformers via LangChain

### **Real-time Communication**
- **WebSockets**: Native FastAPI WebSocket support
- **Email**: aiosmtplib for async email delivery

### **Frontend**
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.10.1
- **HTTP Client**: Axios 1.13.2
- **Icons**: Lucide React 0.555.0
- **State Management**: React Context API
- **Styling**: Custom CSS

### **Data Processing**
- **Excel Export**: openpyxl, pandas
- **Data Validation**: Pydantic models
- **Configuration**: pydantic-settings, python-dotenv

### **Development & Deployment**
- **Version Control**: Git
- **Backend Hosting**: Render(pending)
- **Frontend Hosting**: Vercel(pending)
- **Database Hosting**: MongoDB Atlas

---

## 🏗️ Architecture

### **System Architecture**

```
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
│  │ Identity    │ Doc-Sage    │ Knowledge   │ Ops Planner         │ │
│  │ Vault       │ Service     │ Crystal     │ Service             │ │
│  │             │             │ Service     │                     │ │
│  ├─────────────┼─────────────┼─────────────┼─────────────────────┤ │
│  │ MFA         │ Biometric   │ Analytics   │ Notification        │ │
│  │ Service     │ Service     │ Service     │ Service             │ │
│  │             │             │             │                     │ │
│  ├─────────────┴─────────────┴─────────────┴─────────────────────┤ │
│  │ Facility Ops Service    │ Data Export Service                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                      │
│  ┌──────────────────┬──────────────────┬─────────────────────────┐ │
│  │  MongoDB Atlas   │  ChromaDB        │  File Storage           │ │
│  │                  │                  │                         │ │
│  │  - users         │  - Embeddings    │  - Documents            │ │
│  │  - documents     │  - Vector Search │  - Mission Files        │ │
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
│  │  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐ │  │
│  │  │   Ollama    │    │   Gemini     │    │   Tesseract    │ │  │
│  │  │   (Local)   │    │   (Cloud)    │    │     OCR        │ │  │
│  │  │             │    │              │    │                │ │  │
│  │  │ Llama 3.2   │    │ Gemini 1.5   │    │ Text Extract   │ │  │
│  │  └─────────────┘    └──────────────┘    └────────────────┘ │  │
│  │                                                               │  │
│  │  LangChain Framework: RAG, Embeddings, Document Processing   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### **Module Architecture**

```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   ├── config/
│   │   └── settings.py              # Environment configuration
│   ├── database/
│   │   └── mongodb.py               # MongoDB connection & utilities
│   ├── utils/
│   │   ├── auth.py                  # JWT utilities
│   │   ├── rbac.py                  # Role-based access control
│   │   └── dependencies.py          # FastAPI dependencies
│   │
│   ├── identity_vault/              # Authentication & User Management
│   │   ├── models.py                # User models (Admin, Agent, Technician)
│   │   ├── auth_routes.py           # Login, register, profile endpoints
│   │   ├── admin_routes.py          # Admin user management
│   │   └── services.py              # Business logic
│   │
│   ├── mfa_system/                  # Multi-Factor Authentication
│   │   ├── models.py                # MFA models
│   │   ├── routes.py                # Setup, verify, backup codes
│   │   └── services.py              # TOTP, SMS, Email OTP
│   │
│   ├── biometric_auth/              # Biometric Authentication
│   │   ├── models.py                # Biometric models
│   │   ├── routes.py                # Enroll, verify endpoints
│   │   └── services.py              # Fingerprint, face, iris, voice
│   │
│   ├── doc_sage/                    # AI Document Intelligence
│   │   ├── models.py                # Document models
│   │   ├── routes.py                # Upload, search, chat endpoints
│   │   ├── services.py              # Document processing
│   │   ├── ai_processor.py          # AI/LLM integration
│   │   ├── text_extractor.py        # OCR & text extraction
│   │   └── utils.py                 # Helper functions
│   │
│   ├── knowledge_crystal/           # Knowledge Base System
│   │   ├── models.py                # KB page models
│   │   ├── routes.py                # CRUD, search, Q&A endpoints
│   │   ├── services.py              # KB management
│   │   ├── embedding_service.py     # Generate embeddings
│   │   └── vector_store.py          # ChromaDB integration
│   │
│   ├── ops_planner/                 # Mission Planning Board
│   │   ├── models.py                # Mission models
│   │   ├── routes.py                # Mission CRUD, Kanban, assignments
│   │   ├── services.py              # Mission management
│   │   └── websocket.py             # Real-time updates
│   │
│   ├── facility_ops/                # Facility Operations & Issues
│   │   ├── models.py                # Issue models
│   │   ├── routes.py                # Issue tracking endpoints
│   │   └── services.py              # Issue management
│   │
│   ├── analytics/                   # Analytics & Reporting
│   │   ├── models.py                # Analytics models
│   │   ├── routes.py                # Analytics endpoints
│   │   └── services.py              # Data aggregation & analysis
│   │
│   └── notifications/               # Notification System
│       ├── models.py                # Notification models
│       ├── routes.py                # Notification endpoints
│       └── services.py              # Multi-channel delivery

frontend/
├── src/
│   ├── main.jsx                     # Application entry
│   ├── App.jsx                      # Root component
│   ├── context/
│   │   └── AuthContext.jsx          # Global auth state
│   ├── router/
│   │   └── routes.jsx               # Route configuration
│   ├── pages/
│   │   ├── Login.jsx                # Authentication page
│   │   ├── AdminDashboard.jsx       # Admin control panel
│   │   ├── AgentDashboard.jsx       # Field agent interface
│   │   ├── TechnicianDashboard.jsx  # Technician interface
│   │   ├── DocSage.jsx              # Document intelligence UI
│   │   ├── KnowledgeCrystal.jsx     # Knowledge base UI
│   │   ├── OpsPlanner.jsx           # Mission board UI
│   │   ├── FacilityOps.jsx          # Issue tracking UI
│   │   └── NotificationCenter.jsx   # Notifications UI
│   ├── components/                  # Reusable UI components
│   ├── services/                    # API service layer
│   └── utils/                       # Helper functions
```

### **Data Flow Architecture**

#### **Authentication Flow**
```
User Login Request
    ▼
Verify Credentials (MongoDB)
    ▼
Check MFA Status
    ├─ Enabled → Request 2FA Code
    │             ▼
    │        Verify TOTP/SMS/Email 
    │             ▼
    └─ Disabled → Generate JWT Token
                      ▼
                 Return Access Token + Refresh Token
                      ▼
                 Store in Frontend (Context)
                      ▼
                 Include in Authorization Header
```

#### **Document Processing Flow**
```
Upload Document
    ▼
Validate File Type & Size
    ▼
Save to File System (/uploads)
    ▼
Extract Text (PyPDF2/Tesseract)
    ▼
Send to AI Provider (Ollama/Gemini)
    ▼
Generate Summary & Analysis
    ▼
Create Embeddings (LangChain)
    ▼
Store in ChromaDB
    ▼
Save Metadata in MongoDB
    ▼
Return Document ID
```

#### **RAG (Retrieval-Augmented Generation) Flow**
```
User Query
    ▼
Generate Query Embedding
    ▼
Vector Search in ChromaDB
    ▼
Retrieve Top-K Relevant Chunks
    ▼
Build Context Prompt
    ▼
Send to LLM (Ollama/Gemini)
    ▼
Generate Contextual Answer
    ▼
Return Response with Sources
```

### **Database Schema**

#### **MongoDB Collections**

**users**
```javascript
{
  _id: ObjectId,
  full_name: String,
  email: String (unique),
  password_hash: String,
  role: "admin" | "agent" | "technician",
  age: Number,
  marital_status: "single" | "married",
  criminal_record: Boolean,
  status: "active" | "inactive" | "suspended",
  permissions: {
    create_users: Boolean,
    view_all_data: Boolean,
    view_missions: Boolean,
    fix_issues: Boolean,
    upload_evidence: Boolean,
    manage_facilities: Boolean,
    access_knowledge_base: Boolean
  },
  mfa_enabled: Boolean,
  mfa_secret: String,
  biometric_enrolled: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
```

**documents**
```javascript
{
  _id: ObjectId,
  filename: String,
  original_filename: String,
  file_path: String,
  mime_type: String,
  file_size: Number,
  uploaded_by: String,
  mission_id: String (optional),
  allowed_users: [String],
  extracted_text: String,
  ai_summary: String,
  processing_status: "pending" | "processing" | "completed" | "failed",
  embedding_ids: [String],
  upload_date: DateTime,
  tags: [String]
}
```

**missions**
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  status: "pending" | "in_progress" | "review" | "completed",
  difficulty: "search" | "hard" | "insane",
  assigned_to: String (agent_email),
  created_by: String,
  due_date: DateTime,
  documents: [ObjectId],
  tags: [String],
  activity_log: [{
    action: String,
    performed_by: String,
    timestamp: DateTime,
    details: String
  }],
  created_at: DateTime,
  updated_at: DateTime
}
```

**issues** (Facility Operations)
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: "electrical" | "plumbing" | "hvac" | "security" | "maintenance" | "it" | "other",
  priority: "low" | "medium" | "high" | "critical",
  status: "new" | "assigned" | "in_progress" | "resolved" | "closed",
  reported_by: String,
  assigned_to: String (technician_email),
  location: String,
  evidence_files: [String],
  outcome: String,
  resolution_date: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}
```

**knowledge_pages**
```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  category: "agent" | "technician",
  country: String (for agent docs),
  mission_id: String (optional),
  visibility: "public" | "private",
  tags: [String],
  embedding_chunks: [{
    chunk_id: String,
    text: String,
    vector_id: String
  }],
  created_by: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

**notifications**
```javascript
{
  _id: ObjectId,
  user_id: String,
  type: "system" | "mission" | "security" | "issue",
  priority: "info" | "warning" | "error" | "critical",
  title: String,
  message: String,
  channels: ["in_app" | "email" | "sms" | "push"],
  is_read: Boolean,
  read_at: DateTime,
  created_at: DateTime
}
```

---

## 🚀 Installation

### **Prerequisites**

- **Python** 3.11 or higher
- **Node.js** 18+ and npm/yarn
- **MongoDB** (local or Atlas account)
- **Ollama** (for local LLM) 
- **Git**

### **Backend Setup**

1. **Clone the repository**
```bash
git clone https://github.com/Abhay030405/sentinelops-nexus.git
cd sentinelops-nexus/backend
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
# Copy example .env file
cp .env.example .env

# Edit .env with your settings
```

**.env Configuration:**
```env
# MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=sentinel_ops_nexus

# AI Provider (ollama or gemini)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Or use Gemini
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your_api_key_here

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

5. **Install Ollama (for local LLM)**
```bash
# Download from https://ollama.com/download
# Then pull the model:
ollama pull llama3.2:3b
ollama serve
```

6. **Run the backend**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### **Frontend Setup**

1. **Navigate to frontend directory**
```bash
cd ../frontend
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Configure API endpoint**
```bash
# Create .env file in frontend directory
echo "VITE_API_URL=http://localhost:8000" > .env
```

4. **Run the frontend**
```bash
npm run dev
# or
yarn dev
```

Frontend will be available at: `http://localhost:3000`

### **Initialize Admin User**

```bash
cd backend
python create_admin.py
```

This creates the default admin account with credentials from your `.env` file.

---


## 📱 Usage

### **Admin Workflow**

1. **Login** with admin credentials
2. **Create Users** (Agents & Technicians)
3. **Upload Documents** to Doc-Sage
4. **Create Missions** in Ops Planner
5. **Assign Missions** to agents
6. **Monitor Analytics** dashboard
7. **Manage Facilities** and issues

### **Agent Workflow**

1. **Login** and view assigned missions
2. **Upload Evidence** to missions
3. **Search Knowledge Base** for protocols
4. **Ask AI Questions** about documents
5. **Update Mission Status** as work progresses
6. **Report Facility Issues**

### **Technician Workflow**

1. **Login** and view assigned issues
2. **Access Technical Documentation** in Knowledge Base
3. **Update Issue Status** as repairs progress
4. **Upload Evidence Photos** of completed work
5. **Submit Outcome Reports**

---

## 🔑 API Endpoints

### **Authentication**
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user (admin only)
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh access token

### **Doc-Sage**
- `POST /api/docsage/upload` - Upload document
- `GET /api/docsage/documents` - List documents
- `POST /api/docsage/chat` - Chat with AI about document
- `GET /api/docsage/search` - Search documents

### **Knowledge Crystal**
- `POST /kb/create` - Create knowledge page
- `GET /kb/pages` - List knowledge pages
- `POST /kb/query` - Ask question to KB
- `POST /kb/search` - Vector search KB

### **Ops Planner**
- `POST /api/ops-planner/missions` - Create mission
- `GET /api/ops-planner/missions` - List missions
- `PUT /api/ops-planner/missions/{id}/assign` - Assign mission
- `GET /api/ops-planner/kanban` - Get Kanban board

### **Facility Ops**
- `POST /facility-ops/issues` - Create issue
- `GET /facility-ops/issues` - List issues
- `PUT /facility-ops/issues/{id}/assign` - Assign to technician
- `PUT /facility-ops/issues/{id}/outcome` - Submit outcome

For complete API documentation, visit `/docs` on your running backend server.

---

## 🧪 Testing

### **Run Backend Tests**
```bash
cd backend
pytest tests/
```

### **Test API Endpoints**
```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sentinelops.com","password":"admin123"}'
```

### **Test MongoDB Connection**
```bash
python test_mongodb_connection.py
```

---

## 🐳 Docker Support

### **Build and Run with Docker**

```bash
# Build backend
cd backend
docker build -t sentinelops-backend .
docker run -p 8000:8000 --env-file .env sentinelops-backend

# Build frontend
cd frontend
docker build -t sentinelops-frontend .
docker run -p 3000:3000 sentinelops-frontend
```

### **Docker Compose**

```bash
docker-compose up -d
```

---

## 🔧 Configuration

### **AI Provider Selection**

**Option 1: Ollama (Local, Free, Private)**
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

**Option 2: Google Gemini (Cloud, Fast)**
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-1.5-flash
```

### **File Upload Limits**

```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=[".pdf", ".jpg", ".jpeg", ".png", ".txt"]
```

### **Security Settings**

```env
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
QR_TOKEN_LENGTH=32
SECRET_KEY=generate-strong-key-here
```


---

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- LangChain for AI orchestration
- MongoDB for flexible data storage
- ChromaDB for vector search capabilities
- Ollama for local LLM support
- React team for the frontend framework



[⬆ Back to Top](#-sentinelops-nexus---intelligence-operations-management-platform)

</div>
