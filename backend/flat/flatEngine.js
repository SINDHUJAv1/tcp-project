/**
 * FLAT Theory Lab Engine
 * Covers Formal Languages and Automata Theory (22ITT53)
 * CO1: Finite Automata & State Transitions
 * CO2: Regular Expressions & Input Validation (with TCP Flags & Packet Records)
 * CO3: Context-Free Grammars & Dynamic Sequence Parsing
 * CO4: Pushdown Automata & Stack Verification
 * CO5: Turing Machines & Decidability Analysis
 */

const REGEX_PATTERNS = {
  // RFC 1123 Hostname format
  hostname: {
    pattern: '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$',
    flags: '',
    description: 'RFC 1123 compliant domain/hostname regex. Labels separated by dots, max 63 chars per label, alphanumeric start and end, hyphens allowed internally.'
  },
  // IPv4 dotted-decimal address (0.0.0.0 to 255.255.255.255)
  ipv4: {
    pattern: '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    flags: '',
    description: 'Strict IPv4 dotted decimal address regex enforcing 0-255 octet boundaries.'
  },
  // TCP Port number (1 to 65535)
  port: {
    pattern: '^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$',
    flags: '',
    description: 'Strict TCP 16-bit integer port number regex accepting valid range 1 to 65535, rejecting 0 and numbers >= 65536.'
  },
  // TCP Flags format: single or bracketed combination of SYN, ACK, FIN, RST, PSH
  tcp_flags: {
    pattern: '^\\[?(SYN|ACK|FIN|RST|PSH)(,\\s*(SYN|ACK|FIN|RST|PSH))*\\]?$',
    flags: 'i',
    description: 'Validates TCP control flags (SYN, ACK, FIN, RST, PSH) with comma-delimited combinations, brackets, and RFC 793 semantic validation.'
  },
  // TCP Packet record format: SEQ:num ACK:num FLAGS:[...] WIN:num LEN:num
  packet_record: {
    pattern: '^SEQ:([0-9]{1,10})\\s+ACK:([0-9]{1,10})\\s+FLAGS:\\[(SYN|ACK|FIN|RST|PSH)(,\\s*(SYN|ACK|FIN|RST|PSH))*\\]\\s+WIN:([0-9]{1,5})\\s+LEN:([0-9]{1,5})$',
    flags: 'i',
    description: 'Validates serialized TCP packet header record enforcing SEQ, ACK, FLAGS, WIN, and LEN field specifications with 32-bit sequence and 16-bit window limits.'
  }
};

const REGEX_EXAMPLES = {
  hostname: [
    { input: 'api.github.com', valid: true, reason: 'Valid hierarchical domain structure with alphanumeric labels' },
    { input: '192.168.1.1', valid: true, reason: 'Valid IP formatted as alphanumeric label series' },
    { input: 'localhost', valid: true, reason: 'Valid single-label hostname' },
    { input: '-invalid.com', valid: false, reason: 'Invalid: Starts with a hyphen (RFC 1123 violation)' },
    { input: 'test..com', valid: false, reason: 'Invalid: Consecutive dots denote empty label' },
    { input: 'velalar@edu.in', valid: false, reason: 'Invalid: Contains prohibited character "@"' }
  ],
  ipv4: [
    { input: '127.0.0.1', valid: true, reason: 'Standard loopback IPv4 address' },
    { input: '192.168.10.45', valid: true, reason: 'Standard private Class C address' },
    { input: '255.255.255.255', valid: true, reason: 'Highest broadcast address (valid 255 boundary)' },
    { input: '256.1.1.1', valid: false, reason: 'Octet 256 exceeds 8-bit maximum (255)' },
    { input: '192.168.1', valid: false, reason: 'Missing 4th octet (requires exactly 4)' },
    { input: '192.168.1.1.5', valid: false, reason: 'Too many octets (found 5 octets)' }
  ],
  port: [
    { input: '80', valid: true, reason: 'Standard HTTP well-known port' },
    { input: '443', valid: true, reason: 'Standard HTTPS port' },
    { input: '8080', valid: true, reason: 'Common alternative web proxy port' },
    { input: '65535', valid: true, reason: 'Maximum valid 16-bit unsigned TCP port' },
    { input: '0', valid: false, reason: 'Port 0 is reserved and invalid for endpoint connection' },
    { input: '65536', valid: false, reason: 'Exceeds 16-bit unsigned maximum (2^16 - 1 = 65535)' },
    { input: '-80', valid: false, reason: 'Negative integer not permitted' },
    { input: '80a', valid: false, reason: 'Non-numeric character "a" detected' }
  ],
  tcp_flags: [
    { input: '[SYN]', valid: true, reason: 'Valid single connection initiation flag' },
    { input: '[SYN, ACK]', valid: true, reason: 'Valid 3-way handshake server response flag pair' },
    { input: '[PSH, ACK]', valid: true, reason: 'Valid data segment push acknowledgment' },
    { input: '[FIN, ACK]', valid: true, reason: 'Valid graceful connection teardown flag pair' },
    { input: '[RST]', valid: true, reason: 'Valid connection reset flag' },
    { input: '[SYN, FIN]', valid: false, reason: 'Semantic violation: SYN and FIN are mutually exclusive (RFC 793 anomaly scan)' },
    { input: '[SYN, RST]', valid: false, reason: 'Semantic violation: SYN and RST cannot be asserted together' },
    { input: '[SYN, SYN]', valid: false, reason: 'Semantic violation: Duplicate flag assertion' },
    { input: '[UNKNOWN]', valid: false, reason: 'Syntax violation: Unrecognized TCP control flag' }
  ],
  packet_record: [
    { input: 'SEQ:1000 ACK:0 FLAGS:[SYN] WIN:64240 LEN:0', valid: true, reason: 'Valid initial SYN packet record' },
    { input: 'SEQ:5000 ACK:1001 FLAGS:[SYN, ACK] WIN:65535 LEN:0', valid: true, reason: 'Valid SYN-ACK server response record' },
    { input: 'SEQ:1001 ACK:5001 FLAGS:[PSH, ACK] WIN:65535 LEN:512', valid: true, reason: 'Valid data payload transmission record' },
    { input: 'SEQ:1000 ACK:0 FLAGS:[SYN, FIN] WIN:64240 LEN:0', valid: false, reason: 'Semantic violation: Packet record contains illegal SYN+FIN flags' },
    { input: 'SEQ:1000 ACK:0 FLAGS:[SYN] WIN:999999 LEN:0', valid: false, reason: 'Boundary violation: Window size 999999 exceeds 16-bit unsigned limit (65535)' },
    { input: 'SEQ:abc ACK:0 FLAGS:[SYN] WIN:64240 LEN:0', valid: false, reason: 'Syntax violation: Sequence number must be an unsigned integer' }
  ]
};

/**
 * Semantic validation for TCP flags
 */
const validateFlagsSemantics = (flagsString) => {
  const cleaned = flagsString.replace(/[\[\]]/g, '').trim();
  if (!cleaned) {
    return { valid: false, reason: 'Flag expression cannot be empty.' };
  }

  const rawFlags = cleaned.split(',').map(f => f.trim().toUpperCase());
  const validFlagNames = ['SYN', 'ACK', 'FIN', 'RST', 'PSH'];

  // Check valid flag names
  for (const f of rawFlags) {
    if (!validFlagNames.includes(f)) {
      return { valid: false, reason: `Unrecognized TCP flag '${f}'. Permitted flags are SYN, ACK, FIN, RST, PSH.` };
    }
  }

  // Check duplicates
  const set = new Set(rawFlags);
  if (set.size !== rawFlags.length) {
    return { valid: false, reason: 'Duplicate flags detected in flag list.' };
  }

  // Check mutual exclusivity per RFC 793
  if (set.has('SYN') && set.has('FIN')) {
    return { valid: false, reason: 'RFC 793 Violation: SYN and FIN cannot be combined (SYN-FIN scan anomaly).' };
  }
  if (set.has('SYN') && set.has('RST')) {
    return { valid: false, reason: 'RFC 793 Violation: SYN and RST cannot be combined (RST aborts synchronization).' };
  }
  if (set.has('FIN') && set.has('RST')) {
    return { valid: false, reason: 'RFC 793 Violation: FIN and RST cannot be combined (cannot gracefully close and abort simultaneously).' };
  }

  return { valid: true, flags: Array.from(set) };
};

/**
 * Validate input against regex & semantics
 */
const validateInput = (type, value) => {
  const meta = REGEX_PATTERNS[type];
  if (!meta) {
    return { isValid: false, error: `Unknown validator type '${type}'` };
  }
  const reg = new RegExp(meta.pattern, meta.flags);
  const strVal = String(value).trim();
  const syntaxValid = reg.test(strVal);

  if (!syntaxValid) {
    return {
      type,
      value: strVal,
      pattern: meta.pattern,
      isValid: false,
      description: meta.description,
      message: `Input '${strVal}' violates the regular expression syntax constraints.`
    };
  }

  // Semantic checks for TCP Flags
  if (type === 'tcp_flags') {
    const sem = validateFlagsSemantics(strVal);
    if (!sem.valid) {
      return {
        type,
        value: strVal,
        pattern: meta.pattern,
        isValid: false,
        description: meta.description,
        message: `Syntax valid, but semantic check failed: ${sem.reason}`
      };
    }
  }

  // Semantic checks for Packet Record
  if (type === 'packet_record') {
    const match = strVal.match(new RegExp(meta.pattern, meta.flags));
    if (match) {
      const seq = Number(match[1]);
      const ack = Number(match[2]);
      const flagsStr = strVal.match(/FLAGS:\[(.*?)\]/i)?.[1] || '';
      const win = Number(match[match.length - 2]);
      const len = Number(match[match.length - 1]);

      if (seq > 4294967295) {
        return { type, value: strVal, pattern: meta.pattern, isValid: false, message: `SEQ ${seq} exceeds 32-bit unsigned limit (4,294,967,295).` };
      }
      if (ack > 4294967295) {
        return { type, value: strVal, pattern: meta.pattern, isValid: false, message: `ACK ${ack} exceeds 32-bit unsigned limit (4,294,967,295).` };
      }
      if (win > 65535) {
        return { type, value: strVal, pattern: meta.pattern, isValid: false, message: `Window size ${win} exceeds 16-bit unsigned limit (65,535).` };
      }
      if (len > 65495) {
        return { type, value: strVal, pattern: meta.pattern, isValid: false, message: `Payload length ${len} exceeds maximum TCP segment payload.` };
      }

      const semFlags = validateFlagsSemantics(flagsStr);
      if (!semFlags.valid) {
        return { type, value: strVal, pattern: meta.pattern, isValid: false, message: `Packet record semantic error: ${semFlags.reason}` };
      }
    }
  }

  return {
    type,
    value: strVal,
    pattern: meta.pattern,
    isValid: true,
    description: meta.description,
    message: `Input '${strVal}' matches the formal regular expression and passes all semantic checks.`
  };
};

/**
 * Context-Free Grammar (CFG) Definitions
 * G = (V, Sigma, R, S)
 */
const CFG_MODEL = {
  formalTuple: 'G = (V, Σ, R, S)',
  variables: ['S', 'Handshake', 'SessionBody', 'DataPhase', 'DataUnit', 'Teardown', 'FailureResponse'],
  terminals: ['CONNECT', 'SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK', 'RST', 'TIMEOUT'],
  startSymbol: 'S',
  productions: [
    { lhs: 'S', rhs: ['Handshake', 'SessionBody'], desc: 'Top-level session: Handshake followed by active session body or termination' },
    { lhs: 'Handshake', rhs: ['SYN', 'SYN_ACK', 'ACK'], desc: 'Standard 3-way handshake sequence' },
    { lhs: 'Handshake', rhs: ['CONNECT', 'SYN', 'SYN_ACK', 'ACK'], desc: 'Handshake initiated with explicit client connect event' },
    { lhs: 'Handshake', rhs: ['SYN', 'TIMEOUT'], desc: 'Handshake failure: SYN unacknowledged leading to timeout' },
    { lhs: 'Handshake', rhs: ['SYN', 'RST'], desc: 'Handshake failure: Server rejects connection with TCP Reset' },
    { lhs: 'SessionBody', rhs: ['DataPhase', 'Teardown'], desc: 'Session lifecycle: Data exchange followed by graceful teardown' },
    { lhs: 'SessionBody', rhs: ['DataPhase'], desc: 'Established session with data phase' },
    { lhs: 'SessionBody', rhs: ['Teardown'], desc: 'Immediate graceful teardown without data' },
    { lhs: 'SessionBody', rhs: ['FailureResponse'], desc: 'Abrupt session termination via RST or Timeout' },
    { lhs: 'SessionBody', rhs: ['ε'], desc: 'Empty session body (handshake only)' },
    { lhs: 'DataPhase', rhs: ['DataUnit', 'DataPhase'], desc: 'Recursive stream of acknowledged data units' },
    { lhs: 'DataPhase', rhs: ['DataUnit'], desc: 'Single data unit exchange' },
    { lhs: 'DataPhase', rhs: ['ε'], desc: 'Empty data stream' },
    { lhs: 'DataUnit', rhs: ['DATA', 'DATA_ACK'], desc: 'Standard data segment followed by peer acknowledgment' },
    { lhs: 'DataUnit', rhs: ['DATA', 'ACK'], desc: 'Data segment acknowledged with standard ACK' },
    { lhs: 'DataUnit', rhs: ['DATA'], desc: 'Single data segment' },
    { lhs: 'Teardown', rhs: ['FIN', 'ACK', 'FIN', 'ACK'], desc: 'Graceful 4-way teardown sequence' },
    { lhs: 'Teardown', rhs: ['FIN', 'FIN_ACK'], desc: 'Simultaneous or combined FIN-ACK teardown' },
    { lhs: 'Teardown', rhs: ['FIN', 'ACK'], desc: 'Client-initiated FIN acknowledged by server' },
    { lhs: 'FailureResponse', rhs: ['RST'], desc: 'Abrupt abort via TCP RST segment' },
    { lhs: 'FailureResponse', rhs: ['TIMEOUT'], desc: 'Session dropped due to Keep-Alive or RTO timeout' }
  ]
};

/**
 * Interactive TCP Event Sequence CFG Parser
 * Parses user-entered sequence and generates actual derivation or grammar rejection reason
 */
const parseCFGSequence = (input) => {
  let rawTokens = [];
  if (Array.isArray(input)) {
    rawTokens = input;
  } else if (typeof input === 'string') {
    rawTokens = input.trim().split(/[\s,]+/).filter(Boolean);
  }

  // Normalize tokens
  const tokens = rawTokens.map(t => {
    const upper = t.toUpperCase().replace(/[-_]/g, '_');
    if (upper === 'SYN_ACK' || upper === 'SYNACK') return 'SYN_ACK';
    if (upper === 'FIN_ACK' || upper === 'FINACK') return 'FIN_ACK';
    if (upper === 'DATA_ACK' || upper === 'DATAACK') return 'DATA_ACK';
    return upper;
  });

  if (tokens.length === 0) {
    return {
      accepted: false,
      tokens: [],
      errorIndex: 0,
      reason: 'Empty sequence. Please enter TCP communication event tokens (e.g., SYN, SYN_ACK, ACK, DATA, FIN, ACK).',
      derivationSteps: []
    };
  }

  let index = 0;
  const derivationSteps = [{ step: 1, text: 'S', rule: 'Start Symbol S' }];

  const currentToken = () => tokens[index];

  // Helper to add derivation step
  const addStep = (rule, text) => {
    derivationSteps.push({
      step: derivationSteps.length + 1,
      rule,
      text
    });
  };

  // Phase 1: Parse Handshake
  addStep('S -> Handshake SessionBody', 'Handshake SessionBody');

  let handshakeType = null;
  const hasConnect = currentToken() === 'CONNECT';
  if (hasConnect) {
    index++;
  }

  if (currentToken() !== 'SYN') {
    return {
      accepted: false,
      tokens,
      errorIndex: index,
      errorToken: currentToken() || 'END_OF_STRING',
      expected: ['SYN', 'CONNECT'],
      reason: `Grammar syntax error at token ${index + 1} ('${currentToken() || 'END'}'): A valid TCP session MUST begin with 'SYN' (or 'CONNECT SYN'). Encountered '${currentToken() || 'END'}'.`,
      derivationSteps
    };
  }
  index++; // Consume SYN

  if (currentToken() === 'TIMEOUT') {
    index++;
    handshakeType = 'SYN_TIMEOUT';
    addStep('Handshake -> SYN TIMEOUT', 'SYN TIMEOUT SessionBody');
  } else if (currentToken() === 'RST') {
    index++;
    handshakeType = 'SYN_RST';
    addStep('Handshake -> SYN RST', 'SYN RST SessionBody');
  } else if (currentToken() === 'SYN_ACK') {
    index++;
    if (currentToken() !== 'ACK') {
      return {
        accepted: false,
        tokens,
        errorIndex: index,
        errorToken: currentToken() || 'END_OF_STRING',
        expected: ['ACK'],
        reason: `Grammar violation in 3-way handshake at token ${index + 1}: After receiving 'SYN_ACK', the client MUST transmit 'ACK' to finalize connection establishment. Found '${currentToken() || 'END'}'.`,
        derivationSteps
      };
    }
    index++; // Consume ACK
    handshakeType = '3WAY_HANDSHAKE';
    if (hasConnect) {
      addStep('Handshake -> CONNECT SYN SYN_ACK ACK', 'CONNECT SYN SYN_ACK ACK SessionBody');
    } else {
      addStep('Handshake -> SYN SYN_ACK ACK', 'SYN SYN_ACK ACK SessionBody');
    }
  } else {
    return {
      accepted: false,
      tokens,
      errorIndex: index,
      errorToken: currentToken() || 'END_OF_STRING',
      expected: ['SYN_ACK', 'TIMEOUT', 'RST'],
      reason: `Grammar violation at token ${index + 1} ('${currentToken() || 'END'}'): In the handshake phase, 'SYN' must be followed by 'SYN_ACK', 'TIMEOUT', or 'RST'.`,
      derivationSteps
    };
  }

  // If handshake terminated with TIMEOUT or RST
  if (handshakeType === 'SYN_TIMEOUT' || handshakeType === 'SYN_RST') {
    if (index < tokens.length) {
      return {
        accepted: false,
        tokens,
        errorIndex: index,
        errorToken: currentToken(),
        reason: `Grammar error: Handshake terminated with '${tokens[index - 1]}'. No further symbols are accepted in this session. Found unexpected trailing token '${currentToken()}'.`,
        derivationSteps
      };
    }
    addStep('SessionBody -> ε', (hasConnect ? 'CONNECT ' : '') + (handshakeType === 'SYN_TIMEOUT' ? 'SYN TIMEOUT' : 'SYN RST'));
    return {
      accepted: true,
      tokens,
      scenario: handshakeType === 'SYN_TIMEOUT' ? 'Handshake SYN Timeout' : 'Handshake Connection Refused (RST)',
      derivationSteps,
      finalSentence: tokens,
      explanation: 'The entered sequence is fully accepted by the Context-Free Grammar as a valid TCP handshake terminal failure trace.'
    };
  }

  // Phase 2: SessionBody (DataPhase + Teardown or Failure)
  if (index >= tokens.length) {
    // Empty session body after 3-way handshake
    addStep('SessionBody -> ε', (hasConnect ? 'CONNECT ' : '') + 'SYN SYN_ACK ACK');
    return {
      accepted: true,
      tokens,
      scenario: '3-Way Handshake Established Only',
      derivationSteps,
      finalSentence: tokens,
      explanation: 'The sequence is accepted by grammar G: Successful 3-way handshake with empty session body (ε).'
    };
  }

  // Check abrupt failure response
  if (currentToken() === 'RST') {
    index++;
    addStep('SessionBody -> FailureResponse', (hasConnect ? 'CONNECT ' : '') + 'SYN SYN_ACK ACK RST');
    if (index < tokens.length) {
      return {
        accepted: false,
        tokens,
        errorIndex: index,
        errorToken: currentToken(),
        reason: `Unexpected token '${currentToken()}' after abrupt TCP RST teardown.`,
        derivationSteps
      };
    }
    return {
      accepted: true,
      tokens,
      scenario: 'Established Session Peer Reset (RST)',
      derivationSteps,
      finalSentence: tokens,
      explanation: 'Sequence accepted: Established connection aborted via TCP Reset (RST).'
    };
  }

  // Parse DataPhase
  let dataUnits = 0;
  while (index < tokens.length && currentToken() === 'DATA') {
    index++; // Consume DATA
    dataUnits++;
    if (currentToken() === 'DATA_ACK' || currentToken() === 'ACK') {
      const ackTok = currentToken();
      index++;
      addStep('DataPhase -> DataUnit DataPhase', `... DATA ${ackTok} DataPhase ...`);
    } else {
      addStep('DataPhase -> DataUnit DataPhase', '... DATA DataPhase ...');
    }
  }

  // Check remaining for Teardown or Failure
  if (index < tokens.length) {
    if (currentToken() === 'FIN') {
      index++; // Consume FIN
      if (currentToken() === 'FIN_ACK') {
        index++;
        addStep('Teardown -> FIN FIN_ACK', '... FIN FIN_ACK');
      } else if (currentToken() === 'ACK') {
        index++;
        if (currentToken() === 'FIN' && tokens[index + 1] === 'ACK') {
          index += 2;
          addStep('Teardown -> FIN ACK FIN ACK', '... FIN ACK FIN ACK');
        } else {
          addStep('Teardown -> FIN ACK', '... FIN ACK');
        }
      } else {
        return {
          accepted: false,
          tokens,
          errorIndex: index,
          errorToken: currentToken() || 'END_OF_STRING',
          expected: ['ACK', 'FIN_ACK'],
          reason: `Grammar violation in teardown phase: Client sent 'FIN' but expected peer acknowledgment ('ACK' or 'FIN_ACK'). Encountered '${currentToken() || 'END'}'.`,
          derivationSteps
        };
      }
    } else if (currentToken() === 'RST') {
      index++;
      addStep('SessionBody -> FailureResponse', '... RST');
    } else if (currentToken() === 'TIMEOUT') {
      index++;
      addStep('SessionBody -> FailureResponse', '... TIMEOUT');
    } else {
      return {
        accepted: false,
        tokens,
        errorIndex: index,
        errorToken: currentToken(),
        expected: ['DATA', 'FIN', 'RST', 'TIMEOUT'],
        reason: `Grammar rejection at token ${index + 1}: Unexpected symbol '${currentToken()}'. In Established state, valid symbols are DATA, FIN, RST, or TIMEOUT.`,
        derivationSteps
      };
    }
  }

  if (index < tokens.length) {
    return {
      accepted: false,
      tokens,
      errorIndex: index,
      errorToken: currentToken(),
      reason: `Grammar error: Extra unconsumed tokens starting at token ${index + 1} ('${currentToken()}'). Session already reached terminal derivation.`,
      derivationSteps
    };
  }

  addStep('Session Derivation Complete', tokens.join(' '));

  return {
    accepted: true,
    tokens,
    scenario: dataUnits > 0 ? `Full Session with ${dataUnits} Data Exchange(s)` : 'Session with Graceful Teardown',
    derivationSteps,
    finalSentence: tokens,
    explanation: 'The entered sequence strictly satisfies all production rules of Context-Free Grammar G = (V, Σ, R, S) and belongs to language L(G).'
  };
};

/**
 * Generate Step-by-Step Derivation (preset wrapper)
 */
const generateDerivation = (scenarioType = 'full_session_2_data') => {
  if (scenarioType === 'connection_refused') {
    return parseCFGSequence('SYN SYN_ACK ACK RST');
  }
  if (scenarioType === 'syn_timeout') {
    return parseCFGSequence('SYN TIMEOUT');
  }
  return parseCFGSequence('SYN SYN_ACK ACK DATA DATA_ACK FIN ACK FIN ACK');
};

/**
 * Pushdown Automaton (PDA) Engine
 * Formal Tuple: P = (Q, Sigma, Gamma, delta, q0, Z0, F)
 */
const PDA_MODEL = {
  formalTuple: 'P = (Q, Σ, Γ, δ, q0, Z0, F)',
  states: ['q_closed', 'q_syn_sent', 'q_established', 'q_data_wait', 'q_fin_sent', 'q_accept'],
  inputAlphabet: ['CONNECT', 'SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK', 'RST', 'TIMEOUT'],
  stackAlphabet: ['Z0', 'S_FRAME', 'D_FRAME', 'F_FRAME'],
  initialState: 'q_closed',
  initialStackSymbol: 'Z0',
  acceptingStates: ['q_accept'],
  description: 'PDA models balanced packet-acknowledgment framing and session nesting using a LIFO stack. Transmitted frames push tokens; matching peer acknowledgments pop them until only bottom marker Z0 remains.'
};

/**
 * Simulate PDA Stack operations on a given sequence
 */
const simulatePDATrace = (input = ['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']) => {
  let tokens = [];
  if (Array.isArray(input)) {
    tokens = input;
  } else if (typeof input === 'string') {
    tokens = input.trim().split(/[\s,]+/).filter(Boolean);
  }

  tokens = tokens.map(t => t.toUpperCase().replace(/[-_]/g, '_'));

  const steps = [];
  let state = 'q_closed';
  let stack = ['Z0'];

  steps.push({
    token: 'START',
    state,
    stack: [...stack],
    action: 'Initialize with Bottom-of-Stack marker Z0',
    valid: true
  });

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let action = '';
    let valid = true;

    if (t === 'CONNECT') {
      action = 'Client initiates connect intent (Stack unchanged)';
    } else if (t === 'SYN') {
      state = 'q_syn_sent';
      stack.push('S_FRAME');
      action = 'Push S_FRAME: Tracking unacknowledged handshake SYN';
    } else if (t === 'SYN_ACK' || t === 'ACK') {
      if (stack[stack.length - 1] === 'S_FRAME') {
        stack.pop();
        state = 'q_established';
        action = 'Pop S_FRAME: Handshake acknowledged. State Established.';
      } else {
        action = 'State Established keep-alive ACK (Stack unchanged)';
      }
    } else if (t === 'DATA') {
      stack.push('D_FRAME');
      state = 'q_data_wait';
      action = 'Push D_FRAME: Buffering in-flight data frame awaiting peer ACK';
    } else if (t === 'DATA_ACK') {
      if (stack[stack.length - 1] === 'D_FRAME') {
        stack.pop();
        state = 'q_established';
        action = 'Pop D_FRAME: Data segment acknowledged';
      } else {
        action = 'Unexpected DATA_ACK without matching D_FRAME on stack';
        valid = false;
      }
    } else if (t === 'FIN') {
      stack.push('F_FRAME');
      state = 'q_fin_sent';
      action = 'Push F_FRAME: Active teardown request issued';
    } else if (t === 'FIN_ACK') {
      if (stack[stack.length - 1] === 'F_FRAME') {
        stack.pop();
        state = 'q_accept';
        action = 'Pop F_FRAME: Teardown confirmed. Stack returned to Z0. Accepted.';
      } else {
        action = 'Mismatched FIN_ACK without F_FRAME on stack';
        valid = false;
      }
    } else if (t === 'RST') {
      action = 'Abrupt TCP RST: Session halted prematurely';
      valid = false;
    } else if (t === 'TIMEOUT') {
      action = 'Timeout expired: Unacknowledged frame retained on stack';
      valid = false;
    } else {
      action = `Unrecognized symbol '${t}' in PDA alphabet`;
      valid = false;
    }

    steps.push({
      token: t,
      state,
      stack: [...stack],
      action,
      valid
    });

    if (!valid) break;
  }

  const isAccepted = state === 'q_accept' && stack.length === 1 && stack[0] === 'Z0';

  return {
    pda: PDA_MODEL,
    tokens,
    steps,
    finalState: state,
    finalStack: stack,
    isAccepted,
    resultSummary: isAccepted
      ? 'String accepted by final state q_accept and empty stack above bottom marker Z0.'
      : 'Sequence halted before accepting condition (unbalanced stack or illegal token transition).'
  };
};

/**
 * Turing Machine Model and Decidability Analysis (CO5)
 * Formal 7-tuple: M = (Q, Sigma, Gamma, delta, q0, B, F)
 */
const TURING_MACHINE_MODEL = {
  formalTuple: 'M = (Q, Σ, Γ, δ, q0_start, B, F)',
  states: [
    'q0_start',
    'q1_syn_seen',
    'q2_synack_seen',
    'q3_established',
    'q4_data_pending',
    'q5_fin_seen',
    'q_accept',
    'q_missing_ack',
    'q_timeout_detected',
    'q_reject'
  ],
  tapeAlphabet: ['SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK', 'RST', 'TIMEOUT', 'B (Blank)'],
  inputAlphabet: ['CONNECT', 'SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK', 'RST', 'TIMEOUT'],
  initialState: 'q0_start',
  blankSymbol: 'B',
  finalStates: ['q_accept', 'q_missing_ack', 'q_timeout_detected', 'q_reject'],
  decidabilityAnalysis: {
    isDecidable: true,
    complexityClass: 'P (Deterministic Linear Time O(n))',
    theorem: 'The language L(TCP_FINITE_TRACES) of valid serialized TCP connection events is strictly decidable.',
    proofSummary: 'Because the sequence of TCP events is finite and recognized by a deterministic finite state control with tape head traversing left-to-right, the Turing Machine inspects each tape cell exactly once or twice, halts in at most O(n) tape steps, and always halts either in q_accept or one of the diagnostic rejecting states (q_missing_ack, q_timeout_detected, q_reject). No infinite looping is possible on finite inputs.',
    distinction: {
      decidableProblems: [
        'Hostname format validation against RFC 1123 (Regular Language, decidable in O(n))',
        'IPv4 dotted-decimal address validation (Regular Language, decidable in O(1))',
        'Port range checking 1..65535 (Finite language, decidable in O(1))',
        'Finite TCP event trace verification (DFA/TM decidable in O(n))',
        'Missing ACK and Timeout marker detection on finite tapes (Decidable in O(n))'
      ],
      undecidableProblemsInNetworking: [
        'The Two Generals Problem: Consensus over an unreliable communication link with message loss is provably impossible.',
        'Arbitrary Distributed Protocol Deadlock with unbounded message queues is equivalent to the Turing Halting Problem (Undecidable).',
        'Post Correspondence Problem (PCP) applied to unbounded distributed routing topologies.'
      ]
    }
  }
};

/**
 * Interactive Turing Machine Tape Simulator (CO5)
 * Simulates deterministic tape transitions, detects missing ACK and TIMEOUT markers
 */
const simulateTuringMachine = (input) => {
  let rawTokens = [];
  if (Array.isArray(input)) {
    rawTokens = input;
  } else if (typeof input === 'string') {
    rawTokens = input.trim().split(/[\s,]+/).filter(Boolean);
  }

  // Normalize tokens
  const tokens = rawTokens.map(t => {
    const upper = t.toUpperCase().replace(/[-_]/g, '_');
    if (upper === 'SYN_ACK' || upper === 'SYNACK') return 'SYN_ACK';
    if (upper === 'FIN_ACK' || upper === 'FINACK') return 'FIN_ACK';
    if (upper === 'DATA_ACK' || upper === 'DATAACK') return 'DATA_ACK';
    return upper;
  });

  // Tape initialized with tokens followed by Blank markers B
  const tape = [...tokens, 'B'];
  const steps = [];

  let state = 'q0_start';
  let head = 0;
  let isHalted = false;
  let verdict = 'RUNNING';
  let explanation = '';

  // Max step limit to guarantee halting
  const maxSteps = Math.max(30, tape.length * 3);
  let stepCount = 0;

  while (!isHalted && stepCount < maxSteps) {
    stepCount++;
    const currentSymbol = head < tape.length ? tape[head] : 'B';
    const tapeSnapshot = [...tape];
    let nextState = state;
    let writeSymbol = currentSymbol;
    let moveDirection = 'R'; // 'R', 'L', 'S' (Stay)
    let actionDesc = '';

    // Check TIMEOUT marker anywhere
    if (currentSymbol === 'TIMEOUT') {
      nextState = 'q_timeout_detected';
      moveDirection = 'S';
      actionDesc = `Tape read 'TIMEOUT' marker at head [${head}]. Halting immediately.`;
      isHalted = true;
      verdict = 'REJECTED_TIMEOUT';
      explanation = `Detected TIMEOUT marker at tape cell ${head}. Connection attempt or keep-alive timed out (RTO expired).`;
    } else {
      switch (state) {
        case 'q0_start':
          if (currentSymbol === 'CONNECT') {
            nextState = 'q0_start';
            moveDirection = 'R';
            actionDesc = "Read 'CONNECT' event, moving tape head RIGHT";
          } else if (currentSymbol === 'SYN') {
            nextState = 'q1_syn_seen';
            moveDirection = 'R';
            actionDesc = "Read initial 'SYN'. Moving tape head RIGHT, scanning for server 'SYN_ACK'.";
          } else if (currentSymbol === 'RST') {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED';
            explanation = 'Immediate TCP RST received without SYN handshake.';
            actionDesc = "Read 'RST'. Transitioning to q_reject.";
          } else {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED';
            explanation = `Invalid start symbol '${currentSymbol}'. Protocol requires initial SYN.`;
            actionDesc = `Unexpected symbol '${currentSymbol}' at head [${head}]. Halting in q_reject.`;
          }
          break;

        case 'q1_syn_seen':
          if (currentSymbol === 'SYN_ACK') {
            nextState = 'q2_synack_seen';
            moveDirection = 'R';
            actionDesc = "Read server 'SYN_ACK'. Moving RIGHT, scanning for client 'ACK'.";
          } else if (currentSymbol === 'RST') {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_RST';
            explanation = 'Server actively rejected connection with TCP RST (ECONNREFUSED).';
            actionDesc = "Read 'RST'. Target port is closed. Halting in q_reject.";
          } else if (currentSymbol === 'B') {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = 'Missing SYN-ACK: End of tape (Blank B) reached without server handshake acknowledgment.';
            actionDesc = "Detected Missing ACK: Tape ended before receiving 'SYN_ACK'. Halting in q_missing_ack.";
          } else {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = `Missing SYN-ACK: Expected server 'SYN_ACK' after SYN, but encountered '${currentSymbol}'.`;
            actionDesc = `Unexpected token '${currentSymbol}'. Halting in q_missing_ack.`;
          }
          break;

        case 'q2_synack_seen':
          if (currentSymbol === 'ACK') {
            nextState = 'q3_established';
            moveDirection = 'R';
            actionDesc = "Read client final 'ACK'. 3-Way Handshake established successfully!";
          } else if (currentSymbol === 'B') {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = 'Missing ACK: Client failed to send final 3-way handshake ACK before session ended.';
            actionDesc = "Detected Missing ACK: Blank symbol reached while awaiting final client ACK.";
          } else {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = `Missing ACK: Expected client 'ACK' to complete handshake, found '${currentSymbol}'.`;
            actionDesc = `Encountered '${currentSymbol}' instead of ACK. Halting in q_missing_ack.`;
          }
          break;

        case 'q3_established':
          if (currentSymbol === 'DATA') {
            nextState = 'q4_data_pending';
            moveDirection = 'R';
            actionDesc = "Read application 'DATA' segment. Moving RIGHT, scanning for peer 'DATA_ACK'.";
          } else if (currentSymbol === 'FIN') {
            nextState = 'q5_fin_seen';
            moveDirection = 'R';
            actionDesc = "Read teardown 'FIN'. Moving RIGHT, scanning for teardown 'ACK'.";
          } else if (currentSymbol === 'RST') {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_RST';
            explanation = 'Established connection abruptly reset by remote peer.';
            actionDesc = "Read 'RST'. Connection reset. Halting in q_reject.";
          } else if (currentSymbol === 'B') {
            nextState = 'q_accept';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'ACCEPTED';
            explanation = 'Established TCP session verified with clean tape termination.';
            actionDesc = 'Reached Blank symbol B. Session verified. Halting in q_accept.';
          } else {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED';
            explanation = `Unexpected symbol '${currentSymbol}' in Established state.`;
            actionDesc = `Protocol violation in Established state: unexpected '${currentSymbol}'.`;
          }
          break;

        case 'q4_data_pending':
          if (currentSymbol === 'DATA_ACK' || currentSymbol === 'ACK') {
            nextState = 'q3_established';
            moveDirection = 'R';
            actionDesc = `Read '${currentSymbol}'. Data payload acknowledged. Returning to Established state.`;
          } else if (currentSymbol === 'B') {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = 'Missing Data ACK: Data segment was transmitted but peer acknowledgment was never received on tape.';
            actionDesc = "Detected Missing ACK: Tape ended (B) while awaiting acknowledgment for DATA.";
          } else {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = `Missing Data ACK: Expected DATA_ACK after data transmission, but encountered '${currentSymbol}'.`;
            actionDesc = `Unexpected symbol '${currentSymbol}'. Halting in q_missing_ack.`;
          }
          break;

        case 'q5_fin_seen':
          if (currentSymbol === 'ACK' || currentSymbol === 'FIN_ACK') {
            nextState = 'q_accept';
            moveDirection = 'R';
            isHalted = true;
            verdict = 'ACCEPTED';
            explanation = 'Connection teardown acknowledged and completed gracefully.';
            actionDesc = `Read '${currentSymbol}'. Teardown finalized. Halting in q_accept.`;
          } else if (currentSymbol === 'B') {
            nextState = 'q_missing_ack';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED_MISSING_ACK';
            explanation = 'Missing FIN ACK: Connection teardown request FIN was sent, but remote peer ACK was never received.';
            actionDesc = 'Detected Missing ACK: Tape ended before teardown ACK.';
          } else {
            nextState = 'q_reject';
            moveDirection = 'S';
            isHalted = true;
            verdict = 'REJECTED';
            explanation = `Expected teardown acknowledgment, found '${currentSymbol}'.`;
            actionDesc = `Unexpected symbol '${currentSymbol}'. Halting in q_reject.`;
          }
          break;

        default:
          isHalted = true;
          verdict = state.includes('accept') ? 'ACCEPTED' : 'REJECTED';
          actionDesc = `Halting in terminal state ${state}.`;
          break;
      }
    }

    steps.push({
      stepNumber: stepCount,
      state,
      nextState,
      headPosition: head,
      currentSymbol,
      writeSymbol,
      moveDirection,
      actionDescription: actionDesc,
      tapeSnapshot,
      isHalted,
      verdict
    });

    state = nextState;
    if (moveDirection === 'R') head++;
    else if (moveDirection === 'L') head = Math.max(0, head - 1);

    if (state === 'q_accept' || state === 'q_missing_ack' || state === 'q_timeout_detected' || state === 'q_reject') {
      isHalted = true;
    }
  }

  return {
    model: TURING_MACHINE_MODEL,
    inputTokens: tokens,
    initialTape: [...tokens, 'B'],
    finalTape: tape,
    finalHeadPosition: head,
    finalState: state,
    totalSteps: steps.length,
    verdict,
    isAccepted: state === 'q_accept',
    explanation: explanation || (state === 'q_accept' ? 'Input trace accepted by Turing Machine.' : 'Input trace rejected by Turing Machine.'),
    steps
  };
};

module.exports = {
  REGEX_PATTERNS,
  REGEX_EXAMPLES,
  validateFlagsSemantics,
  validateInput,
  CFG_MODEL,
  parseCFGSequence,
  generateDerivation,
  PDA_MODEL,
  simulatePDATrace,
  TURING_MACHINE_MODEL,
  simulateTuringMachine
};
