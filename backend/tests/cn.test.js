/**
 * Automated Unit Test Suite for Computer Networks (CN - 22ITT52)
 * Tests all 15 required features:
 * 1. Valid TCP checksum calculation
 * 2. Invalid checksum detection
 * 3. Odd-length payload checksum handling
 * 4. Packet corruption detection
 * 5. Valid packet acceptance
 * 6. Invalid packet rejection
 * 7. Normal sliding window transmission
 * 8. ACK-based window movement
 * 9. Receiver buffer exhaustion
 * 10. Zero Window detection
 * 11. Zero Window Probe (ZWP)
 * 12. Window Update broadcast
 * 13. Reset simulation context
 * 14. Packet Inspector fields integration
 * 15. Network Events integration
 */

const assert = require('assert');
const { calculateTCPChecksum, verifyTCPChecksum } = require('../engine/tcpChecksum');
const slidingWindow = require('../engine/slidingWindow');
const tcpSimulator = require('../engine/tcpSimulator');
const storage = require('../models/storage');

console.log('===========================================================');
console.log('STARTING AUTOMATED TESTS FOR COMPUTER NETWORKS (TASK 3)');
console.log('===========================================================');

let passedCount = 0;
let totalCount = 0;

async function runAsyncTest(testName, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`✓ PASS [${totalCount}]: ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`✗ FAIL [${totalCount}]: ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

(async () => {
  // 1. Valid TCP checksum
  await runAsyncTest('1. Valid TCP checksum calculation (16-bit 1\'s complement)', () => {
    const res = calculateTCPChecksum({
      srcIp: '192.168.1.10',
      dstIp: '93.184.216.34',
      srcPort: 49152,
      dstPort: 443,
      seq: 1000,
      ack: 0,
      flag: '[SYN]',
      windowSize: 64240,
      payload: 'HELLO TCP'
    });

    assert.ok(typeof res.checksum === 'number', 'Checksum must be numeric');
    assert.ok(res.checksum >= 0 && res.checksum <= 0xFFFF, 'Checksum must be within 16 bits (0..65535)');
    assert.ok(res.checksumHex.startsWith('0x'), 'ChecksumHex must start with 0x');
    assert.strictEqual(res.checksumHex.length, 6, 'ChecksumHex format 0xXXXX (6 chars)');
  });

  // 2. Invalid checksum detection
  await runAsyncTest('2. Invalid checksum detection on tampered segment', () => {
    const original = calculateTCPChecksum({
      srcIp: '192.168.1.10',
      dstIp: '93.184.216.34',
      srcPort: 49152,
      dstPort: 443,
      seq: 1000,
      ack: 0,
      flag: '[SYN]',
      windowSize: 64240,
      payload: 'LEGITIMATE DATA'
    });

    // Verify with mismatched checksum
    const checkRes = verifyTCPChecksum({
      srcIp: '192.168.1.10',
      dstIp: '93.184.216.34',
      srcPort: 49152,
      dstPort: 443,
      seq: 1000,
      ack: 0,
      flag: '[SYN]',
      windowSize: 64240,
      payload: 'LEGITIMATE DATA',
      checksum: 0x1234,
      checksumHex: '0x1234'
    });

    assert.strictEqual(checkRes.isValid, false, 'Expected checksum verification to fail');
    assert.ok(checkRes.message.includes('Mismatch'), 'Expected error message indicating mismatch');
  });

  // 3. Odd-length payload checksum
  await runAsyncTest('3. Odd-length payload checksum with 0x00 padding', () => {
    const pkt = {
      srcIp: '192.168.1.10',
      dstIp: '93.184.216.34',
      srcPort: 49152,
      dstPort: 443,
      seq: 1000,
      ack: 0,
      flag: '[PSH, ACK]',
      windowSize: 64240,
      payload: '12345' // 5 bytes (odd)
    };
    const oddRes = calculateTCPChecksum(pkt);
    assert.strictEqual(oddRes.isOddLength, true, 'Must identify odd length');
    assert.strictEqual(oddRes.payloadLength, 5, 'Payload length must be 5');

    // Verification must pass on odd payload
    const verifyOdd = verifyTCPChecksum({
      ...pkt,
      checksum: oddRes.checksum,
      checksumHex: oddRes.checksumHex
    });
    assert.strictEqual(verifyOdd.isValid, true, 'Odd length checksum must verify correctly');
  });

  // 4. Packet corruption detection
  await runAsyncTest('4. Packet corruption simulation & detection', async () => {
    const corruptRes = await tcpSimulator.simulateCorruptPacket();
    assert.strictEqual(corruptRes.corruptedPacket.status, 'CORRUPTED');
    assert.strictEqual(corruptRes.corruptedPacket.checksumStatus, 'CORRUPTED');
    assert.strictEqual(corruptRes.verification.isValid, false);
  });

  // 5. Valid packet acceptance
  await runAsyncTest('5. Valid packet acceptance through checksum verification', () => {
    const validPkt = tcpSimulator.createPacket({
      flag: '[ACK]',
      seq: 2000,
      ack: 5000,
      payload: 'GET /index.html HTTP/1.1'
    });

    const verify = verifyTCPChecksum(validPkt);
    assert.strictEqual(verify.isValid, true, 'Legitimate packet must be accepted');
    assert.strictEqual(validPkt.status, 'DELIVERED');
  });

  // 6. Invalid packet rejection
  await runAsyncTest('6. Corrupted packet rejection', () => {
    const badPkt = tcpSimulator.createPacket({
      flag: '[ACK]',
      seq: 2000,
      ack: 5000,
      payload: 'GET /index.html HTTP/1.1',
      corrupt: true
    });

    const verify = verifyTCPChecksum(badPkt);
    assert.strictEqual(verify.isValid, false, 'Tampered packet must be rejected');
    assert.strictEqual(badPkt.status, 'CORRUPTED');
  });

  // 7. Normal sliding window transmission
  await runAsyncTest('7. Normal sliding window transmission within rwnd', async () => {
    slidingWindow.reset();
    const st = await slidingWindow.sendData(512);
    assert.strictEqual(st.bytesSent, 512, 'Bytes sent should be 512');
    assert.strictEqual(st.receiverBufferUsed, 512, 'Receiver buffer used should be 512');
    assert.strictEqual(st.advertisedWindow, 4096 - 512, 'rwnd should be 3584');
    assert.strictEqual(st.clientSeq, 1512, 'Client seq should advance to 1512');
  });

  // 8. ACK-based window movement
  await runAsyncTest('8. ACK-based window sliding forward', async () => {
    const st = await slidingWindow.sendAck();
    assert.strictEqual(st.bytesAcked, 512, 'Bytes acknowledged should equal 512');
    assert.strictEqual(st.serverAck, 1512, 'Server ACK should equal 1512');
    assert.strictEqual(st.inFlightBytes, 0, 'In flight bytes should return to 0');
  });

  // 9. Receiver buffer exhaustion
  await runAsyncTest('9. Receiver buffer exhaustion', async () => {
    const st = await slidingWindow.fillReceiverBuffer();
    assert.strictEqual(st.receiverBufferUsed, 4096, 'Buffer should be completely full (4096B)');
    assert.strictEqual(st.bufferUtilizationPct, 100, 'Utilization must be 100%');
  });

  // 10. Zero Window detection
  await runAsyncTest('10. Zero Window detection (rwnd = 0)', () => {
    const st = slidingWindow.getState();
    assert.strictEqual(st.isZeroWindow, true, 'isZeroWindow flag must be true');
    assert.strictEqual(st.advertisedWindow, 0, 'Advertised window must be 0');
    assert.strictEqual(st.usableWindow, 0, 'Usable window must be 0');
  });

  // 11. Zero Window Probe (ZWP)
  await runAsyncTest('11. Zero Window Probe (ZWP) execution', async () => {
    const st = await slidingWindow.sendZeroWindowProbe();
    assert.ok(st.zeroWindowProbeCount >= 1, 'Probe count must increment');
    const lastHistory = st.history[st.history.length - 1];
    assert.strictEqual(lastHistory.action, 'ZERO_WINDOW_PROBE');
  });

  // 12. Window Update
  await runAsyncTest('12. Window Update after buffer draining', async () => {
    const st = await slidingWindow.freeReceiverBuffer(2048);
    assert.strictEqual(st.isZeroWindow, false, 'isZeroWindow must clear');
    assert.strictEqual(st.advertisedWindow, 2048, 'rwnd must expand to 2048B');
    assert.strictEqual(st.receiverBufferUsed, 2048, 'Buffer used must drop to 2048B');
  });

  // 13. Reset simulation
  await runAsyncTest('13. Reset sliding window simulation context', async () => {
    const st = slidingWindow.reset();
    assert.strictEqual(st.bytesSent, 0);
    assert.strictEqual(st.bytesAcked, 0);
    assert.strictEqual(st.receiverBufferUsed, 0);
    assert.strictEqual(st.advertisedWindow, 4096);
    assert.strictEqual(st.isZeroWindow, false);
  });

  // 14. Packet Inspector integration
  await runAsyncTest('14. Packet Inspector fields completeness (12 fields)', async () => {
    const connRes = await tcpSimulator.simulateConnect({ scenario: 'NORMAL_HANDSHAKE' });
    const pkt = connRes.packets[0];

    assert.ok(pkt.srcIp, 'Must have srcIp');
    assert.ok(pkt.dstIp, 'Must have dstIp');
    assert.ok(pkt.srcPort, 'Must have srcPort');
    assert.ok(pkt.dstPort, 'Must have dstPort');
    assert.ok(pkt.seq !== undefined, 'Must have seq');
    assert.ok(pkt.ack !== undefined, 'Must have ack');
    assert.ok(pkt.flag, 'Must have flag');
    assert.ok(pkt.windowSize, 'Must have windowSize');
    assert.ok(pkt.checksumHex, 'Must have checksumHex');
    assert.ok(pkt.checksumStatus, 'Must have checksumStatus');
    assert.ok(pkt.status, 'Must have status');
    assert.ok(pkt.timestamp, 'Must have timestamp');
  });

  // 15. Network Events integration
  await runAsyncTest('15. Network Events recording for CN failure and flow control', async () => {
    const events = await storage.events.find({}, { limit: 10 });
    const eventTypes = events.map(e => e.eventType);

    assert.ok(eventTypes.some(t => ['HANDSHAKE_SYN', 'CHECKSUM_MISMATCH', 'ZERO_WINDOW', 'WINDOW_UPDATE', 'PACKET_CORRUPTION'].includes(t)),
      'Network Events collection must store CN events');
  });

  console.log('===========================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log('===========================================================');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
})();
