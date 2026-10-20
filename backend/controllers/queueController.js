const { v4: uuidv4 } = require('uuid');
const Visit = require('../models/Visit');

const ADVANCE_CHAIN = ['waiting','progress','recorded','completed'];

function toClient(doc, index) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...o,
    q: index + 1,
    name: o.name || o.patientName || 'Unknown',
    hospNo: o.hospNo || o.hospitalNo || '',
    hosp: o.hospNo || o.hospitalNo || '',
    bp: o.bp || (o.vitalSigns && o.vitalSigns.bp) || '',
    temp: o.temp || (o.vitalSigns && o.vitalSigns.temp) || '',
    pulse: o.pulse || (o.vitalSigns && o.vitalSigns.pulse) || '',
    spo2: o.spo2 || (o.vitalSigns && o.vitalSigns.spo2) || '',
    weight: o.weight || (o.vitalSigns && o.vitalSigns.weight) || ''
  };
}

// Map page vocab ("Waiting"/"In Consultation"/"Completed") -> canonical lowercase
function normStatus(s) {
  if (typeof s !== 'string') return s;
  const map = { 'Waiting': 'waiting', 'In Consultation': 'progress', 'Completed': 'completed' };
  return map[s] || s;
}
function normPriority(p) {
  if (typeof p !== 'string') return p;
  const map = { 'Routine': 'routine', 'Urgent': 'urgent', 'Emergency': 'emergency' };
  return map[p] || p;
}

// GET /api/queue?status=&priority=&dept=&department=&patientId=&search=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const { search = '', status, priority, dept, department, patientId, page = 1, limit = 100 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = { $in: [normStatus(status), status.toLowerCase(), status.toUpperCase()].filter((v, i, a) => a.indexOf(v) === i) };
    if (priority && priority !== 'all') q.priority = { $in: [normPriority(priority), priority.toLowerCase()] };
    if (dept && dept !== 'all') q.dept = dept;
    if (department && department !== 'all') q.department = department;
    if (patientId) q.patientId = patientId;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { hospitalNo: rx }, { name: rx }, { hospNo: rx }];
    }
    const total = await Visit.countDocuments(q);
    const items = await Visit.find(q).sort({ createdAt: 1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items: items.map(toClient), total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Visit.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Queue entry not found' });
    res.json(toClient(doc, 0));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    const today = new Date().toISOString().slice(0, 10);
    const doc = await Visit.create({
      id: uuidv4(),
      patientId: b.patientId || ('unassigned-' + uuidv4()),
      hospitalNo: b.hospitalNo || b.hospNo || 'SHC-NEW',
      patientName: b.patientName || b.name || 'New Patient',
      type: b.type || 'consultation',
      department: b.department || b.dept || 'General OPD',
      dept: b.dept || b.department || 'General OPD',
      doctor: b.doctor || '',
      nurse: b.nurse || '',
      status: normStatus(b.status) || 'waiting',
      priority: normPriority(b.priority) || 'routine',
      reason: b.reason || '',
      date: b.date || today,
      checkin: b.checkin || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      age: b.age || '',
      gender: b.gender || '',
      img: b.img || Math.floor(Math.random() * 60) + 1,
      bp: b.bp || '', temp: b.temp || '', pulse: b.pulse || '', spo2: b.spo2 || '', weight: b.weight || ''
    });
    res.status(201).json(toClient(doc, 0));
  } catch (e) { next(e); }
};

const UPDATE_ALLOWED = ['patientName','name','hospitalNo','hospNo','type','department','dept','doctor','nurse','status','priority','reason','date','checkin','age','gender','img','bp','temp','pulse','spo2','weight','flag','diagnosis','notes','rx','completedAt','avgMinutes','vitalSigns','durationMin','doctorId'];

exports.update = async (req, res, next) => {
  try {
    const doc = await Visit.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Queue entry not found' });
    const b = req.body || {};
    for (const k of UPDATE_ALLOWED) {
      if (b[k] === undefined) continue;
      let v = b[k];
      if (typeof v === 'string') v = v.trim();
      if (k === 'status') v = normStatus(v);
      if (k === 'priority') v = normPriority(v);
      if (k === 'name') { doc.patientName = v; continue; }
      if (k === 'hospNo') { doc.hospitalNo = v; continue; }
      doc[k] = v;
    }
    await doc.save();
    res.json(toClient(doc, 0));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Visit.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Queue entry not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.advance = async (req, res, next) => {
  try {
    const doc = await Visit.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Queue entry not found' });
    const cur = String(doc.status).toLowerCase();
    const idx = ADVANCE_CHAIN.indexOf(cur);
    if (idx === -1) return res.status(400).json({ error: 'Cannot advance from status: ' + doc.status });
    if (idx >= ADVANCE_CHAIN.length - 1) return res.status(400).json({ error: 'Cannot advance' });
    doc.status = ADVANCE_CHAIN[idx + 1];
    if (doc.status === 'completed') doc.completedAt = new Date().toISOString().slice(0, 10);
    await doc.save();
    res.json(toClient(doc, 0));
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [waiting, progress, urgent, total] = await Promise.all([
      Visit.countDocuments({ status: { $in: ['waiting','Waiting'] } }),
      Visit.countDocuments({ status: { $in: ['progress','recorded','active','In Consultation'] } }),
      Visit.countDocuments({ priority: { $in: ['urgent','Urgent','emergency','Emergency'] } }),
      Visit.countDocuments({})
    ]);
    res.json({ waiting, progress, urgent, total });
  } catch (e) { next(e); }
};
