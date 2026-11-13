const EventEmitter = require('events');
const storage = require('../models/storage');

class FailureAnalysisEngine extends EventEmitter {
  constructor() {
    super();
    this.failureWindowMap = new Map(); // key: "hostname:port" -> [ { timestamp, reason, connectionId } ]
    this.threshold = parseInt(process.env.CONSECUTIVE_FAILURE_THRESHOLD || '3', 10);
    this.windowMs = parseInt(process.env.FAILURE_WINDOW_MS || '60000', 10);

    // Register internal listeners to demonstrate Node.js event-driven architecture (CO4)
    this.on('connection:failed', this.handleConnectionFailure.bind(this));
    this.on('connection:timeout', this.handleConnectionTimeout.bind(this));
    this.on('connection:success', this.handleConnectionSuccess.bind(this));
    this.on('fsm:invalid_transition', this.handleInvalidTransition.bind(this));
    this.on('alert:trigger', this.handleAlertTrigger.bind(this));
  }

  getKey(hostname, port) {
    return `${hostname.toLowerCase().trim()}:${port}`;
  }

  cleanOldFailures(key) {
    const now = Date.now();
    const list = this.failureWindowMap.get(key) || [];
    const valid = list.filter(item => now - item.timestamp < this.windowMs);
    this.failureWindowMap.set(key, valid);
    return valid;
  }

  /**
   * Main entry point to record and evaluate a connection attempt
   */
  async recordAttempt(attempt) {
    const { hostname, port, status, failureReason, _id } = attempt;
    const eventPayload = {
      hostname,
      port,
      status,
      failureReason,
      connectionId: _id,
      timestamp: Date.now()
    };

    if (status === 'SUCCESS') {
      this.emit('connection:success', eventPayload);
    } else if (status === 'TIMEOUT') {
      this.emit('connection:timeout', eventPayload);
    } else {
      this.emit('connection:failed', eventPayload);
    }
  }

  handleConnectionSuccess(payload) {
    const key = this.getKey(payload.hostname, payload.port);
    // Reset consecutive failure streak on recovery
    this.failureWindowMap.delete(key);
  }

  async handleConnectionFailure(payload) {
    const key = this.getKey(payload.hostname, payload.port);
    const existing = this.cleanOldFailures(key);
    existing.push({
      timestamp: payload.timestamp,
      reason: payload.failureReason || 'Connection refused or dropped',
      connectionId: payload.connectionId
    });
    this.failureWindowMap.set(key, existing);

    if (existing.length >= this.threshold) {
      this.emit('alert:trigger', {
        type: 'REPEATED_CONNECTION_FAILURE',
        hostname: payload.hostname,
        port: payload.port,
        consecutiveFailures: existing.length,
        failureReasons: existing.map(e => e.reason),
        triggerConnectionId: payload.connectionId,
        severity: existing.length >= 5 ? 'CRITICAL' : 'HIGH'
      });
    }
  }

  async handleConnectionTimeout(payload) {
    const key = this.getKey(payload.hostname, payload.port);
    const existing = this.cleanOldFailures(key);
    existing.push({
      timestamp: payload.timestamp,
      reason: payload.failureReason || 'Retransmission timeout (ETIMEDOUT)',
      connectionId: payload.connectionId
    });
    this.failureWindowMap.set(key, existing);

    if (existing.length >= this.threshold) {
      this.emit('alert:trigger', {
        type: 'CONNECTION_TIMEOUT_BURST',
        hostname: payload.hostname,
        port: payload.port,
        consecutiveFailures: existing.length,
        failureReasons: existing.map(e => e.reason),
        triggerConnectionId: payload.connectionId,
        severity: 'HIGH'
      });
    }
  }

  async handleInvalidTransition(payload) {
    const alertData = {
      alertType: 'UNEXPECTED_STATE_TRANSITION',
      hostname: payload.hostname || 'simulator.local',
      port: payload.port || 80,
      consecutiveFailures: 1,
      failureReasons: [payload.error],
      severity: 'MEDIUM',
      status: 'ACTIVE',
      message: `Protocol violation: Attempted invalid transition from '${payload.fromState}' with input '${payload.event}'.`,
      details: {
        fromState: payload.fromState,
        attemptedEvent: payload.event,
        allowedEvents: payload.allowedEvents,
        timestamp: new Date().toISOString()
      }
    };

    const savedAlert = await storage.alerts.create(alertData);

    await storage.events.create({
      eventType: 'STATE_TRANSITION',
      source: 'FSM_ENGINE',
      hostname: alertData.hostname,
      port: alertData.port,
      severity: 'WARNING',
      description: `Rejected invalid transition: ${payload.fromState} + ${payload.event}. ${payload.error}`
    });

    this.emit('alert:generated', savedAlert);
  }

  async handleAlertTrigger(alertMeta) {
    const alertDoc = {
      alertType: alertMeta.type,
      hostname: alertMeta.hostname,
      port: alertMeta.port,
      consecutiveFailures: alertMeta.consecutiveFailures,
      failureReasons: alertMeta.failureReasons,
      severity: alertMeta.severity,
      status: 'ACTIVE',
      message: `Repeated TCP failure detected on ${alertMeta.hostname}:${alertMeta.port} (${alertMeta.consecutiveFailures} failures in ${Math.round(this.windowMs / 1000)}s window).`,
      details: {
        threshold: this.threshold,
        windowSeconds: Math.round(this.windowMs / 1000),
        detectedAt: new Date().toISOString(),
        engine: 'Node.js EventEmitter + Sliding Window'
      },
      triggerConnectionId: alertMeta.triggerConnectionId
    };

    const savedAlert = await storage.alerts.create(alertDoc);

    // Also record a critical network event
    await storage.events.create({
      connectionId: alertMeta.triggerConnectionId,
      eventType: 'ALERT_GENERATED',
      source: 'DETECTOR',
      hostname: alertMeta.hostname,
      port: alertMeta.port,
      severity: 'CRITICAL',
      description: `Security Alert Generated: ${alertDoc.message}`
    });

    this.emit('alert:generated', savedAlert);
    console.log(`[EventEmitter] Alert Triggered: ${alertDoc.message}`);
  }

  // Helper method for external subscribers/callbacks
  onAlert(callback) {
    this.on('alert:generated', callback);
  }
}

// Global detector instance
const failureDetector = new FailureAnalysisEngine();

module.exports = failureDetector;
