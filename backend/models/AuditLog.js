const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, index: true },
  ts: { type: Date, default: Date.now, index: true },
  userName: { type: String, default: '', index: true },
  userRole: { type: String, default: '' },
  userId: { type: String, default: '' },
  action: {
    type: String,
    enum: ['login', 'login_failed', 'logout', 'create', 'update', 'delete', 'view', 'role_change', 'permission', 'settings', 'password', 'suspend'],
    required: true,
    index: true
  },
  method: { type: String, default: '' },
  path: { type: String, default: '' },
  targetType: { type: String, default: '', index: true },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  statusCode: { type: Number, default: 200 },
  severity: { type: String, enum: ['info', 'success', 'warning', 'critical'], default: 'info', index: true },
  ip: { type: String, default: '' },
  device: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true });

auditLogSchema.index({ ts: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
