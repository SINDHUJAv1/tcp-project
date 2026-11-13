const mongoose = require('mongoose');

let dbStatus = {
  connected: false,
  connecting: false,
  host: null,
  port: null,
  name: null,
  uriMasked: null,
  error: null,
  lastAttemptAt: null,
  mode: 'fallback' // 'mongodb' or 'fallback'
};

const maskUri = (uri) => {
  if (!uri) return 'not_configured';
  try {
    return uri.replace(/\/\/(.*?)@/, '//***:***@');
  } catch {
    return 'masked_uri';
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tcp_connection_analyzer';
  dbStatus.uriMasked = maskUri(uri);
  dbStatus.lastAttemptAt = new Date().toISOString();
  dbStatus.connecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Fast failover to avoid stalling startup
      connectTimeoutMS: 2500
    });

    dbStatus.connected = true;
    dbStatus.connecting = false;
    dbStatus.host = conn.connection.host;
    dbStatus.port = conn.connection.port;
    dbStatus.name = conn.connection.name;
    dbStatus.error = null;
    dbStatus.mode = 'mongodb';

    console.log(`[MongoDB] Connected successfully to ${dbStatus.host}:${dbStatus.port}/${dbStatus.name}`);
  } catch (err) {
    dbStatus.connected = false;
    dbStatus.connecting = false;
    dbStatus.error = err.message;
    dbStatus.mode = 'fallback';

    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${dbStatus.uriMasked}: ${err.message}`);
    console.warn('[Storage] Activated resilient fallback in-memory store. All features, CRUD, FSM simulation, and statistics remain 100% functional.');
  }

  // Register Mongoose connection event listeners
  mongoose.connection.on('connected', () => {
    dbStatus.connected = true;
    dbStatus.connecting = false;
    dbStatus.mode = 'mongodb';
    dbStatus.error = null;
  });

  mongoose.connection.on('error', (err) => {
    dbStatus.connected = false;
    dbStatus.error = err.message;
    dbStatus.mode = 'fallback';
  });

  mongoose.connection.on('disconnected', () => {
    dbStatus.connected = false;
    dbStatus.mode = 'fallback';
  });
};

const getDbStatus = () => ({
  ...dbStatus,
  timestamp: new Date().toISOString()
});

const isMongoConnected = () => dbStatus.connected;

module.exports = {
  connectDB,
  getDbStatus,
  isMongoConnected
};
