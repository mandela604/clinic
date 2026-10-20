/**
 * Nursing Service — Shiloh Clinic (BACKEND-ONLY)
 * Endpoint: /api/queue (id: uuid)
 * No DemoData fallback. No localStorage data fallback.
 */

const NursingService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allPatients: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    currentView: 'list',
    searchQuery: '',
    priorityFilter: 'All',
    statusFilter: 'All',
    nurseFilter: 'All',
    flaggedOnly: false,
    hiddenCols: []
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
      const res = await fetch(this.API_BASE + '/queue?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load queue (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allPatients = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allPatients];
    } catch (e) {
      this.state.allPatients = [];
      this.state.filtered = [];
      this._toast('Could not load nursing queue. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.allPatients; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allPatients.find(p => p.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allPatients;
    return {
      total: all.length,
      waiting: all.filter(p => p.status === 'waiting').length,
      inProgress: all.filter(p => p.status === 'progress').length,
      recorded: all.filter(p => p.status === 'recorded' || p.status === 'flagged').length,
      flagged: all.filter(p => p.flag).length,
      nurses: [...new Set(all.map(p => p.nurse).filter(Boolean))].length
    };
  },

  getNurses() {
    return [...new Set(this.state.allPatients.map(p => p.nurse).filter(Boolean))].sort();
  },

  setView(view) { this.state.currentView = view; },
  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByPriority(priority) { this.state.priorityFilter = priority; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByNurse(nurse) { this.state.nurseFilter = nurse; this._applyFilters(); },
  filterFlaggedOnly(flagged) { this.state.flaggedOnly = flagged; this._applyFilters(); },

  async createEntry(data) {
    try {
      const res = await fetch(this.API_BASE + '/queue', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create queue entry (' + res.status + ')'));
      }
      const created = await res.json();
      this.state.allPatients.unshift(created);
      this._applyFilters();
      return created;
    } catch (e) {
      this._toast(e.message || 'Could not create queue entry.', 'error');
      return null;
    }
  },

  async updateEntry(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/queue/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update queue entry (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allPatients.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allPatients[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update queue entry.', 'error');
      return null;
    }
  },

  async advanceStatus(id) {
    try {
      const res = await fetch(this.API_BASE + '/queue/' + encodeURIComponent(id) + '/advance', {
        method: 'PATCH',
        headers: this._headers(true),
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to advance status (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allPatients.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allPatients[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not advance status.', 'error');
      return null;
    }
  },

  async removeFromQueue(id) {
    try {
      const res = await fetch(this.API_BASE + '/queue/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to remove from queue (' + res.status + ')'));
      }
      this.state.allPatients = this.state.allPatients.filter(x => x.id !== id);
      this._applyFilters();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not remove from queue.', 'error');
      return false;
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allPatients.filter(p => {
      if (this.state.priorityFilter !== 'All' && p.priority !== this.state.priorityFilter) return false;
      if (this.state.statusFilter !== 'All' && p.status !== this.state.statusFilter) return false;
      if (this.state.nurseFilter !== 'All') {
        if (this.state.nurseFilter === '__unassigned') { if (p.nurse) return false; }
        else if (p.nurse !== this.state.nurseFilter) return false;
      }
      if (this.state.flaggedOnly && !p.flag) return false;
      if (q && !(p.name + ' ' + p.hosp + ' ' + p.q).toLowerCase().includes(q)) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.priorityFilter = 'All';
    this.state.statusFilter = 'All';
    this.state.nurseFilter = 'All';
    this.state.flaggedOnly = false;
    this.state.filtered = [...this.state.allPatients];
    this.state.currentPage = 1;
  }
};

window.NursingService = NursingService;
