const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, username, email, phone, password, role, dept } = req.body;
    const userCount = await User.countDocuments({});
    // After first user, public signup is closed — use POST /api/users (admin only)
    if (userCount > 0) {
      // Require admin auth after setup
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) return res.status(403).json({ error: 'Registration is closed — please contact an Administrator or sign in' });
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        const requester = await User.findOne({ id: decoded.id });
        if (!requester || !['Administrator','admin'].includes(requester.role)) return res.status(403).json({ error: 'Only Administrators can create new accounts' });
      } catch { return res.status(403).json({ error: 'Registration is closed — please sign in' }); }
    }
    const finalRole = userCount === 0 ? 'Administrator' : (role || 'receptionist');
    const finalDept = userCount === 0 ? 'Administration' : (dept || 'Front Desk');
    const Role = require('../models/Role');
    const roleDoc = await Role.findOne({ name: finalRole });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      id: uuidv4(),
      userId: 'SHC-U-' + Date.now().toString().slice(-6),
      name: name.trim(), username: username.toLowerCase().trim(), email: email.toLowerCase().trim(), phone: (phone || '').trim(),
      password: hashed, role: finalRole, roleId: roleDoc ? roleDoc.id : null, dept: finalDept, department: finalDept
    });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (email || username || '').toLowerCase();
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is ' + user.status });
    user.lastLogin = new Date();
    await user.save();
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, dept: user.dept } });
  } catch (e) { next(e); }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.setupStatus = async (req, res, next) => {
  try {
    const count = await User.countDocuments({});
    res.json({ needsSetup: count === 0 });
  } catch (e) { next(e); }
};
