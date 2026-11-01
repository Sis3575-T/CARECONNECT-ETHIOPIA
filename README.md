# CARECONNECT-ETHIOPIA
AI-Powered Smart Healthcare Referral and Patient Coordination System (Version 1.0)

CareConnect Ethiopia is a comprehensive healthcare referral and patient coordination platform designed to improve communication, referral management, and coordination between health centres, regional hospitals, transportation units, and administrative health authorities across Ethiopia.

## Dedicated Portal URLs & Routes

Each of the 4 healthcare portals (plus the 4-portal collage overview) is accessible via its own dedicated URL:

| Portal | Dedicated URL | User Profile / Facility | Description |
| :--- | :--- | :--- | :--- |
| **4-Portal Collage Overview** | `/` or `/collage` | Multi-Portal Dashboard | Exact 2×2 replica of the reference image with live reactive status |
| **Health Centre Portal** | `/health-centre` | Dr. Alemayehu (Health Centre) | Patient referral creation, OCR document extraction, completeness checks, and AI hospital recommendations |
| **Hospital Portal** | `/hospital` | Dr. Fitsum (Black Lion Hospital) | Incoming referral queue, clinical triage (accept/reject with reasons), bed capacity, and referrals by source |
| **Transport Coordinator Portal** | `/transport` | Abebe Kebede (Transport) | Transport requests, workflow stepper (Request → Assigned → In Transit → Arrived), and Addis Ababa route tracking |
| **System Administrator Portal** | `/admin` | Admin User (System Admin) | System overview, platform analytics, health facility management, and AI model performance metrics |

*(Aliases supported: `/health-center` &rarr; `/health-centre`, `/transport-coordinator` &rarr; `/transport`, `/system-admin` &rarr; `/admin`)*

## Tech Stack
- **Frontend**: React.js 18, React Router v6, Vite, Tailwind CSS, Lucide Icons
- **Backend Architecture**: Node.js, Express.js
- **Database Architecture**: PostgreSQL
- **AI Processing Layer**: Python, FastAPI, Scikit-learn, Tesseract OCR, and OpenCV

## Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
Open `http://localhost:3000` to view the 4-portal collage or navigate directly to `/health-centre`, `/hospital`, `/transport`, or `/admin`.
