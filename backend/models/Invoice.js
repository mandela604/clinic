const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const invoiceSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // INV-xxxx
  invoiceNo: { type: String, unique: true, sparse: true }, // SHC-INV-0001
  patientId: { type: String, required: true, index: true, ref: 'Patient' },
  patientName: { type: String, required: true },
  hospitalNo: { type: String, default: '' },
  date: { type: String, required: true, index: true },
  items: { type: [String], default: [] },
  lineItems: [{
    description: String, quantity: Number, unitPrice: Number, total: Number
  }],
  total: { type: Number, required: true },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid','Unpaid','Pending','Overdue','Cancelled'], default: 'Unpaid', index: true },
  method: { type: String, default: 'Cash' }, // Cash, Card, Transfer
  payments: [{ amount: Number, method: String, date: String, by: String }],
  dueDate: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

invoiceSchema.index({ patientId: 1, date: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
