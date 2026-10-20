/**
 * Billing Service — Shiloh Clinic (BACKEND-ONLY)
 * No DemoData fallback. No localStorage data fallback.
 */

const BillingService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allInvoices: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    statusFilter: 'all',
    methodFilter: 'all'
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
      const res = await fetch(this.API_BASE + '/invoices?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load invoices (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allInvoices = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allInvoices];
    } catch (e) {
      this.state.allInvoices = [];
      this.state.filtered = [];
      this._toast('Could not load invoices. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.allInvoices; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allInvoices.find(inv => inv.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allInvoices;
    return {
      total: all.length,
      paid: all.filter(i => i.status === 'Paid').length,
      partial: all.filter(i => i.status === 'Partial').length,
      unpaid: all.filter(i => i.status === 'Unpaid').length,
      totalBilled: all.reduce((s, i) => s + i.amount, 0),
      outstanding: all.reduce((s, i) => s + i.balance, 0)
    };
  },

  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },
  filterByMethod(method) { this.state.methodFilter = method; this._applyFilters(); },

  async createInvoice(data) {
    try {
      const res = await fetch(this.API_BASE + '/invoices', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to create invoice (' + res.status + ')'));
      }
      const created = await res.json();
      this.state.allInvoices.unshift(created);
      this._applyFilters();
      return { success: true, invoice: created };
    } catch (e) {
      this._toast(e.message || 'Could not create invoice.', 'error');
      return { success: false, error: e.message || 'Could not create invoice.' };
    }
  },

  async updateInvoice(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/invoices/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update invoice (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allInvoices.findIndex(i => i.id === id);
      if (idx !== -1) this.state.allInvoices[idx] = updated;
      this._applyFilters();
      return { success: true, invoice: updated };
    } catch (e) {
      this._toast(e.message || 'Could not update invoice.', 'error');
      return { success: false, error: e.message || 'Could not update invoice.' };
    }
  },

  async recordPayment(id, amount, method) {
    try {
      const res = await fetch(this.API_BASE + '/invoices/' + encodeURIComponent(id) + '/payments', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify({ amount, method })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to record payment (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allInvoices.findIndex(i => i.id === id);
      if (idx !== -1) this.state.allInvoices[idx] = updated;
      this._applyFilters();
      return { success: true, invoice: updated };
    } catch (e) {
      this._toast(e.message || 'Could not record payment.', 'error');
      return { success: false, error: e.message || 'Could not record payment.' };
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allInvoices.filter(inv => {
      if (q && !(inv.patientName + ' ' + inv.id + ' ' + inv.hospNo).toLowerCase().includes(q)) return false;
      if (this.state.statusFilter !== 'all' && inv.status !== this.state.statusFilter) return false;
      if (this.state.methodFilter !== 'all' && inv.method !== this.state.methodFilter) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.statusFilter = 'all';
    this.state.methodFilter = 'all';
    this.state.filtered = [...this.state.allInvoices];
    this.state.currentPage = 1;
  }
};

window.BillingService = BillingService;
