const { TCPFiniteStateMachine, FSM_STATES, FSM_INPUTS } = require('./tcpFSM');
const failureDetector = require('./failureDetector');
const storage = require('../models/storage');
const { calculateTCPChecksum, verifyTCPChecksum } = require('./tcpChecksum');

class TCPSimulatorEngine {
  constructor() {
    this.fsm = new TCPFiniteStateMachine();
    this.currentSession = this.createDefaultSession();
  }

  createDefaultSession() {
    return {
      sessionId: 'sim_' + Date.now(),
      hostname: 'api.velalar.edu',
      ipAddress: '192.168.10.45',
      clientIp: '192.168.1.105',
      clientPort: 49152,
      port: 443,
      state: FSM_STATES.CLOSED,
      clientSeq: 1000,
      serverSeq: 5000,
      bytesSent: 0,
      bytesReceived: 0,
      latencyMs: 25,
      scenario: 'NORMAL_HANDSHAKE',
      packetLossRate: 0,
      packets: [],
      notes: 'Initial idle state. Ready for connection initiation.',
      activeConnectionRecordId: null
    };
  }

  getSession() {
    return {
      ...this.currentSession,
      fsmState: this.fsm.getCurrentState(),
      allowedActions: this.getAllowedActions()
    };
  }

  getAllowedActions() {
    const state = this.fsm.getCurrentState();
    return {
      canConnect: state === FSM_STATES.CLOSED || state === FSM_STATES.FAILED || state === FSM_STATES.TIMEOUT,
      canSendData: state === FSM_STATES.ESTABLISHED,
      canWait: state === FSM_STATES.ESTABLISHED || state === FSM_STATES.CONNECTING,
      canDisconnect: state === FSM_STATES.ESTABLISHED,
      canReset: true
    };
  }

  /**
   * Helper to build a simulated packet with genuine 16-bit 1's complement checksum
   */
  createPacket(opts) {
    const {
      id = 'pkt_' + Date.now(),
      direction = 'CLIENT_TO_SERVER',
      srcIp = this.currentSession.clientIp,
      dstIp = this.currentSession.ipAddress,
      srcPort = this.currentSession.clientPort,
      dstPort = this.currentSession.port,
      flag = '[SYN]',
      seq = this.currentSession.clientSeq,
      ack = 0,
      payload = '',
      payloadSize = 0,
      windowSize = 64240,
      timestamp = new Date().toISOString(),
      status = 'DELIVERED',
      details = '',
      corrupt = false
    } = opts;

    const actualPayload = payload || '';
    const actualPayloadSize = actualPayload ? Buffer.byteLength(actualPayload, 'utf8') : payloadSize;

    const calc = calculateTCPChecksum({
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      seq,
      ack,
      flag,
      windowSize,
      payload: actualPayload
    });

    let checksum = calc.checksum;
    let checksumHex = calc.checksumHex;
    let checksumStatus = 'VALID';
    let finalStatus = status;

    if (corrupt) {
      // Simulate bit-flip corruption in transit
      checksum = (checksum ^ 0xFFFF) || 0x1234;
      checksumHex = '0x' + checksum.toString(16).toUpperCase().padStart(4, '0');
      checksumStatus = 'CORRUPTED';
      finalStatus = 'CORRUPTED';
    }

    return {
      id,
      direction,
      source: `Client:${srcPort}`,
      destination: `${this.currentSession.hostname}:${dstPort}`,
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      flag,
      seq,
      ack,
      payloadSize: actualPayloadSize,
      payload: actualPayload,
      windowSize,
      checksum,
      checksumHex,
      checksumStatus,
      timestamp,
      status: finalStatus,
      details
    };
  }

  /**
   * Action 1: Connect
   */
  async simulateConnect(params = {}) {
    const hostname = params.hostname ? params.hostname.trim() : this.currentSession.hostname;
    const port = params.port ? Number(params.port) : this.currentSession.port;
    const scenario = params.scenario || 'NORMAL_HANDSHAKE';
    const packetLossRate = params.packetLossRate !== undefined ? Number(params.packetLossRate) : 0;
    const customLatency = params.latencyMs ? Number(params.latencyMs) : 25;

    // Reset session parameters
    this.currentSession.sessionId = 'sim_' + Date.now();
    this.currentSession.hostname = hostname;
    this.currentSession.port = port;
    this.currentSession.scenario = scenario;
    this.currentSession.packetLossRate = packetLossRate;
    this.currentSession.latencyMs = customLatency;
    this.currentSession.bytesSent = 0;
    this.currentSession.bytesReceived = 0;
    this.currentSession.packets = [];

    // Base sequence numbers
    let clientSeq = Math.floor(Math.random() * 80000) + 10000;
    let serverSeq = Math.floor(Math.random() * 80000) + 50000;
    this.currentSession.clientSeq = clientSeq;
    this.currentSession.serverSeq = serverSeq;

    // FSM Step 1: Closed -> Connecting
    this.fsm.reset();
    this.fsm.transition(FSM_INPUTS.SYN_SENT);

    const packets = [];
    const timestampBase = Date.now();

    // Packet 1: SYN
    const synPkt = this.createPacket({
      id: 'pkt_1_syn',
      direction: 'CLIENT_TO_SERVER',
      srcIp: this.currentSession.clientIp,
      dstIp: this.currentSession.ipAddress,
      srcPort: this.currentSession.clientPort,
      dstPort: port,
      flag: '[SYN]',
      seq: clientSeq,
      ack: 0,
      payloadSize: 0,
      windowSize: 64240,
      timestamp: new Date(timestampBase).toISOString(),
      status: 'DELIVERED',
      details: `SYN: Client requested connection synchronization (Initial Sequence Number: ${clientSeq})`
    });
    packets.push(synPkt);

    await storage.events.create({
      eventType: 'HANDSHAKE_SYN',
      source: 'CLIENT',
      hostname,
      port,
      sequenceNumber: clientSeq,
      ackNumber: 0,
      flag: '[SYN]',
      severity: 'INFO',
      description: `Client sent SYN packet to ${hostname}:${port} with ISN=${clientSeq}. Checksum: ${synPkt.checksumHex}.`
    });

    let finalStatus = 'SUCCESS';
    let failureReason = 'None';
    let finalState = FSM_STATES.ESTABLISHED;

    if (scenario === 'CONNECTION_REFUSED') {
      // Server actively rejects with RST
      const rstPkt = this.createPacket({
        id: 'pkt_2_rst',
        direction: 'SERVER_TO_CLIENT',
        srcIp: this.currentSession.ipAddress,
        dstIp: this.currentSession.clientIp,
        srcPort: port,
        dstPort: this.currentSession.clientPort,
        flag: '[RST, ACK]',
        seq: 0,
        ack: clientSeq + 1,
        payloadSize: 0,
        windowSize: 0,
        timestamp: new Date(timestampBase + 4).toISOString(),
        status: 'REJECTED',
        details: `RST: Remote host actively refused TCP connection on port ${port}. Target service is not running or port is closed.`
      });
      packets.push(rstPkt);

      this.fsm.transition(FSM_INPUTS.RST_RCVD);
      finalStatus = 'FAILED';
      failureReason = `ECONNREFUSED - Target host rejected connection on port ${port} with TCP [RST, ACK]`;
      finalState = FSM_STATES.FAILED;
      this.currentSession.notes = `Connection actively refused by ${hostname}:${port}. Port closed.`;

      await storage.events.create({
        eventType: 'RST_PACKET_RECEIVED',
        source: 'SERVER',
        hostname,
        port,
        sequenceNumber: 0,
        ackNumber: clientSeq + 1,
        flag: '[RST, ACK]',
        severity: 'ERROR',
        description: `Server ${hostname}:${port} returned TCP RST packet: Connection refused.`
      });

    } else if (scenario === 'TIMEOUT_DROP') {
      // Packet drop and retransmission timeout
      packets[0].status = 'DROPPED';
      packets[0].details += ' [DROPPED BY NETWORK HOP]';

      const rto1Pkt = this.createPacket({
        id: 'pkt_2_rto1',
        direction: 'CLIENT_TO_SERVER',
        flag: '[SYN]',
        seq: clientSeq,
        ack: 0,
        payloadSize: 0,
        windowSize: 64240,
        timestamp: new Date(timestampBase + 1000).toISOString(),
        status: 'DROPPED',
        details: 'SYN Retransmission 1 (RTO = 1000ms): No acknowledgment received from server.'
      });

      const rto2Pkt = this.createPacket({
        id: 'pkt_3_rto2',
        direction: 'CLIENT_TO_SERVER',
        flag: '[SYN]',
        seq: clientSeq,
        ack: 0,
        payloadSize: 0,
        windowSize: 64240,
        timestamp: new Date(timestampBase + 3000).toISOString(),
        status: 'DROPPED',
        details: 'SYN Retransmission 2 (RTO = 2000ms, Exponential Backoff): Server unresponsive.'
      });

      packets.push(rto1Pkt, rto2Pkt);

      this.fsm.transition(FSM_INPUTS.TIMEOUT_TRIGGER);
      finalStatus = 'TIMEOUT';
      failureReason = 'ETIMEDOUT - Connection handshake timed out after unacknowledged SYN retransmissions';
      finalState = FSM_STATES.TIMEOUT;
      this.currentSession.notes = `Connection to ${hostname}:${port} timed out after 3000ms. Packet loss or firewall drop detected.`;

      await storage.events.create({
        eventType: 'TIMEOUT_EVENT',
        source: 'NETWORK',
        hostname,
        port,
        sequenceNumber: clientSeq,
        ackNumber: 0,
        flag: '[SYN]',
        severity: 'WARNING',
        description: `Connection attempt to ${hostname}:${port} timed out after RTO backoff.`
      });

    } else if (scenario === 'PACKET_LOSS_RETRANSMIT') {
      // First SYN dropped, second succeeds
      packets[0].status = 'DROPPED';
      packets[0].details += ' [DROPPED BY INTERMEDIATE HOP]';

      const synRetx = this.createPacket({
        id: 'pkt_1_retx',
        direction: 'CLIENT_TO_SERVER',
        flag: '[SYN]',
        seq: clientSeq,
        ack: 0,
        payloadSize: 0,
        windowSize: 64240,
        timestamp: new Date(timestampBase + 800).toISOString(),
        status: 'DELIVERED',
        details: 'SYN Retransmission 1 (RTO = 800ms): Retransmit delivered successfully.'
      });

      const synAckPkt = this.createPacket({
        id: 'pkt_2_synack',
        direction: 'SERVER_TO_CLIENT',
        srcIp: this.currentSession.ipAddress,
        dstIp: this.currentSession.clientIp,
        srcPort: port,
        dstPort: this.currentSession.clientPort,
        flag: '[SYN, ACK]',
        seq: serverSeq,
        ack: clientSeq + 1,
        payloadSize: 0,
        windowSize: 65535,
        timestamp: new Date(timestampBase + 800 + customLatency).toISOString(),
        status: 'DELIVERED',
        details: `SYN-ACK: Server acknowledged retransmitted SYN and returned server ISN ${serverSeq}`
      });

      const ackFinal = this.createPacket({
        id: 'pkt_3_ack',
        direction: 'CLIENT_TO_SERVER',
        flag: '[ACK]',
        seq: clientSeq + 1,
        ack: serverSeq + 1,
        payloadSize: 0,
        windowSize: 64240,
        timestamp: new Date(timestampBase + 800 + customLatency * 2).toISOString(),
        status: 'DELIVERED',
        details: 'ACK: 3-way handshake established with packet loss recovery.'
      });

      packets.push(synRetx, synAckPkt, ackFinal);

      this.fsm.transition(FSM_INPUTS.SYN_ACK_RCVD);
      finalStatus = 'SUCCESS';
      finalState = FSM_STATES.ESTABLISHED;
      this.currentSession.notes = 'Connected with simulated packet loss recovery via retransmission.';

      await storage.events.create({
        eventType: 'PACKET_RETRANSMISSION',
        source: 'CLIENT',
        hostname,
        port,
        sequenceNumber: clientSeq,
        ackNumber: 0,
        flag: '[SYN]',
        severity: 'WARNING',
        description: `SYN retransmission succeeded after packet loss on ${hostname}:${port}.`
      });

    } else {
      // Normal 3-way Handshake
      const synAckPkt = this.createPacket({
        id: 'pkt_2_synack',
        direction: 'SERVER_TO_CLIENT',
        srcIp: this.currentSession.ipAddress,
        dstIp: this.currentSession.clientIp,
        srcPort: port,
        dstPort: this.currentSession.clientPort,
        flag: '[SYN, ACK]',
        seq: serverSeq,
        ack: clientSeq + 1,
        payloadSize: 0,
        windowSize: 65535,
        timestamp: new Date(timestampBase + Math.floor(customLatency / 2)).toISOString(),
        status: 'DELIVERED',
        details: `SYN-ACK: Server acknowledges client SYN (Ack=${clientSeq + 1}) and sends Server ISN ${serverSeq}. Checksum: valid.`
      });

      await storage.events.create({
        eventType: 'HANDSHAKE_SYN_ACK',
        source: 'SERVER',
        hostname,
        port,
        sequenceNumber: serverSeq,
        ackNumber: clientSeq + 1,
        flag: '[SYN, ACK]',
        severity: 'INFO',
        description: `Server ${hostname}:${port} returned SYN-ACK packet. Checksum: ${synAckPkt.checksumHex}.`
      });

      const ackFinal = this.createPacket({
        id: 'pkt_3_ack',
        direction: 'CLIENT_TO_SERVER',
        flag: '[ACK]',
        seq: clientSeq + 1,
        ack: serverSeq + 1,
        payloadSize: 0,
        windowSize: 64240,
        timestamp: new Date(timestampBase + customLatency).toISOString(),
        status: 'DELIVERED',
        details: `ACK: Client acknowledges server SYN (Ack=${serverSeq + 1}). Connection ESTABLISHED.`
      });

      await storage.events.create({
        eventType: 'HANDSHAKE_ACK',
        source: 'CLIENT',
        hostname,
        port,
        sequenceNumber: clientSeq + 1,
        ackNumber: serverSeq + 1,
        flag: '[ACK]',
        severity: 'INFO',
        description: `Client sent final ACK. 3-way handshake established. Checksum: ${ackFinal.checksumHex}.`
      });

      packets.push(synAckPkt, ackFinal);

      this.fsm.transition(FSM_INPUTS.SYN_ACK_RCVD);
      finalStatus = 'SUCCESS';
      finalState = FSM_STATES.ESTABLISHED;
      this.currentSession.notes = '3-way handshake established cleanly with valid 16-bit one\'s complement checksums.';
    }

    this.currentSession.packets = packets;
    this.currentSession.state = finalState;

    // Persist Connection Attempt record in DB/storage
    const attemptRecord = await storage.connections.create({
      hostname,
      ipAddress: this.currentSession.ipAddress,
      port,
      protocol: 'TCP',
      status: finalStatus,
      initialState: FSM_STATES.CLOSED,
      currentState: finalState,
      finalState,
      failureReason,
      latencyMs: finalStatus === 'TIMEOUT' ? 3000 : customLatency,
      packetLossRate: scenario === 'TIMEOUT_DROP' ? 100 : (scenario === 'PACKET_LOSS_RETRANSMIT' ? 33 : 0),
      bytesSent: finalStatus === 'SUCCESS' ? 154 : 64,
      bytesReceived: finalStatus === 'SUCCESS' ? 154 : (finalStatus === 'FAILED' ? 40 : 0),
      scenario,
      handshakeDetails: {
        synSent: true,
        synAckReceived: finalStatus === 'SUCCESS',
        ackSent: finalStatus === 'SUCCESS',
        durationMs: finalStatus === 'TIMEOUT' ? 3000 : customLatency,
        clientSeq,
        serverSeq
      },
      rttHistory: [customLatency],
      notes: this.currentSession.notes
    });

    this.currentSession.activeConnectionRecordId = attemptRecord._id;
    await failureDetector.recordAttempt(attemptRecord);

    return {
      session: this.getSession(),
      attemptRecord,
      packets
    };
  }

  /**
   * Action 2: Send Data
   */
  async simulateSendData(params = {}) {
    if (this.fsm.getCurrentState() !== FSM_STATES.ESTABLISHED) {
      const err = `Cannot send data in state '${this.fsm.getCurrentState()}'. Connection must be 'Established'.`;
      throw new Error(err);
    }

    const payload = params.payload || 'GET /api/v1/health HTTP/1.1\r\nHost: ' + this.currentSession.hostname + '\r\n\r\n';
    const payloadBytes = Buffer.byteLength(payload, 'utf8');

    this.fsm.transition(FSM_INPUTS.DATA_TRANSFER);

    const clientSeq = this.currentSession.clientSeq + 1 + this.currentSession.bytesSent;
    const serverSeq = this.currentSession.serverSeq + 1 + this.currentSession.bytesReceived;
    const now = Date.now();

    // Client -> Server Data packet
    const dataPkt = this.createPacket({
      id: 'pkt_data_' + now,
      direction: 'CLIENT_TO_SERVER',
      srcIp: this.currentSession.clientIp,
      dstIp: this.currentSession.ipAddress,
      srcPort: this.currentSession.clientPort,
      dstPort: this.currentSession.port,
      flag: '[PSH, ACK]',
      seq: clientSeq,
      ack: serverSeq,
      payload,
      payloadSize: payloadBytes,
      windowSize: 64240,
      timestamp: new Date(now).toISOString(),
      status: 'DELIVERED',
      details: `PSH-ACK: Client transmitted ${payloadBytes} bytes payload. Checksum: valid 16-bit 1's complement.`
    });

    // Server -> Client ACK packet
    const responsePayload = 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"status":"healthy"}';
    const responseBytes = Buffer.byteLength(responsePayload, 'utf8');

    const ackPkt = this.createPacket({
      id: 'pkt_ack_' + (now + 12),
      direction: 'SERVER_TO_CLIENT',
      srcIp: this.currentSession.ipAddress,
      dstIp: this.currentSession.clientIp,
      srcPort: this.currentSession.port,
      dstPort: this.currentSession.clientPort,
      flag: '[ACK]',
      seq: serverSeq,
      ack: clientSeq + payloadBytes,
      payload: responsePayload,
      payloadSize: responseBytes,
      windowSize: 65535,
      timestamp: new Date(now + 12).toISOString(),
      status: 'DELIVERED',
      details: `ACK: Server acknowledged ${payloadBytes} bytes (Next Expected Seq: ${clientSeq + payloadBytes}) and returned HTTP 200 OK (${responseBytes}B).`
    });

    this.currentSession.packets.push(dataPkt, ackPkt);
    this.currentSession.bytesSent += payloadBytes;
    this.currentSession.bytesReceived += responseBytes;

    await storage.events.create({
      connectionId: this.currentSession.activeConnectionRecordId,
      eventType: 'DATA_TRANSFER',
      source: 'CLIENT',
      hostname: this.currentSession.hostname,
      port: this.currentSession.port,
      sequenceNumber: clientSeq,
      ackNumber: serverSeq,
      flag: '[PSH, ACK]',
      payloadSize: payloadBytes,
      severity: 'INFO',
      description: `Data segment (${payloadBytes} bytes) successfully transmitted. Checksum: ${dataPkt.checksumHex}.`
    });

    return {
      session: this.getSession(),
      sentPacket: dataPkt,
      ackPacket: ackPkt,
      bytesSent: this.currentSession.bytesSent,
      bytesReceived: this.currentSession.bytesReceived
    };
  }

  /**
   * Action: Simulate Packet Corruption
   */
  async simulateCorruptPacket(params = {}) {
    const now = Date.now();
    const corruptedPayload = 'CORRUPTED_PAYLOAD_TAMPERED_IN_TRANSIT_ERR_BITFLIP';

    const clientSeq = this.currentSession.clientSeq + this.currentSession.bytesSent + 1;
    const serverSeq = this.currentSession.serverSeq + this.currentSession.bytesReceived + 1;

    // Generate packet with intentionally inverted / mismatched checksum
    const corruptPkt = this.createPacket({
      id: 'pkt_corrupt_' + now,
      direction: 'CLIENT_TO_SERVER',
      srcIp: this.currentSession.clientIp,
      dstIp: this.currentSession.ipAddress,
      srcPort: this.currentSession.clientPort,
      dstPort: this.currentSession.port,
      flag: '[PSH, ACK]',
      seq: clientSeq,
      ack: serverSeq,
      payload: corruptedPayload,
      payloadSize: Buffer.byteLength(corruptedPayload, 'utf8'),
      windowSize: 64240,
      timestamp: new Date(now).toISOString(),
      status: 'CORRUPTED',
      details: 'CORRUPTED: 1-bit/byte noise injected in transit. Checksum verification failed on receiver.',
      corrupt: true
    });

    // Run verification to confirm the mismatch
    const verification = verifyTCPChecksum(corruptPkt);

    this.currentSession.packets.push(corruptPkt);

    // Record Network Events for Checksum Mismatch and Packet Corruption
    await storage.events.create({
      connectionId: this.currentSession.activeConnectionRecordId,
      eventType: 'CHECKSUM_MISMATCH',
      source: 'NETWORK',
      hostname: this.currentSession.hostname,
      port: this.currentSession.port,
      sequenceNumber: clientSeq,
      ackNumber: serverSeq,
      flag: '[PSH, ACK]',
      payloadSize: corruptPkt.payloadSize,
      severity: 'ERROR',
      description: `TCP Checksum Mismatch: Received checksum (${corruptPkt.checksumHex}) does not match computed one's complement (${verification.expectedChecksumHex}). Segment dropped.`
    });

    await storage.events.create({
      connectionId: this.currentSession.activeConnectionRecordId,
      eventType: 'PACKET_CORRUPTION',
      source: 'SERVER',
      hostname: this.currentSession.hostname,
      port: this.currentSession.port,
      sequenceNumber: clientSeq,
      ackNumber: serverSeq,
      flag: '[PSH, ACK]',
      severity: 'CRITICAL',
      description: `Data segment corruption detected. Segment discarded by receiver TCP stack without advancing ACK number.`
    });

    return {
      session: this.getSession(),
      corruptedPacket: corruptPkt,
      verification
    };
  }

  /**
   * Action 3: Wait (Simulate Idle Keep-Alive Window)
   */
  async simulateWait(params = {}) {
    const duration = params.durationMs || 1000;
    const now = Date.now();

    const keepAlivePkt = this.createPacket({
      id: 'pkt_keepalive_' + now,
      direction: 'CLIENT_TO_SERVER',
      srcIp: this.currentSession.clientIp,
      dstIp: this.currentSession.ipAddress,
      srcPort: this.currentSession.clientPort,
      dstPort: this.currentSession.port,
      flag: '[ACK]',
      seq: this.currentSession.clientSeq + this.currentSession.bytesSent,
      ack: this.currentSession.serverSeq + this.currentSession.bytesReceived,
      payloadSize: 0,
      windowSize: 64240,
      timestamp: new Date(now).toISOString(),
      status: 'DELIVERED',
      details: `TCP Keep-Alive probe (${duration}ms idle window elapsed). State remains ${this.fsm.getCurrentState()}.`
    });

    this.currentSession.packets.push(keepAlivePkt);

    await storage.events.create({
      connectionId: this.currentSession.activeConnectionRecordId,
      eventType: 'MANUAL_SIMULATION_EVENT',
      source: 'CLIENT',
      hostname: this.currentSession.hostname,
      port: this.currentSession.port,
      flag: '[ACK]',
      severity: 'INFO',
      description: `TCP Keep-Alive probe sent during idle wait window (${duration}ms). Checksum: ${keepAlivePkt.checksumHex}.`
    });

    return {
      session: this.getSession(),
      keepAlivePacket: keepAlivePkt
    };
  }

  /**
   * Action 4: Disconnect (Graceful 4-Way Handshake Teardown)
   */
  async simulateDisconnect() {
    if (this.fsm.getCurrentState() !== FSM_STATES.ESTABLISHED) {
      const err = `Cannot initiate disconnect from state '${this.fsm.getCurrentState()}'. Connection must be 'Established'.`;
      throw new Error(err);
    }

    const now = Date.now();
    const clientSeq = this.currentSession.clientSeq + this.currentSession.bytesSent + 1;
    const serverSeq = this.currentSession.serverSeq + this.currentSession.bytesReceived + 1;

    // Step 1: Client sends FIN
    this.fsm.transition(FSM_INPUTS.FIN_SENT); // Transitions to 'Waiting'

    const finClient = this.createPacket({
      id: 'pkt_fin_1_' + now,
      direction: 'CLIENT_TO_SERVER',
      flag: '[FIN, ACK]',
      seq: clientSeq,
      ack: serverSeq,
      payloadSize: 0,
      windowSize: 64240,
      timestamp: new Date(now).toISOString(),
      status: 'DELIVERED',
      details: 'FIN-ACK: Client initiating graceful connection teardown (FIN flag set).'
    });

    // Step 2: Server responds with ACK
    const ackServer = this.createPacket({
      id: 'pkt_fin_2_' + (now + 10),
      direction: 'SERVER_TO_CLIENT',
      srcIp: this.currentSession.ipAddress,
      dstIp: this.currentSession.clientIp,
      srcPort: this.currentSession.port,
      dstPort: this.currentSession.clientPort,
      flag: '[ACK]',
      seq: serverSeq,
      ack: clientSeq + 1,
      payloadSize: 0,
      windowSize: 65535,
      timestamp: new Date(now + 10).toISOString(),
      status: 'DELIVERED',
      details: 'ACK: Server acknowledges client FIN. Entering CLOSE-WAIT.'
    });

    // Step 3: Server sends FIN
    const finServer = this.createPacket({
      id: 'pkt_fin_3_' + (now + 20),
      direction: 'SERVER_TO_CLIENT',
      srcIp: this.currentSession.ipAddress,
      dstIp: this.currentSession.clientIp,
      srcPort: this.currentSession.port,
      dstPort: this.currentSession.clientPort,
      flag: '[FIN, ACK]',
      seq: serverSeq,
      ack: clientSeq + 1,
      payloadSize: 0,
      windowSize: 65535,
      timestamp: new Date(now + 20).toISOString(),
      status: 'DELIVERED',
      details: 'FIN-ACK: Server closing its transmit channel.'
    });

    // Step 4: Client sends final ACK
    this.fsm.transition(FSM_INPUTS.FIN_ACK_RCVD); // Transitions to 'Terminated'

    const ackClient = this.createPacket({
      id: 'pkt_fin_4_' + (now + 30),
      direction: 'CLIENT_TO_SERVER',
      flag: '[ACK]',
      seq: clientSeq + 1,
      ack: serverSeq + 1,
      payloadSize: 0,
      windowSize: 64240,
      timestamp: new Date(now + 30).toISOString(),
      status: 'DELIVERED',
      details: 'ACK: Client acknowledges server FIN. Connection successfully TERMINATED.'
    });

    this.currentSession.packets.push(finClient, ackServer, finServer, ackClient);
    this.currentSession.state = FSM_STATES.TERMINATED;
    this.currentSession.notes = 'Graceful 4-way handshake teardown completed with valid checksums on all control frames.';

    if (this.currentSession.activeConnectionRecordId) {
      await storage.connections.findByIdAndUpdate(this.currentSession.activeConnectionRecordId, {
        currentState: FSM_STATES.TERMINATED,
        finalState: FSM_STATES.TERMINATED,
        notes: this.currentSession.notes
      });
    }

    await storage.events.create({
      connectionId: this.currentSession.activeConnectionRecordId,
      eventType: 'CONNECTION_TERMINATED',
      source: 'CLIENT',
      hostname: this.currentSession.hostname,
      port: this.currentSession.port,
      flag: '[FIN, ACK]',
      severity: 'INFO',
      description: 'Graceful TCP 4-way handshake termination finalized.'
    });

    return {
      session: this.getSession(),
      packets: [finClient, ackServer, finServer, ackClient]
    };
  }

  /**
   * Action 5: Reset
   */
  async simulateReset() {
    this.fsm.reset();
    this.currentSession = this.createDefaultSession();
    return {
      session: this.getSession(),
      message: 'TCP simulation context reset to idle Closed state.'
    };
  }
}

const tcpSimulator = new TCPSimulatorEngine();

module.exports = tcpSimulator;
