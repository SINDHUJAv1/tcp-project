const {
  REGEX_PATTERNS,
  REGEX_EXAMPLES,
  validateInput,
  CFG_MODEL,
  parseCFGSequence,
  generateDerivation,
  PDA_MODEL,
  simulatePDATrace,
  TURING_MACHINE_MODEL,
  simulateTuringMachine
} = require('../flat/flatEngine');

const validateRegex = (req, res) => {
  const { type, value } = req.body;
  if (!type || value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Both "type" and "value" are required.'
    });
  }

  const result = validateInput(type, value);
  res.status(200).json({
    success: true,
    data: result
  });
};

const getRegexDetails = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      patterns: REGEX_PATTERNS,
      examples: REGEX_EXAMPLES
    }
  });
};

const getCFG = (req, res) => {
  res.status(200).json({
    success: true,
    data: CFG_MODEL
  });
};

const getDerivation = (req, res) => {
  const { scenario = 'full_session_2_data' } = req.query;
  const derivation = generateDerivation(scenario);
  res.status(200).json({
    success: true,
    data: derivation
  });
};

const parseCFG = (req, res) => {
  const { sequence } = req.body;
  if (!sequence && sequence !== '') {
    return res.status(400).json({
      success: false,
      error: 'Field "sequence" is required.'
    });
  }

  const result = parseCFGSequence(sequence);
  res.status(200).json({
    success: true,
    data: result
  });
};

const getPDA = (req, res) => {
  res.status(200).json({
    success: true,
    data: PDA_MODEL
  });
};

const simulatePDA = (req, res) => {
  const { tokens } = req.body;
  const result = simulatePDATrace(tokens || ['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']);
  res.status(200).json({
    success: true,
    data: result
  });
};

const getTuringMachine = (req, res) => {
  res.status(200).json({
    success: true,
    data: TURING_MACHINE_MODEL
  });
};

const simulateTM = (req, res) => {
  const { tokens } = req.body;
  const result = simulateTuringMachine(tokens || ['SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'ACK']);
  res.status(200).json({
    success: true,
    data: result
  });
};

module.exports = {
  validateRegex,
  getRegexDetails,
  getCFG,
  getDerivation,
  parseCFG,
  getPDA,
  simulatePDA,
  getTuringMachine,
  simulateTM
};
