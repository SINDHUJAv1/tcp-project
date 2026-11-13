const storage = require('../models/storage');

const getAllEvents = async (req, res, next) => {
  try {
    const { eventType, severity, connectionId, limit = 50 } = req.query;
    const filter = {};
    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity.toUpperCase();
    if (connectionId) filter.connectionId = connectionId;

    const events = await storage.events.find(filter, {
      sort: { timestamp: -1 },
      limit: parseInt(limit, 10)
    });

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (err) {
    next(err);
  }
};

const createManualEvent = async (req, res, next) => {
  try {
    const {
      eventType = 'MANUAL_SIMULATION_EVENT',
      source = 'CLIENT',
      hostname,
      port,
      flag = '[ACK]',
      severity = 'INFO',
      description
    } = req.body;

    if (!hostname || !port || !description) {
      return res.status(400).json({
        success: false,
        error: 'Hostname, port, and description are required.'
      });
    }

    const newEvent = await storage.events.create({
      eventType,
      source,
      hostname,
      port: Number(port),
      flag,
      severity,
      description
    });

    res.status(201).json({
      success: true,
      data: newEvent,
      message: 'Network event recorded.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllEvents,
  createManualEvent
};
