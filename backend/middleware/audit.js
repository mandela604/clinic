const AuditLog = require('../models/AuditLog');

const TARGET_TYPES = {
  patients: 'Patient',
  visits: 'Visit',
  appointments: 'Appointment',
  admissions: 'Admission',
  'lab-orders': 'Lab Order',
  prescriptions: 'Prescription',
  drugs: 'Drug',
  invoices: 'Invoice',
  queue: 'Queue',
  vitals: 'Vitals',
  users: 'User',
  roles: 'Role',
  'audit-logs': 'Audit Log',
  settings: 'Settings'
};

const NAME_FIELDS = ['name', 'patientName', 'invoiceNo', 'test', 'username', 'title', 'role'];

function targetTypeOf(path) {
  const seg = String(path || '').split('?')[0].split('/').filter(Boolean)[1] || '';
  return TARGET_TYPES[seg] || (seg ? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');
}

function targetIdOf(path) {
  const parts = String(path || '').split('?')[0].split('/').filter(Boolean);
  return parts.length > 2 ? parts[2] : '';
}

function nameFrom(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const f of NAME_FIELDS) {
    if (obj[f] && typeof obj[f] === 'string') return obj[f].slice(0, 120);
  }
  return '';
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

function deviceOf(ua) {
  const s = String(ua || '');
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Unknown browser';
  const os = /Windows/.test(s) ? 'Windows' : /Android/.test(s) ? 'Android' : /iPhone|iPad|iOS/.test(s) ? 'iOS' : /Mac OS X/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Unknown OS';
  return browser + ' on ' + os;
}

function severityOf(action, statusCode) {
  if (action === 'login_failed') return 'critical';
  if (action === 'delete') return 'warning';
  if (action === 'role_change' || action === 'permission' || action === 'suspend' || action === 'password') return 'warning';
  if (statusCode >= 400) return 'warning';
  if (action === 'login' || action === 'logout') return 'success';
  return 'info';
}

function actionOf(req, statusCode) {
  const path = req.originalUrl || req.path || '';
  if (path.includes('/auth/login')) return statusCode < 400 ? 'login' : 'login_failed';
  if (path.includes('/auth/logout')) return 'logout';
  if (path.includes('/settings')) return 'settings';
  if (req.method === 'POST') return 'create';
  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (req.body && req.body.permissions !== undefined) return 'permission';
    if (req.body && req.body.role !== undefined) return 'role_change';
    if (req.body && req.body.status !== undefined) return 'suspend';
    return 'update';
  }
  if (req.method === 'DELETE') return 'delete';
  return 'update';
}

function describe(action, actor, targetType, targetName) {
  switch (action) {
    case 'login': return actor + ' signed in.';
    case 'login_failed': return 'Failed sign-in attempt for "' + actor + '".';
    case 'logout': return actor + ' signed out.';
    case 'create': return actor + ' created ' + (targetType || 'record') + (targetName ? ' "' + targetName + '"' : '') + '.';
    case 'update': return actor + ' updated ' + (targetType || 'record') + (targetName ? ' "' + targetName + '"' : '') + '.';
    case 'delete': return actor + ' deleted ' + (targetType || 'record') + (targetName ? ' "' + targetName + '"' : '') + '.';
    case 'role_change': return actor + ' changed the role for ' + (targetName || 'a user') + '.';
    case 'permission': return actor + ' updated permissions for the "' + targetName + '" role.';
    case 'suspend': return actor + ' changed account status for ' + (targetName || 'a user') + '.';
    case 'settings': return actor + ' updated the clinic settings.';
    default: return actor + ' performed ' + action + '.';
  }
}

function record(fields) {
  AuditLog.create(fields).catch(() => {});
}

function auditMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  let body = null;
  const originalJson = res.json.bind(res);
  res.json = data => {
    body = data;
    return originalJson(data);
  };

  res.on('finish', () => {
    const status = res.statusCode;
    const path = req.originalUrl || req.path || '';
    const isLogin = path.includes('/auth/login');
    if (!isLogin && status === 401) return; // expired/missing token — not an auditable event
    if (status >= 500) return;

    const action = actionOf(req, status);
    if (action !== 'login_failed' && status >= 400) return;

    const resUser = body && body.user;
    const actorName = isLogin
      ? ((resUser && resUser.name) || (req.body && (req.body.email || req.body.username)) || 'Unknown user')
      : ((req.user && req.user.name) || 'Unknown user');
    const actorRole = isLogin ? ((resUser && resUser.role) || '') : ((req.user && req.user.role) || '');
    const actorId = isLogin ? ((resUser && resUser.id) || '') : ((req.user && req.user.id) || '');

    const targetType = targetTypeOf(path);
    const targetName = nameFrom(body) || nameFrom(req.body) || '';
    const targetId = targetIdOf(path) || (body && (body.id || body._id)) || '';

    record({
      ts: new Date(),
      userName: String(actorName).slice(0, 120),
      userRole: actorRole,
      userId: actorId,
      action,
      method: req.method,
      path: String(req.originalUrl || req.path || '').slice(0, 300),
      targetType,
      targetId: String(targetId || ''),
      targetName,
      statusCode: status,
      severity: severityOf(action, status),
      ip: clientIp(req),
      device: deviceOf(req.headers['user-agent']),
      description: describe(action, actorName, targetType, targetName)
    });
  });

  next();
}

module.exports = { auditMiddleware, record, severityOf };
