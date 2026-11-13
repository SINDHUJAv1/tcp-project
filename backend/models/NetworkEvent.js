const mongoose = require('mongoose');

const NetworkEventSchema = new mongoose.Schema(
  {
    connectionId: {
      type: String,
      default: null
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'HANDSHAKE_SYN',
        'HANDSHAKE_SYN_ACK',
        'HANDSHAKE_ACK',
        'DATA_TRANSFER',
        'DATA_ACK',
        'FIN_SENT',
        'FIN_ACK_RECEIVED',
        'CONNECTION_TERMINATED',
        'TIMEOUT_EVENT',
        'PACKET_RETRANSMISSION',
        'RST_PACKET_RECEIVED',
        'STATE_TRANSITION',
        'REPEATED_FAILURE_DETECTED',
        'ALERT_GENERATED',
        'MANUAL_SIMULATION_EVENT',
        'PACKET_CORRUPTION',
        'CHECKSUM_MISMATCH',
        'CHECKSUM_VALIDATED',
        'ZERO_WINDOW',
        'ZERO_WINDOW_PROBE',
        'WINDOW_UPDATE'
      ]
    },
    source: {
      type: String,
      enum: ['CLIENT', 'SERVER', 'NETWORK', 'FSM_ENGINE', 'DETECTOR'],
      default: 'CLIENT'
    },
    hostname: {
      type: String,
      required: true
    },
    port: {
      type: Number,
      required: true
    },
    sequenceNumber: {
      type: Number,
      default: 0
    },
    ackNumber: {
      type: Number,
      default: 0
    },
    flag: {
      type: String,
      default: '[ACK]'
    },
    payloadSize: {
      type: Number,
      default: 0
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      default: 'INFO'
    },
    description: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('NetworkEvent', NetworkEventSchema);
