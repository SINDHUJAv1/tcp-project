# TCP Connection Failure Analysis System — Backend Application

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

The `backend/` directory contains the complete Node.js / Express 5 backend server and protocol simulation engines for the TCP Connection Failure Analysis System. It provides REST APIs for database operations, real-time telemetry, 7-state finite automata transitions, RFC 793/1071 TCP checksum calculation, dynamic sliding window flow control, and formal automata theory modules (CFG parser, PDA stack simulator, and Turing Machine tape simulation).

---

## Directory Organization

```text
backend/
├── config/
│   └── db.js                 # Dynamic MongoDB connection manager & offline fallback tracker
├── controllers/
│   ├── alertController.js    # Security alert CRUD and resolution workflows
│   ├── connectionController.js # Complete ConnectionAttempt CRUD with pagination & filtering
│   ├── dashboardController.js  # Real-time metrics aggregation and DB health state
│   ├── eventController.js    # Network packet audit stream logger & retrieval
│   ├── flatController.js     # Automata test benches (Regex, CFG parser, PDA, Turing Machine)
│   ├── fsmController.js      # TCP FSM state queries, transition triggers, and formal specs
│   └── simulatorController.js# Handshake, teardown, corruption, and sliding window endpoints
├── engine/
│   ├── failureDetector.js    # Node.js EventEmitter sliding-window failure detector (CO4)
│   ├── slidingWindow.js      # TCP sliding window flow control engine (rwnd, buffer, ZWP)
│   ├── tcpChecksum.js        # RFC 793 / RFC 1071 16-bit 1's complement checksum engine
│   ├── tcpFSM.js             # 7-State TCP Finite State Machine formal transition logic
│   └── tcpSimulator.js       # Handshake, retransmission, corruption & packet lifecycle engine
├── flat/
│   └── flatEngine.js         # DFA 5-tuple, Regex validators, CFG parser, PDA & TM algorithms
├── middleware/
│   ├── errorHandler.js       # Centralized JSON error handling middleware
│   └── validator.js          # Hostname (RFC 1123) and Port (1-65535) input validators
├── models/
│   ├── ConnectionAttempt.js  # Mongoose schema for TCP connection attempts
│   ├── NetworkEvent.js       # Mongoose schema for packet audit log events
│   ├── SecurityAlert.js      # Mongoose schema for security and anomaly alerts
│   └── storage.js            # Unified DAO with automatic seeding & resilient in-memory store
├── routes/
│   ├── alertRoutes.js        # Routes for /api/alerts
│   ├── connectionRoutes.js   # Routes for /api/connections
│   ├── dashboardRoutes.js    # Routes for /api/dashboard
│   ├── eventRoutes.js        # Routes for /api/events
│   ├── flatRoutes.js         # Routes for /api/flat
│   ├── fsmRoutes.js          # Routes for /api/fsm
│   ├── healthRoutes.js       # Routes for /api/health
│   └── simulatorRoutes.js    # Routes for /api/simulator
├── tests/
│   ├── flat.test.js          # 12 FLAT unit tests (CO1 - CO5)
│   ├── cn.test.js            # 15 Computer Networks tests (Checksum, Flow Control, Corruption)
│   └── integration.test.js   # 20 Full Stack Integration test scenarios
├── .env                      # Local environment configuration (PORT, MONGODB_URI)
├── .env.example              # Template for environment configuration
├── .gitignore                # Backend-specific ignore rules (excludes node_modules, .env)
├── package.json              # Backend dependencies and automated test scripts
└── server.js                 # Main Express server entry point & static SPA host
```

---

## Independent Installation & Running

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Verify `.env` (or copy from `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tcp_connection_analyzer
NODE_ENV=development
CONSECUTIVE_FAILURE_THRESHOLD=3
FAILURE_WINDOW_MS=60000
```

### 3. Run Backend API Server
```bash
npm run dev
# or
npm start
```
- **Base URL:** `http://localhost:5000`
- **Health Telemetry:** `http://localhost:5000/api/health`
- **Dashboard Stats:** `http://localhost:5000/api/dashboard/stats`
- **CORS:** Enabled for all origins (`*`), enabling seamless independent connection from the frontend at `http://localhost:3000`.

### 4. Run Automated Test Suites
```bash
# Run all 47 automated tests (FLAT + CN + Integration)
npm test

# Run individual suites
npm run test:flat          # 12 FLAT tests (CO1 - CO5)
npm run test:cn            # 15 Computer Networks tests
npm run test:integration   # 20 Full Stack Integration scenarios
```
- All 47 tests pass with **0 failures**.
