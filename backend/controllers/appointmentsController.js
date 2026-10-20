const { v4: uuidv4 } = require('uuid');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

const ALLOWED = ['patientId','hospitalNo','patientName','doctor','doctorId','department','type','date','time','duration','priority','status','reason','via'];

function sanitize(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['patientName','hospitalNo','doctor','department','type','date','time','reason']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  return out;
}

// GET /api/appointments?search=&status=&type=&doctor=&patientId=&date=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const { search = '', status, type, doctor, patientId, date, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all') q.status = status;
    if (type && type !== 'all') q.type = type;
    if (doctor && doctor !== 'all') q.doctor = doctor;
    if (patientId) q.patientId = patientId;
    if (date) q.date = date;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ patientName: rx }, { hospitalNo: rx }, { id: rx }, { doctor: rx }];
    }
    const findQ = q.$or ? { $and: [{ $or: q.$or }, (()=>{ const c={...q}; delete c.$or; return c; })()] } : q;
    const total = await Appointment.countDocuments(findQ);
    const items = await Appointment.find(findQ).sort({ date: -1, time: 1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Appointment.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Appointment not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    if (!data.patientId) return res.status(422).json({ error: 'patientId (uuid) required' });
    if (!data.doctor) return res.status(422).json({ error: 'doctor required' });
    if (!data.date) return res.status(422).json({ error: 'date required' });
    if (!data.time) return res.status(422).json({ error: 'time required' });
    const patient = await Patient.findOne({ id: data.patientId });
    if (!patient) return res.status(400).json({ error: 'Patient not found for patientId' });
    data.hospitalNo = data.hospitalNo || patient.hospitalNo;
    data.patientName = data.patientName || patient.name;
    const doc = await Appointment.create({ id: uuidv4(), status: data.status || 'Scheduled', ...data });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitize(req.body);
    delete data.id; delete data.patientId;
    const doc = await Appointment.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Appointment not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Appointment.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, scheduled, completed, today] = await Promise.all([
      Appointment.countDocuments({}),
      Appointment.countDocuments({ status: { $in: ['Scheduled','Confirmed'] } }),
      Appointment.countDocuments({ status: 'Completed' }),
      Appointment.countDocuments({ date: new Date().toISOString().slice(0,10) })
    ]);
    res.json({ total, scheduled, completed, today });
  } catch (e) { next(e); }
};
