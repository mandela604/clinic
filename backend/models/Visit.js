const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const visitSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // VIS-xxxx
  patientId: { type: String, required: true, index: true, ref: 'Patient' }, // Patient.id (uuid)
  hospitalNo: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  type: { type: String, enum: ['walkin','appointment','followup','emergency','consultation','antenatal','familyplanning','labtest','vitals','other'], default: 'walkin', index: true },
  department: { type: String, default: 'General OPD' },
  dept: { type: String, default: 'General OPD' },
  doctor: { type: String, default: '' }, // doctor name or User.id
  doctorId: { type: String, default: '', index: true },
  status: { type: String, enum: ['waiting','active','completed','cancelled','noshow','progress','recorded','flagged','Waiting','In Consultation','Completed'], default: 'waiting', index: true },
  priority: { type: String, enum: ['routine','urgent','emergency','Routine','Urgent','Emergency'], default: 'routine', index: true },
  nurse: { type: String, default: '' },
  age: { type: String, default: '' },
  gender: { type: String, default: '' },
  img: { type: Number, default: 0 },
  bp: { type: String, default: '' },
  temp: { type: String, default: '' },
  pulse: { type: String, default: '' },
  spo2: { type: String, default: '' },
  weight: { type: String, default: '' },
  flag: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  notes: { type: String, default: '' },
  rx: { type: [ { name: String, dose: String, freq: String } ], default: [] },
  completedAt: { type: String, default: null },
  avgMinutes: { type: Number, default: null },
  reason: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  checkin: { type: String, default: '' }, // 09:30 AM
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  durationMin: { type: Number, default: null },
  vitalSigns: {
    bp: String, temp: String, pulse: String, spo2: String, weight: String, height: String
  }
}, { timestamps: true });

visitSchema.index({ patientId: 1, date: -1 });
visitSchema.index({ status: 1 });

module.exports = mongoose.model('Visit', visitSchema);
