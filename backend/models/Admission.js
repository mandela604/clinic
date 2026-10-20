const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const admissionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // ADM-xxxx
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  hospitalNo: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  ward: { type: String, required: true, index: true }, // General Ward, Maternity, ICU
  bed: { type: String, required: true }, // Bed 1
  bedNo: { type: String, default: '' },
  department: { type: String, default: '' },
  admittingDoctor: { type: String, default: '' },
  doctor: { type: String, default: '' },
  doctorId: { type: String, default: '' },
  admitDate: { type: String, required: true, index: true }, // YYYY-MM-DD
  dischargeDate: { type: String, default: null },
  reason: { type: String, default: 'Observation' },
  diagnosis: { type: String, default: '' },
  status: { type: String, enum: ['Admitted','Discharged','Transferred','admitted','discharged','transferred'], default: 'Admitted', index: true }
}, { timestamps: true });

admissionSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Admission', admissionSchema);
