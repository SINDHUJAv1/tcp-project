const { validateInput } = require('../flat/flatEngine');

const validateConnectionInput = (req, res, next) => {
  const { hostname, port } = req.body;

  if (!hostname || typeof hostname !== 'string' || !hostname.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Hostname or IP address is required and cannot be empty.'
    });
  }

  // Validate port
  const portNum = Number(port);
  if (isNaN(portNum) || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Port must be an integer between 1 and 65535.'
    });
  }

  // Check hostname or IP against formal regular expression
  const isHostValid = validateInput('hostname', hostname.trim()).isValid;
  const isIpValid = validateInput('ipv4', hostname.trim()).isValid;

  if (!isHostValid && !isIpValid) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: Hostname/IP '${hostname}' does not conform to RFC 1123 domain syntax or IPv4 dotted-decimal format.`
    });
  }

  req.validatedData = {
    hostname: hostname.trim(),
    port: portNum
  };

  next();
};

module.exports = {
  validateConnectionInput
};
