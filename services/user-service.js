/**
 * User Service — Shiloh Clinic (BACKEND-ONLY)
 * Endpoint: /api/users (id: uuid)
 * No DemoData fallback. No localStorage data fallback.
 */

const UserService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    allUsers: [],
    filtered: [],
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    roleFilter: 'all',
    deptFilter: 'all',
    statusFilter: 'all'
  },

  ROLES: { admin: 'Admin', doctor: 'Doctor', nurse: 'Nurse', labtech: 'Lab Technician', pharmacist: 'Pharmacist', receptionist: 'Receptionist', cashier: 'Cashier' },

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
      const res = await fetch(this.API_BASE + '/users?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load users (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.allUsers = Array.isArray(items) ? items : [];
      this.state.filtered = [...this.state.allUsers];
    } catch (e) {
      this.state.allUsers = [];
      this.state.filtered = [];
      this._toast('Could not load users. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.allUsers; },
  getFiltered() { return this.state.filtered; },
  getById(id) { return this.state.allUsers.find(u => u.id === id); },
  getPage(page) {
    const start = (page - 1) * this.state.perPage;
    return this.state.filtered.slice(start, start + this.state.perPage);
  },
  getTotalPages() { return Math.max(1, Math.ceil(this.state.filtered.length / this.state.perPage)); },

  getStats() {
    const all = this.state.allUsers;
    return {
      total: all.length,
      active: all.filter(u => u.status === 'active').length,
      invited: all.filter(u => u.status === 'invited').length,
      suspended: all.filter(u => u.status === 'suspended').length,
      admins: all.filter(u => u.role === 'admin').length,
      loggedToday: all.filter(u => u.loginDate === 'Today').length
    };
  },

  adminCount() { return this.state.allUsers.filter(u => u.role === 'admin').length; },

  setPage(page) { this.state.currentPage = page; },
  setPerPage(n) { this.state.perPage = n; this.state.currentPage = 1; },

  search(query) { this.state.searchQuery = query; this._applyFilters(); },
  filterByRole(role) { this.state.roleFilter = role; this._applyFilters(); },
  filterByDept(dept) { this.state.deptFilter = dept; this._applyFilters(); },
  filterByStatus(status) { this.state.statusFilter = status; this._applyFilters(); },

  async toggleStatus(id) {
    const u = this.state.allUsers.find(x => x.id === id);
    if (!u) return null;
    if (u.status === 'active' && u.role === 'admin' && this.adminCount() <= 1) return { error: 'Cannot disable the only Admin' };
    const next = u.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(this.API_BASE + '/users/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update status (' + res.status + ')'));
      }
      const updated = await res.json();
      Object.assign(u, updated);
      this._applyFilters();
      return u;
    } catch (e) {
      this._toast(e.message || 'Could not update user status.', 'error');
      return null;
    }
  },

  async addUser(data) {
    try {
      const res = await fetch(this.API_BASE + '/users', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to add user (' + res.status + ')'));
      }
      const user = await res.json();
      this.state.allUsers.unshift(user);
      this._applyFilters();
      return user;
    } catch (e) {
      this._toast(e.message || 'Could not add user.', 'error');
      return null;
    }
  },

  async updateUser(id, data) {
    const u = this.state.allUsers.find(x => x.id === id);
    if (!u) return null;
    if (u.role === 'admin' && data.role && data.role !== 'admin' && this.adminCount() <= 1) return { error: 'Cannot change role — only remaining Admin' };
    try {
      const res = await fetch(this.API_BASE + '/users/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update user (' + res.status + ')'));
      }
      const updated = await res.json();
      Object.assign(u, updated);
      this._applyFilters();
      return u;
    } catch (e) {
      this._toast(e.message || 'Could not update user.', 'error');
      return null;
    }
  },

  async deleteUser(id) {
    const u = this.state.allUsers.find(x => x.id === id);
    if (!u) return null;
    if (u.role === 'admin' && this.adminCount() <= 1) return { error: 'Cannot delete the only Admin' };
    try {
      const res = await fetch(this.API_BASE + '/users/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to delete user (' + res.status + ')'));
      }
      this.state.allUsers = this.state.allUsers.filter(x => x.id !== id);
      this._applyFilters();
      return u;
    } catch (e) {
      this._toast(e.message || 'Could not delete user.', 'error');
      return null;
    }
  },

  async resetPassword(id) {
    try {
      const res = await fetch(this.API_BASE + '/users/' + encodeURIComponent(id) + '/reset-password', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to reset password (' + res.status + ')'));
      }
      const data = await res.json();
      const u = this.state.allUsers.find(x => x.id === id) || null;
      return { user: u, tempPassword: data.tempPassword || data.password || null };
    } catch (e) {
      this._toast(e.message || 'Could not reset password.', 'error');
      return null;
    }
  },

  _applyFilters() {
    const q = this.state.searchQuery.toLowerCase();
    this.state.filtered = this.state.allUsers.filter(u => {
      if (this.state.roleFilter !== 'all' && u.role !== this.state.roleFilter) return false;
      if (this.state.deptFilter !== 'all' && u.dept !== this.state.deptFilter) return false;
      if (this.state.statusFilter !== 'all' && u.status !== this.state.statusFilter) return false;
      if (q && !(u.name + ' ' + u.username + ' ' + u.email + ' ' + u.userId).toLowerCase().includes(q)) return false;
      return true;
    });
    this.state.currentPage = 1;
  },

  resetFilters() {
    this.state.searchQuery = '';
    this.state.roleFilter = 'all';
    this.state.deptFilter = 'all';
    this.state.statusFilter = 'all';
    this.state.filtered = [...this.state.allUsers];
    this.state.currentPage = 1;
  }
};

window.UserService = UserService;
