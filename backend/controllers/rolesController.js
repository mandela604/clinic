const { v4: uuidv4 } = require('uuid');
const Role = require('../models/Role');
const User = require('../models/User');

// GET /api/roles?search=&type=&status=&page=1&limit=20
exports.list = async (req, res, next) => {
  try {
    const { search = '', type, status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (type && type !== 'all') q.type = type;
    if (status && status !== 'all') q.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { description: rx }];
    }
    const total = await Role.countDocuments(q);
    const items = await Role.find(q).sort({ createdAt: 1 }).skip((+page - 1) * +limit).limit(+limit);
    // attach live usersCount
    const withCounts = await Promise.all(items.map(async r => {
      const cnt = await User.countDocuments({ role: r.name });
      return { ...r.toObject(), usersCount: cnt };
    }));
    res.json({ items: withCounts, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Role.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Role not found' });
    const cnt = await User.countDocuments({ role: doc.name });
    res.json({ ...doc.toObject(), usersCount: cnt });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    const doc = await Role.create({
      id: uuidv4(),
      name: name.trim(),
      description: (description || '').trim(),
      type: 'custom',
      status: 'active',
      permissions: permissions || {}
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Role name already exists' });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'permissions', 'status'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (updates.name) updates.name = updates.name.trim();
    if (updates.description !== undefined) updates.description = updates.description.trim();
    const doc = await Role.findOneAndUpdate({ id: req.params.id }, updates, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Role not found' });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Role name already exists' });
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Role.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Role not found' });
    if (doc.type === 'system') return res.status(400).json({ error: 'System roles cannot be deleted' });
    const cnt = await User.countDocuments({ role: doc.name });
    if (cnt > 0) return res.status(400).json({ error: `Cannot delete: ${cnt} user(s) still assigned to this role` });
    await Role.deleteOne({ id: req.params.id });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const doc = await Role.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Role not found' });
    doc.status = doc.status === 'active' ? 'disabled' : 'active';
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, active, custom, system] = await Promise.all([
      Role.countDocuments({}),
      Role.countDocuments({ status: 'active' }),
      Role.countDocuments({ type: 'custom' }),
      Role.countDocuments({ type: 'system' })
    ]);
    const usersAssigned = await User.countDocuments({});
    res.json({ total, active, custom, system, usersAssigned, totalPerms: 40 });
  } catch (e) { next(e); }
};
