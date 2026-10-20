const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appointmentSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // APT-xxxx
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  hospitalNo: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  doctor: { type: String, required: true },
  doctorId: { type: String, index: true },
  department: { type: String, default: 'General OPD' },
  type: { type: String, enum: ['consultation','antenatal','familyplanning','followup','labtest'], default: 'consultation' },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD or "May 17, 2025"
  time: { type: String, required: true }, // 09:30 AM
  duration: { type: Number, default: 30 }, // minutes
  priority: { type: String, enum: ['Normal','Urgent'], default: 'Normal' },
  status: { type: String, enum: ['Scheduled','Confirmed','Completed','Cancelled','No-Show'], default: 'Scheduled', index: true },
  reason: { type: String, default: '' },
  via: { type: String, default: 'Walk-in' }
}, { timestamps: true });

appointmentSchema.index({ patientId: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
