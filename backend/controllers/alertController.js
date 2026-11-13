const storage = require('../models/storage');

const getAllAlerts = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const alerts = await storage.alerts.find(filter, {
      sort: { createdAt: -1 },
      limit: parseInt(limit, 10)
    });

    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
};

const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alerts = await storage.alerts.find({});
    const alert = alerts.find(a => String(a._id) === String(id));

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `Alert '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};

const acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await storage.alerts.findByIdAndUpdate(id, {
      status: 'ACKNOWLEDGED'
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Alert '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Alert acknowledged.'
    });
  } catch (err) {
    next(err);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await storage.alerts.findByIdAndUpdate(id, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Alert '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Alert marked as resolved.'
    });
  } catch (err) {
    next(err);
  }
};

const clearAlerts = async (req, res, next) => {
  try {
    await storage.alerts.clearAll();
    res.status(200).json({
      success: true,
      message: 'All security alerts cleared.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  clearAlerts
};
