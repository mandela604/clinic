/**
 * Live end-to-end smoke test (development only).
 * Boots an in-memory MongoDB, starts the real server, and exercises
 * auth + full CRUD (by custom uuid id) on every resource, plus static hosting.
 * Run: node scripts/smoke.js   (from backend/)
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

const PORT = process.env.SMOKE_PORT || '5099';
const BASE = 'http://127.0.0.1:' + PORT + '/api';

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name + (extra ? ' :: ' + extra : '')); console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
}

async function req(method, path, { token, body } = {}) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('shiloh_smoke');
  process.env.PORT = PORT;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret';
  process.env.NODE_ENV = 'development';

  require('../server'); // starts listening after DB connect

  // wait for server + db
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    const h = await fetch('http://127.0.0.1:' + PORT + '/api/health').then(r => r.ok).catch(() => false);
    if (h) up = true; else await wait(500);
  }
  if (!up) { console.error('Server never came up'); process.exit(1); }

  console.log('\n--- 1. Health + setup status ---');
  const health = await req('GET', '/health');
  ok('GET /api/health', health.status === 200 && health.data.ok === true);
  const setup = await req('GET', '/auth/setup-status');
  ok('GET /auth/setup-status (needsSetup=true)', setup.status === 200 && setup.data.needsSetup === true, JSON.stringify(setup.data));

  console.log('\n--- 2. Auth: register first admin, login, guards ---');
  const reg = await req('POST', '/auth/register', { body: { name: 'Smoke Admin', username: 'admin', email: 'admin@smoke.test', password: 'Admin@123' } });
  ok('POST /auth/register first user -> admin + token', reg.status === 201 && !!reg.data.token, JSON.stringify(reg.data));
  const token = reg.data && reg.data.token;

  const reg2 = await req('POST', '/auth/register', { body: { name: 'X', username: 'x', email: 'x@smoke.test', password: 'xxxxxx' } });
  ok('second public register closed (403)', reg2.status === 403, 'status=' + reg2.status);

  const login = await req('POST', '/auth/login', { body: { username: 'admin', password: 'Admin@123' } });
  ok('POST /auth/login', login.status === 200 && !!login.data.token, JSON.stringify(login.data));
  const tok = login.data && login.data.token ? login.data.token : token;

  const me = await req('GET', '/auth/me', { token: tok });
  ok('GET /auth/me', me.status === 200 && me.data.user, JSON.stringify(me.data));

  const noAuth = await req('GET', '/patients');
  ok('GET /api/patients without token -> 401', noAuth.status === 401, 'status=' + noAuth.status);

  console.log('\n--- 3. Patients CRUD (uuid id) ---');
  const p1 = await req('POST', '/patients', { token: tok, body: { name: 'Smoke Patient', firstName: 'Smoke', lastName: 'Patient', gender: 'Female', dateOfBirth: '1990-01-01', phone: '08012345678', email: 'sp@smoke.test', address: '1 Test Lane', bloodGroup: 'O+' } });
  ok('POST /api/patients', p1.status === 201 && p1.data.id && p1.data.id.length === 36, JSON.stringify(p1.data).slice(0, 200));
  const pid = p1.data && p1.data.id;

  const pList = await req('GET', '/patients?limit=100', { token: tok });
  ok('GET /api/patients list', pList.status === 200 && Array.isArray(pList.data.items) && pList.data.items.length === 1);

  const pGet = await req('GET', '/patients/' + pid, { token: tok });
  ok('GET /api/patients/:id by uuid', pGet.status === 200 && pGet.data.id === pid);

  const pPut = await req('PUT', '/patients/' + pid, { token: tok, body: { phone: '08099999999' } });
  ok('PUT /api/patients/:id', pPut.status === 200 && pPut.data.phone === '08099999999');

  const hospNo = p1.data.hospitalNo;

  console.log('\n--- 4. Visits + Queue CRUD + advance ---');
  const v1 = await req('POST', '/visits', { token: tok, body: { patientId: pid, hospitalNo: hospNo, patientName: 'Smoke Patient', type: 'walkin', date: '2026-10-17' } });
  ok('POST /api/visits', v1.status === 201 && v1.data.id, JSON.stringify(v1.data).slice(0, 200));
  const vid = v1.data && v1.data.id;

  const vPut = await req('PUT', '/visits/' + vid, { token: tok, body: { status: 'active' } });
  ok('PUT /api/visits/:id (status active)', vPut.status === 200 && vPut.data.status === 'active', JSON.stringify(vPut.data));

  const q1 = await req('POST', '/queue', { token: tok, body: {} });
  ok('POST /api/queue (tolerant create w/ defaults)', q1.status === 201 && q1.data.id, JSON.stringify(q1.data).slice(0, 200));
  const qid = q1.data && q1.data.id;

  const qList = await req('GET', '/queue?limit=100', { token: tok });
  ok('GET /api/queue returns ALL entries (no status filter)', qList.status === 200 && qList.data.items.length >= 1, JSON.stringify(qList.data).slice(0, 300));
  ok('queue item has client aliases (name/hospNo/q)', !!(qList.data.items[0] && qList.data.items[0].name && qList.data.items[0].q !== undefined));

  const adv1 = await req('PATCH', '/queue/' + qid + '/advance', { token: tok, body: {} });
  ok('PATCH /queue/:id/advance waiting->progress', adv1.status === 200 && adv1.data.status === 'progress', JSON.stringify(adv1.data));
  const adv2 = await req('PATCH', '/queue/' + qid + '/advance', { token: tok, body: {} });
  ok('advance -> recorded', adv2.status === 200 && adv2.data.status === 'recorded', JSON.stringify(adv2.data));
  const adv3 = await req('PATCH', '/queue/' + qid + '/advance', { token: tok, body: {} });
  ok('advance -> completed (+completedAt)', adv3.status === 200 && adv3.data.status === 'completed' && !!adv3.data.completedAt, JSON.stringify(adv3.data));
  const adv4 = await req('PATCH', '/queue/' + qid + '/advance', { token: tok, body: {} });
  ok('advance past end -> 400', adv4.status === 400, 'status=' + adv4.status);

  const qPut = await req('PUT', '/queue/' + qid, { token: tok, body: { status: 'Completed', diagnosis: 'Smoke dx', notes: 'n', rx: [{ name: 'Drug A', dose: '1 tab', freq: 'daily' }] } });
  ok('PUT /queue/:id with page vocab status Completed', qPut.status === 200 && qPut.data.status === 'completed' && qPut.data.diagnosis === 'Smoke dx', JSON.stringify(qPut.data).slice(0, 250));

  const qDel = await req('DELETE', '/queue/' + qid, { token: tok });
  ok('DELETE /api/queue/:id', qDel.status === 200 && qDel.data.ok === true);

  console.log('\n--- 5. Departments + Users + Roles ---');
  const depts = await req('GET', '/departments', { token: tok });
  ok('GET /api/departments -> string[]', depts.status === 200 && Array.isArray(depts.data) && typeof depts.data[0] === 'string' && depts.data.length > 3, JSON.stringify(depts.data).slice(0, 120));

  const u1 = await req('POST', '/users', { token: tok, body: { name: 'Smoke Doctor', username: 'sdoctor', email: 'doc@smoke.test', password: 'Doc@12345', role: 'Doctor', dept: 'General OPD' } });
  ok('POST /api/users (admin creates staff)', u1.status === 201 && u1.data.id, JSON.stringify(u1.data).slice(0, 200));
  const uid = u1.data && u1.data.id;
  const uPut = await req('PUT', '/users/' + uid, { token: tok, body: { status: 'inactive' } });
  ok('PUT /api/users/:id (toggle status)', uPut.status === 200 && uPut.data.status === 'inactive');
  const uReset = await req('POST', '/users/' + uid + '/reset-password', { token: tok, body: {} });
  ok('POST /users/:id/reset-password', uReset.status === 200 && !!uReset.data.tempPassword, JSON.stringify(uReset.data));
  const uDel = await req('DELETE', '/users/' + uid, { token: tok });
  ok('DELETE /api/users/:id', uDel.status === 200 && uDel.data.ok === true);

  const r1 = await req('POST', '/roles', { token: tok, body: { name: 'Smoke Role ' + Date.now(), description: 'test', permissions: { patients: { read: true } } } });
  ok('POST /api/roles', r1.status === 201 && r1.data.id, JSON.stringify(r1.data).slice(0, 200));
  const rid = r1.data && r1.data.id;
  const rPut = await req('PUT', '/roles/' + rid, { token: tok, body: { description: 'updated' } });
  ok('PUT /api/roles/:id', rPut.status === 200);
  const rDel = await req('DELETE', '/roles/' + rid, { token: tok });
  ok('DELETE /api/roles/:id', rDel.status === 200 && rDel.data.ok === true);

  console.log('\n--- 6. Appointments + Admissions (discharge) ---');
  const a1 = await req('POST', '/appointments', { token: tok, body: { patientId: pid, patientName: 'Smoke Patient', hospitalNo: hospNo, doctor: 'Smoke Doctor', date: '2026-10-20', time: '10:00 AM' } });
  ok('POST /api/appointments', a1.status === 201 && a1.data.id, JSON.stringify(a1.data).slice(0, 200));
  const aid = a1.data && a1.data.id;
  const aPut = await req('PUT', '/appointments/' + aid, { token: tok, body: { status: 'Confirmed' } });
  ok('PUT /api/appointments/:id', aPut.status === 200);
  const aDel = await req('DELETE', '/appointments/' + aid, { token: tok });
  ok('DELETE /api/appointments/:id', aDel.status === 200 && aDel.data.ok === true);

  const ad1 = await req('POST', '/admissions', { token: tok, body: { patientId: pid, hospitalNo: hospNo, patientName: 'Smoke Patient', ward: 'General Ward', bed: 'Bed 1', admitDate: '2026-10-17' } });
  ok('POST /api/admissions', ad1.status === 201 && ad1.data.id, JSON.stringify(ad1.data).slice(0, 200));
  const adid = ad1.data && ad1.data.id;
  const adDis = await req('PATCH', '/admissions/' + adid + '/discharge', { token: tok, body: { dischargeDate: '2026-10-18' } });
  ok('PATCH /admissions/:id/discharge', adDis.status === 200 && String(adDis.data.status).toLowerCase() === 'discharged' && adDis.data.dischargeDate, JSON.stringify(adDis.data).slice(0, 200));
  const adGet = await req('GET', '/admissions/' + adid, { token: tok });
  ok('GET /api/admissions/:id', adGet.status === 200 && adGet.data.id === adid);
  const adDel = await req('DELETE', '/admissions/' + adid, { token: tok });
  ok('DELETE /api/admissions/:id', adDel.status === 200 && adDel.data.ok === true);

  console.log('\n--- 7. Lab orders (advance chain) ---');
  const l1 = await req('POST', '/lab-orders', { token: tok, body: { patientId: pid, test: 'Full Blood Count', orderedBy: 'Smoke Doctor', date: '2026-10-17' } });
  ok('POST /api/lab-orders', l1.status === 201 && l1.data.id, JSON.stringify(l1.data).slice(0, 200));
  const lid = l1.data && l1.data.id;
  const lAdv1 = await req('PATCH', '/lab-orders/' + lid + '/advance', { token: tok, body: {} });
  ok('PATCH /lab-orders/:id/advance pending->collected', lAdv1.status === 200 && lAdv1.data.status === 'collected', JSON.stringify(lAdv1.data));
  const lAdv2 = await req('PATCH', '/lab-orders/' + lid + '/advance', { token: tok, body: {} });
  ok('advance -> progress', lAdv2.status === 200 && lAdv2.data.status === 'progress');
  const lAdv3 = await req('PATCH', '/lab-orders/' + lid + '/advance', { token: tok, body: {} });
  ok('advance -> completed (+completedOn)', lAdv3.status === 200 && lAdv3.data.status === 'completed' && !!lAdv3.data.completedOn, JSON.stringify(lAdv3.data).slice(0, 200));
  const lPut = await req('PUT', '/lab-orders/' + lid, { token: tok, body: { notes: 'ok' } });
  ok('PUT /api/lab-orders/:id', lPut.status === 200);
  const lDel = await req('DELETE', '/lab-orders/' + lid, { token: tok });
  ok('DELETE /api/lab-orders/:id', lDel.status === 200 && lDel.data.ok === true);

  console.log('\n--- 8. Prescriptions ---');
  const rx1 = await req('POST', '/prescriptions', { token: tok, body: { patientId: pid, patientName: 'Smoke Patient', hospitalNo: hospNo, doctor: 'Smoke Doctor', date: '2026-10-17', items: [{ name: 'Paracetamol', dose: '500mg', freq: '3x daily' }] } });
  ok('POST /api/prescriptions', rx1.status === 201 && rx1.data.id, JSON.stringify(rx1.data).slice(0, 200));
  const rxid = rx1.data && rx1.data.id;
  const rxPut = await req('PUT', '/prescriptions/' + rxid, { token: tok, body: { status: 'Dispensed' } });
  ok('PUT /api/prescriptions/:id', rxPut.status === 200 && rxPut.data.status === 'Dispensed');
  const rxGet = await req('GET', '/prescriptions/' + rxid, { token: tok });
  ok('GET /api/prescriptions/:id', rxGet.status === 200 && rxGet.data.id === rxid);
  const rxDel = await req('DELETE', '/prescriptions/' + rxid, { token: tok });
  ok('DELETE /api/prescriptions/:id', rxDel.status === 200 && rxDel.data.ok === true);

  console.log('\n--- 9. Drugs (pharmacy inventory) ---');
  const d1 = await req('POST', '/drugs', { token: tok, body: { name: 'Paracetamol 500mg', generic: 'Paracetamol', code: 'DRG-001', category: 'Analgesic', form: 'Tabs', stock: 100, unit: 'Tabs', unitPrice: 0.5, reorderLevel: 20, expiry: '2027-06-30' } });
  ok('POST /api/drugs', d1.status === 201 && d1.data.id && d1.data.id.length === 36, JSON.stringify(d1.data).slice(0, 200));
  const did = d1.data && d1.data.id;
  const dRestock = await req('PATCH', '/drugs/' + did + '/restock', { token: tok, body: { qty: 50 } });
  ok('PATCH /drugs/:id/restock +50', dRestock.status === 200 && dRestock.data.stock === 150, JSON.stringify(dRestock.data));
  const dDisp1 = await req('POST', '/drugs/' + did + '/dispense', { token: tok, body: { qty: 30 } });
  ok('POST /drugs/:id/dispense -30', dDisp1.status === 200 && dDisp1.data.stock === 120, JSON.stringify(dDisp1.data));
  const dDisp2 = await req('POST', '/drugs/' + did + '/dispense', { token: tok, body: { qty: 999 } });
  ok('dispense over stock -> 400', dDisp2.status === 400, 'status=' + dDisp2.status);
  const dPut = await req('PUT', '/drugs/' + did, { token: tok, body: { unitPrice: 0.75 } });
  ok('PUT /api/drugs/:id', dPut.status === 200 && dPut.data.unitPrice === 0.75);
  const dList = await req('GET', '/drugs?search=Paracetamol', { token: tok });
  ok('GET /api/drugs?search=', dList.status === 200 && dList.data.items.length === 1);
  const dDel = await req('DELETE', '/drugs/' + did, { token: tok });
  ok('DELETE /api/drugs/:id', dDel.status === 200 && dDel.data.ok === true);

  console.log('\n--- 10. Invoices + payments ---');
  const i1 = await req('POST', '/invoices', { token: tok, body: { patientId: pid, patientName: 'Smoke Patient', hospitalNo: hospNo, date: '2026-10-17', total: 100, paid: 0, status: 'Unpaid', lineItems: [{ description: 'Consultation', quantity: 1, unitPrice: 100, total: 100 }] } });
  ok('POST /api/invoices', i1.status === 201 && i1.data.id, JSON.stringify(i1.data).slice(0, 200));
  const iid = i1.data && i1.data.id;
  const iPay = await req('POST', '/invoices/' + iid + '/payments', { token: tok, body: { amount: 60, method: 'Cash' } });
  ok('POST /invoices/:id/payments 60', iPay.status === 200 && iPay.data.paid === 60 && iPay.data.balance === 40 && iPay.data.status === 'Unpaid', JSON.stringify(iPay.data));
  const iPay2 = await req('POST', '/invoices/' + iid + '/payments', { token: tok, body: { amount: 40, method: 'Card' } });
  ok('POST payment 40 -> Paid + history', iPay2.status === 200 && iPay2.data.balance === 0 && iPay2.data.status === 'Paid' && Array.isArray(iPay2.data.payments) && iPay2.data.payments.length === 2, JSON.stringify(iPay2.data));
  const iPay3 = await req('POST', '/invoices/' + iid + '/payments', { token: tok, body: { amount: 10, method: 'Cash' } });
  ok('overpay -> 400', iPay3.status === 400, 'status=' + iPay3.status);
  const iGet = await req('GET', '/invoices/' + iid, { token: tok });
  ok('GET /api/invoices/:id', iGet.status === 200 && iGet.data.id === iid);
  const iPut = await req('PUT', '/invoices/' + iid, { token: tok, body: { notes: 'paid fully' } });
  ok('PUT /api/invoices/:id', iPut.status === 200);
  const iDel = await req('DELETE', '/invoices/' + iid, { token: tok });
  ok('DELETE /api/invoices/:id', iDel.status === 200 && iDel.data.ok === true);

  console.log('\n--- 11. Vitals ---');
  const vit = await req('POST', '/vitals', { token: tok, body: { patientId: pid, bp: '120/80', temp: '36.8', pulse: '72' } });
  ok('POST /api/vitals', vit.status === 201 && vit.data.id, JSON.stringify(vit.data).slice(0, 200));
  const vitid = vit.data && vit.data.id;
  const vitPut = await req('PUT', '/vitals/' + vitid, { token: tok, body: { bp: '130/85' } });
  ok('PUT /api/vitals/:id', vitPut.status === 200 && vitPut.data.bp === '130/85');
  const vitList = await req('GET', '/vitals?patientId=' + pid, { token: tok });
  ok('GET /api/vitals?patientId=', vitList.status === 200 && vitList.data.items.length >= 1, JSON.stringify(vitList.data).slice(0, 200));
  const vitDel = await req('DELETE', '/vitals/' + vitid, { token: tok });
  ok('DELETE /api/vitals/:id', vitDel.status === 200 && vitDel.data.ok === true);

  console.log('\n--- 12. Stats + visit delete ---');
  const stats = await req('GET', '/stats/dashboard', { token: tok });
  ok('GET /api/stats/dashboard', stats.status === 200 && stats.data.patients && stats.data.queue, JSON.stringify(stats.data).slice(0, 200));
  const vDel = await req('DELETE', '/visits/' + vid, { token: tok });
  ok('DELETE /api/visits/:id', vDel.status === 200 && vDel.data.ok === true);
  const pDel = await req('DELETE', '/patients/' + pid, { token: tok });
  ok('DELETE /api/patients/:id', pDel.status === 200 && pDel.data.ok === true);

  console.log('\n--- 13. Static frontend hosting (Render single service) ---');
  const root = await fetch('http://127.0.0.1:' + PORT + '/', { redirect: 'manual' });
  ok('GET / -> redirect to /login.html', root.status === 302 && (root.headers.get('location') || '').includes('login.html'), 'status=' + root.status + ' loc=' + root.headers.get('location'));
  const loginPage = await fetch('http://127.0.0.1:' + PORT + '/login.html');
  ok('GET /login.html served', loginPage.status === 200);
  const apiJs = await fetch('http://127.0.0.1:' + PORT + '/services/api.js');
  ok('GET /services/api.js served', apiJs.status === 200);
  const svcJs = await fetch('http://127.0.0.1:' + PORT + '/services/patient-service.js');
  ok('GET /services/patient-service.js served', svcJs.status === 200);

  console.log('\n========================================');
  console.log('SMOKE RESULT: ' + pass + ' passed, ' + fail + ' failed');
  if (failures.length) { console.log('Failures:'); failures.forEach(f => console.log('  - ' + f)); }
  console.log('========================================');
  await require('mongoose').disconnect().catch(() => {});
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
