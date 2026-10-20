const { v4: uuidv4 } = require('uuid');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','hospitalNo','visitId','bp','temp','pulse','spo2','weight','height','recordedBy','recordedById','date','time'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['hospitalNo','bp','temp','pulse','spo2','weight','height','recordedBy','date','time']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

exports.list = async (req, res, next) => {
  try {
    const { search = '', patientId, visitId, date, page = 1, limit = 10 } = req.query;
    const q = {};
    if (patientId) q.patientId = patientId;
    if (visitId) q.visitId = visitId;
    if (date) q.date = date;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ hospitalNo: rx }, { id: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await Vitals.countDocuments(findQ);
    const items = await Vitals.find(findQ).sort({ date: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Vitals.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Vitals record not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.date) data.date = new Date().toISOString().slice(0, 10);
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    if (req.user) { data.recordedBy = data.recordedBy || req.user.name; data.recordedById = data.recordedById || req.user.id; }
    const doc = await Vitals.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await Vitals.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Vitals record not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Vitals.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Vitals record not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const total = await Vitals.countDocuments({});
    res.json({ total });
  } catch (e) { next(e); }
};
