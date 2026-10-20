const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','patientName','hospitalNo','invoiceNo','date','items','lineItems','total','paid','balance','status','method','dueDate','notes'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','invoiceNo','date','status','method']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

exports.list = async (req, res, next) => {
  try {
    const { search = '', status, method, patientId, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (method && method !== 'all') q.method = method;
    if (patientId) q.patientId = patientId;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { id: rx }, { invoiceNo: rx }, { hospitalNo: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await Invoice.countDocuments(findQ);
    const items = await Invoice.find(findQ).sort({ date: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Invoice.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Invoice not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (data.total == null) return res.status(422).json({ error: 'total required' });
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    if (!data.date) data.date = new Date().toISOString().slice(0,10);
    if (!data.invoiceNo) data.invoiceNo = 'SHC-INV-' + Date.now().toString().slice(-6);
    data.balance = (data.total || 0) - (data.paid || 0);
    const doc = await Invoice.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Invoice number already exists' });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    if (data.total != null || data.paid != null) {
      const existing = await Invoice.findOne({ id: req.params.id });
      if (!existing) return res.status(404).json({ error: 'Invoice not found' });
      const total = data.total != null ? data.total : existing.total;
      const paid = data.paid != null ? data.paid : existing.paid;
      data.balance = total - paid;
    }
    const doc = await Invoice.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Invoice not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Invoice.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const amount = Number(req.body && req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(422).json({ error: 'amount must be > 0' });
    const method = (req.body && req.body.method) || 'Cash';
    const doc = await Invoice.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Invoice not found' });
    if (amount > doc.balance && doc.balance >= 0) return res.status(400).json({ error: 'Payment exceeds outstanding balance' });
    doc.paid = Math.round(((doc.paid || 0) + amount) * 100) / 100;
    doc.balance = Math.round(((doc.total || 0) - doc.paid) * 100) / 100;
    doc.method = method;
    doc.status = doc.balance <= 0 ? 'Paid' : 'Unpaid';
    doc.payments = doc.payments || [];
    doc.payments.push({ amount, method, date: new Date().toISOString().slice(0, 10), by: (req.user && req.user.name) || '' });
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, paid, unpaid] = await Promise.all([
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: 'Paid' }),
      Invoice.countDocuments({ status: { $in: ['Unpaid','Pending','Overdue'] } })
    ]);
    const agg = await Invoice.aggregate([{ $group: { _id: null, totalRevenue: { $sum: '$total' }, totalPaid: { $sum: '$paid' } } }]);
    const revenue = agg[0] || { totalRevenue: 0, totalPaid: 0 };
    res.json({ total, paid, unpaid, totalRevenue: revenue.totalRevenue, totalPaid: revenue.totalPaid, outstanding: revenue.totalRevenue - revenue.totalPaid });
  } catch (e) { next(e); }
};
