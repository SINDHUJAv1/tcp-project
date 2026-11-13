const storage = require('../models/storage');
const failureDetector = require('../engine/failureDetector');

/**
 * Create a new connection attempt manually or via client test
 */
const createConnection = async (req, res, next) => {
  try {
    const { hostname, port } = req.validatedData;
    const {
      status = 'SUCCESS',
      initialState = 'Closed',
      currentState = 'Established',
      finalState = 'Established',
      failureReason = 'None',
      latencyMs = 25,
      packetLossRate = 0,
      bytesSent = 120,
      bytesReceived = 450,
      scenario = 'MANUAL_TEST',
      notes = ''
    } = req.body;

    const newAttempt = await storage.connections.create({
      hostname,
      ipAddress: req.body.ipAddress || '127.0.0.1',
      port,
      protocol: 'TCP',
      status,
      initialState,
      currentState,
      finalState,
      failureReason: status === 'SUCCESS' ? 'None' : failureReason,
      latencyMs: Number(latencyMs) || 0,
      packetLossRate: Number(packetLossRate) || 0,
      bytesSent: Number(bytesSent) || 0,
      bytesReceived: Number(bytesReceived) || 0,
      scenario,
      notes
    });

    // Record with failure detector
    await failureDetector.recordAttempt(newAttempt);

    // Record network event
    await storage.events.create({
      connectionId: newAttempt._id,
      eventType: status === 'SUCCESS' ? 'HANDSHAKE_ACK' : (status === 'TIMEOUT' ? 'TIMEOUT_EVENT' : 'RST_PACKET_RECEIVED'),
      source: 'CLIENT',
      hostname,
      port,
      severity: status === 'SUCCESS' ? 'INFO' : 'ERROR',
      description: `Manual Connection Record Created: ${status} on ${hostname}:${port}`
    });

    res.status(201).json({
      success: true,
      data: newAttempt,
      message: 'Connection attempt record successfully created.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all connection attempts with filtering, searching, and pagination
 */
const getAllConnections = async (req, res, next) => {
  try {
    const {
      status,
      search,
      port,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && ['SUCCESS', 'FAILED', 'TIMEOUT'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      filter.hostname = { $regex: search.trim(), $options: 'i' };
    }

    if (port && !isNaN(Number(port))) {
      filter.port = Number(port);
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const [total, connections] = await Promise.all([
      storage.connections.countDocuments(filter),
      storage.connections.find(filter, {
        sort: sortOptions,
        skip,
        limit: limitNum
      })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      success: true,
      data: connections,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get connection attempt by ID
 */
const getConnectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const connection = await storage.connections.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: `Connection record with ID '${id}' not found.`
      });
    }

    // Also get related network events
    const relatedEvents = await storage.events.find({ connectionId: id });

    res.status(200).json({
      success: true,
      data: {
        ...connection,
        events: relatedEvents
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update connection attempt (Edit / Annotate)
 */
const updateConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, status, failureReason, port, hostname } = req.body;

    const existing = await storage.connections.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Connection record with ID '${id}' not found.`
      });
    }

    const updates = {};
    if (notes !== undefined) updates.notes = notes;
    if (status && ['SUCCESS', 'FAILED', 'TIMEOUT'].includes(status)) updates.status = status;
    if (failureReason !== undefined) updates.failureReason = failureReason;
    if (port) updates.port = Number(port);
    if (hostname) updates.hostname = hostname.trim();

    const updated = await storage.connections.findByIdAndUpdate(id, updates);

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Connection record successfully updated.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete connection attempt
 */
const deleteConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await storage.connections.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Connection record with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      message: `Connection record '${id}' was permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createConnection,
  getAllConnections,
  getConnectionById,
  updateConnection,
  deleteConnection
};
