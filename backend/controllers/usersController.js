const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

// GET /api/users?search=&role=&dept=&status=&page=1&limit=10
exports.list = async (req, res, next) => {
  try {
    const { search = '', role, dept, status, page = 1, limit = 10 } = req.query;
    const q = {};
    if (role && role !== 'all') q.role = role;
    if (dept && dept !== 'all') q.dept = dept;
    if (status && status !== 'all') q.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { username: rx }, { email: rx }, { userId: rx }];
    }
    const total = await User.countDocuments(q);
    const items = await User.find(q).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit).select('-password');
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await User.findOne({ id: req.params.id }).select('-password');
    if (!doc) return res.status(404).json({ error: 'User not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, username, email, phone, password, role, dept, department, status } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const doc = await User.create({
      id: uuidv4(),
      userId: 'SHC-U-' + Date.now().toString().slice(-6),
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
      password: hashed,
      role: role || 'receptionist',
      dept: (dept || department || 'Front Desk').trim(),
      department: (dept || department || 'Front Desk').trim(),
      status: status || 'active',
      img: Math.floor(Math.random() * 70) + 1
    });
    const out = doc.toObject(); delete out.password;
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Username or email already exists' });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'username', 'email', 'phone', 'role', 'dept', 'department', 'status'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
    if (updates.username) updates.username = updates.username.toLowerCase();
    if (updates.email) updates.email = updates.email.toLowerCase();
    // password change via dedicated route, not here
    const doc = await User.findOneAndUpdate({ id: req.params.id }, updates, { new: true, runValidators: true }).select('-password');
    if (!doc) return res.status(404).json({ error: 'User not found' });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Username or email already exists' });
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Prevent deleting last admin — check by id
    const target = await User.findOne({ id: req.params.id });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin' || target.role === 'Administrator') {
      const adminCount = await User.countDocuments({ role: { $in: ['admin', 'Administrator'] } });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
    await User.deleteOne({ id: req.params.id });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const doc = await User.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'User not found' });
    if (doc.status === 'suspended' || doc.status === 'invited') return res.status(400).json({ error: 'Cannot toggle suspended/invited via this endpoint' });
    doc.status = doc.status === 'active' ? 'inactive' : 'active';
    await doc.save();
    const out = doc.toObject(); delete out.password;
    res.json(out);
  } catch (e) { next(e); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const doc = await User.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'User not found' });
    const temp = Math.random().toString(36).slice(-8) + 'A1!';
    doc.password = await bcrypt.hash(temp, 10);
    await doc.save();
    // In production, email temp password; here return it once
    res.json({ ok: true, id: doc.id, tempPassword: temp });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, active, invited, suspended, admins] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'invited' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ role: { $in: ['admin', 'Administrator'] } })
    ]);
    res.json({ total, active, invited, suspended, admins });
  } catch (e) { next(e); }
};
