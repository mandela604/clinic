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

const ROLE_ALIASES = {
  admin: 'Administrator',
  administrator: 'Administrator',
  superadmin: 'Administrator',
  'super admin': 'Administrator',
  doctor: 'Doctor',
  physician: 'Doctor',
  nurse: 'Nurse',
  labtech: 'Lab Technician',
  'lab tech': 'Lab Technician',
  'lab technician': 'Lab Technician',
  'laboratory technician': 'Lab Technician',
  pharmacist: 'Pharmacist',
  pharmacy: 'Pharmacist',
  receptionist: 'Receptionist',
  frontdesk: 'Receptionist',
  'front desk': 'Receptionist',
  cashier: 'Cashier',
  billing: 'Cashier'
};

function canonicalRole(role) {
  const raw = String(role || '').trim();
  const key = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return ROLE_ALIASES[key] || raw;
}

function authorize(...roles) {
  const allowed = new Set(roles.map(canonicalRole));
  return (req, res, next) => {
    if (!allowed.has(canonicalRole(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: requires ' + roles.join(', ') });
    }
    next();
  };
}

module.exports = { protect, authorize, canonicalRole };
