const { v4: uuidv4 } = require('uuid');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','patientName','hospitalNo','doctor','doctorId','date','medications','items','status','notes'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','doctor','date','status']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

exports.list = async (req, res, next) => {
  try {
    const { search = '', status, patientId, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (patientId) q.patientId = patientId;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { id: rx }, { hospitalNo: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await Prescription.countDocuments(findQ);
    const items = await Prescription.find(findQ).sort({ date: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Prescription.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Prescription not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.doctor) return res.status(422).json({ error: 'doctor required' });
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    if (!data.date) data.date = new Date().toISOString().slice(0,10);
    const doc = await Prescription.create({ id: uuidv4(), status: data.status || 'Pending', ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await Prescription.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Prescription not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Prescription.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Prescription not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, pending, dispensed] = await Promise.all([
      Prescription.countDocuments({}),
      Prescription.countDocuments({ status: 'Pending' }),
      Prescription.countDocuments({ status: 'Dispensed' })
    ]);
    res.json({ total, pending, dispensed });
  } catch (e) { next(e); }
};
