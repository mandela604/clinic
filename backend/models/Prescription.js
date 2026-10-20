const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const prescriptionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // RX-xxxx
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  patientName: { type: String, required: true },
  hospitalNo: { type: String, default: '' },
  doctor: { type: String, required: true },
  doctorId: { type: String, default: '' },
  date: { type: String, required: true, index: true },
  medications: { type: [String], default: [] }, // or refs
  items: [{
    name: String, dose: String, freq: String, duration: String, quantity: Number, instructions: String
  }],
  status: { type: String, enum: ['Pending','Dispensed','Completed','Cancelled'], default: 'Pending', index: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

prescriptionSchema.index({ patientId: 1, date: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
