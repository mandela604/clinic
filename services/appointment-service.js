/**
 * Appointment Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 */

const AppointmentService = {

  state: {
    allAppointments: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    currentView: 'list',
    searchQuery: '',
    statusFilter: 'all',
    dateFilter: 'all',
    typeFilter: 'all',
    doctorFilter: 'all'
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

  async init() {
    try {
      const res = await fetch(this.API_BASE + '/appointments?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load appointments (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allAppointments = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allAppointments];
    } catch (e) {
      this.state.allAppointments = [];
      this.state.filtered = [];
      this._toast('Could not load appointments. Check connection / login.', 'error');
    }
  },

  _formatDate(dateStr) {
    try { const d = new Date(dateStr); return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); }
  },

  getAll() { return this.state.allAppointments; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allAppointments.find(a => a.id === id); },

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

  async createAppointment(data) {
    try {
      const res = await fetch(this.API_BASE + '/appointments', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create appointment (' + res.status + ')'));
      }
      const appt = await res.json();
      this.state.allAppointments.unshift(appt);
      this._applyFilters();
      return appt;
    } catch (e) {
      this._toast(e.message || 'Could not create appointment.', 'error');
      return null;
    }
  },

  async updateAppointment(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/appointments/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update appointment (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allAppointments.findIndex(a => a.id === id);
      if (idx !== -1) this.state.allAppointments[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update appointment.', 'error');
      return null;
    }
  },

  async cancelAppointment(id) {
    try {
      const res = await fetch(this.API_BASE + '/appointments/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to cancel appointment (' + res.status + ')'));
      }
      this.state.allAppointments = this.state.allAppointments.filter(a => a.id !== id);
      this._applyFilters();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not cancel appointment.', 'error');
      return false;
    }
  },

  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allAppointments;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
    return {
      total: all.length,
      today: all.filter(a => a.date === today).length,
      scheduled: all.filter(a => a.status === 'scheduled').length,
      pending: all.filter(a => a.status === 'scheduled' || a.status === 'pending').length,
      completed: all.filter(a => a.status === 'completed').length,
      cancelled: all.filter(a => a.status === 'cancelled').length,
      thisWeek: all.filter(a => { const d = new Date(a.date + 'T00:00:00'); return d >= weekStart && d <= weekEnd; }).length,
      totalPatients: [...new Set(all.map(a => a.patientId))].length,
      doctors: [...new Set(all.map(a => a.doctor))].length
    };
  },

  setView(view) { this.state.currentView = view; },
  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByDoctor(doctor) { this.state.doctorFilter = doctor; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByDate(date) { this.state.dateFilter = date; this._applyFilters(); },
  filterByType(type) { this.state.typeFilter = type; this._applyFilters(); },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allAppointments.filter(a => {
      if (q && !(a.patientName + ' ' + a.hospitalNo + ' ' + a.doctor + ' ' + a.reason).toLowerCase().includes(q)) return false;
      if (this.state.statusFilter !== 'all' && a.status !== this.state.statusFilter) return false;
      if (this.state.typeFilter !== 'all' && a.type !== this.state.typeFilter) return false;
      if (this.state.doctorFilter !== 'all' && a.doctor !== this.state.doctorFilter) return false;
      if (this.state.dateFilter !== 'all') {
        const today = new Date().toISOString().slice(0, 10);
        if (this.state.dateFilter === 'today' && a.date !== today) return false;
        if (this.state.dateFilter === 'upcoming' && a.date < today) return false;
        if (this.state.dateFilter === 'past' && a.date > today) return false;
      }
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.statusFilter = 'all';
    this.state.dateFilter = 'all';
    this.state.typeFilter = 'all';
    this.state.doctorFilter = 'all';
    this.state.filtered = [...this.state.allAppointments];
    this.state.currentPage = 1;
  }
};

window.AppointmentService = AppointmentService;
