/**
 * Visit Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 */

const VisitService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allVisits: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    currentView: 'list',
    searchQuery: '',
    statusFilter: 'all',
    deptFilter: 'all',
    dateFilter: 'all',
    sortBy: 'date-desc'
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
      const res = await fetch(this.API_BASE + '/visits?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load visits (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allVisits = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allVisits];
      this.state.currentPage = 1;
    } catch (e) {
      this.state.allVisits = [];
      this.state.filtered = [];
      this.state.currentPage = 1;
      this._toast('Could not load visits. Check connection / login.', 'error');
    }
  },

  _parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().slice(0, 10);
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  },

  /* ── Getters ─────────────────────────────────────────────────────── */
  getAll() { return this.state.allVisits; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allVisits.find(v => v.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allVisits;
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      today: all.filter(v => v.date === today).length,
      completed: all.filter(v => v.status === 'completed').length,
      inProgress: all.filter(v => v.status === 'in-progress').length,
      withAppointment: all.filter(v => v.appointmentId).length,
      consultationRequested: all.filter(v => v.consultationRequested).length,
      departments: [...new Set(all.map(v => v.department))].length,
      doctors: [...new Set(all.map(v => v.doctor))].length
    };
  },

  /* ── Patient & Appointment Lookups (backend-only) ──────────────── */
  async getPatients() {
    try {
      const res = await fetch(this.API_BASE + '/patients?limit=100', { headers: this._headers() });
      if (!res.ok) throw new Error('Failed to load patients (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load patients. Check connection / login.', 'error');
      return [];
    }
  },

  async getDoctors() {
    try {
      const res = await fetch(this.API_BASE + '/users?limit=100', { headers: this._headers() });
      if (!res.ok) throw new Error('Failed to load doctors (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load doctors. Check connection / login.', 'error');
      return [];
    }
  },

  async getDepartments() {
    try {
      const res = await fetch(this.API_BASE + '/departments?limit=100', { headers: this._headers() });
      if (!res.ok) throw new Error('Failed to load departments (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load departments. Check connection / login.', 'error');
      return [];
    }
  },

  async getUpcomingAppointments(patientId) {
    try {
      const res = await fetch(this.API_BASE + '/appointments?patientId=' + encodeURIComponent(patientId), { headers: this._headers() });
      if (!res.ok) throw new Error('Failed to load appointments (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      return Array.isArray(items) ? items : [];
    } catch (e) {
      this._toast('Could not load appointments. Check connection / login.', 'error');
      return [];
    }
  },

  /* ── Create Visit (backend-only) ───────────────────────────────── */
  async createVisit(data) {
    try {
      const res = await fetch(this.API_BASE + '/visits', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create visit (' + res.status + ')'));
      }
      const visit = await res.json();
      this.state.allVisits.unshift(visit);
      this._applyFilters();
      return visit;
    } catch (e) {
      this._toast(e.message || 'Could not create visit.', 'error');
      return null;
    }
  },

  async updateVisit(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/visits/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update visit (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allVisits.findIndex(v => v.id === id);
      if (idx !== -1) this.state.allVisits[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update visit.', 'error');
      return null;
    }
  },

  /* ── Actions ─────────────────────────────────────────────────────── */
  setView(view) { this.state.currentView = view; },
  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) {
    this.state.searchQuery = query;
    this._applyFilters();
  },

  filterByStatus(status) {
    this.state.statusFilter = status;
    this._applyFilters();
  },

  filterByDepartment(dept) {
    this.state.deptFilter = dept;
    this._applyFilters();
  },

  filterByDate(date) {
    this.state.dateFilter = date;
    this._applyFilters();
  },

  sortByDate(order) {
    this.state.sortBy = order;
    this._applyFilters();
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    const status = this.state.statusFilter;
    const date = this.state.dateFilter;

    this.state.filtered = this.state.allVisits.filter(v => {
      if (q && !(v.patientName + ' ' + v.hospitalNo + ' ' + v.reason + ' ' + v.doctor + ' ' + v.id).toLowerCase().includes(q)) return false;
      if (status !== 'all' && v.status !== status) return false;
      if (this.state.deptFilter !== 'all' && v.department !== this.state.deptFilter) return false;
      if (date !== 'all') {
        const vDate = new Date(v.date);
        const now = new Date();
        if (date === 'today' && v.date !== now.toISOString().slice(0, 10)) return false;
        if (date === 'week' && (now - vDate) > 7 * 86400000) return false;
        if (date === 'month' && (now - vDate) > 30 * 86400000) return false;
      }
      return true;
    });

    if (this.state.sortBy === 'date-desc') {
      this.state.filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      this.state.filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.statusFilter = 'all';
    this.state.deptFilter = 'all';
    this.state.dateFilter = 'all';
    this.state.sortBy = 'date-desc';
    this.state.filtered = [...this.state.allVisits];
    this.state.currentPage = 1;
  }
};

window.VisitService = VisitService;
