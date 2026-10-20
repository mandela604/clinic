const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const patientSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  hospitalNo: { type: String, required: true, unique: true, index: true },
  // name fields — frontend sends split, backend stores both split + full
  name: { type: String, required: true, trim: true, index: true }, // full "John O. Adekunle"
  title: { type: String, default: 'Mr.' },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, default: '' },
  lastName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  age: { type: String, required: true },
  dateOfBirth: { type: String, default: '' },
  maritalStatus: { type: String, default: '' },
  nationality: { type: String, default: 'Nigerian' },
  stateOfOrigin: { type: String, default: '' },
  lga: { type: String, default: '' },
  religion: { type: String, default: '' },
  occupation: { type: String, default: '' },
  employer: { type: String, default: '' },
  bloodType: { type: String, default: 'O+' },
  genotype: { type: String, default: 'AA' },
  // contact
  phonePrimary: { type: String, required: true, trim: true },
  phoneSecondary: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  address: { type: String, default: '' }, // full residential
  residentialAddress: { type: String, default: '' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  // additional
  idType: { type: String, default: '' },
  idNumber: { type: String, default: '' },
  idDateIssued: { type: String, default: '' },
  idExpiryDate: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'English' },
  howDidYouHear: { type: String, default: 'Walk-in' },
  patientType: { type: String, default: 'Outpatient' },
  patientCategory: { type: String, default: 'General Outpatient' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  allergies: { type: String, default: 'No known allergies' },
  chronicConditions: { type: String, default: 'No chronic conditions recorded' },
  emergencyContact: {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  registeredOn: { type: String, default: '' },
  lastVisit: { type: String, default: '' },
  avatar: { type: String, default: '' }
}, { timestamps: true });

patientSchema.index({ name: 'text', hospitalNo: 'text' });

module.exports = mongoose.model('Patient', patientSchema);
