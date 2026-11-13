const storage = require('../models/storage');
const { getDbStatus } = require('../config/db');

const getDashboardStats = async (req, res, next) => {
  try {
    const [allConnections, recentEvents, activeAlerts] = await Promise.all([
      storage.connections.find({}, { sort: { createdAt: -1 } }),
      storage.events.find({}, { sort: { timestamp: -1 }, limit: 10 }),
      storage.alerts.find({ status: 'ACTIVE' }, { sort: { createdAt: -1 }, limit: 10 })
    ]);

    const totalAttempts = allConnections.length;
    const successfulConnections = allConnections.filter(c => c.status === 'SUCCESS').length;
    const failedConnections = allConnections.filter(c => c.status === 'FAILED').length;
    const timeoutConnections = allConnections.filter(c => c.status === 'TIMEOUT').length;

    const successRate = totalAttempts > 0 ? Number(((successfulConnections / totalAttempts) * 100).toFixed(1)) : 0;
    const failureRate = totalAttempts > 0 ? Number((((failedConnections + timeoutConnections) / totalAttempts) * 100).toFixed(1)) : 0;

    // Latency calculations
    const validLatencies = allConnections.map(c => c.latencyMs).filter(l => typeof l === 'number' && l >= 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 0;

    // Failure reasons breakdown
    const failureReasonMap = {};
    allConnections
      .filter(c => c.status !== 'SUCCESS' && c.failureReason && c.failureReason !== 'None')
      .forEach(c => {
        let key = c.failureReason;
        if (key.includes('ECONNREFUSED')) key = 'Port Closed (ECONNREFUSED)';
        else if (key.includes('ETIMEDOUT')) key = 'Timeout Drop (ETIMEDOUT)';
        else if (key.includes('EHOSTUNREACH')) key = 'Host Unreachable';
        else key = 'Protocol / Other Error';

        failureReasonMap[key] = (failureReasonMap[key] || 0) + 1;
      });

    const failureBreakdown = Object.entries(failureReasonMap).map(([reason, count]) => ({
      reason,
      count
    }));

    // Status distribution for PieChart
    const statusDistribution = [
      { name: 'Successful', count: successfulConnections, color: '#10B981' },
      { name: 'Failed', count: failedConnections, color: '#EF4444' },
      { name: 'Timeout', count: timeoutConnections, color: '#F59E0B' }
    ];

    // Timeline data for Line / Bar charts
    const timelineData = allConnections.slice(0, 15).reverse().map((c, index) => ({
      index: index + 1,
      target: `${c.hostname}:${c.port}`,
      latency: c.latencyMs || 0,
      status: c.status,
      timestamp: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }));

    // Recent 5 connections
    const recentConnections = allConnections.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalAttempts,
          successfulConnections,
          failedConnections,
          timeoutConnections,
          successRate,
          failureRate,
          avgLatency
        },
        statusDistribution,
        failureBreakdown,
        timelineData,
        recentConnections,
        recentEvents,
        activeAlerts,
        dbStatus: getDbStatus()
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats
};
