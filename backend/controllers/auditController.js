const AuditLog = require('../models/AuditLog');

const PAGE_DEFAULT = 10;

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildQuery(q) {
  const filter = {};
  if (q.user && q.user !== 'all') filter.userName = q.user;
  if (q.action && q.action !== 'all') filter.action = q.action;
  if (q.target && q.target !== 'all') filter.targetType = q.target;
  if (q.severity && q.severity !== 'all') filter.severity = q.severity;

  let from = null;
  let to = null;
  if (q.from) from = new Date(q.from);
  if (q.to) to = new Date(q.to);
  if (q.date && q.date !== 'all') {
    if (q.date === 'today') from = dayStart(new Date());
    else if (/^\d+$/.test(q.date)) from = new Date(Date.now() - Number(q.date) * 24 * 60 * 60 * 1000);
  }
  if (from && !isNaN(from)) filter.ts = { $gte: from };
  if (to && !isNaN(to)) {
    const end = dayStart(to);
    end.setDate(end.getDate() + 1);
    filter.ts = Object.assign({}, filter.ts, { $lte: end });
  }

  if (q.search) {
    const rx = new RegExp(String(q.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ userName: rx }, { targetName: rx }, { targetType: rx }, { description: rx }, { ip: rx }, { path: rx }];
  }
  return filter;
}

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || PAGE_DEFAULT));
    const filter = buildQuery(req.query);
    const [total, items] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ ts: -1 }).skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ items, total, page, limit });
  } catch (e) { next(e); }
};

exports.stats = async (req, res, next) => {
  try {
    const today = dayStart(new Date());
    const [eventsToday, failedToday, criticalTotal, activeUsers, dataChanges, securityChanges] = await Promise.all([
      AuditLog.countDocuments({ ts: { $gte: today } }),
      AuditLog.countDocuments({ ts: { $gte: today }, action: 'login_failed' }),
      AuditLog.countDocuments({ severity: 'critical' }),
      AuditLog.distinct('userName', { ts: { $gte: today } }),
      AuditLog.countDocuments({ action: { $in: ['create', 'update', 'delete'] } }),
      AuditLog.countDocuments({ action: { $in: ['role_change', 'permission', 'settings', 'password', 'suspend'] } })
    ]);
    res.json({
      eventsToday,
      failedLoginsToday: failedToday,
      criticalEvents: criticalTotal,
      activeUsersToday: activeUsers.filter(Boolean).length,
      dataChanges,
      securityChanges
    });
  } catch (e) { next(e); }
};

exports.meta = async (req, res, next) => {  try {
    const [users, targets] = await Promise.all([
      AuditLog.distinct('userName'),
      AuditLog.distinct('targetType')
    ]);
    res.json({
      users: users.filter(Boolean).sort(),
      targets: targets.filter(Boolean).sort()
    });
  } catch (e) { next(e); }
};

exports.count = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (isNaN(before)) return res.status(400).json({ error: 'Invalid before date' });
      filter.ts = { $lt: before };
    }
    const count = await AuditLog.countDocuments(filter);
    res.json({ count });
  } catch (e) { next(e); }
};

exports.purge = async (req, res, next) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 90);
    const before = req.query.before ? new Date(req.query.before) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    if (isNaN(before)) return res.status(400).json({ error: 'Invalid cutoff date' });
    const result = await AuditLog.deleteMany({ ts: { $lt: before } });
    res.json({ ok: true, removed: result.deletedCount || 0, before });
  } catch (e) { next(e); }
};
