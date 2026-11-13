const mongoose = require('mongoose');

const ConnectionAttemptSchema = new mongoose.Schema(
  {
    hostname: {
      type: String,
      required: true,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '127.0.0.1'
    },
    port: {
      type: Number,
      required: true,
      min: 1,
      max: 65535
    },
    protocol: {
      type: String,
      default: 'TCP'
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'TIMEOUT'],
      required: true
    },
    initialState: {
      type: String,
      default: 'Closed'
    },
    currentState: {
      type: String,
      default: 'Established'
    },
    finalState: {
      type: String,
      required: true
    },
    failureReason: {
      type: String,
      default: 'None'
    },
    latencyMs: {
      type: Number,
      default: 0
    },
    packetLossRate: {
      type: Number,
      default: 0
    },
    bytesSent: {
      type: Number,
      default: 0
    },
    bytesReceived: {
      type: Number,
      default: 0
    },
    scenario: {
      type: String,
      default: 'NORMAL_HANDSHAKE'
    },
    handshakeDetails: {
      synSent: { type: Boolean, default: true },
      synAckReceived: { type: Boolean, default: false },
      ackSent: { type: Boolean, default: false },
      durationMs: { type: Number, default: 0 },
      clientSeq: { type: Number, default: 1000 },
      serverSeq: { type: Number, default: 5000 }
    },
    rttHistory: [{ type: Number }],
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ConnectionAttempt', ConnectionAttemptSchema);
