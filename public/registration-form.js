/**
 * Patient registration — backend-only form wiring.
 * Requires ../services/api.js, ../services/patient-service.js, ../services/visit-service.js
 */
(function () {
  'use strict';

  const el = id => document.getElementById(id);
  const val = id => (el(id) ? String(el(id).value || '').trim() : '');
  const form = el('regForm');
  if (!form) return;

  const toast = (msg, type) => {
    if (window.ShilohAPI && window.ShilohAPI.toast) window.ShilohAPI.toast(msg, type);
  };

  let savedUser = {};
  try { savedUser = JSON.parse(localStorage.getItem('shiloh_user') || '{}') || {}; } catch (e) {}

  /* ── Header / summary ─────────────────────────────────────────── */
  const now = new Date();
  const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  el('sumDate').textContent = fmtDate(now);
  el('sumUser').textContent = savedUser.name || 'Signed-in user';
  el('sumDept').textContent = savedUser.dept || savedUser.role || 'Reception';

  /* ── Age from date of birth ───────────────────────────────────── */
  function refreshAge() {
    const dob = el('dateOfBirth').value;
    if (!dob) { el('age').value = ''; return; }
    const d = new Date(dob);
    if (isNaN(d.getTime())) { el('age').value = ''; return; }
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    el('age').value = age >= 0 ? String(age) : '';
  }
  el('dateOfBirth').addEventListener('change', refreshAge);
  el('dateOfBirth').addEventListener('input', refreshAge);

  /* ── Notes counter ────────────────────────────────────────────── */
  el('notes').addEventListener('input', () => {
    el('notesCount').textContent = String(el('notes').value.length);
  });

  /* ── Patient photo ────────────────────────────────────────────── */
  let photoData = '';
  const MAX_PHOTO = 320;

  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Unsupported image'));
        img.onload = () => {
          const scale = Math.min(1, MAX_PHOTO / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  el('photoBtn').addEventListener('click', () => el('photoInput').click());
  el('photoInput').addEventListener('change', async () => {
    const file = el('photoInput').files && el('photoInput').files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Please choose an image file', 'error'); return; }
    try {
      photoData = await shrinkPhoto(file);
      el('photoPreview').src = photoData;
      el('photoPreview').style.display = 'block';
      el('photoIcon').style.display = 'none';
    } catch (e) {
      toast('Could not use that image. Try another one.', 'error');
    }
  });

  function resetPhoto() {
    photoData = '';
    el('photoInput').value = '';
    el('photoPreview').removeAttribute('src');
    el('photoPreview').style.display = 'none';
    el('photoIcon').style.display = 'block';
  }

  /* ── Emergency address = patient address ──────────────────────── */
  el('sameAddress').addEventListener('change', () => {
    if (el('sameAddress').checked) {
      el('emAddress').value = val('address');
      el('emAddress').readOnly = true;
    } else {
      el('emAddress').readOnly = false;
    }
  });
  el('address').addEventListener('input', () => {
    if (el('sameAddress').checked) el('emAddress').value = val('address');
  });

  /* ── Validation ───────────────────────────────────────────────── */
  const REQUIRED = {
    firstName: 'First name',
    lastName: 'Last name',
    dateOfBirth: 'Date of birth',
    gender: 'Gender',
    phonePrimary: 'Phone number',
    address: 'Residential address',
    stateOfOrigin: 'State of origin',
    state: 'State',
    city: 'City / town',
    emName: 'Emergency contact name',
    emRelationship: 'Relationship',
    emPhone: 'Emergency contact phone'
  };

  function fieldWrap(name) {
    return form.querySelector('[data-required="' + name + '"]');
  }

  function clearErrors() {
    form.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
    el('consentBox').classList.remove('invalid');
    el('consentErr').style.display = 'none';
  }

  function validate() {
    clearErrors();
    let firstBad = null;
    for (const name of Object.keys(REQUIRED)) {
      const input = el(name);
      const ok = input && String(input.value || '').trim() !== '';
      if (!ok) {
        const wrap = fieldWrap(name);
        if (wrap) wrap.classList.add('invalid');
        if (!firstBad) firstBad = input;
      }
    }
    const email = val('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Enter a valid email address', 'error');
      return false;
    }
    if (!el('consent').checked) {
      el('consentBox').classList.add('invalid');
      el('consentErr').style.display = 'block';
      if (!firstBad) firstBad = el('consent');
    }
    if (firstBad) {
      toast('Please complete the required fields', 'error');
      try { firstBad.focus(); } catch (e) {}
      return false;
    }
    return true;
  }

  form.addEventListener('input', e => {
    const wrap = e.target.closest('[data-required]');
    if (wrap && String(e.target.value || '').trim()) wrap.classList.remove('invalid');
    if (e.target.id === 'consent' && e.target.checked) {
      el('consentBox').classList.remove('invalid');
      el('consentErr').style.display = 'none';
    }
  });
  form.addEventListener('change', e => {
    const wrap = e.target.closest('[data-required]');
    if (wrap && String(e.target.value || '').trim()) wrap.classList.remove('invalid');
    if (e.target.id === 'consent' && e.target.checked) {
      el('consentBox').classList.remove('invalid');
      el('consentErr').style.display = 'none';
    }
  });

  /* ── Payload ──────────────────────────────────────────────────── */
  function isoToDisplay(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    return p.length === 3 ? p[2] + ' / ' + p[1] + ' / ' + p[0] : iso;
  }

  function buildPayload() {
    const first = val('firstName'), middle = val('middleName'), last = val('lastName');
    const payload = {
      title: val('title'),
      firstName: first,
      middleName: middle,
      lastName: last,
      name: [first, middle, last].filter(Boolean).join(' '),
      gender: val('gender'),
      age: val('age') || '0',
      dateOfBirth: isoToDisplay(val('dateOfBirth')),
      maritalStatus: val('maritalStatus'),
      nationality: val('nationality'),
      stateOfOrigin: val('stateOfOrigin'),
      lga: val('lga'),
      religion: val('religion'),
      occupation: val('occupation'),
      employer: val('employer'),
      bloodType: val('bloodType'),
      genotype: val('genotype'),
      phonePrimary: val('phonePrimary'),
      phoneSecondary: val('phoneSecondary'),
      address: val('address'),
      residentialAddress: val('address'),
      state: val('state'),
      residentialLga: val('lgaResidence'),
      city: val('city'),
      idType: val('idType'),
      idNumber: val('idNumber'),
      idDateIssued: isoToDisplay(val('idDateIssued')),
      idExpiryDate: isoToDisplay(val('idExpiryDate')),
      preferredLanguage: val('preferredLanguage'),
      howDidYouHear: val('howDidYouHear'),
      patientType: 'Outpatient',
      patientCategory: val('patientCategory') || 'General Outpatient',
      notes: val('notes'),
      status: 'Active',
      registeredOn: fmtDate(new Date()),
      registeredBy: savedUser.name || '',
      emergencyContact: {
        name: val('emName'),
        relationship: val('emRelationship'),
        phone: val('emPhone'),
        address: val('emAddress')
      }
    };
    if (val('email')) payload.email = val('email');
    if (photoData) payload.avatar = photoData;
    return payload;
  }

  /* ── Submit ───────────────────────────────────────────────────── */
  let busy = false;

  function setBusy(on) {
    busy = on;
    ['saveBtn', 'saveNewBtn', 'saveCheckInTopBtn'].forEach(id => {
      if (el(id)) el(id).classList.toggle('is-busy', on);
    });
  }

  async function savePatient() {
    if (!validate()) return null;
    setBusy(true);
    try {
      const res = await window.PatientService.registerPatient(buildPayload());
      if (!res || !res.success) return null;
      return res.patient;
    } finally {
      setBusy(false);
    }
  }

  async function save(opts) {
    if (busy) return;
    const patient = await savePatient();
    if (!patient) return;

    toast('Patient saved · ' + (patient.hospitalNo || patient.name || ''));
    el('hospNoValue').textContent = patient.hospitalNo || 'Saved';

    if (opts.checkIn) {
      const deptMap = {
        'Antenatal': 'Antenatal Clinic',
        'Pediatric': 'Pediatrics',
        'Emergency': 'Emergency',
        'General Outpatient': 'General OPD'
      };
      const department = deptMap[val('patientCategory')] || 'General OPD';
      const visit = await window.VisitService.createVisit({
        patientId: patient.id,
        patientName: patient.name,
        hospitalNo: patient.hospitalNo,
        department,
        dept: department,
        doctor: '',
        reason: 'Patient registration check-in',
        type: 'walkin',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        priority: 'routine'
      });
      if (visit) {
        toast('Checked in · visit ' + (visit.id || ''));
        setTimeout(() => { window.location.href = 'visit-view.html?visit=' + encodeURIComponent(visit.id); }, 500);
      }
      return;
    }

    if (opts.another) {
      setTimeout(() => {
        form.reset();
        el('sameAddress').checked = false;
        el('emAddress').readOnly = false;
        el('age').value = '';
        el('notesCount').textContent = '0';
        el('hospNoValue').textContent = 'Auto-generated';
        el('sumDate').textContent = fmtDate(new Date());
        resetPhoto();
        el('firstName').focus();
      }, 250);
      return;
    }

    setTimeout(() => {
      window.location.href = 'patient-profile.html?hosp=' + encodeURIComponent(patient.hospitalNo);
    }, 500);
  }

  el('saveBtn').addEventListener('click', () => save({}));
  el('saveNewBtn').addEventListener('click', () => save({ another: true }));
  el('saveCheckInTopBtn').addEventListener('click', () => save({ checkIn: true }));

  /* ── Clear / cancel / back ────────────────────────────────────── */
  function clearForm() {
    form.reset();
    el('sameAddress').checked = false;
    el('emAddress').readOnly = false;
    el('age').value = '';
    el('notesCount').textContent = '0';
    el('hospNoValue').textContent = 'Auto-generated';
    resetPhoto();
    clearErrors();
    el('firstName').focus();
  }

  el('clearTopBtn').addEventListener('click', () => {
    if (confirm('Clear all fields?')) clearForm();
  });

  el('cancelBtn').addEventListener('click', () => {
    if (confirm('Discard this registration?')) {
      window.location.href = 'patients.html';
    }
  });

  el('backBtn').addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'patients.html';
  });

  el('scanBtn').addEventListener('click', () => {
    toast('QR / barcode scanning is not available on this device', 'error');
  });
})();
