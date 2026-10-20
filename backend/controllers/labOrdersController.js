const { v4: uuidv4 } = require('uuid');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','patientName','hospitalNo','test','category','sampleType','sample','orderedBy','orderedById','date','time','priority','status','result','resultClass','resultNotes','params','notes','forwardedDepts','history'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','test','category','sample','orderedBy','date','status','result']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

exports.list = async (req, res, next) => {
  try {
    const { search = '', status, test, patientId, priority, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (test && test !== 'all') q.test = test;
    if (priority && priority !== 'all') q.priority = priority;
    if (patientId) q.patientId = patientId;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ test: rx }, { patientName: rx }, { id: rx }, { hospitalNo: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await LabOrder.countDocuments(findQ);
    const items = await LabOrder.find(findQ).sort({ date: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await LabOrder.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Lab order not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.test) return res.status(422).json({ error: 'test required' });
    if (!data.orderedBy) return res.status(422).json({ error: 'orderedBy required' });
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    if (!data.date) data.date = new Date().toISOString().slice(0,10);
    const doc = await LabOrder.create({ id: uuidv4(), status: data.status || 'Pending', ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await LabOrder.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Lab order not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.complete = async (req, res, next) => {
  try {
    const { result, resultClass, resultNotes, params } = sanitize(req.body);
    if (!result) return res.status(422).json({ error: 'result required' });
    const doc = await LabOrder.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Lab order not found' });
    doc.result = result;
    doc.resultClass = resultClass || 'normal';
    doc.resultNotes = resultNotes || '';
    if (params) doc.params = params;
    doc.status = resultClass === 'critical' ? 'critical' : 'Completed';
    doc.completedOn = new Date().toISOString().slice(0,10);
    if (!doc.forwardedDepts.includes('consultation')) doc.forwardedDepts.push('consultation');
    doc.history.push({ label: `Completed — Result: ${result}`, date: doc.completedOn, time: new Date().toLocaleTimeString(), critical: resultClass === 'critical' });
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await LabOrder.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Lab order not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

const LAB_CHAIN = ['pending','collected','progress','completed'];
function normLabStatus(s) {
  const map = { 'Pending': 'pending', 'Sample Collected': 'collected', 'In Progress': 'progress', 'Completed': 'completed' };
  return map[s] || s;
}

exports.advance = async (req, res, next) => {
  try {
    const doc = await LabOrder.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Lab order not found' });
    const cur = normLabStatus(String(doc.status));
    const idx = LAB_CHAIN.indexOf(cur);
    if (idx === -1 || idx >= LAB_CHAIN.length - 1) return res.status(400).json({ error: 'Cannot advance from status: ' + doc.status });
    doc.status = LAB_CHAIN[idx + 1];
    if (doc.status === 'completed') doc.completedOn = new Date().toISOString().slice(0, 10);
    doc.history = doc.history || [];
    doc.history.push({ label: 'Advanced to ' + doc.status, date: new Date().toISOString().slice(0, 10), time: new Date().toLocaleTimeString(), critical: false, forwarded: false });
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, pending, completed, critical] = await Promise.all([
      LabOrder.countDocuments({}),
      LabOrder.countDocuments({ status: 'Pending' }),
      LabOrder.countDocuments({ status: 'Completed' }),
      LabOrder.countDocuments({ status: 'critical' })
    ]);
    res.json({ total, pending, completed, critical });
  } catch (e) { next(e); }
};
