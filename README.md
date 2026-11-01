# CARECONNECT-ETHIOPIA
AI-Powered Smart Healthcare Referral and Patient Coordination System (Version 1.0)

CareConnect Ethiopia is a comprehensive healthcare referral and patient coordination platform designed to improve communication, referral management, and coordination between health centres, regional hospitals, transportation units, and administrative health authorities across Ethiopia.

---

## Multiple Execution Modes

You can run the portals **independently on dedicated ports**, **all concurrently**, or **unified under a single dev server**:

### 1. Run All 5 Portals Concurrently (Recommended)
Launch all 5 portal servers simultaneously in one terminal:
```bash
npm run dev:all
```
This spawns:
- **Collage Overview**: `http://localhost:3000/`
- **Health Centre Portal**: `http://localhost:3001/`
- **Hospital Portal**: `http://localhost:3002/`
- **Transport Coordinator Portal**: `http://localhost:3003/`
- **System Administrator Portal**: `http://localhost:3004/`

---

### 2. Run Each Portal Independently

| Target Portal | Command | Port & URL | Primary User |
| :--- | :--- | :--- | :--- |
| **Health Centre Portal** | `npm run dev:health-centre` | `http://localhost:3001` | **Dr. Alemayehu** (Health Centre) |
| **Hospital Portal** | `npm run dev:hospital` | `http://localhost:3002` | **Dr. Fitsum** (Black Lion Hospital) |
| **Transport Coordinator Portal** | `npm run dev:transport` | `http://localhost:3003` | **Abebe Kebede** (Transport) |
| **System Administrator Portal** | `npm run dev:admin` | `http://localhost:3004` | **Admin User** (System Admin) |
| **4-Portal Collage Overview** | `npm run dev:collage` | `http://localhost:3000` | 2×2 Multi-Portal View |

---

### 3. Run Standard Unified Server with Dedicated Path Routes
```bash
npm run dev
```
Available on `http://localhost:3000`:
- `/health-centre`
- `/hospital`
- `/transport`
- `/admin`
- `/collage`

---

## Tech Stack
- **Frontend**: React.js 18, React Router v6, Vite, Tailwind CSS, Lucide Icons, Concurrently
- **Backend Architecture**: Node.js, Express.js
- **Database Architecture**: PostgreSQL
- **AI Processing Layer**: Python, FastAPI, Scikit-learn, Tesseract OCR, and OpenCV
