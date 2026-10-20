const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const labOrderSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // LAB-xxxx
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  patientName: { type: String, required: true, index: true },
  hospitalNo: { type: String, default: '' },
  test: { type: String, required: true, trim: true, index: true }, // Full Blood Count
  category: { type: String, default: 'Chemistry' },
  sampleType: { type: String, default: 'Blood' },
  sample: { type: String, default: 'Blood' },
  orderedBy: { type: String, required: true },
  orderedById: { type: String, default: '' },
  date: { type: String, required: true, index: true }, // May 17, 2025 or YYYY-MM-DD
  time: { type: String, default: '09:00 AM' },
  priority: { type: String, enum: ['routine','urgent','stat'], default: 'routine' },
  status: { type: String, enum: ['Pending','Completed','In Progress','Sample Collected','pending','collected','progress','completed','critical','cancelled'], default: 'Pending', index: true },
  result: { type: String, default: null },
  resultClass: { type: String, enum: ['normal','critical', null], default: null },
  resultNotes: { type: String, default: '' },
  params: [{ name: String, result: String, range: String, unit: String, flagged: Boolean }],
  notes: { type: String, default: '' },
  completedOn: { type: String, default: null },
  forwardedDepts: { type: [String], default: [] }, // nursing, pharmacy etc.
  history: [{ label: String, date: String, time: String, critical: Boolean, forwarded: Boolean }]
}, { timestamps: true });

labOrderSchema.index({ patientId: 1, date: -1 });

module.exports = mongoose.model('LabOrder', labOrderSchema);
