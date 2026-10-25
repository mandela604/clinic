const Setting = require('../models/Setting');
const Patient = require('../models/Patient');
const Invoice = require('../models/Invoice');
const LabOrder = require('../models/LabOrder');
const AuditLog = require('../models/AuditLog');
const Visit = require('../models/Visit');
const Appointment = require('../models/Appointment');
const Admission = require('../models/Admission');
const Prescription = require('../models/Prescription');
const Drug = require('../models/Drug');
const User = require('../models/User');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS = [
  { day: 'Monday', open: true, start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Tuesday', open: true, start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Wednesday', open: true, start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Thursday', open: true, start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Friday', open: true, start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Saturday', open: true, start: '09:00', end: '15:00', breakStart: '', breakEnd: '' },
  { day: 'Sunday', open: false, start: '', end: '', breakStart: '', breakEnd: '' }
];

const STRING_FIELDS = {
  clinicName: 120, tagline: 160, license: 80,
  phonePrimary: 40, phoneSecondary: 40, email: 120,
  street: 160, city: 80, state: 80, country: 80,
  timezone: 60, currency: 8, dateFormat: 24, timeFormat: 4,
  backupFrequency: 40, backupRetention: 40
};

const DEFAULT_WARDS = [
  { name: 'Male Ward', beds: 12, colorIdx: 0 },
  { name: 'Female Ward', beds: 12, colorIdx: 1 },
  { name: 'Maternity Ward', beds: 10, colorIdx: 2 },
  { name: 'ICU', beds: 6, colorIdx: 3 },
  { name: 'Pediatric Ward', beds: 8, colorIdx: 4 },
  { name: 'General Ward', beds: 15, colorIdx: 5 }
];

const DEFAULT_STATUSES = [
  { name: 'Admitted', colorIdx: 0, neutral: false },
  { name: 'Discharged', colorIdx: 1, neutral: false },
  { name: 'Transferred', colorIdx: 3, neutral: false },
  { name: 'Critical', colorIdx: 4, neutral: false }
];

function defaults() {
  return {
    clinicName: 'Shiloh Clinic & Maternity',
    tagline: 'Compassionate care, every step of the way',
    license: '',
    phonePrimary: '',
    phoneSecondary: '',
    email: '',
    street: '12 Aba Road',
    city: 'Port Harcourt',
    state: 'Rivers',
    country: 'Nigeria',
    timezone: 'Africa/Lagos',
    currency: 'NGN',
    dateFormat: 'MMM D, YYYY',
    timeFormat: '12',
    logo: '',
    hours: JSON.parse(JSON.stringify(DEFAULT_HOURS)),
    wards: JSON.parse(JSON.stringify(DEFAULT_WARDS)),
    statuses: JSON.parse(JSON.stringify(DEFAULT_STATUSES)),
    emergency247: true,
    backupAuto: true,
    backupFrequency: 'Daily',
    backupRetention: '30 days',
    lastBackup: null
  };
}

function merged(doc) {
  return Object.assign(defaults(), (doc && doc.data) || {});
}

function cleanString(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function cleanTime(value) {
  const s = String(value == null ? '' : value).trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
}

function cleanHours(value) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 7).map(entry => {
    const day = DAYS.includes(entry && entry.day) ? entry.day : '';
    const open = !!(entry && entry.open);
    return {
      day,
      open,
      start: open ? cleanTime(entry.start) : '',
      end: open ? cleanTime(entry.end) : '',
      breakStart: open ? cleanTime(entry.breakStart) : '',
      breakEnd: open ? cleanTime(entry.breakEnd) : ''
    };
  }).filter(h => h.day);
}

function clampInt(value, max) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

function cleanWards(value) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 50).map(w => {
    const name = cleanString(w && w.name, 60);
    if (!name) return null;
    return { name, beds: clampInt(w.beds, 999), colorIdx: clampInt(w.colorIdx, 7) };
  }).filter(Boolean);
}

function cleanStatuses(value) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 50).map(s => {
    const name = cleanString(s && s.name, 60);
    if (!name) return null;
    return { name, colorIdx: clampInt(s.colorIdx, 7), neutral: !!(s && s.neutral) };
  }).filter(Boolean);
}

function pickUpdates(body) {
  const out = {};
  for (const [key, max] of Object.entries(STRING_FIELDS)) {
    if (body[key] !== undefined) out[key] = cleanString(body[key], max);
  }
  if (body.emergency247 !== undefined) out.emergency247 = !!body.emergency247;
  if (body.backupAuto !== undefined) out.backupAuto = !!body.backupAuto;
  if (body.logo !== undefined) {
    const logo = String(body.logo || '');
    if (logo && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(logo)) {
      const err = new Error('Logo must be an image data URL');
      err.status = 400;
      throw err;
    }
    out.logo = logo.slice(0, 900000);
  }
  const hours = cleanHours(body.hours);
  if (hours) out.hours = hours;
  const wards = cleanWards(body.wards);
  if (wards) out.wards = wards;
  const statuses = cleanStatuses(body.statuses);
  if (statuses) out.statuses = statuses;
  return out;
}

async function saveData(data) {
  await Setting.findOneAndUpdate(
    { key: 'clinic' },
    { $set: { data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return data;
}

exports.get = async (req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: 'clinic' }).lean();
    res.json({ settings: merged(doc) });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: 'clinic' }).lean();
    const data = Object.assign(merged(doc), pickUpdates(req.body || {}));
    data.updatedAt = new Date().toISOString();
    await saveData(data);
    res.json({ settings: data });
  } catch (e) { next(e); }
};

exports.reset = async (req, res, next) => {
  try {
    await Setting.deleteOne({ key: 'clinic' });
    res.json({ settings: defaults() });
  } catch (e) { next(e); }
};

exports.updateWards = async (req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: 'clinic' }).lean();
    const data = merged(doc);
    const wards = cleanWards(req.body && req.body.wards);
    const statuses = cleanStatuses(req.body && req.body.statuses);
    if (wards) data.wards = wards;
    if (statuses) data.statuses = statuses;
    data.updatedAt = new Date().toISOString();
    await saveData(data);
    res.json({ settings: data });
  } catch (e) { next(e); }
};

exports.backup = async (req, res, next) => {
  try {
    const [patients, visits, appointments, admissions, invoices, labOrders, prescriptions, drugs, users, setting] = await Promise.all([
      Patient.find({}).lean(),
      Visit.find({}).lean(),
      Appointment.find({}).lean(),
      Admission.find({}).lean(),
      Invoice.find({}).lean(),
      LabOrder.find({}).lean(),
      Prescription.find({}).lean(),
      Drug.find({}).lean(),
      User.find({}).select('-password').lean(),
      Setting.findOne({ key: 'clinic' }).lean()
    ]);
    const payload = {
      generatedAt: new Date().toISOString(),
      clinic: merged(setting),
      collections: { patients, visits, appointments, admissions, invoices, labOrders, prescriptions, drugs, users }
    };
    const json = JSON.stringify(payload, null, 2);
    const size = Buffer.byteLength(json, 'utf8');
    const settings = merged(setting);
    settings.lastBackup = { at: payload.generatedAt, size };
    settings.updatedAt = payload.generatedAt;
    await saveData(settings);

    const stamp = payload.generatedAt.slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shiloh-backup-${stamp}.json"`);
    res.setHeader('X-Backup-Size', String(size));
    res.setHeader('X-Backup-At', payload.generatedAt);
    res.send(json);
  } catch (e) { next(e); }
};

function csvCell(value) {
  return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
}

function toCsv(header, rows) {
  return '\ufeff' + [header.map(csvCell).join(',')]
    .concat(rows.map(row => row.map(csvCell).join(',')))
    .join('\r\n');
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

const EXPORTS = {
  patients: {
    filename: () => `shiloh-patients-${stamp()}.csv`,
    build: async () => {
      const rows = await Patient.find({}).sort({ name: 1 }).lean();
      return toCsv(
        ['Hospital No', 'Name', 'Gender', 'Age', 'Date of Birth', 'Blood Type', 'Genotype', 'Phone', 'Email', 'Address', 'Status', 'Registered On'],
        rows.map(p => [p.hospitalNo, p.name, p.gender, p.age, p.dateOfBirth, p.bloodType, p.genotype, p.phonePrimary, p.email, p.address, p.status, p.registeredOn])
      );
    }
  },
  billing: {
    filename: () => `shiloh-billing-${stamp()}.csv`,
    build: async () => {
      const rows = await Invoice.find({}).sort({ date: -1 }).lean();
      return toCsv(
        ['Invoice No', 'Patient', 'Hospital No', 'Date', 'Total', 'Paid', 'Balance', 'Status', 'Method', 'Due Date'],
        rows.map(i => [i.invoiceNo || i.id, i.patientName, i.hospitalNo, i.date, i.total, i.paid, i.balance, i.status, i.method, i.dueDate])
      );
    }
  },
  lab: {
    filename: () => `shiloh-lab-${stamp()}.csv`,
    build: async () => {
      const rows = await LabOrder.find({}).sort({ date: -1 }).lean();
      return toCsv(
        ['Lab No', 'Patient', 'Hospital No', 'Test', 'Category', 'Status', 'Priority', 'Ordered By', 'Date', 'Result'],
        rows.map(l => [l.id, l.patientName, l.hospitalNo, l.test, l.category, l.status, l.priority, l.orderedBy, l.date, l.result])
      );
    }
  },
  audit: {
    filename: () => `shiloh-audit-${stamp()}.csv`,
    build: async () => {
      const rows = await AuditLog.find({}).sort({ ts: -1 }).limit(20000).lean();
      return toCsv(
        ['Timestamp', 'User', 'Role', 'Action', 'Target Type', 'Target', 'Severity', 'IP Address', 'Device', 'Status', 'Description'],
        rows.map(l => [l.ts && l.ts.toISOString ? l.ts.toISOString() : l.ts, l.userName, l.userRole, l.action, l.targetType, l.targetName, l.severity, l.ip, l.device, l.statusCode, l.description])
      );
    }
  }
};

exports.exportCsv = async (req, res, next) => {
  try {
    const spec = EXPORTS[req.params.type];
    if (!spec) return res.status(400).json({ error: 'Unknown export type' });
    const csv = await spec.build();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${spec.filename()}"`);
    res.send(csv);
  } catch (e) { next(e); }
};
