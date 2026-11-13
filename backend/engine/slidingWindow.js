/**
 * TCP Sliding Window & Flow Control Engine
 * Implements receiver advertised window (rwnd), sender usable window,
 * Zero Window condition, Zero Window Probing (ZWP), and Window Update notifications.
 */

const storage = require('../models/storage');

class SlidingWindowEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.bufferCapacity = 4096; // 4 KB receiver buffer
    this.receiverBufferUsed = 0; // Bytes currently buffered awaiting app read
    this.advertisedWindow = 4096; // rwnd advertised to sender
    this.senderWindow = 4096; // Current sender window limit
    this.clientSeq = 1000; // Base Sequence Number
    this.serverAck = 1000; // Acknowledged Sequence Number
    this.bytesSent = 0; // Total transmitted bytes
    this.bytesAcked = 0; // Total acknowledged bytes
    this.inFlightBytes = 0; // bytesSent - bytesAcked
    this.usableWindow = 4096; // Max bytes sender can transmit immediately
    this.isZeroWindow = false;
    this.zeroWindowProbeCount = 0;
    this.history = [];

    this.recordSnapshot('RESET', 'Sliding window reset to initial state (rwnd = 4096 B)');
    return this.getState();
  }

  getState() {
    this.inFlightBytes = this.bytesSent - this.bytesAcked;
    this.usableWindow = Math.max(0, this.advertisedWindow - this.inFlightBytes);
    this.isZeroWindow = this.advertisedWindow === 0;

    return {
      bufferCapacity: this.bufferCapacity,
      receiverBufferUsed: this.receiverBufferUsed,
      bufferAvailable: Math.max(0, this.bufferCapacity - this.receiverBufferUsed),
      bufferUtilizationPct: Math.min(100, Math.round((this.receiverBufferUsed / this.bufferCapacity) * 100)),
      advertisedWindow: this.advertisedWindow,
      senderWindow: this.senderWindow,
      usableWindow: this.usableWindow,
      clientSeq: this.clientSeq,
      serverAck: this.serverAck,
      bytesSent: this.bytesSent,
      bytesAcked: this.bytesAcked,
      inFlightBytes: this.inFlightBytes,
      isZeroWindow: this.isZeroWindow,
      zeroWindowProbeCount: this.zeroWindowProbeCount,
      history: this.history.slice(-15)
    };
  }

  recordSnapshot(action, description) {
    this.history.push({
      action,
      description,
      timestamp: new Date().toISOString(),
      seq: this.clientSeq,
      ack: this.serverAck,
      rwnd: this.advertisedWindow,
      usableWindow: Math.max(0, this.advertisedWindow - (this.bytesSent - this.bytesAcked)),
      bufferUsed: this.receiverBufferUsed
    });
  }

  /**
   * Send Data within available window
   */
  async sendData(bytes = 512) {
    const toSend = Math.min(Number(bytes) || 512, 1460); // Maximum MSS chunk
    this.inFlightBytes = this.bytesSent - this.bytesAcked;
    this.usableWindow = Math.max(0, this.advertisedWindow - this.inFlightBytes);

    if (this.isZeroWindow || this.usableWindow === 0) {
      const err = `Cannot transmit: Zero Window condition active (rwnd = 0). Receiver buffer is completely exhausted.`;
      throw new Error(err);
    }

    if (toSend > this.usableWindow) {
      const err = `Requested ${toSend}B exceeds sender usable window (${this.usableWindow}B). Transmission throttled.`;
      throw new Error(err);
    }

    this.bytesSent += toSend;
    this.receiverBufferUsed = Math.min(this.bufferCapacity, this.receiverBufferUsed + toSend);
    this.advertisedWindow = Math.max(0, this.bufferCapacity - this.receiverBufferUsed);
    this.clientSeq += toSend;
    this.isZeroWindow = this.advertisedWindow === 0;

    const desc = `Sent ${toSend} bytes (Seq ${this.clientSeq - toSend}..${this.clientSeq}). Advertised rwnd is now ${this.advertisedWindow}B.`;
    this.recordSnapshot('SEND_DATA', desc);

    if (this.isZeroWindow) {
      await storage.events.create({
        eventType: 'ZERO_WINDOW',
        source: 'SERVER',
        hostname: 'flow-control.local',
        port: 443,
        sequenceNumber: this.serverAck,
        ackNumber: this.clientSeq,
        flag: '[ACK]',
        severity: 'WARNING',
        description: `TCP Zero Window condition entered! Receiver buffer is 100% full (0 bytes available). Sender transmission suspended.`
      });
    }

    return this.getState();
  }

  /**
   * Send ACK acknowledging in-flight data and sliding the window forward
   */
  async sendAck() {
    const unacked = this.bytesSent - this.bytesAcked;
    if (unacked <= 0) {
      return this.getState();
    }

    this.bytesAcked = this.bytesSent;
    this.serverAck = this.clientSeq;

    const desc = `ACK transmitted for Seq ${this.serverAck}. Window slid forward by ${unacked} bytes.`;
    this.recordSnapshot('SEND_ACK', desc);

    return this.getState();
  }

  /**
   * Fill receiver buffer to simulate slow application processing and trigger Zero Window
   */
  async fillReceiverBuffer() {
    this.receiverBufferUsed = this.bufferCapacity;
    this.advertisedWindow = 0;
    this.isZeroWindow = true;
    this.bytesSent = Math.max(this.bytesSent, this.bytesAcked + this.bufferCapacity);
    this.clientSeq = 1000 + this.bytesSent;

    this.recordSnapshot('FILL_BUFFER', 'Simulated slow receiver app: Receiver buffer 100% filled. Advertised window drops to ZERO.');

    await storage.events.create({
      eventType: 'ZERO_WINDOW',
      source: 'SERVER',
      hostname: 'flow-control.local',
      port: 443,
      sequenceNumber: this.serverAck,
      ackNumber: this.clientSeq,
      flag: '[ACK]',
      severity: 'WARNING',
      description: `Receiver buffer exhaustion: Advertised window size dropped to 0 (Zero Window).`
    });

    return this.getState();
  }

  /**
   * Send Zero Window Probe (ZWP: 1-byte segment)
   */
  async sendZeroWindowProbe() {
    this.zeroWindowProbeCount++;
    const desc = `Zero Window Probe (ZWP) # ${this.zeroWindowProbeCount}: Transmitted 1-byte probe (Seq ${this.clientSeq}) to query receiver buffer.`;
    this.recordSnapshot('ZERO_WINDOW_PROBE', desc);

    await storage.events.create({
      eventType: 'ZERO_WINDOW_PROBE',
      source: 'CLIENT',
      hostname: 'flow-control.local',
      port: 443,
      sequenceNumber: this.clientSeq,
      ackNumber: this.serverAck,
      flag: '[ACK]',
      payloadSize: 1,
      severity: 'INFO',
      description: `Zero Window Probe (ZWP) # ${this.zeroWindowProbeCount} sent to query advertised window availability.`
    });

    return this.getState();
  }

  /**
   * Free receiver buffer: simulated app reading data, causing Window Update
   */
  async freeReceiverBuffer(bytes = 2048) {
    const toFree = Math.min(this.receiverBufferUsed, Number(bytes) || 2048);
    this.receiverBufferUsed = Math.max(0, this.receiverBufferUsed - toFree);
    this.advertisedWindow = this.bufferCapacity - this.receiverBufferUsed;
    this.isZeroWindow = this.advertisedWindow === 0;

    const desc = `Receiver application consumed ${toFree}B from buffer. Window Update sent with rwnd = ${this.advertisedWindow}B.`;
    this.recordSnapshot('WINDOW_UPDATE', desc);

    await storage.events.create({
      eventType: 'WINDOW_UPDATE',
      source: 'SERVER',
      hostname: 'flow-control.local',
      port: 443,
      sequenceNumber: this.serverAck,
      ackNumber: this.clientSeq,
      flag: '[ACK]',
      severity: 'INFO',
      description: `TCP Window Update: Application drained ${toFree}B from buffer. Advertised window expanded to ${this.advertisedWindow} bytes.`
    });

    return this.getState();
  }
}

const slidingWindow = new SlidingWindowEngine();

module.exports = slidingWindow;
