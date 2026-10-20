const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const drugSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  generic: { type: String, default: '' },
  code: { type: String, default: '', index: true },
  category: { type: String, default: 'General', index: true },
  form: { type: String, default: 'Tabs' },
  stock: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'Tabs' },
  unitPrice: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10, min: 0 },
  batch: { type: String, default: '' },
  expiry: { type: String, default: '' },
  supplier: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

drugSchema.index({ name: 1, code: 1 });

module.exports = mongoose.model('Drug', drugSchema);
