const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const vitalsSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  hospitalNo: { type: String, required: true, index: true },
  visitId: { type: String, index: true, ref: 'Visit' },
  bp: { type: String, default: '' }, // 120/80
  temp: { type: String, default: '' },
  pulse: { type: String, default: '' },
  spo2: { type: String, default: '' },
  weight: { type: String, default: '' },
  height: { type: String, default: '' },
  recordedBy: { type: String, default: '' },
  recordedById: { type: String, default: '' },
  date: { type: String, required: true, index: true },
  time: { type: String, default: '' }
}, { timestamps: true });

vitalsSchema.index({ patientId: 1, date: -1 });

module.exports = mongoose.model('Vitals', vitalsSchema);
