const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const { connectDB, getDbStatus } = require('./config/db');
const storage = require('./models/storage');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const healthRoutes = require('./routes/healthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const fsmRoutes = require('./routes/fsmRoutes');
const alertRoutes = require('./routes/alertRoutes');
const eventRoutes = require('./routes/eventRoutes');
const flatRoutes = require('./routes/flatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Route Registration
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/fsm', fsmRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/flat', flatRoutes);

// Serve built frontend static files in production if available
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Express 5 compatible catch-all route for SPA navigation
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile('index.html', { root: frontendDist });
    }
    next();
  });
} else {
  // Fallback root route if frontend is not built
  app.get('/', (req, res) => {
    res.json({
      message: 'TCP Connection Failure Analysis System API is running.',
      rollNumber: 104,
      healthEndpoint: '/api/health',
      dashboardEndpoint: '/api/dashboard/stats',
      docs: 'Start frontend dev server or build frontend via npm run build.'
    });
  });
}

// Centralized Error Handling Middleware
app.use(errorHandler);

// Connect to Database and Start Server
let server;

const startServer = async () => {
  // Attempt DB Connection
  await connectDB();
  await storage.checkAndSeedMongoDB();

  server = app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`TCP Connection Failure Analysis System Running`);
    console.log(`Unified App URL: http://localhost:${PORT}`);
    console.log(`Roll Number: 104 | Courses: FSWD, CN, FLAT`);
    console.log(`Database Status: ${getDbStatus().connected ? 'Connected to MongoDB' : 'Fallback Resilient Memory Mode'}`);
    console.log(`========================================================`);
  });
};

// Catch unhandled rejections to prevent silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Start if not imported as module in test runner
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
