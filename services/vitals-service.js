/**
 * Vitals Service — Shiloh Clinic (BACKEND-ONLY)
 * Endpoint: /api/vitals (id: uuid)
 * No DemoData fallback. No localStorage data fallback.
 */

const VitalsService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allVitals: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    statusFilter: 'all'
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

  async init() {
    try {
      const res = await fetch(this.API_BASE + '/vitals?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load vitals (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allVitals = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allVitals];
    } catch (e) {
      this.state.allVitals = [];
      this.state.filtered = [];
      this._toast('Could not load vitals. Check connection / login.', 'error');
    }
  },

  async list(params) {
    try {
      const qs = params ? ('?' + new URLSearchParams(params).toString()) : '?limit=100';
      const res = await fetch(this.API_BASE + '/vitals' + qs, { headers: this._headers() });
      if (!res.ok) throw new Error('Failed to load vitals (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load vitals. Check connection / login.', 'error');
      return [];
    }
  },

  getAll() { return this.state.allVitals; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allVitals.find(v => v.id === id); },

  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allVitals;
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      today: all.filter(v => v.date === today || v.recordedAt === today).length,
      flagged: all.filter(v => v.flag === true).length,
      patients: [...new Set(all.map(v => v.patientId).filter(Boolean))].length
    };
  },

  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filter(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },

  async create(data) {
    try {
      const res = await fetch(this.API_BASE + '/vitals', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create vitals (' + res.status + ')'));
      }
      const created = await res.json();
      this.state.allVitals.unshift(created);
      this._applyFilters();
      return created;
    } catch (e) {
      this._toast(e.message || 'Could not create vitals.', 'error');
      return null;
    }
  },

  async update(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/vitals/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update vitals (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allVitals.findIndex(v => v.id === id);
      if (idx !== -1) this.state.allVitals[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update vitals.', 'error');
      return null;
    }
  },

  async remove(id) {
    try {
      const res = await fetch(this.API_BASE + '/vitals/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to delete vitals (' + res.status + ')'));
      }
      this.state.allVitals = this.state.allVitals.filter(v => v.id !== id);
      this._applyFilters();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not delete vitals.', 'error');
      return false;
    }
  },

  _applyFilters() {
    const q = String(this.state.searchQuery || '').toLowerCase();
    this.state.filtered = this.state.allVitals.filter(v => {
      if (this.state.statusFilter !== 'all' && v.status !== this.state.statusFilter) return false;
      if (q && !((v.patientName || '') + ' ' + (v.patientId || '') + ' ' + (v.id || '')).toLowerCase().includes(q)) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.statusFilter = 'all';
    this.state.filtered = [...this.state.allVitals];
    this.state.currentPage = 1;
  }
};

window.VitalsService = VitalsService;
