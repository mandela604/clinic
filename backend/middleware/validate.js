const { validationResult } = require('express-validator');

// All inputs are sanitized via express-validator's trim/escape/normalize + xss-clean in server.js
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array().map(e => ({ field: e.path, msg: e.msg })) });
  }
  next();
}

module.exports = { handleValidation };
