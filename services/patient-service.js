/**
 * Patient Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 * Auth token via ShilohAPI (localStorage token only for auth headers).
 */

const PatientService = {

  /* ── State ───────────────────────────────────────────────────────── */
  state: {
    currentPatient: null,
    allPatients: [],
    currentFilter: 'all',
    isGridView: true
  },

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  _headers(json) {
    if (window.ShilohAPI) return window.ShilohAPI.headers(json);
    var h = {};
    if (json) h['Content-Type'] = 'application/json';
    try {
      var t = localStorage.getItem('shiloh_token');
      if (t) h['Authorization'] = 'Bearer ' + t;
    } catch (e) {}
    return h;
  },

  _toast(msg, type) {
    if (window.ShilohAPI) window.ShilohAPI.toast(msg, type);
  },

  /* ── Init (backend-only) ─────────────────────────────────────────── */
  async init() {
    try {
      const res = await fetch(this.API_BASE + '/patients?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load patients (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allPatients = Array.isArray(items) ? items : [];
    } catch (e) {
      this.state.allPatients = [];
      this._toast('Could not load patients. Check connection / login.', 'error');
    }
  },

  async fetchById(id) {
    try {
      const res = await fetch(this.API_BASE + '/patients/' + encodeURIComponent(id), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to fetch patient (' + res.status + ')');
      return await res.json();
    } catch (e) {
      const found = this.state.allPatients.find(p => p.id === id) || null;
      if (!found) this._toast('Could not load patient. Check connection / login.', 'error');
      return found;
    }
  },

  /* ── Getters ─────────────────────────────────────────────────────── */
  getCurrentPatient() { return this.state.currentPatient; },
  getAllPatients() { return this.state.allPatients; },
  getCurrentFilter() { return this.state.currentFilter; },
  isGridView() { return this.state.isGridView; },

  /* ── Actions ─────────────────────────────────────────────────────── */
  setCurrentPatient(patient) {
    this.state.currentPatient = patient;
    this.state.isGridView = true;
  },

  setFilter(filter) {
    this.state.currentFilter = filter;
  },

  toggleView() {
    this.state.isGridView = !this.state.isGridView;
  },

  getFilteredPatients() {
    const { allPatients, currentFilter } = this.state;
    if (currentFilter === 'all') return allPatients;

    const filterMap = {
      nursing: p => p.allergies && !p.allergies.includes('No known'),
      doctor: p => p.visitHistory && p.visitHistory.length > 0,
      lab: p => p.prescriptionHistory && p.prescriptionHistory.length > 0,
      pharmacy: p => p.contactHistory && p.contactHistory.length > 0,
      billing: p => true
    };

    const predicate = filterMap[currentFilter];
    return predicate ? allPatients.filter(predicate).sort((a, b) => a.name.localeCompare(b.name)) : allPatients;
  },

  async loadPatientByHospital(hospitalNo) {
    try {
      const res = await fetch(this.API_BASE + '/patients/hospital/' + encodeURIComponent(hospitalNo), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Patient not found');
      const patient = await res.json();
      this.setCurrentPatient(patient);
      return { success: true, patient };
    } catch (e) {
      this._toast('Could not load patient. Check connection / login.', 'error');
      return { success: false, error: e.message || 'Patient not found' };
    }
  },

  async updatePatient(id, patch) {
    try {
      const res = await fetch(this.API_BASE + '/patients/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update patient (' + res.status + ')'));
      }
      const patient = await res.json();
      const idx = this.state.allPatients.findIndex(p => p.id === patient.id);
      if (idx !== -1) this.state.allPatients[idx] = patient;
      this.setCurrentPatient(patient);
      return { success: true, patient };
    } catch (e) {
      this._toast(e.message || 'Could not update patient.', 'error');
      return { success: false, error: e.message || 'Could not update patient.' };
    }
  },

  async registerPatient(newPatient) {
    try {
      const res = await fetch(this.API_BASE + '/patients', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(newPatient)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to register patient (' + res.status + ')'));
      }
      const patient = await res.json();
      this.state.allPatients.push(patient);
      this.setCurrentPatient(patient);
      return { success: true, patient };
    } catch (e) {
      this._toast(e.message || 'Could not register patient.', 'error');
      return { success: false, error: e.message || 'Could not register patient.' };
    }
  },

  /* ── Related data (backend-only) ─────────────────────────────────── */
  async getPatientLabTests(patientId) {
    try {
      const res = await fetch(this.API_BASE + '/lab-orders?patientId=' + encodeURIComponent(patientId), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load lab tests (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load lab tests. Check connection / login.', 'error');
      return [];
    }
  },

  async getPatientAppointments(patientId) {
    try {
      const res = await fetch(this.API_BASE + '/appointments?patientId=' + encodeURIComponent(patientId), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load appointments (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load appointments. Check connection / login.', 'error');
      return [];
    }
  },

  async getPatientPrescriptions(patientId) {
    try {
      const res = await fetch(this.API_BASE + '/prescriptions?patientId=' + encodeURIComponent(patientId), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load prescriptions (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load prescriptions. Check connection / login.', 'error');
      return [];
    }
  },

  async getPatientInvoices(patientId) {
    try {
      const res = await fetch(this.API_BASE + '/invoices?patientId=' + encodeURIComponent(patientId), {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load invoices (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load invoices. Check connection / login.', 'error');
      return [];
    }
  }
};

window.PatientService = PatientService;
