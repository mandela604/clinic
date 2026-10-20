const Patient = require('../models/Patient');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_FIELDS = [
  'hospitalNo','name','title','firstName','middleName','lastName',
  'gender','age','dateOfBirth','maritalStatus','nationality','stateOfOrigin','lga',
  'religion','occupation','employer','bloodType','genotype',
  'phonePrimary','phoneSecondary','email','address','residentialAddress','state','city',
  'idType','idNumber','idDateIssued','idExpiryDate','preferredLanguage','howDidYouHear',
  'patientType','patientCategory','notes','status','allergies','chronicConditions',
  'emergencyContact','registeredOn','lastVisit'
];

function sanitizePatientInput(body) {
  const out = {};
  for (const k of ALLOWED_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  // trim strings
  for (const k of ['name','hospitalNo','phonePrimary','phoneSecondary','email','address']) {
    if (typeof out[k] === 'string') out[k] = out[k].trim();
  }
  if (out.email) out.email = out.email.toLowerCase();
  if (out.name) out.name = out.name.replace(/<[^>]*>/g, '').trim();
  return out;
}

// GET /api/patients?search=&status=&page=1&limit=10&sort=-createdAt
exports.list = async (req, res, next) => {
  try {
    const { search = '', status, page = 1, limit = 10 } = req.query;
    const q = {};
    if (status && status !== 'all' && status !== '') q.status = status;
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { hospitalNo: rx }, { phonePrimary: rx }, { email: rx }];
    }
    const total = await Patient.countDocuments(q);
    const items = await Patient.find(q).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(Math.min(+limit, 100));
    res.json({ items, total, page: +page, limit: +limit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Patient.findOne({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Patient not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.getByHospitalNo = async (req, res, next) => {
  try {
    const hospNo = req.params.hospitalNo.trim();
    const doc = await Patient.findOne({ hospitalNo: hospNo });
    if (!doc) return res.status(404).json({ error: 'Patient not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = sanitizePatientInput(req.body);
    // Frontend registration.html sends split names — compose full name if needed
    if (!data.name && (data.firstName || data.lastName)) {
      data.name = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').trim();
    }
    if (!data.firstName && data.name) {
      const parts = data.name.trim().split(' ');
      data.firstName = parts[0] || '';
      data.lastName = parts.slice(1).join(' ') || parts[0] || '';
    }
    if (!data.name) return res.status(422).json({ error: 'Name (or firstName + lastName) required' });
    if (!data.firstName) return res.status(422).json({ error: 'First Name required' });
    if (!data.lastName) return res.status(422).json({ error: 'Last Name required' });
    if (!data.phonePrimary) return res.status(422).json({ error: 'Phone required' });
    if (!data.gender || !['Male','Female','Other'].includes(data.gender)) return res.status(422).json({ error: 'Gender must be Male/Female/Other' });
    if (!data.hospitalNo) {
      let hospNo; let tries=0;
      do {
        hospNo = 'SHC-' + String(Date.now() + tries).slice(-6);
        tries++;
      } while (await Patient.findOne({ hospitalNo: hospNo }) && tries < 5);
      data.hospitalNo = hospNo;
    }
    if (!data.age) data.age = '0';
    // sanitize emergencyContact subfields
    if (data.emergencyContact && typeof data.emergencyContact === 'object') {
      for (const k of ['name','relationship','phone','address']) {
        if (typeof data.emergencyContact[k] === 'string') data.emergencyContact[k] = data.emergencyContact[k].trim();
      }
    }
    const doc = await Patient.create({ id: uuidv4(), ...data });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) {
      const field = e.keyPattern && e.keyPattern.hospitalNo ? 'Hospital number' : 'Field';
      return res.status(409).json({ error: `${field} already exists` });
    }
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = sanitizePatientInput(req.body);
    delete data.id; // never allow id overwrite
    delete data.hospitalNo; // keep hospitalNo immutable after create? allow but check duplicate
    if (req.body.hospitalNo && req.body.hospitalNo !== data.hospitalNo) {
      // allow hospitalNo change with duplicate check
      data.hospitalNo = req.body.hospitalNo.trim();
    }
    const doc = await Patient.findOneAndUpdate({ id: req.params.id }, data, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Patient not found' });
    res.json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Hospital number already exists' });
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const doc = await Patient.findOneAndDelete({ id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Patient not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const [total, active] = await Promise.all([
      Patient.countDocuments({}),
      Patient.countDocuments({ status: 'Active' })
    ]);
    res.json({ total, active, inactive: total - active });
  } catch (e) { next(e); }
};
