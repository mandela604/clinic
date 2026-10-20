const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  userId: { type: String, unique: true, sparse: true }, // SHC-U-0001 display id
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, index: true }, // references Role.name
  roleId: { type: String, ref: 'Role', index: true }, // stores Role.id (uuid)
  dept: { type: String, default: 'General OPD' },
  department: { type: String, default: 'General OPD' },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'invited'], default: 'active', index: true },
  avatar: { type: String, default: '' },
  img: { type: Number, default: 1 },
  lastLogin: { type: Date, default: null },
  loginTime: { type: String, default: '' },
  loginDate: { type: String, default: '' }
}, { timestamps: true });

// indexes already defined via field unique:true — no duplicate

module.exports = mongoose.model('User', userSchema);
