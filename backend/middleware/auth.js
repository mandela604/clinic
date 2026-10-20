const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) return res.status(401).json({ error: 'Not authorized, no token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded.id is User.id (uuid), not _id
    const user = await User.findOne({ id: decoded.id }).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is ' + user.status });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: requires ' + roles.join(', ') });
    }
    next();
  };
}

module.exports = { protect, authorize };
