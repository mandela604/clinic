const { v4: uuidv4 } = require('uuid');
const Admission = require('../models/Admission');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','hospitalNo','patientName','ward','bed','bedNo','department','admittingDoctor','doctor','doctorId','admitDate','dischargeDate','reason','diagnosis','status'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','ward','bed','department','admittingDoctor','doctor','reason','diagnosis','status']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

exports.list = async (req, res, next) => {
  try {
    const { search = '', status, ward, patientId, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (ward && ward !== 'all') q.ward = ward;
    if (patientId) q.patientId = patientId;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { hospitalNo: rx }, { id: rx }, { ward: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await Admission.countDocuments(findQ);
    const items = await Admission.find(findQ).sort({ admitDate: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Admission.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Admission not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.ward) return res.status(422).json({ error: 'ward required' });
    if (!data.bed) data.bed = 'Bed 1';
    if (!data.admitDate) data.admitDate = new Date().toISOString().slice(0,10);
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    const doc = await Admission.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await Admission.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Admission not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Admission.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Admission not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.discharge = async (req, res, next) => {
  try {
    const doc = await Admission.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Admission not found' });
    if (String(doc.status).toLowerCase() === 'discharged') return res.status(400).json({ error: 'Already discharged' });
    doc.status = 'Discharged';
    doc.dischargeDate = (req.body && req.body.dischargeDate) || new Date().toISOString().slice(0, 10);
    if (req.body && typeof req.body.diagnosis === 'string') doc.diagnosis = req.body.diagnosis.trim();
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, admitted, discharged] = await Promise.all([
      Admission.countDocuments({}),
      Admission.countDocuments({ status: { $in: ['Admitted','admitted'] } }),
      Admission.countDocuments({ status: { $in: ['Discharged','discharged'] } })
    ]);
    res.json({ total, admitted, discharged });
  } catch (e) { next(e); }
};
