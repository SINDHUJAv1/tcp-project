const mongoose = require('mongoose');

const SecurityAlertSchema = new mongoose.Schema(
  {
    alertType: {
      type: String,
      required: true,
      enum: [
        'REPEATED_CONNECTION_FAILURE',
        'CONNECTION_TIMEOUT_BURST',
        'UNEXPECTED_STATE_TRANSITION',
        'HIGH_RETRANSMISSION_ANOMALY',
        'SUSPICIOUS_PORT_PROBE'
      ]
    },
    hostname: {
      type: String,
      required: true
    },
    port: {
      type: Number,
      required: true
    },
    consecutiveFailures: {
      type: Number,
      default: 1
    },
    failureReasons: [
      {
        type: String
      }
    ],
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE'
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    triggerConnectionId: {
      type: String,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SecurityAlert', SecurityAlertSchema);
