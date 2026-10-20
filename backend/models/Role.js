const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roleSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true }, // query by id
  name: { type: String, required: true, unique: true, trim: true }, // Administrator, Doctor
  description: { type: String, default: '' },
  type: { type: String, enum: ['system', 'custom'], default: 'custom' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  permissions: { type: Object, default: {} }, // { patients:{view,create,edit,delete}, ... }
  usersCount: { type: Number, default: 0 }
}, { timestamps: true });

roleSchema.index({ name: 1 });

module.exports = mongoose.model('Role', roleSchema);
