/**
 * Consultation Service — Shiloh Clinic (BACKEND-ONLY)
 * Endpoints:
 *   GET   /api/queue?limit=100        -> init / getAll
 *   POST  /api/visits                 -> addEntry
 *   PUT   /api/queue/:id              -> updateEntry
 *   DELETE /api/queue/:id             -> removeEntry
 *   PATCH /api/queue/:id/advance      -> advanceStatus
 * No STORAGE_KEY / SEQ_KEY / localStorage / DemoData / _generateDemoQueue.
 */

const ConsultationService = {

  API_BASE: (window.ShilohAPI && window.ShilohAPI.BASE) || (window.__SHILOH_API__ || 'http://localhost:5001/api'),

  state: {
    queue: []
  },

  TODAY: new Date().toISOString().slice(0, 10),

  DOCTORS: ['Dr. Samuel O.', 'Dr. Adeola', 'Dr. Chinedu', 'Dr. Funke'],
  PRIORITIES: ['Routine', 'Urgent', 'Emergency'],
  STATUSES: ['Waiting', 'In Consultation', 'Completed'],

  PRIORITY_MAP: {
    Routine: { label: 'Routine', cls: 'consult-priority-routine' },
    Urgent: { label: 'Urgent', cls: 'consult-priority-urgent' },
    Emergency: { label: 'Emergency', cls: 'consult-priority-emergency' }
  },

  STATUS_MAP: {
    'Waiting': { label: 'Waiting', cls: 'consult-status-waiting' },
    'In Consultation': { label: 'In Consultation', cls: 'consult-status-inprogress' },
    'Completed': { label: 'Completed', cls: 'consult-status-completed' }
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

  // Backend canonical (lowercase) -> page display vocab
  _fromApi(item) {
    if (!item) return item;
    var statusMap = {
      'waiting': 'Waiting',
      'active': 'In Consultation',
      'progress': 'In Consultation',
      'recorded': 'In Consultation',
      'completed': 'Completed',
      'flagged': 'Waiting',
      'cancelled': 'Cancelled'
    };
    var priorityMap = { 'routine': 'Routine', 'urgent': 'Urgent', 'emergency': 'Emergency' };
    var o = Object.assign({}, item);
    o.status = statusMap[item.status] || item.status;
    o.priority = priorityMap[item.priority] || item.priority || 'Routine';
    o.name = o.name || o.patientName || 'Unknown';
    o.hospNo = o.hospNo || o.hospitalNo || '';
    o.bp = o.bp || (item.vitalSigns && item.vitalSigns.bp) || '';
    o.temp = o.temp || (item.vitalSigns && item.vitalSigns.temp) || '';
    o.pulse = o.pulse || (item.vitalSigns && item.vitalSigns.pulse) || '';
    o.spo2 = o.spo2 || (item.vitalSigns && item.vitalSigns.spo2) || '';
    o.rx = Array.isArray(o.rx) ? o.rx : [];
    o.diagnosis = o.diagnosis || '';
    o.notes = o.notes || '';
    o.completedAt = o.completedAt || null;
    o.avgMinutes = o.avgMinutes || null;
    return o;
  },

  async init() {
    try {
      const res = await fetch(this.API_BASE + '/queue?limit=100', {
        headers: this._headers()
      });
      if (!res.ok) throw new Error('Failed to load queue (' + res.status + ')');
      const data = await res.json();
      const items = (data && data.items) || data;
      this.state.queue = Array.isArray(items) ? items.map(i => this._fromApi(i)) : [];
      this._reindex();
    } catch (e) {
      this.state.queue = [];
      this._toast('Could not load consultation queue. Check connection / login.', 'error');
    }
  },

  getAll() { return this.state.queue; },
  getById(id) { return this.state.queue.find(c => c.id === id); },

  getFiltered(status) {
    if (!status || status === 'all') return this.state.queue;
    return this.state.queue.filter(c => c.status === status);
  },

  getPage(page, perPage) {
    const n = perPage || 10;
    const start = (page - 1) * n;
    return this.state.queue.slice(start, start + n);
  },

  search(query) {
    const q = String(query || '').toLowerCase();
    if (!q) return this.state.queue;
    return this.state.queue.filter(c =>
      (c.name + ' ' + c.hospNo + ' ' + c.id).toLowerCase().includes(q)
    );
  },

  filter(status) {
    return this.getFiltered(status);
  },

  async addEntry(data) {
    try {
      const res = await fetch(this.API_BASE + '/queue', {
        method: 'POST',
        headers: this._headers(true),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to add consultation entry (' + res.status + ')'));
      }
      const entry = this._fromApi(await res.json());
      this.state.queue.unshift(entry);
      this._reindex();
      return entry;
    } catch (e) {
      this._toast(e.message || 'Could not add consultation entry.', 'error');
      return null;
    }
  },

  async updateEntry(id, updates) {
    try {
      const res = await fetch(this.API_BASE + '/queue/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: this._headers(true),
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to update entry (' + res.status + ')'));
      }
      const updated = this._fromApi(await res.json());
      const idx = this.state.queue.findIndex(c => c.id === id);
      if (idx !== -1) this.state.queue[idx] = updated;
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not update entry.', 'error');
      return null;
    }
  },

  async removeEntry(id) {
    try {
      const res = await fetch(this.API_BASE + '/queue/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: this._headers()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || ('Failed to remove entry (' + res.status + ')'));
      }
      const idx = this.state.queue.findIndex(c => c.id === id);
      if (idx === -1) return false;
      this.state.queue.splice(idx, 1);
      this._reindex();
      return true;
    } catch (e) {
      this._toast(e.message || 'Could not remove entry.', 'error');
      return false;
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
      const updated = this._fromApi(await res.json());
      const idx = this.state.queue.findIndex(c => c.id === id);
      if (idx !== -1) this.state.queue[idx] = updated;
      return updated;
    } catch (e) {
      this._toast(e.message || 'Could not advance status.', 'error');
      return null;
    }
  },

  getStats() {
    const all = this.state.queue;
    const completed = all.filter(r => r.status === 'Completed');
    const todayCompleted = completed.filter(r => r.completedAt === this.TODAY);
    const withTime = completed.filter(r => r.avgMinutes);
    return {
      inQueue: all.filter(r => r.status === 'Waiting').length,
      inConsultation: all.filter(r => r.status === 'In Consultation').length,
      completedToday: todayCompleted.length,
      avgTime: withTime.length ? Math.round(withTime.reduce((s, r) => s + r.avgMinutes, 0) / withTime.length) : 0,
      total: all.length
    };
  },

  /* ── Internal helpers ──────────────────────────────────────────────── */
  _vitalsText(bp, temp, pulse) {
    return bp ? bp + ' · ' + temp + ' · ' + pulse : 'Not recorded';
  },

  _reindex() {
    this.state.queue.forEach((c, i) => { c.q = i + 1; });
  }
};

window.ConsultationService = ConsultationService;
