/**
 * Lab Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 */

const LabService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allOrders: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    currentView: 'list',
    searchQuery: '',
    testTypeFilter: 'All',
    priorityFilter: 'All',
    statusFilter: 'All',
    dateFrom: null,
    dateTo: null,
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
      const res = await fetch(this.API_BASE + '/lab-orders?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load lab orders (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allOrders = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allOrders];
    } catch (e) {
      this.state.allOrders = [];
      this.state.filtered = [];
      this._toast('Could not load lab orders. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.allOrders; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allOrders.find(o => o.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allOrders;
    const TODAY = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      pending: all.filter(o => o.status === 'pending').length,
      inProgress: all.filter(o => o.status === 'progress').length,
      completed: all.filter(o => o.status === 'completed').length,
      critical: all.filter(o => o.status === 'critical').length,
      collectedToday: all.filter(o => o.date === TODAY && o.status !== 'pending').length,
      resultsToday: all.filter(o => o.date === TODAY && (o.status === 'completed' || o.result)).length,
      labTechs: 0
    };
  },

  getTestTypes() {
    return [...new Set(this.state.allOrders.map(o => o.test))].sort();
  },

  setView(view) { this.state.currentView = view; },
  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByTestType(type) { this.state.testTypeFilter = type; this._applyFilters(); },
  filterByPriority(priority) { this.state.priorityFilter = priority; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByDate(from, to) { this.state.dateFrom = from; this.state.dateTo = to; this._applyFilters(); },

  async createOrder(data) {
    try {
      const res = await fetch(this.API_BASE + '/lab-orders', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create lab order (' + res.status + ')'));
      }
      const created = await res.json();
      this.state.allOrders.unshift(created);
      this._applyFilters();
      return created;
    } catch (e) {
      this._toast(e.message || 'Could not create lab order.', 'error');
      return null;
    }
  },

  async updateOrder(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/lab-orders/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update lab order (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allOrders.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allOrders[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update lab order.', 'error');
      return null;
    }
  },

  async advanceStatus(id) {
    try {
      const res = await fetch(this.API_BASE + '/lab-orders/' + encodeURIComponent(id) + '/advance', {
        method: 'PATCH',
        headers: this._headers(true),
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to advance lab order (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allOrders.findIndex(x => x.id === id);
      if (idx !== -1) this.state.allOrders[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not advance lab order.', 'error');
      return null;
    }
  },

  async cancelOrder(id) {
    try {
      const res = await fetch(this.API_BASE + '/lab-orders/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to cancel lab order (' + res.status + ')'));
      }
      this.state.allOrders = this.state.allOrders.filter(x => x.id !== id);
      this._applyFilters();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not cancel lab order.', 'error');
      return false;
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allOrders.filter(o => {
      if (this.state.testTypeFilter !== 'All' && o.test !== this.state.testTypeFilter) return false;
      if (this.state.priorityFilter !== 'All' && o.priority !== this.state.priorityFilter) return false;
      if (this.state.statusFilter !== 'All' && o.status !== this.state.statusFilter) return false;
      if (q && !(o.id + ' ' + o.name + ' ' + o.hosp + ' ' + o.test).toLowerCase().includes(q)) return false;
      if (this.state.dateFrom && o.date && o.date < this.state.dateFrom) return false;
      if (this.state.dateTo && o.date && o.date > this.state.dateTo) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.testTypeFilter = 'All';
    this.state.priorityFilter = 'All';
    this.state.statusFilter = 'All';
    this.state.filtered = [...this.state.allOrders];
    this.state.currentPage = 1;
  }
};

window.LabService = LabService;
