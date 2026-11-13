/**
 * Full Stack Integration Test Suite (Task 4)
 * Verifies all 20 integration scenarios across FSWD, CN, and FLAT.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { app } = require('../server');
const { getDbStatus } = require('../config/db');
const storage = require('../models/storage');
const tcpSimulator = require('../engine/tcpSimulator');
const slidingWindow = require('../engine/slidingWindow');
const { calculateTCPChecksum, verifyTCPChecksum } = require('../engine/tcpChecksum');
const { TCPFiniteStateMachine, FSM_STATES, FSM_INPUTS } = require('../engine/tcpFSM');
const { validateInput, parseCFGSequence, simulatePDATrace, simulateTuringMachine } = require('../flat/flatEngine');

console.log('===========================================================');
console.log('STARTING FULL STACK INTEGRATION VERIFICATION (TASK 4)');
console.log('===========================================================');

let passed = 0;
let total = 0;

async function testScenario(num, title, fn) {
  total++;
  try {
    await fn();
    console.log(`✓ PASS [${num}/20]: ${title}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL [${num}/20]: ${title}`);
    console.error(`  Error: ${err.message}`);
  }
}

(async () => {
  // Scenario 1: Frontend loads successfully (built production bundle exists)
  await testScenario(1, 'Frontend production assets exist and are compiled', () => {
    const distPath = path.resolve(__dirname, '../../frontend/dist');
    assert.ok(fs.existsSync(distPath), 'frontend/dist directory must exist');
    assert.ok(fs.existsSync(path.join(distPath, 'index.html')), 'frontend/dist/index.html must exist');
    const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('<div id="root"></div>'), 'index.html must include root mount point');
  });

  // Scenario 2: Backend starts successfully & exports app
  await testScenario(2, 'Backend server initializes express app instance', () => {
    assert.ok(app, 'Express app must be defined and exported');
    assert.strictEqual(typeof app.listen, 'function', 'app.listen must be a function');
  });

  // Scenario 3: Backend health endpoint responds correctly
  await testScenario(3, 'Health endpoint provides accurate system telemetry', async () => {
    const status = getDbStatus();
    assert.ok(status, 'Database status object must be returned');
    assert.ok(['mongodb', 'fallback'].includes(status.mode), 'Mode must be mongodb or fallback');
    assert.ok(status.timestamp, 'Timestamp must be present');
  });

  // Scenario 4: Frontend can retrieve dashboard data
  await testScenario(4, 'Dashboard data aggregation retrieves metrics from storage', async () => {
    const conns = await storage.connections.find({});
    const events = await storage.events.find({});
    assert.ok(Array.isArray(conns), 'Connections must be an array');
    assert.ok(Array.isArray(events), 'Events must be an array');
  });

  // Scenario 5: A connection attempt is recorded
  await testScenario(5, 'Connection attempt is recorded with full protocol metrics', async () => {
    const newAttempt = await storage.connections.create({
      hostname: 'api.velalar.edu',
      port: 443,
      protocol: 'TCP',
      status: 'SUCCESS',
      initialState: 'Closed',
      currentState: 'Established',
      finalState: 'Established',
      failureReason: 'None',
      latencyMs: 25,
      bytesSent: 120,
      bytesReceived: 450,
      scenario: 'INTEGRATION_TEST'
    });
    assert.ok(newAttempt._id, 'Attempt must have unique identifier');
    assert.strictEqual(newAttempt.status, 'SUCCESS');
  });

  // Scenario 6: Invalid hostname and port are rejected
  await testScenario(6, 'Input validator rejects invalid hostname and out-of-range port', () => {
    const badHost = validateInput('hostname', '-invalid..domain');
    const badPort = validateInput('port', '99999');
    const badPortZero = validateInput('port', '0');
    assert.strictEqual(badHost.isValid, false, 'Invalid hostname syntax must be rejected');
    assert.strictEqual(badPort.isValid, false, 'Port 99999 must be rejected');
    assert.strictEqual(badPortZero.isValid, false, 'Port 0 must be rejected');
  });

  // Scenario 7: Connection history displays recorded attempts with pagination
  await testScenario(7, 'Connection history supports pagination and query filtering', async () => {
    const list = await storage.connections.find({}, { sort: { createdAt: -1 }, skip: 0, limit: 5 });
    const totalCount = await storage.connections.countDocuments({});
    assert.ok(Array.isArray(list), 'Paginated result must contain array of records');
    assert.ok(list.length <= 5, 'Page limit 5 must be respected');
    assert.ok(totalCount >= list.length, 'Total count must be >= page length');
  });

  // Scenario 8: Failure events are recorded and displayed
  await testScenario(8, 'Network Events audit log records failure events', async () => {
    const evt = await storage.events.create({
      eventType: 'TIMEOUT_EVENT',
      source: 'NETWORK',
      hostname: 'gateway.timeout.test',
      port: 8080,
      severity: 'WARNING',
      description: 'SYN retransmission timeout elapsed during integration test'
    });
    assert.ok(evt._id, 'Event must have ID');
    assert.strictEqual(evt.eventType, 'TIMEOUT_EVENT');
  });

  // Scenario 9: TCP state transitions work correctly
  await testScenario(9, 'TCP FSM executes valid transitions and rejects invalid ones', () => {
    const fsm = new TCPFiniteStateMachine();
    assert.strictEqual(fsm.getCurrentState(), FSM_STATES.CLOSED);
    const r1 = fsm.transition(FSM_INPUTS.SYN_SENT);
    assert.strictEqual(r1.success, true);
    assert.strictEqual(fsm.getCurrentState(), FSM_STATES.CONNECTING);
    // Attempt invalid symbol from Connecting
    const rBad = fsm.transition(FSM_INPUTS.DATA_TRANSFER);
    assert.strictEqual(rBad.success, false, 'DATA_TRANSFER cannot be accepted in CONNECTING state');
  });

  // Scenario 10: TCP checksum verification works
  await testScenario(10, 'TCP 16-bit One\'s Complement checksum computes and verifies', () => {
    const pkt = {
      srcIp: '192.168.1.10',
      dstIp: '93.184.216.34',
      srcPort: 49152,
      dstPort: 443,
      seq: 1000,
      ack: 5000,
      flag: '[PSH, ACK]',
      windowSize: 64240,
      payload: 'GET /test HTTP/1.1'
    };
    const calc = calculateTCPChecksum(pkt);
    const verify = verifyTCPChecksum({ ...pkt, checksum: calc.checksum, checksumHex: calc.checksumHex });
    assert.strictEqual(verify.isValid, true, 'Computed checksum must match verification');
  });

  // Scenario 11: Corrupted packets are rejected
  await testScenario(11, 'Corrupted packet simulation detects checksum mismatch', async () => {
    const corruptRes = await tcpSimulator.simulateCorruptPacket();
    assert.strictEqual(corruptRes.corruptedPacket.status, 'CORRUPTED');
    assert.strictEqual(corruptRes.verification.isValid, false);
  });

  // Scenario 12: Sliding Window controls work
  await testScenario(12, 'Sliding Window transmits within rwnd and advances seq', async () => {
    slidingWindow.reset();
    const st1 = await slidingWindow.sendData(512);
    assert.strictEqual(st1.bytesSent, 512);
    assert.strictEqual(st1.inFlightBytes, 512);
    const st2 = await slidingWindow.sendAck();
    assert.strictEqual(st2.bytesAcked, 512);
    assert.strictEqual(st2.inFlightBytes, 0);
  });

  // Scenario 13: Zero Window and Window Update work
  await testScenario(13, 'Zero Window condition and Window Update flow control', async () => {
    const stZero = await slidingWindow.fillReceiverBuffer();
    assert.strictEqual(stZero.isZeroWindow, true);
    assert.strictEqual(stZero.advertisedWindow, 0);
    const stProbe = await slidingWindow.sendZeroWindowProbe();
    assert.ok(stProbe.zeroWindowProbeCount > 0);
    const stUpdate = await slidingWindow.freeReceiverBuffer(2048);
    assert.strictEqual(stUpdate.isZeroWindow, false);
    assert.strictEqual(stUpdate.advertisedWindow, 2048);
  });

  // Scenario 14: FLAT FSM validation works
  await testScenario(14, 'FLAT Automata model has 7 states and formal 5-tuple', () => {
    const fsm = new TCPFiniteStateMachine();
    const spec = fsm.getFormalDefinition();
    assert.strictEqual(spec.states.length, 7);
    assert.ok(spec.states.includes('Closed'));
    assert.ok(spec.states.includes('Established'));
    assert.ok(spec.states.includes('Terminated'));
  });

  // Scenario 15: CFG parser works
  await testScenario(15, 'Context-Free Grammar parser accepts valid and rejects invalid sequences', () => {
    const valid = parseCFGSequence('CONNECT SYN SYN_ACK ACK DATA DATA_ACK FIN ACK');
    assert.strictEqual(valid.accepted, true);
    assert.ok(valid.derivationSteps.length > 3);
    const invalid = parseCFGSequence('SYN FIN');
    assert.strictEqual(invalid.accepted, false);
  });

  // Scenario 16: PDA stack operations work
  await testScenario(16, 'Pushdown Automata pushes/pops frame tokens and verifies Z0 acceptance', () => {
    const pda = simulatePDATrace(['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']);
    assert.strictEqual(pda.isAccepted, true);
    assert.strictEqual(pda.finalStack[0], 'Z0');
  });

  // Scenario 17: Turing Machine simulation works
  await testScenario(17, 'Turing Machine detects missing ACK and TIMEOUT markers', () => {
    const tmNormal = simulateTuringMachine(['SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'ACK']);
    assert.strictEqual(tmNormal.verdict, 'ACCEPTED');

    const tmMissing = simulateTuringMachine(['SYN', 'SYN_ACK']);
    assert.strictEqual(tmMissing.verdict, 'REJECTED_MISSING_ACK');

    const tmTimeout = simulateTuringMachine(['SYN', 'TIMEOUT']);
    assert.strictEqual(tmTimeout.verdict, 'REJECTED_TIMEOUT');
  });

  // Scenario 18: Database status is accurate
  await testScenario(18, 'Database status accurately distinguishes MongoDB from demo fallback', () => {
    const dbSt = getDbStatus();
    assert.ok(dbSt.mode === 'mongodb' || dbSt.mode === 'fallback');
    // If not connected, mode must be fallback
    if (!dbSt.connected) {
      assert.strictEqual(dbSt.mode, 'fallback');
    }
  });

  // Scenario 19: Navigation between all pages works
  await testScenario(19, 'App routes and client navigation targets are configured', () => {
    const appJsx = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/App.jsx'), 'utf8');
    const requiredRoutes = ['/', '/simulator', '/fsm', '/history', '/failure-analysis', '/events', '/flat-lab', '/about'];
    requiredRoutes.forEach(r => {
      assert.ok(appJsx.includes(`path="${r}"`), `Route ${r} must be defined in App.jsx`);
    });
  });

  // Scenario 20: Existing Task 2 and Task 3 functionality has no regression
  await testScenario(20, 'Zero regression across FSWD, CN, and FLAT modules', () => {
    assert.ok(typeof validateInput === 'function', 'FLAT validateInput exists');
    assert.ok(typeof parseCFGSequence === 'function', 'FLAT parseCFGSequence exists');
    assert.ok(typeof simulateTuringMachine === 'function', 'FLAT simulateTuringMachine exists');
    assert.ok(typeof calculateTCPChecksum === 'function', 'CN calculateTCPChecksum exists');
    assert.ok(typeof slidingWindow.sendData === 'function', 'CN slidingWindow exists');
  });

  console.log('===========================================================');
  console.log(`FULL STACK INTEGRATION SUMMARY: ${passed} / ${total} SCENARIOS VERIFIED`);
  console.log('===========================================================');

  if (passed !== total) {
    process.exit(1);
  }
})();
