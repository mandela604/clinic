const { v4: uuidv4 } = require('uuid');
const Drug = require('../models/Drug');

const ALLOWED = ['name','generic','code','category','form','stock','unit','unitPrice','reorderLevel','batch','expiry','supplier','notes'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['name','generic','code','category','form','unit','batch','expiry','supplier','notes']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  for (const k of ['stock','unitPrice','reorderLevel']) {
    if (out[k] !== undefined) out[k] = Number(out[k]);
    if (out[k] !== undefined && (!Number.isFinite(out[k]) || out[k] < 0)) delete out[k];
  }
  return out;
}

// GET /api/drugs?search=&category=&stock=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const { search = '', category, stock, page = 1, limit = 100 } = req.query;
    const q = {};
    if (category && category !== 'all') q.category = category;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { generic: rx }, { code: rx }, { category: rx }];
    }
    if (stock === 'in') q.$expr = { $gt: ['$stock', '$reorderLevel'] };
    if (stock === 'low') q.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderLevel'] }] };
    if (stock === 'out') q.stock = 0;
    const total = await Drug.countDocuments(q);
    const items = await Drug.find(q).sort({ name: 1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Drug.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Drug not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.name) return res.status(422).json({ error: 'name required' });
    const doc = await Drug.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Drug code already exists' });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id;
    const doc = await Drug.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Drug not found' });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Drug code already exists' });
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Drug.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Drug not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.restock = async (req, res, next) => {
  try {
    const qty = Number(req.body && req.body.qty);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(422).json({ error: 'qty must be > 0' });
    const doc = await Drug.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Drug not found' });
    doc.stock = (doc.stock || 0) + qty;
    if (req.body && req.body.expiry && typeof req.body.expiry === 'string') doc.expiry = req.body.expiry.trim();
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.dispense = async (req, res, next) => {
  try {
    const qty = Number(req.body && req.body.qty);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(422).json({ error: 'qty must be > 0' });
    const doc = await Drug.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Drug not found' });
    if ((doc.stock || 0) < qty) return res.status(400).json({ error: 'Insufficient stock (available: ' + (doc.stock || 0) + ')' });
    doc.stock -= qty;
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, out, low] = await Promise.all([
      Drug.countDocuments({}),
      Drug.countDocuments({ stock: 0 }),
      Drug.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderLevel'] }] } })
    ]);
    res.json({ total, out, low, inStock: total - out - low });
  } catch (e) { next(e); }
};
