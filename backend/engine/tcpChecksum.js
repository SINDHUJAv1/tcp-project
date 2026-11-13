/**
 * TCP Checksum Engine
 * Implements the official 16-bit One's Complement Checksum algorithm (RFC 793 / RFC 1071)
 *
 * Algorithm Steps:
 * 1. Build the TCP Pseudo-Header:
 *    - Source IP (32-bit, split into two 16-bit words)
 *    - Destination IP (32-bit, split into two 16-bit words)
 *    - Zero byte (8-bit) + Protocol byte (8-bit, 6 for TCP)
 *    - TCP Segment Length (16-bit, TCP Header 20B + Payload Length)
 * 2. Sum the 16-bit words of the TCP Header (with Checksum field set to 0).
 * 3. Sum the 16-bit words of the Payload (padded with 0x00 if odd length).
 * 4. Add carries (fold 32-bit sum into 16 bits).
 * 5. Compute bitwise NOT (~sum & 0xFFFF) to obtain the 1's complement.
 */

// Helper to convert dotted-decimal IPv4 to array of octets
function parseIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return [127, 0, 0, 1];
  const parts = ipStr.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    return parts;
  }
  return [127, 0, 0, 1];
}

// Map flag string (e.g. "[SYN, ACK]") to 6-bit control flag mask
function parseFlagsToBits(flagStr) {
  if (!flagStr) return 0;
  const upper = String(flagStr).toUpperCase();
  let bits = 0;
  if (upper.includes('URG')) bits |= 0x20;
  if (upper.includes('ACK')) bits |= 0x10;
  if (upper.includes('PSH')) bits |= 0x08;
  if (upper.includes('RST')) bits |= 0x04;
  if (upper.includes('SYN')) bits |= 0x02;
  if (upper.includes('FIN')) bits |= 0x01;
  return bits;
}

/**
 * Calculate 16-bit one's complement TCP checksum
 */
function calculateTCPChecksum(packetParams) {
  const {
    srcIp = '192.168.1.10',
    dstIp = '93.184.216.34',
    srcPort = 49152,
    dstPort = 443,
    seq = 1000,
    ack = 0,
    flag = '[SYN]',
    windowSize = 64240,
    urgentPointer = 0,
    payload = ''
  } = packetParams;

  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload || ''), 'utf8');
  const tcpLength = 20 + payloadBuffer.length; // 20 bytes standard header + payload

  let sum = 0;

  // --- Step 1: Pseudo-Header ---
  const srcOctets = parseIp(srcIp);
  const dstOctets = parseIp(dstIp);

  // Source IP (2 words)
  sum += (srcOctets[0] << 8) | srcOctets[1];
  sum += (srcOctets[2] << 8) | srcOctets[3];

  // Destination IP (2 words)
  sum += (dstOctets[0] << 8) | dstOctets[1];
  sum += (dstOctets[2] << 8) | dstOctets[3];

  // Zero byte (0x00) + Protocol (6 = TCP)
  sum += (0 << 8) | 6;

  // TCP Segment Length (Header + Payload)
  sum += tcpLength;

  // --- Step 2: TCP Header (20 bytes standard, checksum field = 0) ---
  // Source Port
  sum += Number(srcPort) & 0xFFFF;
  // Destination Port
  sum += Number(dstPort) & 0xFFFF;

  // Sequence Number (32-bit = 2 words)
  const seqNum = Number(seq) >>> 0;
  sum += (seqNum >>> 16) & 0xFFFF;
  sum += seqNum & 0xFFFF;

  // Acknowledgment Number (32-bit = 2 words)
  const ackNum = Number(ack) >>> 0;
  sum += (ackNum >>> 16) & 0xFFFF;
  sum += ackNum & 0xFFFF;

  // Data Offset (5 = 20 bytes), Reserved (0), Flags (6 bits)
  const flagBits = parseFlagsToBits(flag);
  const dataOffsetAndFlags = (5 << 12) | (0 << 6) | (flagBits & 0x3F);
  sum += dataOffsetAndFlags;

  // Window Size
  sum += Number(windowSize) & 0xFFFF;

  // Checksum Field is 0 during computation
  sum += 0;

  // Urgent Pointer
  sum += Number(urgentPointer) & 0xFFFF;

  // --- Step 3: Payload (with odd-length padding) ---
  for (let i = 0; i < payloadBuffer.length; i += 2) {
    const byte1 = payloadBuffer[i];
    const byte2 = (i + 1 < payloadBuffer.length) ? payloadBuffer[i + 1] : 0x00; // Pad odd byte with 0x00
    sum += (byte1 << 8) | byte2;
  }

  // --- Step 4: Fold 32-bit carries into 16 bits ---
  while (sum >>> 16) {
    sum = (sum & 0xFFFF) + (sum >>> 16);
  }

  // --- Step 5: Bitwise One's Complement ---
  const checksum = (~sum) & 0xFFFF;
  const checksumHex = '0x' + checksum.toString(16).toUpperCase().padStart(4, '0');

  return {
    checksum,
    checksumHex,
    tcpLength,
    payloadLength: payloadBuffer.length,
    isOddLength: (payloadBuffer.length % 2) !== 0,
    pseudoHeaderSummary: {
      srcIp,
      dstIp,
      protocol: 'TCP (6)',
      tcpLength
    }
  };
}

/**
 * Verify packet checksum
 */
function verifyTCPChecksum(packet) {
  if (!packet) return { isValid: false, reason: 'Packet is undefined' };

  const expected = calculateTCPChecksum({
    srcIp: packet.srcIp || '192.168.1.10',
    dstIp: packet.dstIp || '93.184.216.34',
    srcPort: packet.srcPort !== undefined ? packet.srcPort : 49152,
    dstPort: packet.dstPort !== undefined ? packet.dstPort : 443,
    seq: packet.seq !== undefined ? packet.seq : 1000,
    ack: packet.ack !== undefined ? packet.ack : 0,
    flag: packet.flag || '[SYN]',
    windowSize: packet.windowSize !== undefined ? packet.windowSize : 64240,
    payload: packet.payload || ''
  });

  const receivedHex = packet.checksumHex || ('0x' + Number(packet.checksum || 0).toString(16).toUpperCase().padStart(4, '0'));
  const isValid = receivedHex.toUpperCase() === expected.checksumHex.toUpperCase();

  return {
    isValid,
    expectedChecksum: expected.checksum,
    expectedChecksumHex: expected.checksumHex,
    receivedChecksum: packet.checksum,
    receivedChecksumHex: receivedHex,
    isOddLength: expected.isOddLength,
    message: isValid
      ? `TCP Checksum Valid (${receivedHex}): 16-bit 1's complement matched over pseudo-header, header, and ${expected.payloadLength}B payload.`
      : `Checksum Mismatch! Expected ${expected.checksumHex}, but received ${receivedHex}. Segment corrupted in transit.`
  };
}

module.exports = {
  calculateTCPChecksum,
  verifyTCPChecksum,
  parseIp,
  parseFlagsToBits
};
