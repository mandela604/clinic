/**
 * visit-history.js — Shiloh Clinic Reusable Visit History Component (for patient profiles)
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * Drop one <script src="visit-history.js"></script> in any page, then:
 *
 *   const vh = ShilohVisits.attach('#visitHistoryPlaceholder', {
 *     title: 'Visit History',
 *     subtitle: 'All recorded visits for this patient',
 *     visits: SEED_VISITS,               // optional initial data, see shape below
 *     departments: ['General OPD','Maternity','Laboratory','Pharmacy'],   // optional
 *     doctors: ['Dr. Samuel O.','Dr. Amaka N.','Dr. Bello T.'],           // optional
 *     types: [                            // optional — omit to use the default 4
 *       { id:'consultation', label:'Consultation', cls:'svh-type-consultation' },
 *       { id:'followup',     label:'Follow-up',    cls:'svh-type-followup' },
 *       { id:'emergency',    label:'Emergency',    cls:'svh-type-emergency' },
 *       { id:'antenatal',    label:'Antenatal',    cls:'svh-type-antenatal' },
 *     ],
 *     statuses: [                         // optional — omit to use the default 3
 *       { id:'Completed',  label:'Completed',   badgeCls:'svh-badge-completed', statIcon:'fa-solid fa-circle-check',   statCls:'svh-ic-green' },
 *       { id:'In Progress',label:'In Progress', badgeCls:'svh-badge-progress',  statIcon:'fa-solid fa-hourglass-half', statCls:'svh-ic-orange' },
 *       { id:'Cancelled',  label:'Cancelled',   badgeCls:'svh-badge-cancelled',statIcon:'fa-solid fa-ban',            statCls:'svh-ic-red' },
 *     ],
 *     dateRanges: [{ days:7, label:'Last 7 days' }, { days:30, label:'Last 30 days' }, { days:90, label:'Last 90 days' }],
 *     pageSize: 5,
 *
 *     onLogVisit:     (visit) => { ... your API call ... },
 *     onView:         (visit) => { ... fires when the detail modal opens ... },
 *     onPrint:        (visit) => { ... hook a real print/PDF flow here ... },
 *     onResetFilters: () => { ... },
 *   });
 *
 *   vh.setVisits(newList);   // replace all visits, re-render
 *   vh.addVisit({ dept:'General OPD', doctor:'Dr. Samuel O.', type:'consultation', status:'Completed' });
 *   vh.getVisits();          // read current in-memory state
 *   vh.destroy();            // remove and clean up
 *
 * Visit shape (any field can be omitted):
 *   {
 *     id,        // unique — auto-assigned if omitted
 *     visitNo,   // e.g. "VIS-000089" — auto-generated if omitted
 *     dept,      // one of your `departments`
 *     doctor,    // one of your `doctors`
 *     type,      // one of your `types[].id`
 *     status,    // one of your `statuses[].id`
 *     ts,        // epoch ms, used for sorting + date-range filtering — defaults to now
 *     date, time,// display strings — derived from `ts` if omitted
 *     notes,     // shown in the detail modal
 *   }
 *
 * This component does NOT know about your backend. It keeps its own in-memory
 * visit list (mutating what you pass in) and calls your hooks so the host page
 * can persist changes. "Print" is a hook (`onPrint`) — wire it up to a real
 * print/PDF flow in the host app; without a hook it just shows a demo toast.
 *
 * ── LAYOUT ───────────────────────────────────────────────────────────────────
 * Header (title + New Visit button) → stat chips (Total + one per status) →
 * search / department / status / date-range filters + reset → table → pagination.
 *
 * ── FILTERING ────────────────────────────────────────────────────────────────
 * Search matches visit number and doctor name. Department, status and date
 * range (last 7/30/90 days, relative to each visit's `ts`) filter in addition.
 * "Reset filters" clears all four and calls `onResetFilters`.
 *
 * ── MODALS ───────────────────────────────────────────────────────────────────
 * "View" opens a detail modal (date/time, department, doctor, type, status,
 * notes) with a Print action. "New Visit" opens a form (department, type,
 * doctor, status, notes) that prepends a new visit to the list. Both are
 * built once per instance and appended to <body>, namespaced by instance id.
 */

(function () {
  'use strict';

  if (window.__shilohVisitHistory) return;
  window.__shilohVisitHistory = true;

  // ══════════════════════════════════════════════════════════════════════
  // CSS  (svh- prefixed, self-contained)
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .svh-wrap{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#1c2440;font-size:13px;}
    .svh-panel{background:#fff;border:1px solid #eef0f6;border-radius:14px;padding:18px 20px;}
    .svh-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px;flex-wrap:wrap;}
    .svh-title{font-size:15px;font-weight:800;color:#1c2440;}
    .svh-sub{font-size:11.5px;color:#9aa1b3;font-weight:600;margin-top:2px;}
    .svh-btn-primary{display:flex;align-items:center;gap:8px;background:#2f6fed;border:1px solid #2f6fed;border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;cursor:pointer;box-shadow:0 4px 10px rgba(47,111,237,0.28);}
    .svh-btn-primary:hover{background:#2660d6;}
    .svh-btn-secondary{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eef0f6;border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:#6b7280;white-space:nowrap;cursor:pointer;}
    .svh-btn-secondary:hover{background:#f4f6fb;color:#1c2440;}

    .svh-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
    .svh-search{display:flex;align-items:center;gap:8px;background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;flex:1;min-width:200px;}
    .svh-search i{color:#9aa1b3;font-size:12px;}
    .svh-search input{border:none;background:transparent;outline:none;font-size:12.5px;color:#1c2440;width:100%;font-family:inherit;}
    .svh-search input::placeholder{color:#9aa1b3;}
    .svh-select{background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:600;color:#1c2440;cursor:pointer;font-family:inherit;}
    .svh-filters-right{display:flex;align-items:center;gap:8px;margin-left:auto;}
    .svh-reset{font-size:11.5px;color:#2f6fed;font-weight:700;cursor:pointer;white-space:nowrap;}
    .svh-reset:hover{text-decoration:underline;}

    .svh-stats{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
    .svh-stat{flex:1;min-width:130px;border:1px solid #eef0f6;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;}
    .svh-stat-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
    .svh-ic-blue{background:#eaf1ff;color:#2f6fed;}
    .svh-ic-green{background:#e9f9f0;color:#12b76a;}
    .svh-ic-orange{background:#fff4e5;color:#f79009;}
    .svh-ic-red{background:#feecec;color:#f04438;}
    .svh-ic-purple{background:#f4efff;color:#8b5cf6;}
    .svh-stat-label{font-size:10.5px;color:#6b7280;font-weight:700;}
    .svh-stat-value{font-size:16px;font-weight:800;color:#1c2440;}

    .svh-table-scroll{overflow-x:auto;}
    .svh-wrap table{width:100%;border-collapse:collapse;}
    .svh-wrap thead th{text-align:left;font-size:10.5px;letter-spacing:.03em;color:#9aa1b3;text-transform:uppercase;font-weight:700;padding:10px 8px;border-bottom:1px solid #eef0f6;white-space:nowrap;}
    .svh-wrap tbody td{padding:12px 8px;border-bottom:1px solid #eef0f6;font-size:12.5px;vertical-align:middle;color:#1c2440;font-weight:600;white-space:nowrap;}
    .svh-wrap tbody tr:last-child td{border-bottom:none;}
    .svh-wrap tbody tr:hover{background:#fafbfe;}

    .svh-visitno{color:#2f6fed;font-weight:800;cursor:pointer;}
    .svh-visitno:hover{text-decoration:underline;}
    .svh-date-main{font-weight:700;}
    .svh-date-time{display:block;font-size:11px;color:#9aa1b3;font-weight:600;margin-top:1px;}

    .svh-type-tag{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:7px;display:inline-block;}
    .svh-type-consultation{background:#eaf1ff;color:#1d54c9;}
    .svh-type-followup{background:#f4efff;color:#6b3fd6;}
    .svh-type-emergency{background:#feecec;color:#c1362b;}
    .svh-type-antenatal{background:#fdeefa;color:#c2299c;}

    .svh-badge{font-size:11px;font-weight:700;padding:4px 11px;border-radius:20px;display:inline-block;}
    .svh-badge-completed{background:#e9f9f0;color:#0a8a52;}
    .svh-badge-progress{background:#fff4e5;color:#c56c05;}
    .svh-badge-cancelled{background:#feecec;color:#c1362b;}

    .svh-row-actions{display:flex;align-items:center;gap:6px;}
    .svh-icon-btn{width:28px;height:28px;border-radius:8px;border:1px solid #eef0f6;background:#fff;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:11px;cursor:pointer;}
    .svh-icon-btn:hover{color:#2f6fed;border-color:#eaf1ff;background:#eaf1ff;}

    .svh-empty{padding:44px 10px;text-align:center;color:#9aa1b3;}
    .svh-empty i{font-size:26px;margin-bottom:10px;display:block;color:#9aa1b3;}
    .svh-empty div{font-size:12.5px;font-weight:600;}

    .svh-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap;gap:10px;}
    .svh-page-info{font-size:11.5px;color:#6b7280;font-weight:600;}
    .svh-page-controls{display:flex;align-items:center;gap:6px;}
    .svh-page-btn{width:30px;height:30px;border-radius:8px;border:1px solid #eef0f6;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#6b7280;cursor:pointer;}
    .svh-page-btn:hover:not(.on):not(:disabled){border-color:#2f6fed;color:#2f6fed;}
    .svh-page-btn.on{background:#2f6fed;border-color:#2f6fed;color:#fff;cursor:default;}
    .svh-page-btn:disabled{opacity:.4;cursor:default;}
    .svh-page-ellipsis{width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#9aa1b3;font-weight:700;}

    /* modals (appended to body, namespaced per instance) */
    .svh-modal-overlay{position:fixed;inset:0;background:rgba(15,20,40,0.45);display:none;align-items:center;justify-content:center;z-index:1900;padding:20px;}
    .svh-modal-overlay.open{display:flex;}
    .svh-modal-box{background:#fff;border-radius:16px;max-width:480px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(10,15,40,0.25);max-height:90vh;overflow-y:auto;font-family:inherit;color:#1c2440;}
    .svh-modal-box.wide{max-width:560px;}
    .svh-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
    .svh-modal-title{font-size:15px;font-weight:800;color:#1c2440;}
    .svh-modal-close{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;cursor:pointer;font-size:13px;}
    .svh-modal-close:hover{background:#f4f6fb;}
    .svh-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;}

    .svh-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .svh-detail-item{display:flex;flex-direction:column;gap:3px;}
    .svh-detail-label{font-size:10px;font-weight:800;color:#9aa1b3;text-transform:uppercase;letter-spacing:.03em;}
    .svh-detail-value{font-size:13px;font-weight:700;color:#1c2440;}

    .svh-form-group{margin-bottom:14px;}
    .svh-form-label{font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;display:block;}
    .svh-form-input,.svh-form-select{width:100%;border:1px solid #eef0f6;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;color:#1c2440;outline:none;background:#fff;}
    .svh-form-input:focus,.svh-form-select:focus{border-color:#2f6fed;}
    .svh-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

    @media (max-width:720px){
      .svh-stats{flex-direction:column;}
      .svh-detail-grid,.svh-form-row{grid-template-columns:1fr;}
    }
  `;

  const DEFAULT_DEPTS = ['General OPD', 'Maternity', 'Laboratory', 'Pharmacy'];
  const DEFAULT_DOCTORS = ['Dr. Samuel O.', 'Dr. Amaka N.', 'Dr. Bello T.'];
  const DEFAULT_TYPES = [
    { id: 'consultation', label: 'Consultation', cls: 'svh-type-consultation' },
    { id: 'followup', label: 'Follow-up', cls: 'svh-type-followup' },
    { id: 'emergency', label: 'Emergency', cls: 'svh-type-emergency' },
    { id: 'antenatal', label: 'Antenatal', cls: 'svh-type-antenatal' }
  ];
  const DEFAULT_STATUSES = [
    { id: 'Completed', label: 'Completed', badgeCls: 'svh-badge-completed', statIcon: 'fa-solid fa-circle-check', statCls: 'svh-ic-green' },
    { id: 'In Progress', label: 'In Progress', badgeCls: 'svh-badge-progress', statIcon: 'fa-solid fa-hourglass-half', statCls: 'svh-ic-orange' },
    { id: 'Cancelled', label: 'Cancelled', badgeCls: 'svh-badge-cancelled', statIcon: 'fa-solid fa-ban', statCls: 'svh-ic-red' }
  ];
  const DEFAULT_DATE_RANGES = [
    { days: 7, label: 'Last 7 days' },
    { days: 30, label: 'Last 30 days' },
    { days: 90, label: 'Last 90 days' }
  ];

  // ══════════════════════════════════════════════════════════════════════
  // Utils
  // ══════════════════════════════════════════════════════════════════════
  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    let el = document.getElementById('svhToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'svhToast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#0b1a4d;color:#fff;padding:11px 20px;border-radius:10px;font-size:12.5px;font-weight:700;box-shadow:0 10px 30px rgba(10,15,40,0.3);opacity:0;pointer-events:none;transition:.22s;z-index:2100;font-family:\'Segoe UI\',sans-serif;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)'; }, 1800);
  }

  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const el = document.createElement('style');
    el.id = 'svh-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Instance factory — each attach() call gets its own isolated state
  // ══════════════════════════════════════════════════════════════════════
  let _idCounter = 1000;
  let _instanceCounter = 0;

  function attach(target, options) {
    options = options || {};
    _injectStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) { console.warn('[ShilohVisits] Target not found:', target); return null; }

    const instId = 'svh' + (++_instanceCounter);
    const DEPTS = options.departments || DEFAULT_DEPTS;
    const DOCTORS = options.doctors || DEFAULT_DOCTORS;
    const TYPES = options.types || DEFAULT_TYPES;
    const TYPE_BY_ID = {}; TYPES.forEach(t => { TYPE_BY_ID[t.id] = t; });
    const STATUSES = options.statuses || DEFAULT_STATUSES;
    const STATUS_BY_ID = {}; STATUSES.forEach(s => { STATUS_BY_ID[s.id] = s; });
    const DATE_RANGES = options.dateRanges || DEFAULT_DATE_RANGES;
    const PAGE_SIZE = options.pageSize || 5;

    function _fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    function _fmtTime(ts) { return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

    function _normalize(v) {
      const ts = v.ts || Date.now();
      return Object.assign({
        id: ++_idCounter,
        visitNo: 'VIS-' + String(100000 + (_idCounter % 900000)).slice(-6),
        dept: DEPTS[0], doctor: DOCTORS[0], type: TYPES[0] ? TYPES[0].id : '', status: STATUSES[0] ? STATUSES[0].id : '',
        ts, date: _fmtDate(ts), time: _fmtTime(ts), notes: ''
      }, v);
    }

    let visits = (options.visits || []).map(_normalize);
    let state = { search: '', dept: 'all', status: 'all', date: 'all', page: 1 };

    // ── Build shell ──
    container.innerHTML = `
      <div class="svh-wrap" id="${instId}">
        <div class="svh-panel">
          <div class="svh-head">
            <div>
              <div class="svh-title">${_esc(options.title || 'Visit History')}</div>
              ${options.subtitle ? `<div class="svh-sub">${_esc(options.subtitle)}</div>` : ''}
            </div>
            <div class="svh-btn-primary" data-svh-newvisit><i class="fa-solid fa-plus"></i> New Visit</div>
          </div>
          <div class="svh-stats" data-svh-stats></div>
          <div class="svh-filters">
            <div class="svh-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" data-svh-search placeholder="Search by visit no. or doctor…"></div>
            <select class="svh-select" data-svh-dept>
              <option value="all">All Departments</option>
              ${DEPTS.map(d => `<option value="${_esc(d)}">${_esc(d)}</option>`).join('')}
            </select>
            <select class="svh-select" data-svh-status>
              <option value="all">All Statuses</option>
              ${STATUSES.map(s => `<option value="${_esc(s.id)}">${_esc(s.label)}</option>`).join('')}
            </select>
            <select class="svh-select" data-svh-date>
              <option value="all">All Dates</option>
              ${DATE_RANGES.map(r => `<option value="${r.days}">${_esc(r.label)}</option>`).join('')}
            </select>
            <div class="svh-filters-right"><div class="svh-reset" data-svh-reset>Reset filters</div></div>
          </div>
          <div class="svh-table-scroll">
            <table>
              <thead><tr><th>Visit No.</th><th>Date &amp; Time</th><th>Department</th><th>Doctor</th><th>Type</th><th>Status</th><th></th></tr></thead>
              <tbody data-svh-tbody></tbody>
            </table>
          </div>
          <div class="svh-empty" data-svh-empty style="display:none;">
            <i class="fa-regular fa-folder-open"></i><div>No visits match your filters</div>
          </div>
          <div class="svh-pagination" data-svh-pagination>
            <div class="svh-page-info" data-svh-pageinfo></div>
            <div class="svh-page-controls" data-svh-pagecontrols></div>
          </div>
        </div>
      </div>`;

    const root       = container.querySelector('#' + instId);
    const statsEl    = root.querySelector('[data-svh-stats]');
    const searchEl   = root.querySelector('[data-svh-search]');
    const deptEl     = root.querySelector('[data-svh-dept]');
    const statusEl   = root.querySelector('[data-svh-status]');
    const dateEl     = root.querySelector('[data-svh-date]');
    const resetEl    = root.querySelector('[data-svh-reset]');
    const tbodyEl    = root.querySelector('[data-svh-tbody]');
    const scrollEl   = root.querySelector('.svh-table-scroll');
    const emptyEl    = root.querySelector('[data-svh-empty]');
    const pagBarEl   = root.querySelector('[data-svh-pagination]');
    const pageInfoEl = root.querySelector('[data-svh-pageinfo]');
    const pageCtrlEl = root.querySelector('[data-svh-pagecontrols]');
    const newVisitTrig = root.querySelector('[data-svh-newvisit]');

    // ── Modals (built once per instance, appended to <body>) ──
    const modalsWrap = document.createElement('div');
    modalsWrap.innerHTML = `
      <div class="svh-modal-overlay" id="${instId}-view">
        <div class="svh-modal-box">
          <div class="svh-modal-head"><div class="svh-modal-title" id="${instId}-view-title">Visit detail</div>
            <div class="svh-modal-close" data-svh-close="${instId}-view"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="svh-detail-grid" id="${instId}-view-body"></div>
          <div class="svh-modal-actions">
            <div class="svh-btn-secondary" id="${instId}-view-print"><i class="fa-solid fa-print"></i> Print</div>
          </div>
        </div>
      </div>
      <div class="svh-modal-overlay" id="${instId}-new">
        <div class="svh-modal-box wide">
          <div class="svh-modal-head"><div class="svh-modal-title">Log a new visit</div>
            <div class="svh-modal-close" data-svh-close="${instId}-new"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="svh-form-row">
            <div class="svh-form-group"><label class="svh-form-label">Department</label>
              <select class="svh-form-select" id="${instId}-f-dept">${DEPTS.map(d => `<option>${_esc(d)}</option>`).join('')}</select></div>
            <div class="svh-form-group"><label class="svh-form-label">Visit type</label>
              <select class="svh-form-select" id="${instId}-f-type">${TYPES.map(t => `<option value="${t.id}">${_esc(t.label)}</option>`).join('')}</select></div>
          </div>
          <div class="svh-form-row">
            <div class="svh-form-group"><label class="svh-form-label">Doctor</label>
              <select class="svh-form-select" id="${instId}-f-doctor">${DOCTORS.map(d => `<option>${_esc(d)}</option>`).join('')}</select></div>
            <div class="svh-form-group"><label class="svh-form-label">Status</label>
              <select class="svh-form-select" id="${instId}-f-status">${STATUSES.map(s => `<option value="${_esc(s.id)}">${_esc(s.label)}</option>`).join('')}</select></div>
          </div>
          <div class="svh-form-group"><label class="svh-form-label">Notes (optional)</label>
            <input class="svh-form-input" id="${instId}-f-notes" placeholder="Reason for visit, quick summary…"></div>
          <div class="svh-modal-actions">
            <div class="svh-btn-secondary" data-svh-close="${instId}-new">Cancel</div>
            <div class="svh-btn-primary" id="${instId}-new-submit"><i class="fa-solid fa-check"></i> Save Visit</div>
          </div>
        </div>
      </div>`;
    while (modalsWrap.firstChild) document.body.appendChild(modalsWrap.firstChild);

    function modal(id) { return document.getElementById(instId + '-' + id); }
    document.querySelectorAll('[data-svh-close]').forEach(btn => {
      if (!btn.dataset.svhClose.startsWith(instId)) return;
      btn.addEventListener('click', () => document.getElementById(btn.dataset.svhClose).classList.remove('open'));
    });
    ['view', 'new'].forEach(name => {
      const ov = modal(name);
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });

    // ── Filtering ──
    function getFiltered() {
      const q = state.search.trim().toLowerCase();
      const now = Date.now();
      return visits.filter(v => {
        if (state.dept !== 'all' && v.dept !== state.dept) return false;
        if (state.status !== 'all' && v.status !== state.status) return false;
        if (state.date !== 'all') {
          const days = Number(state.date);
          if (now - v.ts > days * 24 * 60 * 60 * 1000) return false;
        }
        if (q && !(v.visitNo.toLowerCase().includes(q) || v.doctor.toLowerCase().includes(q))) return false;
        return true;
      }).sort((a, b) => b.ts - a.ts);
    }

    function renderStats() {
      const total = visits.length;
      let html = `<div class="svh-stat"><div class="svh-stat-ic svh-ic-blue"><i class="fa-solid fa-user-group"></i></div>
        <div><div class="svh-stat-label">Total Visits</div><div class="svh-stat-value">${total}</div></div></div>`;
      STATUSES.forEach(s => {
        const count = visits.filter(v => v.status === s.id).length;
        html += `<div class="svh-stat"><div class="svh-stat-ic ${s.statCls || 'svh-ic-purple'}"><i class="${s.statIcon || 'fa-solid fa-circle'}"></i></div>
          <div><div class="svh-stat-label">${_esc(s.label)}</div><div class="svh-stat-value">${count}</div></div></div>`;
      });
      statsEl.innerHTML = html;
    }

    function renderRow(v) {
      const tmeta = TYPE_BY_ID[v.type] || { label: v.type, cls: '' };
      const smeta = STATUS_BY_ID[v.status] || { label: v.status, badgeCls: '' };
      return `
        <tr data-id="${v.id}">
          <td><span class="svh-visitno" data-action="view" data-id="${v.id}">${_esc(v.visitNo)}</span></td>
          <td><span class="svh-date-main">${_esc(v.date)}</span><span class="svh-date-time">${_esc(v.time)}</span></td>
          <td>${_esc(v.dept)}</td>
          <td>${_esc(v.doctor)}</td>
          <td><span class="svh-type-tag ${tmeta.cls}">${_esc(tmeta.label)}</span></td>
          <td><span class="svh-badge ${smeta.badgeCls}">${_esc(smeta.label)}</span></td>
          <td>
            <div class="svh-row-actions">
              <div class="svh-icon-btn" data-action="view" data-id="${v.id}" title="View"><i class="fa-regular fa-eye"></i></div>
              <div class="svh-icon-btn" data-action="print" data-id="${v.id}" title="Print"><i class="fa-solid fa-print"></i></div>
            </div>
          </td>
        </tr>`;
    }

    function buildPageControls(page, totalPages) {
      let html = `<div class="svh-page-btn" data-prev ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></div>`;
      const pages = [];
      const add = p => { if (p >= 1 && p <= totalPages && pages.indexOf(p) === -1) pages.push(p); };
      add(1); add(2); add(totalPages - 1); add(totalPages);
      for (let p = page - 1; p <= page + 1; p++) add(p);
      pages.sort((a, b) => a - b);
      let last = 0;
      pages.forEach(p => {
        if (p - last > 1) html += `<div class="svh-page-ellipsis">…</div>`;
        html += `<div class="svh-page-btn ${p === page ? 'on' : ''}" data-page="${p}">${p}</div>`;
        last = p;
      });
      html += `<div class="svh-page-btn" data-next ${page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></div>`;
      return html;
    }

    function render() {
      renderStats();
      const all = getFiltered();
      const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      const start = (state.page - 1) * PAGE_SIZE;
      const pageItems = all.slice(start, start + PAGE_SIZE);

      tbodyEl.innerHTML = pageItems.map(renderRow).join('');
      scrollEl.style.display = all.length ? 'block' : 'none';
      emptyEl.style.display = all.length ? 'none' : 'block';

      if (all.length === 0) {
        pagBarEl.style.display = 'none';
      } else {
        pagBarEl.style.display = 'flex';
        const from = start + 1, to = Math.min(start + PAGE_SIZE, all.length);
        pageInfoEl.textContent = `Showing ${from}–${to} of ${all.length} visit${all.length === 1 ? '' : 's'}`;
        pageCtrlEl.innerHTML = buildPageControls(state.page, totalPages);
      }
      attachRowListeners();
    }

    function attachRowListeners() {
      root.querySelectorAll('[data-action="view"]').forEach(elx => {
        elx.addEventListener('click', () => openViewModal(Number(elx.dataset.id)));
      });
      root.querySelectorAll('[data-action="print"]').forEach(elx => {
        elx.addEventListener('click', e => { e.stopPropagation(); printVisit(Number(elx.dataset.id)); });
      });
      pageCtrlEl.querySelectorAll('[data-page]').forEach(b => {
        b.addEventListener('click', () => { state.page = Number(b.dataset.page); render(); });
      });
      const prev = pageCtrlEl.querySelector('[data-prev]');
      const next = pageCtrlEl.querySelector('[data-next]');
      if (prev) prev.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
      if (next) next.addEventListener('click', () => { state.page++; render(); });
    }

    // ── view modal ──
    function openViewModal(id) {
      const v = visits.find(x => x.id === id);
      if (!v) return;
      const tmeta = TYPE_BY_ID[v.type] || { label: v.type, cls: '' };
      const smeta = STATUS_BY_ID[v.status] || { label: v.status, badgeCls: '' };
      document.getElementById(instId + '-view-title').textContent = v.visitNo;
      document.getElementById(instId + '-view-body').innerHTML = `
        <div class="svh-detail-item"><span class="svh-detail-label">Date &amp; Time</span><span class="svh-detail-value">${_esc(v.date)} · ${_esc(v.time)}</span></div>
        <div class="svh-detail-item"><span class="svh-detail-label">Department</span><span class="svh-detail-value">${_esc(v.dept)}</span></div>
        <div class="svh-detail-item"><span class="svh-detail-label">Doctor</span><span class="svh-detail-value">${_esc(v.doctor)}</span></div>
        <div class="svh-detail-item"><span class="svh-detail-label">Type</span><span class="svh-detail-value"><span class="svh-type-tag ${tmeta.cls}">${_esc(tmeta.label)}</span></span></div>
        <div class="svh-detail-item"><span class="svh-detail-label">Status</span><span class="svh-detail-value"><span class="svh-badge ${smeta.badgeCls}">${_esc(smeta.label)}</span></span></div>
        <div class="svh-detail-item" style="grid-column:1/-1;"><span class="svh-detail-label">Notes</span><span class="svh-detail-value" style="font-weight:600;">${_esc(v.notes)}</span></div>`;
      document.getElementById(instId + '-view-print').dataset.id = id;
      modal('view').classList.add('open');
      if (typeof options.onView === 'function') options.onView(v);
    }
    document.getElementById(instId + '-view-print').addEventListener('click', e => printVisit(Number(e.currentTarget.dataset.id)));

    function printVisit(id) {
      const v = visits.find(x => x.id === id);
      if (!v) return;
      if (typeof options.onPrint === 'function') { options.onPrint(v); return; }
      _toast(`Preparing ${v.visitNo} for print… (demo)`);
    }

    // ── new visit modal ──
    function openNewVisitModal() {
      document.getElementById(instId + '-f-dept').value = DEPTS[0];
      document.getElementById(instId + '-f-type').value = TYPES[0] ? TYPES[0].id : '';
      document.getElementById(instId + '-f-doctor').value = DOCTORS[0];
      document.getElementById(instId + '-f-status').value = STATUSES[0] ? STATUSES[0].id : '';
      document.getElementById(instId + '-f-notes').value = '';
      modal('new').classList.add('open');
    }
    newVisitTrig.addEventListener('click', openNewVisitModal);
    document.getElementById(instId + '-new-submit').addEventListener('click', () => {
      const now = Date.now();
      const visit = _normalize({
        dept: document.getElementById(instId + '-f-dept').value,
        doctor: document.getElementById(instId + '-f-doctor').value,
        type: document.getElementById(instId + '-f-type').value,
        status: document.getElementById(instId + '-f-status').value,
        ts: now,
        notes: document.getElementById(instId + '-f-notes').value.trim() || 'No additional notes recorded.'
      });
      visits.unshift(visit);
      modal('new').classList.remove('open');
      state.page = 1;
      _toast('Visit logged');
      render();
      if (typeof options.onLogVisit === 'function') options.onLogVisit(visit);
    });

    // ── filters ──
    searchEl.addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });
    deptEl.addEventListener('change', e => { state.dept = e.target.value; state.page = 1; render(); });
    statusEl.addEventListener('change', e => { state.status = e.target.value; state.page = 1; render(); });
    dateEl.addEventListener('change', e => { state.date = e.target.value; state.page = 1; render(); });
    resetEl.addEventListener('click', () => {
      state = { search: '', dept: 'all', status: 'all', date: 'all', page: 1 };
      searchEl.value = ''; deptEl.value = 'all'; statusEl.value = 'all'; dateEl.value = 'all';
      render();
      _toast('Filters reset');
      if (typeof options.onResetFilters === 'function') options.onResetFilters();
    });

    render();

    // ── Public control object ──
    return {
      setVisits(list) { visits = (list || []).map(_normalize); state.page = 1; render(); },
      addVisit(visit) { const v = _normalize(visit || {}); visits.unshift(v); render(); return v; },
      getVisits() { return visits; },
      destroy() {
        ['view', 'new'].forEach(name => { const m = modal(name); if (m) m.remove(); });
        container.innerHTML = '';
      }
    };
  }

  window.ShilohVisits = { attach };

})();

/*─── USAGE ────────────────────────────────────────────────────────────────

  <div id="visitHistoryPlaceholder"></div>
  <script src="visit-history.js"></script>
  <script>
    // Optional: generate demo data the same way the original page did
    function seedVisits(n) {
      const DEPTS = ['General OPD','Maternity','Laboratory','Pharmacy'];
      const DOCTORS = ['Dr. Samuel O.','Dr. Amaka N.','Dr. Bello T.'];
      const TYPES = ['consultation','followup','emergency','antenatal'];
      const STATUSES = ['Completed','Completed','Completed','Completed','In Progress','Cancelled'];
      let d = new Date();
      const out = [];
      for (let i = 0; i < n; i++) {
        const dept = DEPTS[Math.floor(Math.abs(Math.sin(i*3.1))*DEPTS.length) % DEPTS.length];
        out.push({
          dept,
          doctor: dept==='Maternity' ? 'Dr. Amaka N.' : DOCTORS[Math.floor(Math.abs(Math.sin(i*1.7))*DOCTORS.length) % DOCTORS.length],
          type: dept==='Maternity' ? 'antenatal' : TYPES[Math.floor(Math.abs(Math.sin(i*2.3))*TYPES.length) % TYPES.length],
          status: STATUSES[Math.floor(Math.abs(Math.sin(i*4.1))*STATUSES.length) % STATUSES.length],
          ts: d.getTime(),
          notes: 'General consultation for reported symptoms.'
        });
        d.setDate(d.getDate() - (1 + (i % 4)));
      }
      return out;
    }

    const vh = ShilohVisits.attach('#visitHistoryPlaceholder', {
      visits: seedVisits(48),
      onLogVisit: (v) => console.log('logged', v),
      onView:     (v) => console.log('viewed', v),
      onPrint:    (v) => console.log('print', v),   // wire this to a real print/PDF flow
    });
  </script>

── CUSTOM DEPARTMENTS / TYPES / STATUSES ────────────────────────────────────

  Pass your own `departments`, `doctors`, `types` and `statuses` to repurpose
  this for a different clinical (or non-clinical) context — the filters, form
  selects, and stat chips all key off these arrays.

── MULTIPLE INSTANCES ───────────────────────────────────────────────────────

  Every attach() call is fully isolated (its own state, its own modals,
  namespaced element ids) — attach as many as you like on the same page.

─────────────────────────────────────────────────────────────────────────*/