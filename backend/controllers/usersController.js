const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Role = require('../models/Role');
const { canonicalRole } = require('../middleware/auth');

const ADMIN_RX = /^(administrator|admin)$/i;

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function roleIdFor(name) {
  if (!name) return null;
  const doc = await Role.findOne({ name: new RegExp('^' + escapeRegex(name) + '$', 'i') });
  return doc ? doc.id : null;
}

async function lastAdminBlocked(target, updates) {
  if (canonicalRole(target.role) !== 'Administrator') return false;
  const demoting = updates.role !== undefined && canonicalRole(updates.role) !== 'Administrator';
  const disabling = updates.status !== undefined && updates.status !== 'active';
  if (!demoting && !disabling) return false;
  return (await User.countDocuments({ role: ADMIN_RX })) <= 1;
}

// GET /api/users?search=&role=&dept=&status=&page=1&limit=10
exports.list = async (req, res, next) => {
  try {
    const { search = '', role, dept, status, page = 1, limit = 10 } = req.query;
    const q = {};
    if (role && role !== 'all') q.role = new RegExp('^' + escapeRegex(canonicalRole(role)) + '$', 'i');
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
    const finalRole = canonicalRole(role) || 'Receptionist';
    const finalDept = (dept || department || 'Front Desk').trim();
    const hashed = await bcrypt.hash(password, 10);
    const doc = await User.create({
      id: uuidv4(),
      userId: 'SHC-U-' + Date.now().toString().slice(-6),
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
      password: hashed,
      role: finalRole,
      roleId: await roleIdFor(finalRole),
      dept: finalDept,
      department: finalDept,
      status: status || 'active'
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
    const target = await User.findOne({ id: req.params.id });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const allowed = ['name', 'username', 'email', 'phone', 'role', 'dept', 'department', 'status'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
    if (updates.username) updates.username = updates.username.toLowerCase();
    if (updates.email) updates.email = updates.email.toLowerCase();
    if (updates.role !== undefined) {
      updates.role = canonicalRole(updates.role);
      if (!updates.role) return res.status(422).json({ error: 'Role is required' });
      updates.roleId = await roleIdFor(updates.role);
    }
    if (updates.dept !== undefined && updates.department === undefined) updates.department = updates.dept;
    if (updates.department !== undefined && updates.dept === undefined) updates.dept = updates.department;
    if (req.body.password !== undefined) {
      const password = String(req.body.password || '');
      if (password.length < 6) return res.status(422).json({ error: 'Password must be at least 6 characters' });
      updates.password = await bcrypt.hash(password, 10);
    }

    if (await lastAdminBlocked(target, updates)) {
      return res.status(400).json({ error: 'Cannot remove or disable the last Administrator account' });
    }

    const doc = await User.findOneAndUpdate({ id: req.params.id }, updates, { new: true, runValidators: true }).select('-password');
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
    if (canonicalRole(target.role) === 'Administrator') {
      const adminCount = await User.countDocuments({ role: ADMIN_RX });
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
    if (doc.status === 'active' && canonicalRole(doc.role) === 'Administrator') {
      const adminCount = await User.countDocuments({ role: ADMIN_RX, status: 'active' });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot disable the last Administrator account' });
    }
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
      User.countDocuments({ role: ADMIN_RX })
    ]);
    res.json({ total, active, invited, suspended, admins });
  } catch (e) { next(e); }
};
