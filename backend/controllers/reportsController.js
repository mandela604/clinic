const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Invoice = require('../models/Invoice');
const User = require('../models/User');

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDay(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? null : d;
}
function display(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { from, to };
}

function resolveRange(q) {
  let from = parseDay(q.from);
  let to = parseDay(q.to);
  if (!from || !to) {
    const d = defaultRange();
    from = from || d.from;
    to = to || d.to;
  }
  if (from > to) { const t = from; from = to; to = t; }
  return { from, to, days: Math.floor((to - from) / DAY_MS) + 1 };
}

function buildBuckets(from, to) {
  const days = Math.floor((to - from) / DAY_MS) + 1;
  const weekly = days > 14;
  const buckets = [];
  if (weekly) {
    let cursor = new Date(from);
    let i = 1;
    while (cursor <= to) {
      const end = new Date(Math.min(cursor.getTime() + 6 * DAY_MS, to.getTime()));
      buckets.push({ label: 'Wk ' + i, from: ymd(cursor), to: ymd(end) });
      cursor = new Date(end.getTime() + DAY_MS);
      i++;
    }
  } else {
    for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
      const d = new Date(t);
      buckets.push({ label: display(d), from: ymd(d), to: ymd(d) });
    }
  }
  return buckets;
}

function bucketOf(buckets, dayStr) {
  return buckets.findIndex(b => dayStr >= b.from && dayStr <= b.to);
}

function toDayStr(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return ymd(d);
}

const CANCELLED_VISIT = ['cancelled'];
const NOSHOW_VISIT = ['noshow'];
const NON_SERVED = CANCELLED_VISIT.concat(NOSHOW_VISIT);
const COMPLETED_VISIT = ['completed', 'Completed', 'recorded'];

function isNonServed(v) { return NON_SERVED.includes(String(v.status || '').toLowerCase()); }
function isCompleted(v) { return COMPLETED_VISIT.includes(v.status); }

const REVENUE_CATEGORIES = [
  { name: 'Consultation', color: '#2563eb', rx: /consult|clinic fee|doctor|review/i },
  { name: 'Laboratory', color: '#8b5cf6', rx: /lab|test|scan|x-?ray|ultrasound|pathology/i },
  { name: 'Pharmacy', color: '#12b76a', rx: /drug|med|pharm|tablet|capsule|injection|syrup/i },
  { name: 'Maternity Services', color: '#ec4899', rx: /matern|antenatal|delivery|postnatal|obstetric/i },
  { name: 'Admissions', color: '#f79009', rx: /admission|ward|bed|inpatient/i }
];
const OTHER_COLOR = '#94a3b8';

function categorize(text) {
  const s = String(text || '');
  for (const c of REVENUE_CATEGORIES) if (c.rx.test(s)) return c.name;
  return 'Other';
}
function colorOf(name) {
  const c = REVENUE_CATEGORIES.find(x => x.name === name);
  return c ? c.color : OTHER_COLOR;
}

function topEntries(map, limit) {
  return Object.keys(map).map(name => ({ name, count: map[name] }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
}

exports.reports = async (req, res, next) => {
  try {
    const { from, to, days } = resolveRange(req.query);
    const fromStr = ymd(from);
    const toStr = ymd(to);
    const dept = req.query.department && req.query.department !== 'all' ? req.query.department : null;
    const doctor = req.query.doctor && req.query.doctor !== 'all' ? req.query.doctor : null;

    const visitQuery = { date: { $gte: fromStr, $lte: toStr } };
    if (dept) visitQuery.$or = [{ department: dept }, { dept: dept }];
    if (doctor) visitQuery.doctor = doctor;

    const appointmentQuery = { date: { $gte: fromStr, $lte: toStr } };
    if (dept) appointmentQuery.department = dept;
    if (doctor) appointmentQuery.doctor = doctor;

    const invoiceQuery = { date: { $gte: fromStr, $lte: toStr }, status: { $ne: 'Cancelled' } };

    const [visits, legacyAppointments, appointments, prescriptions, invoices, doctorUsers, allPatients] = await Promise.all([
      Visit.find(visitQuery).select('patientId date department dept doctor status diagnosis rx durationMin avgMinutes').limit(20000).lean(),
      Appointment.find({ date: { $not: /^\d{4}-\d{2}-\d{2}$/ } }).select('date doctor department status').limit(5000).lean(),
      Appointment.find(appointmentQuery).select('date doctor department status').limit(20000).lean(),
      Prescription.find({ date: { $gte: fromStr, $lte: toStr } }).select('medications items date').limit(10000).lean(),
      Invoice.find(invoiceQuery).select('date items lineItems total paid balance status').limit(10000).lean(),
      User.find({ role: { $in: ['Doctor', 'doctor'] } }).select('name').lean(),
      Patient.find({}).select('id registeredOn createdAt').limit(50000).lean()
    ]);

    // Legacy (non ISO) appointment dates — keep only those inside the range
    const legacyInRange = legacyAppointments.filter(a => {
      const d = new Date(a.date);
      if (isNaN(d)) return false;
      if (d < from || d > new Date(to.getTime() + DAY_MS - 1)) return false;
      if (dept && a.department !== dept) return false;
      if (doctor && a.doctor !== doctor) return false;
      return true;
    });
    const allAppointments = appointments.concat(legacyInRange);

    // ── Patient volume ──
    const servedVisits = visits.filter(v => !isNonServed(v));
    const buckets = buildBuckets(from, to);
    const series = buckets.map(b => ({ label: b.label, visits: 0, reg: 0 }));
    servedVisits.forEach(v => {
      const i = bucketOf(buckets, String(v.date || '').slice(0, 10));
      if (i >= 0) series[i].visits++;
    });

    const registrations = [];
    const registeredOnMap = {};
    allPatients.forEach(p => {
      const dayStr = toDayStr(p.registeredOn) || toDayStr(p.createdAt);
      if (p.id) registeredOnMap[p.id] = dayStr;
      if (!dayStr || dayStr < fromStr || dayStr > toStr) return;
      registrations.push(dayStr);
      const i = bucketOf(buckets, dayStr);
      if (i >= 0) series[i].reg++;
    });

    const uniquePatients = new Set(servedVisits.map(v => v.patientId).filter(Boolean));
    let returningCount = 0;
    uniquePatients.forEach(id => {
      const reg = registeredOnMap[id];
      if (reg && reg < fromStr) returningCount++;
    });
    const returningPct = uniquePatients.size ? Math.round((returningCount / uniquePatients.size) * 100) : 0;
    const prevFrom = new Date(from.getTime() - days * DAY_MS);
    const prevTo = new Date(from.getTime() - DAY_MS);
    const prevQuery = Object.assign({}, visitQuery, {
      date: { $gte: ymd(prevFrom), $lte: ymd(prevTo) },
      status: { $nin: ['cancelled', 'noshow'] }
    });
    const prevVisits = await Visit.countDocuments(prevQuery);
    const visitDelta = prevVisits ? Math.round(((servedVisits.length - prevVisits) / prevVisits) * 100) : null;

    // ── Appointments ──
    const apptCounts = { Scheduled: 0, Confirmed: 0, Completed: 0, Cancelled: 0, 'No-Show': 0 };
    allAppointments.forEach(a => {
      if (apptCounts[a.status] === undefined) apptCounts[a.status] = 0;
      apptCounts[a.status]++;
    });
    const apptTotal = allAppointments.length;
    const pct = n => apptTotal ? Math.round((n / apptTotal) * 1000) / 10 : 0;
    const apptColors = { Completed: '#12b76a', 'Checked In': '#2563eb', Confirmed: '#8b5cf6', Scheduled: '#64748b', Cancelled: '#f79009', 'No-Show': '#f04438' };
    const apptBreakdown = ['Completed', 'Confirmed', 'Scheduled', 'Cancelled', 'No-Show']
      .map(k => ({ label: k, value: apptCounts[k] || 0, color: apptColors[k] }))
      .filter(x => x.value > 0);

    const doctorMap = {};
    allAppointments.forEach(a => {
      if (!a.doctor) return;
      const d = doctorMap[a.doctor] || (doctorMap[a.doctor] = { name: a.doctor, appts: 0, completed: 0, noshow: 0 });
      d.appts++;
      if (a.status === 'Completed') d.completed++;
      if (a.status === 'No-Show') d.noshow++;
    });
    (doctorUsers || []).forEach(u => {
      if (u.name && !doctorMap[u.name]) doctorMap[u.name] = { name: u.name, appts: 0, completed: 0, noshow: 0 };
    });
    const doctorUtil = Object.values(doctorMap)
      .map(d => ({ ...d, util: d.appts ? Math.round((d.completed / d.appts) * 100) : 0 }))
      .sort((a, b) => b.appts - a.appts || a.name.localeCompare(b.name));

    // ── Department performance ──
    const deptMap = {};
    visits.forEach(v => {
      const name = v.department || v.dept || 'General OPD';
      const d = deptMap[name] || (deptMap[name] = { name, served: 0, completed: 0, waiting: 0, minutes: 0, minuteCount: 0 });
      if (isNonServed(v)) return;
      d.served++;
      if (isCompleted(v)) d.completed++;
      if (String(v.status || '').toLowerCase() === 'waiting') d.waiting++;
      const m = Number(v.durationMin || v.avgMinutes || 0);
      if (m > 0) { d.minutes += m; d.minuteCount++; }
    });
    const departments = Object.values(deptMap).map(d => {
      const total = d.served + d.waiting;
      return {
        name: d.name,
        served: d.served,
        completed: d.completed,
        avgConsult: d.minuteCount ? Math.round(d.minutes / d.minuteCount) : 0,
        throughput: days ? Math.round((d.served / (days * 8)) * 10) / 10 : 0,
        load: total ? Math.round((d.waiting / total) * 100) : 0
      };
    }).sort((a, b) => b.served - a.served);

    // ── Consultation summary ──
    const diagMap = {};
    servedVisits.forEach(v => {
      const name = String(v.diagnosis || '').trim();
      if (!name) return;
      diagMap[name] = (diagMap[name] || 0) + 1;
    });
    const diagnoses = topEntries(diagMap, 8);

    const rxMap = {};
    (prescriptions || []).forEach(p => {
      const meds = [].concat(p.medications || [], (p.items || []).map(i => i && i.name)).filter(Boolean);
      meds.forEach(m => {
        const name = String(m).trim();
        if (name) rxMap[name] = (rxMap[name] || 0) + 1;
      });
    });
    servedVisits.forEach(v => (v.rx || []).forEach(r => {
      const name = String(r && r.name || '').trim();
      if (name) rxMap[name] = (rxMap[name] || 0) + 1;
    }));
    const prescriptionsTop = topEntries(rxMap, 8);

    // ── Revenue ──
    const revenueSeries = buckets.map(b => ({ label: b.label, revenue: 0 }));
    const billingMap = {};
    let totalRevenue = 0;
    let totalPaid = 0;
    const statusPaid = /^(paid|completed)$/i;
    invoices.forEach(inv => {
      totalRevenue += Number(inv.total) || 0;
      totalPaid += Number(inv.paid) || (statusPaid.test(inv.status) ? Number(inv.total) || 0 : 0);
      const i = bucketOf(buckets, String(inv.date || '').slice(0, 10));
      if (i >= 0) revenueSeries[i].revenue += Number(inv.total) || 0;

      const lines = Array.isArray(inv.lineItems) && inv.lineItems.length ? inv.lineItems : null;
      if (lines) {
        lines.forEach(li => {
          const cat = categorize(li.description);
          billingMap[cat] = (billingMap[cat] || 0) + (Number(li.total) || (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0));
        });
      } else {
        const items = Array.isArray(inv.items) ? inv.items : [];
        const cat = items.length ? categorize(items[0]) : 'Other';
        billingMap[cat] = (billingMap[cat] || 0) + (Number(inv.total) || 0);
      }
    });
    const outstanding = Math.max(0, totalRevenue - totalPaid);
    const collectionRate = totalRevenue ? Math.round((totalPaid / totalRevenue) * 1000) / 10 : 0;
    const billing = Object.keys(billingMap)
      .map(name => ({ name, amount: Math.round(billingMap[name]), color: colorOf(name) }))
      .filter(b => b.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    // ── Filter option lists ──
    const [visitDepts, visitDoctors, apptDoctors] = await Promise.all([
      Visit.distinct('department'),
      Visit.distinct('doctor'),
      Appointment.distinct('doctor')
    ]);
    const deptOptions = Array.from(new Set(visitDepts.concat(await Appointment.distinct('department')).filter(Boolean))).sort();
    const doctorOptions = Array.from(new Set(visitDoctors.concat(apptDoctors).concat((doctorUsers || []).map(u => u.name)).filter(Boolean))).sort();

    res.json({
      range: { from: fromStr, to: toStr, days },
      options: { departments: deptOptions, doctors: doctorOptions },
      volume: {
        totalVisits: servedVisits.length,
        newRegistrations: registrations.length,
        avgDaily: days ? Math.round((servedVisits.length / days) * 10) / 10 : 0,
        returningPct,
        visitDelta,
        series
      },
      appointments: {
        total: apptTotal,
        showRate: pct(apptCounts.Completed),
        noShowRate: pct(apptCounts['No-Show']),
        cancellationRate: pct(apptCounts.Cancelled),
        breakdown: apptBreakdown,
        doctors: doctorUtil
      },
      departments,
      diagnoses,
      prescriptions: prescriptionsTop,
      revenue: {
        total: totalRevenue,
        paid: totalPaid,
        outstanding,
        collectionRate,
        series: revenueSeries
      },
      billing
    });
  } catch (e) { next(e); }
};
