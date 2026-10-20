const { v4: uuidv4 } = require('uuid');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','hospitalNo','patientName','type','department','dept','doctor','doctorId','status','priority','reason','referredBy','checkin','date','durationMin','vitalSigns'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','department','dept','doctor','reason','checkin','date']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

// GET /api/visits?search=&status=&type=&dept=&patientId=&date=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const { search = '', status, type, dept, department, patientId, date, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (type && type !== 'all') q.type = type;
    if (dept && dept !== 'all') q.dept = dept;
    if (department && department !== 'all') q.department = department;
    if (patientId) q.patientId = patientId;
    if (date) q.date = date;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { hospitalNo: rx }, { id: rx }];
    }
    const total = await Visit.countDocuments(q.$or ? { $or: q.$or } : q);
    // if $or present, need to merge with other filters — use and
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const items = await Visit.find(findQ).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Visit.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Visit not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.date) data.date = new Date().toISOString().slice(0,10);
    // verify patient exists by id (uuid)
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    if (!data.type) data.type = 'walkin';
    const doc = await Visit.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await Visit.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Visit not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Visit.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Visit not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, waiting, active, completed] = await Promise.all([
      Visit.countDocuments({}),
      Visit.countDocuments({ status: 'waiting' }),
      Visit.countDocuments({ status: 'active' }),
      Visit.countDocuments({ status: 'completed' })
    ]);
    res.json({ total, waiting, active, completed });
  } catch (e) { next(e); }
};
