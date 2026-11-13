const { isMongoConnected } = require('../config/db');
const ConnectionAttempt = require('./ConnectionAttempt');
const NetworkEvent = require('./NetworkEvent');
const SecurityAlert = require('./SecurityAlert');

// Fallback in-memory database store
const memoryStore = {
  connections: [],
  events: [],
  alerts: []
};

// Seed initial realistic records so the system opens with meaningful data if DB is empty
const seedInitialData = () => {
  const now = Date.now();
  const sampleConnections = [
    {
      _id: 'conn_demo_101',
      hostname: 'api.velalar.edu',
      ipAddress: '192.168.10.45',
      port: 443,
      protocol: 'TCP',
      status: 'SUCCESS',
      initialState: 'Closed',
      currentState: 'Terminated',
      finalState: 'Terminated',
      failureReason: 'None',
      latencyMs: 28,
      packetLossRate: 0,
      bytesSent: 1420,
      bytesReceived: 4580,
      scenario: 'NORMAL_HANDSHAKE',
      handshakeDetails: {
        synSent: true,
        synAckReceived: true,
        ackSent: true,
        durationMs: 24,
        clientSeq: 1000,
        serverSeq: 5000
      },
      rttHistory: [25, 28, 26, 30],
      notes: 'Standard HTTPS 3-way handshake established and closed cleanly',
      createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 35).toISOString()
    },
    {
      _id: 'conn_demo_102',
      hostname: 'db.internal.local',
      ipAddress: '10.0.0.12',
      port: 27017,
      protocol: 'TCP',
      status: 'FAILED',
      initialState: 'Closed',
      currentState: 'Failed',
      finalState: 'Failed',
      failureReason: 'ECONNREFUSED - Server rejected connection with TCP RST',
      latencyMs: 4,
      packetLossRate: 0,
      bytesSent: 64,
      bytesReceived: 40,
      scenario: 'CONNECTION_REFUSED',
      handshakeDetails: {
        synSent: true,
        synAckReceived: false,
        ackSent: false,
        durationMs: 4,
        clientSeq: 1042,
        serverSeq: 0
      },
      rttHistory: [4],
      notes: 'Port 27017 closed on target host; RST flag received',
      createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 25).toISOString()
    },
    {
      _id: 'conn_demo_103',
      hostname: 'cloud-gateway.net',
      ipAddress: '198.51.100.89',
      port: 8080,
      protocol: 'TCP',
      status: 'TIMEOUT',
      initialState: 'Closed',
      currentState: 'Timeout',
      finalState: 'Timeout',
      failureReason: 'ETIMEDOUT - No SYN-ACK received after 3 retransmissions (RTO expired)',
      latencyMs: 3000,
      packetLossRate: 100,
      bytesSent: 192,
      bytesReceived: 0,
      scenario: 'TIMEOUT_DROP',
      handshakeDetails: {
        synSent: true,
        synAckReceived: false,
        ackSent: false,
        durationMs: 3000,
        clientSeq: 2011,
        serverSeq: 0
      },
      rttHistory: [1000, 2000, 3000],
      notes: 'Blackhole packet drop detected, SYN retransmissions unacknowledged',
      createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 18).toISOString()
    },
    {
      _id: 'conn_demo_104',
      hostname: 'auth.service.io',
      ipAddress: '172.16.4.22',
      port: 8443,
      protocol: 'TCP',
      status: 'SUCCESS',
      initialState: 'Closed',
      currentState: 'Established',
      finalState: 'Established',
      failureReason: 'None',
      latencyMs: 45,
      packetLossRate: 0,
      bytesSent: 3200,
      bytesReceived: 8192,
      scenario: 'NORMAL_HANDSHAKE',
      handshakeDetails: {
        synSent: true,
        synAckReceived: true,
        ackSent: true,
        durationMs: 38,
        clientSeq: 3001,
        serverSeq: 8001
      },
      rttHistory: [42, 45, 43],
      notes: 'Active connection streaming telemetry data',
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 10).toISOString()
    },
    {
      _id: 'conn_demo_105',
      hostname: 'db.internal.local',
      ipAddress: '10.0.0.12',
      port: 27017,
      protocol: 'TCP',
      status: 'FAILED',
      initialState: 'Closed',
      currentState: 'Failed',
      finalState: 'Failed',
      failureReason: 'ECONNREFUSED - Server rejected connection with TCP RST',
      latencyMs: 5,
      packetLossRate: 0,
      bytesSent: 64,
      bytesReceived: 40,
      scenario: 'CONNECTION_REFUSED',
      handshakeDetails: {
        synSent: true,
        synAckReceived: false,
        ackSent: false,
        durationMs: 5,
        clientSeq: 1043,
        serverSeq: 0
      },
      rttHistory: [5],
      notes: 'Repeated attempt on closed DB port',
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 5).toISOString()
    },
    {
      _id: 'conn_demo_106',
      hostname: 'db.internal.local',
      ipAddress: '10.0.0.12',
      port: 27017,
      protocol: 'TCP',
      status: 'FAILED',
      initialState: 'Closed',
      currentState: 'Failed',
      finalState: 'Failed',
      failureReason: 'ECONNREFUSED - Consecutive failure threshold exceeded (3rd attempt)',
      latencyMs: 3,
      packetLossRate: 0,
      bytesSent: 64,
      bytesReceived: 40,
      scenario: 'CONNECTION_REFUSED',
      handshakeDetails: {
        synSent: true,
        synAckReceived: false,
        ackSent: false,
        durationMs: 3,
        clientSeq: 1044,
        serverSeq: 0
      },
      rttHistory: [3],
      notes: 'Repeated attempt triggered EventEmitter Security Alert',
      createdAt: new Date(now - 1000 * 60 * 1).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 1).toISOString()
    }
  ];

  const sampleEvents = [
    {
      _id: 'evt_1',
      connectionId: 'conn_demo_101',
      eventType: 'HANDSHAKE_SYN',
      source: 'CLIENT',
      hostname: 'api.velalar.edu',
      port: 443,
      sequenceNumber: 1000,
      ackNumber: 0,
      flag: '[SYN]',
      payloadSize: 0,
      severity: 'INFO',
      description: 'Client initiated TCP 3-way handshake with SYN segment',
      timestamp: new Date(now - 1000 * 60 * 35).toISOString()
    },
    {
      _id: 'evt_2',
      connectionId: 'conn_demo_101',
      eventType: 'HANDSHAKE_SYN_ACK',
      source: 'SERVER',
      hostname: 'api.velalar.edu',
      port: 443,
      sequenceNumber: 5000,
      ackNumber: 1001,
      flag: '[SYN, ACK]',
      payloadSize: 0,
      severity: 'INFO',
      description: 'Remote host responded with SYN-ACK acknowledging client ISN',
      timestamp: new Date(now - 1000 * 60 * 35 + 15).toISOString()
    },
    {
      _id: 'evt_3',
      connectionId: 'conn_demo_101',
      eventType: 'HANDSHAKE_ACK',
      source: 'CLIENT',
      hostname: 'api.velalar.edu',
      port: 443,
      sequenceNumber: 1001,
      ackNumber: 5001,
      flag: '[ACK]',
      payloadSize: 0,
      severity: 'INFO',
      description: 'Handshake complete: State transitioned to ESTABLISHED',
      timestamp: new Date(now - 1000 * 60 * 35 + 24).toISOString()
    },
    {
      _id: 'evt_4',
      connectionId: 'conn_demo_102',
      eventType: 'RST_PACKET_RECEIVED',
      source: 'SERVER',
      hostname: 'db.internal.local',
      port: 27017,
      sequenceNumber: 0,
      ackNumber: 1043,
      flag: '[RST, ACK]',
      payloadSize: 0,
      severity: 'ERROR',
      description: 'Connection actively refused by host operating system (Port not listening)',
      timestamp: new Date(now - 1000 * 60 * 25).toISOString()
    },
    {
      _id: 'evt_5',
      connectionId: 'conn_demo_103',
      eventType: 'TIMEOUT_EVENT',
      source: 'NETWORK',
      hostname: 'cloud-gateway.net',
      port: 8080,
      sequenceNumber: 2011,
      ackNumber: 0,
      flag: '[SYN]',
      payloadSize: 64,
      severity: 'WARNING',
      description: 'Retransmission Timeout (RTO) reached: Server dropped SYN packet',
      timestamp: new Date(now - 1000 * 60 * 18).toISOString()
    },
    {
      _id: 'evt_6',
      connectionId: 'conn_demo_106',
      eventType: 'REPEATED_FAILURE_DETECTED',
      source: 'DETECTOR',
      hostname: 'db.internal.local',
      port: 27017,
      sequenceNumber: 0,
      ackNumber: 0,
      flag: '[ALERT]',
      payloadSize: 0,
      severity: 'CRITICAL',
      description: 'EventEmitter detected 3 consecutive failed connection attempts within 60s',
      timestamp: new Date(now - 1000 * 60 * 1).toISOString()
    }
  ];

  const sampleAlerts = [
    {
      _id: 'alert_1',
      alertType: 'REPEATED_CONNECTION_FAILURE',
      hostname: 'db.internal.local',
      port: 27017,
      consecutiveFailures: 3,
      failureReasons: [
        'ECONNREFUSED - Server rejected connection with TCP RST',
        'ECONNREFUSED - Server rejected connection with TCP RST',
        'ECONNREFUSED - Consecutive failure threshold exceeded (3rd attempt)'
      ],
      severity: 'HIGH',
      status: 'ACTIVE',
      message: 'Repeated TCP connection failure detected for db.internal.local:27017 (3 consecutive failed handshakes)',
      details: {
        firstFailedAt: new Date(now - 1000 * 60 * 25).toISOString(),
        lastFailedAt: new Date(now - 1000 * 60 * 1).toISOString(),
        detectedBy: 'Node.js EventEmitter FailureDetector',
        threshold: 3
      },
      triggerConnectionId: 'conn_demo_106',
      createdAt: new Date(now - 1000 * 60 * 1).toISOString()
    }
  ];

  memoryStore.connections = sampleConnections;
  memoryStore.events = sampleEvents;
  memoryStore.alerts = sampleAlerts;
};

seedInitialData();

// Seed MongoDB if it's connected and empty
const checkAndSeedMongoDB = async () => {
  if (!isMongoConnected()) return;
  try {
    const count = await ConnectionAttempt.countDocuments();
    if (count === 0) {
      console.log('[MongoDB] Populating initial demo connection records into MongoDB collections...');
      // Strip _id to let MongoDB generate ObjectIds, or keep as string if desired
      const conns = memoryStore.connections.map(c => {
        const { _id, ...rest } = c;
        return rest;
      });
      const evts = memoryStore.events.map(e => {
        const { _id, ...rest } = e;
        return rest;
      });
      const alts = memoryStore.alerts.map(a => {
        const { _id, ...rest } = a;
        return rest;
      });

      await ConnectionAttempt.insertMany(conns);
      await NetworkEvent.insertMany(evts);
      await SecurityAlert.insertMany(alts);
      console.log('[MongoDB] Demo collections successfully seeded in MongoDB.');
    }
  } catch (err) {
    console.warn('[MongoDB] Seed check skipped:', err.message);
  }
};

// Unified Data Access Interface
const storage = {
  // Connections
  connections: {
    async create(data) {
      if (isMongoConnected()) {
        try {
          const doc = await ConnectionAttempt.create(data);
          return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback save due to Mongo error:', e.message);
        }
      }
      const newDoc = {
        _id: 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memoryStore.connections.unshift(newDoc);
      return newDoc;
    },

    async find(filter = {}, options = {}) {
      if (isMongoConnected()) {
        try {
          let query = ConnectionAttempt.find(filter);
          if (options.sort) query = query.sort(options.sort);
          if (options.skip) query = query.skip(options.skip);
          if (options.limit) query = query.limit(options.limit);
          const docs = await query.exec();
          return docs.map(d => d.toObject());
        } catch (e) {
          console.warn('[Storage] Fallback find due to Mongo error:', e.message);
        }
      }

      let results = [...memoryStore.connections];
      if (filter.status) {
        results = results.filter(c => c.status === filter.status);
      }
      if (filter.hostname) {
        if (filter.hostname.$regex) {
          const reg = new RegExp(filter.hostname.$regex, filter.hostname.$options || 'i');
          results = results.filter(c => reg.test(c.hostname));
        } else {
          results = results.filter(c => c.hostname === filter.hostname);
        }
      }
      if (filter.port) {
        results = results.filter(c => c.port === Number(filter.port));
      }

      // Sort
      if (options.sort) {
        const [sortKey, sortDir] = Object.entries(options.sort)[0] || ['createdAt', -1];
        results.sort((a, b) => {
          const va = new Date(a[sortKey] || 0).getTime();
          const vb = new Date(b[sortKey] || 0).getTime();
          return sortDir === -1 ? vb - va : va - vb;
        });
      }

      const skip = options.skip || 0;
      const limit = options.limit || results.length;
      return results.slice(skip, skip + limit);
    },

    async countDocuments(filter = {}) {
      if (isMongoConnected()) {
        try {
          return await ConnectionAttempt.countDocuments(filter);
        } catch (e) {
          console.warn('[Storage] Fallback count due to Mongo error:', e.message);
        }
      }

      let results = [...memoryStore.connections];
      if (filter.status) {
        results = results.filter(c => c.status === filter.status);
      }
      if (filter.hostname) {
        if (filter.hostname.$regex) {
          const reg = new RegExp(filter.hostname.$regex, filter.hostname.$options || 'i');
          results = results.filter(c => reg.test(c.hostname));
        } else {
          results = results.filter(c => c.hostname === filter.hostname);
        }
      }
      return results.length;
    },

    async findById(id) {
      if (isMongoConnected()) {
        try {
          const doc = await ConnectionAttempt.findById(id);
          if (doc) return doc.toObject();
        } catch (e) {
          // May be custom string id in fallback
        }
      }
      return memoryStore.connections.find(c => String(c._id) === String(id)) || null;
    },

    async findByIdAndUpdate(id, updates) {
      if (isMongoConnected()) {
        try {
          const doc = await ConnectionAttempt.findByIdAndUpdate(id, updates, { new: true });
          if (doc) return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback update due to Mongo error:', e.message);
        }
      }
      const idx = memoryStore.connections.findIndex(c => String(c._id) === String(id));
      if (idx !== -1) {
        memoryStore.connections[idx] = {
          ...memoryStore.connections[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return memoryStore.connections[idx];
      }
      return null;
    },

    async findByIdAndDelete(id) {
      if (isMongoConnected()) {
        try {
          const doc = await ConnectionAttempt.findByIdAndDelete(id);
          if (doc) return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback delete due to Mongo error:', e.message);
        }
      }
      const idx = memoryStore.connections.findIndex(c => String(c._id) === String(id));
      if (idx !== -1) {
        const deleted = memoryStore.connections.splice(idx, 1)[0];
        return deleted;
      }
      return null;
    }
  },

  // Events
  events: {
    async create(data) {
      if (isMongoConnected()) {
        try {
          const doc = await NetworkEvent.create(data);
          return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback event save:', e.message);
        }
      }
      const newDoc = {
        _id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      memoryStore.events.unshift(newDoc);
      if (memoryStore.events.length > 500) memoryStore.events.pop();
      return newDoc;
    },

    async find(filter = {}, options = {}) {
      if (isMongoConnected()) {
        try {
          let query = NetworkEvent.find(filter);
          if (options.sort) query = query.sort(options.sort);
          if (options.limit) query = query.limit(options.limit);
          const docs = await query.exec();
          return docs.map(d => d.toObject());
        } catch (e) {
          console.warn('[Storage] Fallback events find:', e.message);
        }
      }
      let results = [...memoryStore.events];
      if (filter.eventType) {
        results = results.filter(e => e.eventType === filter.eventType);
      }
      if (filter.severity) {
        results = results.filter(e => e.severity === filter.severity);
      }
      if (filter.connectionId) {
        results = results.filter(e => String(e.connectionId) === String(filter.connectionId));
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      return results;
    }
  },

  // Alerts
  alerts: {
    async create(data) {
      if (isMongoConnected()) {
        try {
          const doc = await SecurityAlert.create(data);
          return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback alert save:', e.message);
        }
      }
      const newDoc = {
        _id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        status: 'ACTIVE',
        ...data,
        createdAt: new Date().toISOString()
      };
      memoryStore.alerts.unshift(newDoc);
      return newDoc;
    },

    async find(filter = {}, options = {}) {
      if (isMongoConnected()) {
        try {
          let query = SecurityAlert.find(filter);
          if (options.sort) query = query.sort(options.sort);
          if (options.limit) query = query.limit(options.limit);
          const docs = await query.exec();
          return docs.map(d => d.toObject());
        } catch (e) {
          console.warn('[Storage] Fallback alert find:', e.message);
        }
      }
      let results = [...memoryStore.alerts];
      if (filter.status) {
        results = results.filter(a => a.status === filter.status);
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      return results;
    },

    async findByIdAndUpdate(id, updates) {
      if (isMongoConnected()) {
        try {
          const doc = await SecurityAlert.findByIdAndUpdate(id, updates, { new: true });
          if (doc) return doc.toObject();
        } catch (e) {
          console.warn('[Storage] Fallback alert update:', e.message);
        }
      }
      const idx = memoryStore.alerts.findIndex(a => String(a._id) === String(id));
      if (idx !== -1) {
        memoryStore.alerts[idx] = {
          ...memoryStore.alerts[idx],
          ...updates
        };
        return memoryStore.alerts[idx];
      }
      return null;
    },

    async clearAll() {
      if (isMongoConnected()) {
        try {
          await SecurityAlert.deleteMany({});
        } catch (e) {}
      }
      memoryStore.alerts = [];
      return true;
    }
  },

  checkAndSeedMongoDB
};

module.exports = storage;
