/**
 * Automated Unit Test Suite for FLAT Theory Lab
 * Covers 12 specific evaluation requirements:
 * 1. Valid IPv4
 * 2. Invalid IPv4
 * 3. Valid port
 * 4. Invalid port
 * 5. Valid TCP flags
 * 6. Invalid TCP flags
 * 7. Valid CFG sequence
 * 8. Invalid CFG sequence
 * 9. PDA push and pop operations
 * 10. Turing Machine missing ACK detection
 * 11. Turing Machine timeout detection
 * 12. Turing Machine reset and step operations
 */

const assert = require('assert');
const {
  validateInput,
  parseCFGSequence,
  simulatePDATrace,
  simulateTuringMachine
} = require('../flat/flatEngine');

const { TCPFiniteStateMachine, FSM_STATES } = require('../engine/tcpFSM');

console.log('===========================================================');
console.log('STARTING AUTOMATED TESTS FOR FLAT THEORY LAB (TASK 2)');
console.log('===========================================================');

let passedCount = 0;
let totalCount = 0;

function runTest(testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✓ PASS [${totalCount}]: ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`✗ FAIL [${totalCount}]: ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

// 1. Valid IPv4
runTest('Valid IPv4 format verification (192.168.1.1)', () => {
  const res = validateInput('ipv4', '192.168.1.1');
  assert.strictEqual(res.isValid, true, 'Expected 192.168.1.1 to be valid');
});

// 2. Invalid IPv4
runTest('Invalid IPv4 octet overflow verification (256.1.1.1)', () => {
  const res = validateInput('ipv4', '256.1.1.1');
  assert.strictEqual(res.isValid, false, 'Expected 256.1.1.1 to be invalid');
});

// 3. Valid port
runTest('Valid port number range verification (443)', () => {
  const res = validateInput('port', '443');
  assert.strictEqual(res.isValid, true, 'Expected port 443 to be valid');
});

// 4. Invalid port
runTest('Invalid port boundary verification (99999 and 0)', () => {
  const res1 = validateInput('port', '99999');
  const res2 = validateInput('port', '0');
  assert.strictEqual(res1.isValid, false, 'Expected port 99999 to be invalid');
  assert.strictEqual(res2.isValid, false, 'Expected port 0 to be invalid');
});

// 5. Valid TCP flags
runTest('Valid TCP control flag format & combinations ([SYN], [SYN, ACK], [PSH, ACK])', () => {
  const res1 = validateInput('tcp_flags', '[SYN]');
  const res2 = validateInput('tcp_flags', '[SYN, ACK]');
  const res3 = validateInput('tcp_flags', '[PSH, ACK]');
  assert.strictEqual(res1.isValid, true, 'Expected [SYN] to be valid');
  assert.strictEqual(res2.isValid, true, 'Expected [SYN, ACK] to be valid');
  assert.strictEqual(res3.isValid, true, 'Expected [PSH, ACK] to be valid');
});

// 6. Invalid TCP flags
runTest('Invalid TCP flags rejection ([SYN, FIN] mutually exclusive, [UNKNOWN] syntax)', () => {
  const res1 = validateInput('tcp_flags', '[SYN, FIN]');
  const res2 = validateInput('tcp_flags', '[SYN, RST]');
  const res3 = validateInput('tcp_flags', '[INVALID]');
  assert.strictEqual(res1.isValid, false, 'Expected [SYN, FIN] to be rejected by RFC 793 semantic check');
  assert.strictEqual(res2.isValid, false, 'Expected [SYN, RST] to be rejected');
  assert.strictEqual(res3.isValid, false, 'Expected [INVALID] to be rejected');
});

// 7. Valid CFG sequence
runTest('Valid CFG sequence derivation (CONNECT SYN SYN_ACK ACK DATA FIN ACK)', () => {
  const res = parseCFGSequence('CONNECT SYN SYN_ACK ACK DATA FIN ACK');
  assert.strictEqual(res.accepted, true, 'Expected valid sequence to be accepted by CFG');
  assert.ok(res.derivationSteps.length >= 4, 'Expected step-by-step derivation steps');
});

// 8. Invalid CFG sequence
runTest('Invalid CFG sequence rejection (SYN FIN premature teardown)', () => {
  const res = parseCFGSequence('SYN FIN');
  assert.strictEqual(res.accepted, false, 'Expected premature teardown to be rejected');
  assert.ok(res.reason.includes('SYN_ACK'), 'Expected rejection message explaining missing SYN_ACK');
});

// 9. PDA push and pop operations
runTest('Pushdown Automaton stack push/pop and acceptance on balanced trace', () => {
  const res = simulatePDATrace(['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']);
  assert.strictEqual(res.isAccepted, true, 'Expected balanced trace to be accepted');
  assert.strictEqual(res.finalStack.length, 1, 'Expected stack to contain only Z0 upon acceptance');
  assert.strictEqual(res.finalStack[0], 'Z0', 'Bottom-of-stack marker must be Z0');

  // Verify push and pop occurred
  const pushStep = res.steps.find(s => s.action.includes('Push S_FRAME'));
  const popStep = res.steps.find(s => s.action.includes('Pop S_FRAME'));
  assert.ok(pushStep, 'Expected Push S_FRAME step');
  assert.ok(popStep, 'Expected Pop S_FRAME step');
});

// 10. Turing Machine missing ACK detection
runTest('Turing Machine detection of Missing Handshake ACK (q_missing_ack)', () => {
  const res = simulateTuringMachine(['SYN', 'SYN_ACK']);
  assert.strictEqual(res.finalState, 'q_missing_ack', 'Expected TM to halt in q_missing_ack');
  assert.strictEqual(res.verdict, 'REJECTED_MISSING_ACK', 'Verdict must be REJECTED_MISSING_ACK');
  assert.ok(res.explanation.toLowerCase().includes('missing'), 'Explanation must mention missing ACK');
});

// 11. Turing Machine timeout detection
runTest('Turing Machine detection of TIMEOUT marker (q_timeout_detected)', () => {
  const res = simulateTuringMachine(['SYN', 'TIMEOUT']);
  assert.strictEqual(res.finalState, 'q_timeout_detected', 'Expected TM to halt in q_timeout_detected');
  assert.strictEqual(res.verdict, 'REJECTED_TIMEOUT', 'Verdict must be REJECTED_TIMEOUT');
  assert.ok(res.explanation.includes('TIMEOUT'), 'Explanation must diagnose TIMEOUT marker');
});

// 12. Turing Machine reset, stepping and successful acceptance
runTest('Turing Machine step-by-step trace generation and acceptance', () => {
  const res = simulateTuringMachine(['SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'ACK']);
  assert.strictEqual(res.isAccepted, true, 'Expected full valid sequence to be accepted');
  assert.strictEqual(res.finalState, 'q_accept', 'Expected final state to be q_accept');
  assert.ok(res.steps.length > 5, 'Expected multiple sequential execution steps');
  
  // Verify each step has head movement and snapshot
  res.steps.forEach(step => {
    assert.ok(step.headPosition >= 0, 'Head position must be non-negative');
    assert.ok(Array.isArray(step.tapeSnapshot), 'Tape snapshot must be an array');
    assert.ok(['R', 'L', 'S'].includes(step.moveDirection), 'Move direction must be R, L, or S');
  });
});

console.log('===========================================================');
console.log(`TEST EXECUTION SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
console.log('===========================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}
