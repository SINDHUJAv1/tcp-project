const express = require('express');
const router = express.Router();
const { getDbStatus } = require('../config/db');

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    project: 'TCP Connection Failure Analysis System',
    rollNumber: 104,
    subjects: ['22ITT51-FSWD', '22ITT52-CN', '22ITT53-FLAT'],
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    database: getDbStatus()
  });
});

module.exports = router;
