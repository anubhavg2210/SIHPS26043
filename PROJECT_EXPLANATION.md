# CivicSync (SIH PS 26043) — Complete Project Explanation & Architecture Guide

---

## 📌 Executive Summary / Project Overview

**CivicSync** (SIH Problem Statement **SIHPS26043**) ek high-impact, multi-tier civic-tech innovation platform hai jo ground-level societal & civic issues (jaise Paani, Kheti, Swasthya, Bijli, Infrastructure, Waste Management) ko report karne aur unke **AI-driven root-cause resolution** ke liye banaya gaya hai.

Yeh platform nimn-likhit stakeholders ko ek sath laata hai:
1. **Citizens & Community Members**: Issues report karte hain.
2. **Local & Government Authorities**: Problems receive, prioritize, aur track karte hain.
3. **Academic & Research Institutions**: (IIT ISM Dhanbad, BIT Mesra, NIT Jamshedpur, Birsa Agricultural University, RIMS Ranchi, AIIMS Deoghar, etc.) Expertise aur lab research provide karte hain.
4. **Faculty, Student Researchers, Startups & MSMEs**: Collaboration teams bana kar ground-level pilots deploy karte hain.

---

## 🏗️ 1. Overall System Architecture

Is project ko ek **Decoupled Microservices / Multi-Tier Architecture** par build kiya gaya hai:

```
+-----------------------------------------------------------------------+
|                         React 19 + Vite Frontend                      |
| (Custom CSS Theme Engine, RouterContext, AuthContext, ToastContext)  |
+-----------------------------------------------------------------------+
                                   |
                             HTTP REST APIs
                                   v
+-----------------------------------------------------------------------+
|                    Node.js + Express.js Backend Server                 |
|  (20+ API Route Handlers, Controllers, Services, SQL Query Engine)    |
+-----------------------------------------------------------------------+
         |                                                 |
  SQL Connection Pool                               HTTP Internal Calls
         v                                                 v
+-----------------------------+           +-----------------------------+
|     PostgreSQL Database     |           |  Python FastAPI AI Service  |
|  (18 Migration Scripts,     |           | (Bilingual NLP Parser,      |
|   Spatial & Anti-Gaming)    |           |  Domain Classifier Engine)  |
+-----------------------------+           +-----------------------------+
```

### Architecture Specifications:
- **Frontend Stack**: React 19, Vite, Pure CSS Tokens (custom variables, modern dark/glassmorphic support), Custom SPA Router & State Management.
- **Backend Stack**: Node.js, Express.js REST Gateway, `pg` (PostgreSQL client pool), Async Controller Pattern.
- **AI Microservice**: Python 3, FastAPI, Pydantic, Regex/Rules-based Bilingual Natural Language Processor.
- **Database Engine**: PostgreSQL with 18 modular migration scripts.
- **Scripts & Dataset**: Python data validators (`dataset_schema.py`, `validate_csv.py`), verified institutional provenance metadata (`DATA_SOURCES.md`).

---

## 📑 2. Core Functional Pillars (Har Ek Aspect Ki Details)

### A. Multilingual Problem Reporting & Intelligent Parsing
* Citizens problems report karte hain English, Hindi, ya Hinglish mein.
* AI Microservice problem ke text ko parse karti hai, keywords extraction karti hai, aur **Domain**, **Subdomain**, **Severity Score (1-10)**, aur **Urgency Score (1-10)** automatic set karti hai.

### B. Duplicate Detection & Spatial-Temporal Clustering
* Migration `001_duplicate_detection.sql` aur `002_problem_clustering.sql` ke zariye same geographical radius aur similarity score wale issues ko ek single **Problem Cluster** mein group kiya jata hai. Isse government ko hazaro duplicate complaints ke bajaye 1 central problem par kaam karne me madad milti hai.

### C. Capability & Expertise Matching Engine
* Problem ke extracted technical keywords (e.g., *Groundwater, Wastewater Treatment, Soil Science*) ko backend service matches karti hai regional institutions aur faculty capabilities ke sath.
* Provenance dataset mein 10 verified real-world institutions include hain:
  - **INST001**: IIT (ISM) Dhanbad (Earth Sciences, Mining, Hydrology)
  - **INST002**: BIT Mesra (Remote Sensing, GIS, Environmental Engg)
  - **INST003**: NIT Jamshedpur (Civil, Metallurgy, Electrical)
  - **INST004**: BIT Sindri (Chemical, Mining, Civil)
  - **INST005**: Birsa Agricultural University (Agro-climatic, Soil Science, Forestry)
  - **INST006**: RIMS Ranchi & **INST007**: AIIMS Deoghar (Community Health, Epidemiology)
  - **INST008**: IIM Ranchi, **INST009**: IIIT Ranchi, **INST010**: Central University of Jharkhand

### D. Multidisciplinary Collaboration Teams
* Faculty members, student researchers, aur startups/MSMEs milkar solution team register kar sakte hain (`016_collaboration_teams.sql`).

### E. Pilot Implementation Tracking
* Solution ka progress 4 phases mein track hota hai (`009_implementation_pilot_tracking.sql`):
  1. **Concept Proposal**
  2. **Lab Prototype**
  3. **Field Pilot Testing**
  4. **Full Scale Deployment**

### F. Measurable Impact Passport
* Implementation ke baad ground impact ko verify aur audit kiya jata hai (`010_impact_tracking.sql`). System ek visual **Impact Passport** generate karta hai (showing Liters of Water Cleaned, People Benefited, ROI, Sustainability Index).

### G. Anti-Gaming Trust Score & Reputation System
* Fake issues report karne ya spam upvoting ko rokne ke liye anti-gaming trust metric algorithm implemented hai (`017_trust_and_anti_gaming.sql`).
* Honest contributors ko reputation points, trust badges, aur leaderboard rankings di jaati hain (`014_reputation_rewards.sql`).

### H. Authority & Executive Analytics Dashboard
* District Magistrates aur Municipal Commissioners ke liye specialized analytical dashboards (`003_authority_dashboard.sql`) provide karta hai heatmaps, district-wise progress, resource deployment, aur root cause dependency graphs (`011_root_cause_analysis.sql`).

---

## 🧠 3. AI & ML Microservice Technical Breakdown (`ai/`)

AI service Python FastAPI par nirmit hai.

### Core Modules:
- **`ai/app/main.py`**: FastAPI server entry point.
- **`ai/app/routes/challenge.py`**: API route `/api/v1/challenge/analyze` jo input text handle karti hai.
- **`ai/app/services/classifier.py`**: Primary classification logic:
  - **Text Normalization**: Lowercasing, spacing cleanup, Hindi Devanagari character preservation.
  - **Domain Dictionary (`DOMAIN_RULES`)**:
    - **Water**: Keywords (`water`, `paani`, `पानी`, `borewell`, `groundwater`, `तालाब`, `river`, `नदी`) $\rightarrow$ Expertise: Water Quality, Hydrology, Treatment.
    - **Agriculture**: Keywords (`farmer`, `kisan`, `किसान`, `crop`, `fasal`, `irrigation`, `sinchai`, `soil`, `fertilizer`) $\rightarrow$ Expertise: Agriculture, Irrigation, GIS.
    - **Healthcare**: Keywords (`health`, `hospital`, `doctor`, `medicine`, `रोगी`, `अस्पताल`) $\rightarrow$ Expertise: Healthcare, MedTech.
    - **Education, Environment, Energy, Infrastructure**.
  - **Priority Score Calculation**:
    - Urgent words (`death`, `danger`, `emergency`, `critical`, `खतरा`, `आपातकाल`) $\rightarrow$ Urgency +2, Severity +1.
    - Severe words (`disease`, `contamination`, `pollution`, `unsafe`, `accident`) $\rightarrow$ Severity +2, Urgency +1.
  - **Confidence Score**: Dynamic confidence scaling based on matched rule score ($0.60 + \text{score} \times 0.07$, capped at $0.95$).

---

## 🖥️ 4. Backend Architecture (`backend/`)

Node.js + Express server jo REST APIs serve karta hai.

### App Routes Registry (`backend/src/app.js`):
- `/api/auth`: Login, Register, User sessions
- `/api/problems`: Problem reporting, listing, detailed view
- `/api/challenges`: Challenge analysis bridging AI service
- `/api/clusters`: Spatial clustering & duplicate grouping
- `/api/authority/dashboard`: District metrics & authority analytics
- `/api/solutions`: Solution proposals submission & review
- `/api/implementations`: Field pilot status tracking
- `/api/impact-assessments`: Verified impact metrics & passports
- `/api/root-causes`: Root cause trees & dependency graphs
- `/api/dependencies`: Cross-problem dependencies
- `/api/notifications`: Smart user alerts & notifications
- `/api/teams`: Collaboration team creation & management
- `/api/reputation`: User karma points & badges
- `/api/rankings`: Leaderboards & institute rankings
- `/api/trust`: Anti-gaming flags & trust score analysis
- `/api/analytics`: System-wide executive analytics

---

## 🗄️ 5. Database Schema & Migrations Index (`database/migrations/`)

18 modular SQL files se database schema banta hai:

| File Name | Functional Scope |
|---|---|
| `001_duplicate_detection.sql` | Problem text similarity & spatial coordinate radius detection |
| `002_problem_clustering.sql` | Regional cluster grouping tables & foreign key mappings |
| `003_authority_dashboard.sql` | Aggregated views for government dashboard & district stats |
| `004_faculty_matching.sql` | Faculty expertise mapping & institution department tables |
| `005_required_expertise.sql` | Expertise tag definitions for issues |
| `006_student_researcher_demo.sql` | Student researcher profiles & academic project linking |
| `007_startup_msme_demo.sql` | Incubated startups & MSME capability directory |
| `008_solution_evaluations.sql` | Jury/Expert evaluation rubrics & scores |
| `009_implementation_pilot_tracking.sql` | Milestone tracking for field pilots (Phase 1 to Phase 4) |
| `010_impact_tracking.sql` | Impact Passport data schema & metric verification audits |
| `011_root_cause_analysis.sql` | Cause-and-effect tree nodes & systemic problem analysis |
| `012_problem_dependencies.sql` | Inter-problem linkage & bottleneck tracking |
| `013_smart_notifications.sql` | User notification logs & delivery status |
| `014_reputation_rewards.sql` | User points, badges, levels & reward history |
| `015_community_layer.sql` | Community upvotes, comments, and discussions |
| `016_collaboration_teams.sql` | Multidisciplinary project teams & member roles |
| `017_trust_and_anti_gaming.sql` | Trust metrics, flag logs, and abuse prevention rules |
| `017_verification_layer.sql` | Ground verification audits by independent verifiers |

---

## 🎨 6. Frontend UI Architecture (`frontend/`)

React 19 application built with Vite and custom Modular Architecture.

### Core Structure:
- **`src/App.jsx`**: Main view controller with authenticated layout wrappers and custom SPA router switcher.
- **Context API State Providers**:
  - `RouterProvider`: Lightweight client-side route parser (`useRouter`).
  - `AuthProvider`: Manages user login state, JWT tokens, user role (`citizen`, `faculty`, `student`, `startup`, `authority`).
  - `ToastProvider` & `NotificationProvider`: Real-time system feedback toasts and notification bell feed.
- **Key Pages**:
  - `LandingPage.jsx`: Public landing showcase with metrics & call-to-actions.
  - `DashboardPage.jsx`, `AnalyticsDashboardPage.jsx`, `TrustDashboardPage.jsx`: Executive & role-specific analytical views.
  - `ReportProblemPage.jsx`: Interactive multi-step problem submission with live AI assistance.
  - `ProblemDetailPage.jsx`: Comprehensive view showing cluster info, matched institutes, proposed solutions, pilot status, and root cause graph.
  - `ImpactPassportPage.jsx`: Verified impact metrics and certificate views.
  - `ReputationPage.jsx`, `RankingsPage.jsx`, `ProfilePage.jsx`: Gamification & user profiles.

---

## 📁 7. File & Folder Hierarchy Reference

```text
SIHPS26043new/
│
├── ai/                                # Python FastAPI NLP & Matching Service
│   ├── app/
│   │   ├── config/                    # Environment & Model configurations
│   │   ├── models/                    # Internal data models
│   │   ├── routes/                    # API Endpoints (challenge.py, classification.py, matching.py)
│   │   ├── schemas/                   # Pydantic schemas (challenge.py)
│   │   ├── services/                  # Business logic (classifier.py, matching_service.py)
│   │   ├── __init__.py
│   │   └── main.py                    # Service main entry point
│   ├── AI_REQUIREMENTS.md
│   ├── main.py
│   └── requirements.txt               # Dependencies (FastAPI, uvicorn, pydantic)
│
├── backend/                           # Node.js Express REST API
│   ├── src/
│   │   ├── config/                    # db.js (PostgreSQL pool configuration)
│   │   ├── controllers/               # Express Controllers (Auth, Problems, Analytics, etc.)
│   │   ├── middleware/                # Auth & Validation Middlewares
│   │   ├── routes/                    # 20+ Express Route files
│   │   ├── services/                  # matchingService.js, etc.
│   │   ├── utils/                     # Helper utilities
│   │   ├── app.js                     # App initialization & Route registration
│   │   └── server.js                  # HTTP Server listener
│   ├── recover_db.js                  # Database recovery script
│   ├── run-migration.js               # SQL Migration runner
│   ├── package.json
│   └── tests/                         # API tests
│
├── database/                          # PostgreSQL Database Definitions
│   ├── migrations/                    # 18 Modular SQL migrations (001_ to 017_)
│   ├── schema.sql                     # Base schema reference
│   └── seed.sql                       # Initial sample data seed
│
├── dataset/                           # Provenance Records & Data Schemas
│   ├── json/                          # Raw & structured JSON dataset entries
│   ├── raw/                           # Unprocessed source data
│   ├── DATA_DICTIONARY.md             # Field definitions
│   └── DATA_SOURCES.md                # 10+ verified institution provenance details
│
├── frontend/                          # React 19 Client SPA
│   ├── public/                        # Static assets & favicon
│   ├── src/
│   │   ├── assets/                    # Styling assets & graphics
│   │   ├── components/                # Reusable UI (common, dashboard, layout, problems, teams)
│   │   ├── constants/                 # UI constants & system tokens
│   │   ├── context/                   # RouterContext, AuthContext, ToastContext, NotificationContext
│   │   ├── pages/                     # Landing, Auth, Dashboard, Explore, Problems, Reputation, Rankings
│   │   ├── services/                  # API client services
│   │   ├── App.css                    # Component styles
│   │   ├── App.jsx                    # SPA Router & Route Switcher
│   │   ├── index.css                  # Modern CSS Token System Variables
│   │   └── main.jsx                   # React DOM Root Entry
│   ├── index.html
│   ├── vite.config.js                 # Vite bundler configuration
│   └── package.json
│
├── scripts/                           # Validation & Data Maintenance Scripts
│   ├── dataset_schema.py              # Pydantic/Python dataset validator
│   ├── generate_summary.py            # Summary generator tool
│   ├── validate_csv.py                # CSV integrity inspector
│   ├── validate_foreign_keys.py       # SQL relationship validator
│   ├── validate_ids.py                # Unique ID validator
│   └── validate_urls.py               # Dataset URL validator
│
├── package.json                       # Root package config
├── vite.config.js                     # Root Vite config
└── README.md                          # Repository README
```

---

## ⚡ 8. Project Execution Guide (Kaise Run Karein)

### Step 1: Database Setup
Ensure PostgreSQL is running locally or on a remote server.
```bash
# Run migrations using node runner
cd backend
node run-migration.js
```

### Step 2: Start Python AI Microservice
```bash
cd ai
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Step 3: Start Node.js Backend API
```bash
cd backend
npm install
npm run dev # Runs on port 5000 / configured PORT
```

### Step 4: Start Frontend Client UI
```bash
cd frontend
npm install
npm run dev # Runs Vite server on http://localhost:5173
```

---

## 🎯 Conclusion

CivicSync (**SIHPS26043**) ek standard hackathon prototype se aage badhkar ek **Enterprise-Grade Civic Innovation Engine** hai. Iska modular architectural separation (React Frontend, Express Backend, Python AI Engine, 18-part SQL Schema, Data Provenance) isko scalable, maintainable, aur real-world deployment-ready banata hai.
