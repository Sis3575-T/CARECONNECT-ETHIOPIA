# CareConnect Ethiopia — Installation & Setup Guide

## 1. System Requirements & Prerequisites

Ensure the following runtimes and tools are installed before launching the development environment:

| Requirement | Minimum Version | Tested / Recommended Version | Purpose |
|---|---|---|---|
| **Node.js** | `>= 18.0.0` | `24.x LTS` or `20.x LTS` | Frontend build tooling & Express API |
| **npm** | `>= 9.0.0` | `10.x+` | Package & workspace manager |
| **Python** | `>= 3.10` | `3.12.x` | FastAPI AI microservice & OCR pipelines |
| **PostgreSQL** | `>= 14.0` | `16.x` or `18.x` | Primary relational data store |
| **Tesseract OCR** | `>= 5.0` | `5.3.x+` | Optical Character Recognition (with `amh` traineddata) |

---

## 2. Quickstart Installation Steps

### Step 1: Clone Repository
```bash
git clone https://github.com/Sis3575-T/CARECONNECT-ETHIOPIA.git
cd "CareConnect Ethiopia Healthcare Dashboard Collage"
```

### Step 2: Configure Environment Variables
Copy the provided `.env.example` templates into active `.env` files:
```bash
# Root environment
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env

# AI Service environment
cp ai-service/.env.example ai-service/.env

# Frontend Portals
cp portals/health-centre/.env.example portals/health-centre/.env
cp portals/hospital/.env.example portals/hospital/.env
cp portals/transport/.env.example portals/transport/.env
cp portals/administrator/.env.example portals/administrator/.env
```

### Step 3: Install Node.js Dependencies
Install root dependencies and all npm workspaces:
```bash
npm install
```

### Step 4: Setup Python AI Service Environment
```bash
cd ai-service
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### Step 5: Database Provisioning & Migrations
Ensure PostgreSQL is running locally on port 5432:
```bash
# Create database
createdb -U postgres careconnect_db

# Run migrations and seed data
npm run db:migrate
npm run db:seed
```

---

## 3. Launching Services in Development

### Option A: Launch All Portals + Backend Simultaneously
```bash
npm run dev:all
```
This concurrently boots:
- Backend Express API on port `5000`
- Health Centre Portal on port `5173`
- Hospital Portal on port `5174`
- Transport Portal on port `5175`
- Administrator Portal on port `5176`

### Option B: Launch AI Decision Service
In a separate terminal:
```bash
npm run dev:ai
```
Runs FastAPI at `http://localhost:8000` with interactive OpenAPI documentation at `http://localhost:8000/docs`.

---

## 4. Service Directory & Port Map

| Component | URL | Default Port | Description |
|---|---|---|---|
| **Health Centre Portal** | `http://localhost:5173` | 5173 | Patient intake, referral drafting, OCR review |
| **Hospital Portal** | `http://localhost:5174` | 5174 | Incoming referral triage, bed allocation |
| **Transport Portal** | `http://localhost:5175` | 5175 | Ambulance dispatch, route telematics |
| **Administrator Portal** | `http://localhost:5176` | 5176 | User governance, facility registry, analytics |
| **Main REST API** | `http://localhost:5000/api/v1` | 5000 | Core data & coordination gateway |
| **AI Decision Service** | `http://localhost:8000` | 8000 | Tesseract OCR, ML ranking & NLP endpoints |

---

## 5. Verification Commands

To verify that all ports and services are operational:
```bash
node scripts/dev-orchestrator.js
```

To run the automated test suite:
```bash
npm run test:backend
npm run test:ai
```
