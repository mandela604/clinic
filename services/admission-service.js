/**
 * Admission Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 */

const AdmissionService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allAdmissions: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    statusFilter: 'all',
    wardFilter: 'all',
    wards: [
      { name: 'Male Ward', beds: 12, colorIdx: 0 },
      { name: 'Female Ward', beds: 12, colorIdx: 1 },
      { name: 'Maternity Ward', beds: 10, colorIdx: 2 },
      { name: 'ICU', beds: 6, colorIdx: 3 },
      { name: 'Pediatric Ward', beds: 8, colorIdx: 4 },
      { name: 'General Ward', beds: 15, colorIdx: 5 }
    ],
    statuses: [
      { name: 'Admitted', colorIdx: 0, neutral: false },
      { name: 'Discharged', colorIdx: 1, neutral: false },
      { name: 'Transferred', colorIdx: 3, neutral: false },
      { name: 'Critical', colorIdx: 4, neutral: false }
    ]
  },

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

  async loadConfig() {
    try {
      const res = await fetch(this.API_BASE + '/settings', { headers: this._headers() });
      if (!res.ok) return;
      const data = await res.json();
      const s = (data && data.settings) || data || {};
      if (Array.isArray(s.wards) && s.wards.length) this.state.wards = s.wards;
      if (Array.isArray(s.statuses) && s.statuses.length) this.state.statuses = s.statuses;
    } catch (e) { /* keep built-in defaults until settings load succeeds */ }
  },

  async _saveConfig() {
    const res = await fetch(this.API_BASE + '/settings/wards', {
      method: 'PUT',
      headers: this._headers(true),
      body: JSON.stringify({ wards: this.state.wards, statuses: this.state.statuses })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || ('Failed to save ward configuration (' + res.status + ')'));
    }
    return res.json();
  },

  async init() {
    await this.loadConfig();
    try {
      const res = await fetch(this.API_BASE + '/admissions?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load admissions (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      const list = Array.isArray(items) ? items : [];
      this.state.allAdmissions = list.map(a => ({ ...a, name: a.patientName || a.name, hospNo: a.hospitalNo || a.hospNo }));
      this.state.filtered = [...this.state.allAdmissions];
    } catch (e) {
      this.state.allAdmissions = [];
      this.state.filtered = [];
      this._toast('Could not load admissions. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.allAdmissions; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allAdmissions.find(a => a.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allAdmissions;
    const totalBeds = this.state.wards.reduce((sum, w) => sum + w.beds, 0);
    const admitted = all.filter(a => a.status === 'Admitted').length;
    return {
      total: all.length,
      admitted: admitted,
      discharged: all.filter(a => a.status === 'Discharged').length,
      pending: all.filter(a => a.status === 'Pending').length,
      available: totalBeds - admitted,
      totalBeds: totalBeds
    };
  },

  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByWard(ward) { this.state.wardFilter = ward; this._applyFilters(); },

  async createAdmission(data) {
    try {
      const res = await fetch(this.API_BASE + '/admissions', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create admission (' + res.status + ')'));
      }
      const created = await res.json();
      const norm = { ...created, name: created.patientName || created.name, hospNo: created.hospitalNo || created.hospNo };
      this.state.allAdmissions.unshift(norm);
      this._applyFilters();
      return norm;
    } catch (e) {
      this._toast(e.message || 'Could not create admission.', 'error');
      return null;
    }
  },

  async updateAdmission(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/admissions/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update admission (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allAdmissions.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allAdmissions[idx] = { ...updated, name: updated.patientName || updated.name, hospNo: updated.hospitalNo || updated.hospNo };
      this._applyFilters();
      return this.state.allAdmissions[idx] || updated;
    } catch (e) {
      this._toast(e.message || 'Could not update admission.', 'error');
      return null;
    }
  },

  async discharge(id) {
    try {
      const res = await fetch(this.API_BASE + '/admissions/' + encodeURIComponent(id) + '/discharge', {
        method: 'PATCH',
        headers: this._headers(true),
        body: JSON.stringify({ dischargeDate: new Date().toISOString().slice(0, 10) })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to discharge (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allAdmissions.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allAdmissions[idx] = { ...updated, name: updated.patientName || updated.name, hospNo: updated.hospitalNo || updated.hospNo };
      this._applyFilters();
      return this.state.allAdmissions[idx] || updated;
    } catch (e) {
      this._toast(e.message || 'Could not discharge patient.', 'error');
      return null;
    }
  },

  async addWard(name, beds) {
    const ward = { name, beds, colorIdx: this.state.wards.length % 6 };
    this.state.wards.push(ward);
    try {
      await this._saveConfig();
      return true;
    } catch (e) {
      this.state.wards = this.state.wards.filter(w => w !== ward);
      this._toast(e.message, 'error');
      return false;
    }
  },

  async removeWard(i) {
    const removed = this.state.wards.splice(i, 1)[0];
    try {
      await this._saveConfig();
      return true;
    } catch (e) {
      this.state.wards.splice(i, 0, removed);
      this._toast(e.message, 'error');
      return false;
    }
  },

  async addStatus(name) {
    const status = { name, colorIdx: this.state.statuses.length % 6, neutral: false };
    this.state.statuses.push(status);
    try {
      await this._saveConfig();
      return true;
    } catch (e) {
      this.state.statuses = this.state.statuses.filter(s => s !== status);
      this._toast(e.message, 'error');
      return false;
    }
  },

  async removeStatus(i) {
    const removed = this.state.statuses.splice(i, 1)[0];
    try {
      await this._saveConfig();
      return true;
    } catch (e) {
      this.state.statuses.splice(i, 0, removed);
      this._toast(e.message, 'error');
      return false;
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allAdmissions.filter(a => {
      if (q && !(a.name + ' ' + a.hospNo + ' ' + a.ward + ' ' + a.doctor + ' ' + a.id).toLowerCase().includes(q)) return false;
      if (this.state.statusFilter !== 'all' && a.status.toLowerCase() !== this.state.statusFilter.toLowerCase()) return false;
      if (this.state.wardFilter !== 'all' && a.ward !== this.state.wardFilter) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.statusFilter = 'all';
    this.state.wardFilter = 'all';
    this.state.filtered = [...this.state.allAdmissions];
    this.state.currentPage = 1;
  }
};

window.AdmissionService = AdmissionService;
