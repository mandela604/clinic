/**
 * Pharmacy Service — Shiloh Clinic (BACKEND-ONLY)
 * Endpoint: /api/prescriptions (id: uuid)
 * No DemoData fallback. No localStorage data fallback.
 */

const PharmacyService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allDrugs: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    categoryFilter: 'All',
    stockFilter: 'All',
    formFilter: 'All',
    codeSeq: 400
  },

  CATEGORIES: ["Analgesic", "Antibiotic", "Antimalarial", "Antihypertensive", "Antidiabetic", "Antacid", "Anti-inflammatory", "Vitamin/Supplement", "Contraceptive", "IV Fluid", "Antihistamine", "Maternity/Obstetric"],
  FORMS: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "IV Fluid", "Suppository"],

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
      const res = await fetch(this.API_BASE + '/drugs?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load prescriptions (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allDrugs = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allDrugs];
    } catch (e) {
      this.state.allDrugs = [];
      this.state.filtered = [];
      this._toast('Could not load prescriptions. Check connection / login.', 'error');
    }
  },

  getStatus(drug) {
    if (drug.stock <= 0) return 'Out of Stock';
    if (drug.stock <= drug.reorderLevel) return 'Low Stock';
    return 'In Stock';
  },

  daysUntil(dateStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  },

  fmtDate(d) { const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return m[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear(); },

  getAll() { return this.state.allDrugs; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allDrugs.find(d => d.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allDrugs;
    return {
      total: all.length,
      inStock: all.filter(d => this.getStatus(d) === 'In Stock').length,
      lowStock: all.filter(d => this.getStatus(d) === 'Low Stock').length,
      outOfStock: all.filter(d => this.getStatus(d) === 'Out of Stock').length,
      expiringSoon: all.filter(d => { const dd = this.daysUntil(d.expiry); return dd >= 0 && dd <= 60; }).length,
      totalValue: all.reduce((s, d) => s + (d.stock * d.unitPrice), 0)
    };
  },

  getCategories() { return [...new Set(this.state.allDrugs.map(d => d.category))].sort(); },
  getForms() { return [...new Set(this.state.allDrugs.map(d => d.form))].sort(); },

  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByCategory(cat) { this.state.categoryFilter = cat; this._applyFilters(); },
  filterByStock(stock) { this.state.stockFilter = stock; this._applyFilters(); },
  filterByForm(form) { this.state.formFilter = form; this._applyFilters(); },

  async addDrug(data) {
    try {
      const res = await fetch(this.API_BASE + '/drugs', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to add drug (' + res.status + ')'));
      }
      const drug = await res.json();
      this.state.allDrugs.unshift(drug);
      this._applyFilters();
      return drug;
    } catch (e) {
      this._toast(e.message || 'Could not add drug.', 'error');
      return null;
    }
  },

  async updateDrug(id, data) {
    try {
      const res = await fetch(this.API_BASE + '/drugs/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update drug (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allDrugs.findIndex(d => d.id === id);
      if (idx !== -1) this.state.allDrugs[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update drug.', 'error');
      return null;
    }
  },

  async deleteDrug(id) {
    try {
      const res = await fetch(this.API_BASE + '/drugs/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to delete drug (' + res.status + ')'));
      }
      this.state.allDrugs = this.state.allDrugs.filter(d => d.id !== id);
      this._applyFilters();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not delete drug.', 'error');
      return false;
    }
  },

  async restock(id, qty) {
    try {
      const res = await fetch(this.API_BASE + '/drugs/' + encodeURIComponent(id) + '/restock', {
        method: 'PATCH',
        headers: this._headers(true),
        body: JSON.stringify({ qty })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to restock (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allDrugs.findIndex(d => d.id === id);
      if (idx !== -1) this.state.allDrugs[idx] = updated;
      this._applyFilters();
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not restock drug.', 'error');
      return null;
    }
  },

  async dispense(id, qty) {
    try {
      const res = await fetch(this.API_BASE + '/drugs/' + encodeURIComponent(id) + '/dispense', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify({ qty })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to dispense (' + res.status + ')'));
      }
      const updated = await res.json();
      const idx = this.state.allDrugs.findIndex(d => d.id === id);
      if (idx !== -1) this.state.allDrugs[idx] = updated;
      this._applyFilters();
      return { success: true, drug: updated };
    } catch (e) {
      this._toast(e.message || 'Could not dispense drug.', 'error');
      return { success: false, error: e.message || 'Could not dispense drug.' };
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allDrugs.filter(d => {
      if (this.state.categoryFilter !== 'All' && d.category !== this.state.categoryFilter) return false;
      if (this.state.formFilter !== 'All' && d.form !== this.state.formFilter) return false;
      if (this.state.stockFilter !== 'All' && this.getStatus(d) !== this.state.stockFilter) return false;
      if (q && !(d.name + ' ' + d.generic + ' ' + d.code).toLowerCase().includes(q)) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.categoryFilter = 'All';
    this.state.stockFilter = 'All';
    this.state.formFilter = 'All';
    this.state.filtered = [...this.state.allDrugs];
    this.state.currentPage = 1;
  }
};

window.PharmacyService = PharmacyService;
