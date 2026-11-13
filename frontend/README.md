# TCP Connection Failure Analysis System — Frontend Application

**Candidate Roll Number:** 104  
**Class:** 25IT5A & B (Odd Semester) | **Academic Year:** 2026 – 2027  
**Department:** Information Technology, Velalar College of Engineering and Technology, Erode – 638 012  
**Problem Statement #43:** *TCP Connection Failure Analysis System*  
**Integrated Courses:**
- **22ITT51** – Full Stack Web Development (FSWD)
- **22ITT52** – Computer Networks (CN)
- **22ITT53** – Formal Languages and Automata Theory (FLAT)

---

## Overview

The `frontend/` directory contains the complete React 19 Single Page Application (SPA) for the TCP Connection Failure Analysis System. It delivers a Cyber Dark academic dashboard providing real-time network telemetry, protocol simulation, 7-state FSM visualization, sliding window flow control, packet inspection, and automata test benches.

---

## Directory Organization

```text
frontend/
├── public/                     # Static public assets (icons, manifests)
├── src/
│   ├── api/
│   │   └── client.js           # REST API client (dynamic VITE_API_BASE_URL & /api default)
│   ├── assets/                 # SVGs, images, and brand illustrations
│   ├── components/             # Reusable UI components
│   │   ├── EmptyState.jsx      # High-contrast empty state placeholder
│   │   ├── Header.jsx          # Top bar with dynamic DB status badge & manual refresh
│   │   ├── LoadingSpinner.jsx  # Animated loading indicator
│   │   ├── Sidebar.jsx         # 8-destination academic navigation sidebar
│   │   └── StatusBadge.jsx     # Semantic status tags (SUCCESS, FAILED, TIMEOUT, etc.)
│   ├── pages/                  # Top-level route views
│   │   ├── Dashboard.jsx       # Real-time Recharts analytics (pie, line, bar) & telemetry
│   │   ├── ConnectionSimulator.jsx # 3-way handshake, 12-field packet inspector, sliding window
│   │   ├── TCPStateVisualizer.jsx  # Glowing 7-state FSM node graph & transition tester
│   │   ├── ConnectionHistory.jsx   # Full MongoDB CRUD table with search & pagination
│   │   ├── FailureAnalysis.jsx     # EventEmitter sliding-window failure velocity detector
│   │   ├── NetworkEvents.jsx       # Granular TCP packet audit stream & filtering
│   │   ├── FLATTheoryLab.jsx       # 5 Automata Course Outcomes (CO1 - CO5) interactive lab
│   │   └── AboutProject.jsx        # Academic specifications, syllabus mapping & Roll 104 info
│   ├── App.jsx                 # React Router v7 layout & route declarations
│   ├── index.css               # Design system tokens, Cyber Dark theme & typography
│   └── main.jsx                # React DOM root entry point
├── .env.example                # Frontend environment template
├── .gitignore                  # Frontend-specific ignore rules
├── .oxlintrc.json              # Oxlint high-performance linter configuration
├── index.html                  # HTML5 shell template
├── package.json                # Frontend dependencies and npm scripts
└── vite.config.js              # Vite dev server configuration & /api backend proxy
```

---

## Independent Installation & Running

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Standalone Development Server
```bash
npm run dev
```
- **Local URL:** `http://localhost:3000`
- **Backend API Proxy:** Vite automatically proxies all `/api/*` HTTP requests to `http://localhost:5000` (configurable in `vite.config.js`).

### 3. Run Quality Check & Linter
```bash
npm run lint
```
- Analyzes all JavaScript and JSX source files using `oxlint`.
- Clean status: **0 warnings, 0 errors**.

### 4. Build for Production
```bash
npm run build
```
- Bundles minified assets into `frontend/dist/`.
- Ready to be served statically or hosted by Express.

### 5. Preview Production Build
```bash
npm run preview
```
- Previews the production bundle locally on `http://localhost:4173`.
