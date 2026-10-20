/**
 * prescriptions.js — Shiloh Clinic Reusable Prescriptions Component (for patient profiles)
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * Drop one <script src="prescriptions.js"></script> in any page (after Font Awesome), then:
 *
 *   const rx = ShilohRx.attach('#prescriptionsPlaceholder', {
 *     title: 'Prescriptions',
 *     subtitle: 'Medications prescribed to this patient',
 *     patientName: 'Emeka Johnson',                 // printed on the prescription document
 *     clinicName: 'Shiloh Clinic & Maternity',        // optional — has sensible defaults
 *     clinicAddress: '12 Aba Road, Port Harcourt, Rivers State',
 *     clinicPhone: '+234 800 000 0000',
 *     prescriptions: SEED_RX,                         // optional initial data, see shape below
 *     doctors: ['Dr. Samuel O.', 'Dr. Amaka N.'],      // optional
 *     statuses: [                                      // optional — omit to use the default 3
 *       { id:'dispensed', label:'Dispensed',            cls:'spx-flag-dispensed' },
 *       { id:'pending',   label:'Pending Pickup',        cls:'spx-flag-pending' },
 *       { id:'active',    label:'Active — Refillable',   cls:'spx-flag-active' },
 *     ],
 *
 *     onSave:     (rx) => { ... your API call when a new prescription is saved ... },
 *     onDispense: (rx) => { ... fires when marked "ready for pickup" / dispensed ... },
 *     onRefill:   (rx) => { ... fires when a refill is requested ... },
 *     onView:     (rx) => { ... fires when the full-prescription modal opens ... },
 *     onPrint:    (rx) => { ... OPTIONAL override — by default this component prints for real ... },
 *   });
 *
 *   rx.setPrescriptions(newList);   // replace all prescriptions, re-render
 *   rx.addPrescription({ doctor:'Dr. Samuel O.', status:'pending', meds:[...] });
 *   rx.getPrescriptions();          // read current in-memory state
 *   rx.destroy();                   // remove and clean up
 *
 * Prescription shape (any field can be omitted):
 *   {
 *     id,       // unique — auto-assigned if omitted
 *     rxNo,     // e.g. "RX-000067" — auto-generated if omitted
 *     doctor,   // one of your `doctors`
 *     status,   // one of your `statuses[].id`
 *     ts,       // epoch ms — used for the printed/displayed date, defaults to now
 *     date,     // display string — derived from `ts` if omitted
 *     meds,     // [{ name, dosage, freq, duration }, ...]
 *     notes,    // free text, shown in the row detail + printed prescription
 *   }
 *
 * ── PRINTING ─────────────────────────────────────────────────────────────────
 * Printing works out of the box — no host wiring required. The component keeps
 * one shared hidden #spxPrintArea + a `body.spx-print-mode` rule (injected once,
 * shared by every instance on the page) that hides everything else and shows
 * only the formatted prescription document, then calls window.print() and
 * cleans up automatically on `afterprint`. Pass `onPrint` only if you want to
 * fully replace this behaviour (e.g. to generate a PDF server-side instead).
 *
 * ── LAYOUT ───────────────────────────────────────────────────────────────────
 * Header (title + New Prescription button) → stat chips (Total + one per
 * status) → search / status / doctor filters → expandable prescription list
 * (each row expands to show the medication table + actions).
 *
 * ── MODALS ───────────────────────────────────────────────────────────────────
 * "New Prescription" opens a form with dynamic medication rows (add/remove).
 * "View Full Prescription" opens a formatted, printable document preview.
 * Both are built once per instance and appended to <body>, namespaced by
 * instance id so multiple instances can coexist on one page.
 */

(function () {
  'use strict';

  if (window.__shilohRx) return;
  window.__shilohRx = true;

  // ══════════════════════════════════════════════════════════════════════
  // CSS  (spx- prefixed, self-contained)
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .spx-wrap{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#1c2440;font-size:13px;}
    .spx-panel{background:#fff;border:1px solid #eef0f6;border-radius:14px;padding:18px 20px;}
    .spx-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px;flex-wrap:wrap;}
    .spx-title{font-size:15px;font-weight:800;color:#1c2440;}
    .spx-sub{font-size:11.5px;color:#9aa1b3;font-weight:600;margin-top:2px;}
    .spx-btn-primary{display:flex;align-items:center;gap:8px;background:#2f6fed;border:1px solid #2f6fed;border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;cursor:pointer;box-shadow:0 4px 10px rgba(47,111,237,0.28);}
    .spx-btn-primary:hover{background:#2660d6;}
    .spx-btn-primary:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;}
    .spx-btn-secondary{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eef0f6;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;color:#6b7280;white-space:nowrap;cursor:pointer;}
    .spx-btn-secondary:hover{background:#f4f6fb;color:#1c2440;}

    .spx-stats{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
    .spx-stat{flex:1;min-width:130px;border:1px solid #eef0f6;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;}
    .spx-stat-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
    .spx-ic-purple{background:#f4efff;color:#8b5cf6;}
    .spx-ic-green{background:#e9f9f0;color:#12b76a;}
    .spx-ic-orange{background:#fff4e5;color:#f79009;}
    .spx-ic-blue{background:#eaf1ff;color:#2f6fed;}
    .spx-stat-label{font-size:10.5px;color:#6b7280;font-weight:700;}
    .spx-stat-value{font-size:16px;font-weight:800;color:#1c2440;}

    .spx-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
    .spx-search{display:flex;align-items:center;gap:8px;background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;flex:1;min-width:200px;}
    .spx-search i{color:#9aa1b3;font-size:12px;}
    .spx-search input{border:none;background:transparent;outline:none;font-size:12.5px;color:#1c2440;width:100%;font-family:inherit;}
    .spx-search input::placeholder{color:#9aa1b3;}
    .spx-select{background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:600;color:#1c2440;cursor:pointer;font-family:inherit;}

    .spx-item{border:1px solid #eef0f6;border-radius:12px;margin-bottom:10px;overflow:hidden;}
    .spx-item:last-child{margin-bottom:0;}
    .spx-item-head{display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer;}
    .spx-item-ic{width:36px;height:36px;border-radius:9px;background:#f4efff;color:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
    .spx-item-body{flex:1;min-width:0;}
    .spx-item-name{font-size:12.5px;font-weight:800;color:#1c2440;}
    .spx-item-meta{font-size:11px;color:#9aa1b3;font-weight:600;margin-top:1px;}
    .spx-item-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
    .spx-flag{font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;}
    .spx-flag-dispensed{background:#e9f9f0;color:#0a8a52;}
    .spx-flag-pending{background:#fff4e5;color:#c56c05;}
    .spx-flag-active{background:#eaf1ff;color:#1d54c9;}
    .spx-chevron{color:#9aa1b3;font-size:11px;transition:transform .2s;}
    .spx-item.open .spx-chevron{transform:rotate(180deg);}

    .spx-item-detail{display:none;border-top:1px solid #eef0f6;padding:14px;}
    .spx-item.open .spx-item-detail{display:block;}

    .spx-wrap table.spx-table{width:100%;border-collapse:collapse;}
    .spx-wrap table.spx-table thead th{text-align:left;font-size:10.5px;letter-spacing:.03em;color:#9aa1b3;text-transform:uppercase;font-weight:700;padding:7px 6px;border-bottom:1px solid #eef0f6;}
    .spx-wrap table.spx-table tbody td{padding:9px 6px;border-bottom:1px solid #eef0f6;font-size:12px;color:#1c2440;font-weight:600;}
    .spx-wrap table.spx-table tbody tr:last-child td{border-bottom:none;}

    .spx-detail-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
    .spx-detail-btn{display:flex;align-items:center;gap:7px;border:1px solid #eef0f6;background:#fff;border-radius:9px;padding:8px 13px;font-size:11.5px;font-weight:700;color:#1c2440;cursor:pointer;}
    .spx-detail-btn:hover{border-color:#eaf1ff;color:#2f6fed;}
    .spx-detail-btn.refill{border-color:#eaf1ff;background:#eaf1ff;color:#2f6fed;}

    .spx-notes{background:#f4f6fb;border-radius:9px;padding:10px 12px;font-size:11.5px;color:#6b7280;font-weight:600;margin-top:10px;line-height:1.5;}
    .spx-notes b{color:#1c2440;}

    .spx-empty{padding:40px 10px;text-align:center;color:#9aa1b3;}
    .spx-empty i{font-size:26px;margin-bottom:10px;display:block;color:#9aa1b3;}
    .spx-empty div{font-size:12.5px;font-weight:600;}

    /* modals (appended to body, namespaced per instance) */
    .spx-modal-overlay{position:fixed;inset:0;background:rgba(15,20,40,0.45);display:none;align-items:center;justify-content:center;z-index:1900;padding:20px;}
    .spx-modal-overlay.open{display:flex;}
    .spx-modal-box{background:#fff;border-radius:16px;max-width:480px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(10,15,40,0.25);max-height:90vh;overflow-y:auto;font-family:inherit;color:#1c2440;}
    .spx-modal-box.wide{max-width:620px;}
    .spx-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
    .spx-modal-title{font-size:15px;font-weight:800;color:#1c2440;}
    .spx-modal-close{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;cursor:pointer;font-size:13px;flex-shrink:0;}
    .spx-modal-close:hover{background:#f4f6fb;}
    .spx-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;}

    .spx-form-group{margin-bottom:14px;}
    .spx-form-label{font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;display:block;}
    .spx-form-input,.spx-form-select{width:100%;border:1px solid #eef0f6;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;color:#1c2440;outline:none;background:#fff;}
    .spx-form-input:focus,.spx-form-select:focus{border-color:#2f6fed;}
    .spx-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .spx-med-row{display:grid;grid-template-columns:1.6fr 1fr 1.2fr .9fr auto;gap:8px;margin-bottom:8px;align-items:center;}
    .spx-med-row input{border:1px solid #eef0f6;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;}
    .spx-med-row input:focus{border-color:#2f6fed;}
    .spx-med-remove{width:28px;height:28px;border-radius:8px;border:1px solid #eef0f6;background:#fff;color:#f04438;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
    .spx-med-remove:hover{background:#feecec;}
    .spx-add-med-btn{display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:700;color:#2f6fed;cursor:pointer;margin-top:4px;}
    .spx-add-med-btn:hover{text-decoration:underline;}

    /* printable prescription preview / print document */
    .spx-doc{border:1px solid #eef0f6;border-radius:12px;padding:20px;}
    .spx-doc-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b1a4d;padding-bottom:14px;margin-bottom:14px;}
    .spx-doc-clinic{font-size:15px;font-weight:800;color:#0b1a4d;}
    .spx-doc-clinic-sub{font-size:10.5px;color:#9aa1b3;font-weight:600;margin-top:2px;}
    .spx-doc-no{text-align:right;font-size:11px;color:#6b7280;font-weight:700;}
    .spx-doc-no b{color:#1c2440;font-size:13px;}
    .spx-doc-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
    .spx-doc-meta-item{font-size:11.5px;}
    .spx-doc-meta-item span{display:block;font-size:9.5px;color:#9aa1b3;text-transform:uppercase;font-weight:800;letter-spacing:.03em;margin-bottom:2px;}
    .spx-doc-sign{margin-top:22px;display:flex;justify-content:space-between;align-items:flex-end;}
    .spx-doc-sign-line{border-top:1px solid #9aa1b3;padding-top:6px;font-size:11px;font-weight:700;color:#6b7280;min-width:180px;text-align:center;}

    @media (max-width:720px){
      .spx-stats{flex-direction:column;}
      .spx-item-meta{display:none;}
      .spx-form-row,.spx-doc-meta{grid-template-columns:1fr;}
      .spx-med-row{grid-template-columns:1fr;}
    }
  `;

  const DEFAULT_DOCTORS = ['Dr. Samuel O.', 'Dr. Amaka N.'];
  const DEFAULT_STATUSES = [
    { id: 'dispensed', label: 'Dispensed', cls: 'spx-flag-dispensed' },
    { id: 'pending', label: 'Pending Pickup', cls: 'spx-flag-pending' },
    { id: 'active', label: 'Active — Refillable', cls: 'spx-flag-active' }
  ];

  // ══════════════════════════════════════════════════════════════════════
  // Utils
  // ══════════════════════════════════════════════════════════════════════
  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function _toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    let el = document.getElementById('spxToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'spxToast';
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
    el.id = 'spx-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ── Shared, page-wide print infrastructure (one hidden area + one afterprint listener) ──
  let _printInfraReady = false;
  function _ensurePrintInfra() {
    if (_printInfraReady) return;
    _printInfraReady = true;

    const area = document.createElement('div');
    area.id = 'spxPrintArea';
    document.body.appendChild(area);

    const style = document.createElement('style');
    style.id = 'spx-print-styles';
    style.textContent = `
      #spxPrintArea{display:none;}
      body.spx-print-mode > *:not(#spxPrintArea){display:none !important;}
      body.spx-print-mode #spxPrintArea{display:block !important;padding:30px;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;}
    `;
    document.head.appendChild(style);

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('spx-print-mode');
      area.innerHTML = '';
    });
  }

  /** Renders `docHtml` into the shared print area and triggers a real browser print. */
  function _printDocument(docHtml) {
    _ensurePrintInfra();
    const area = document.getElementById('spxPrintArea');
    area.innerHTML = `<div class="spx-doc" style="border:none;">${docHtml}</div>`;
    document.body.classList.add('spx-print-mode');
    // Give the browser a tick to apply the print-mode layout before printing (helps Firefox/Safari).
    setTimeout(() => window.print(), 30);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Instance factory — each attach() call gets its own isolated state
  // ══════════════════════════════════════════════════════════════════════
  let _idCounter = 2000;
  let _numCounter = 60;
  let _instanceCounter = 0;

  function attach(target, options) {
    options = options || {};
    _injectStyles();
    _ensurePrintInfra();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) { console.warn('[ShilohRx] Target not found:', target); return null; }

    const instId = 'spx' + (++_instanceCounter);
    const DOCTORS = options.doctors || DEFAULT_DOCTORS;
    const STATUSES = options.statuses || DEFAULT_STATUSES;
    const STATUS_BY_ID = {}; STATUSES.forEach(s => { STATUS_BY_ID[s.id] = s; });

    const PATIENT_NAME = options.patientName || 'Patient';
    const CLINIC_NAME = options.clinicName || 'Shiloh Clinic & Maternity';
    const CLINIC_ADDRESS = options.clinicAddress || '12 Aba Road, Port Harcourt, Rivers State';
    const CLINIC_PHONE = options.clinicPhone || '+234 800 000 0000';

    function _fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

    function _normalize(p) {
      const ts = p.ts || Date.now();
      _numCounter++;
      return Object.assign({
        id: ++_idCounter,
        rxNo: 'RX-' + String(100000 + (_numCounter % 900000)).slice(-6),
        doctor: DOCTORS[0],
        status: STATUSES[0] ? STATUSES[0].id : '',
        ts, date: _fmtDate(ts),
        meds: [],
        notes: ''
      }, p);
    }

    let prescriptions = (options.prescriptions || []).map(_normalize);
    let state = { search: '', status: 'all', doctor: 'all' };
    let medRowCount = 0;

    // ── Build shell ──
    container.innerHTML = `
      <div class="spx-wrap" id="${instId}">
        <div class="spx-panel">
          <div class="spx-head">
            <div>
              <div class="spx-title">${_esc(options.title || 'Prescriptions')}</div>
              ${options.subtitle ? `<div class="spx-sub">${_esc(options.subtitle)}</div>` : ''}
            </div>
            <div class="spx-btn-primary" data-spx-newrx><i class="fa-solid fa-prescription"></i> New Prescription</div>
          </div>
          <div class="spx-stats" data-spx-stats></div>
          <div class="spx-filters">
            <div class="spx-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" data-spx-search placeholder="Search medication or prescription no…"></div>
            <select class="spx-select" data-spx-status>
              <option value="all">All Statuses</option>
              ${STATUSES.map(s => `<option value="${_esc(s.id)}">${_esc(s.label)}</option>`).join('')}
            </select>
            <select class="spx-select" data-spx-doctor>
              <option value="all">All Doctors</option>
              ${DOCTORS.map(d => `<option value="${_esc(d)}">${_esc(d)}</option>`).join('')}
            </select>
          </div>
          <div data-spx-list></div>
          <div class="spx-empty" data-spx-empty style="display:none;">
            <i class="fa-solid fa-prescription-bottle"></i><div>No prescriptions match your filters</div>
          </div>
        </div>
      </div>`;

    const root = container.querySelector('#' + instId);
    const statsEl = root.querySelector('[data-spx-stats]');
    const searchEl = root.querySelector('[data-spx-search]');
    const statusEl = root.querySelector('[data-spx-status]');
    const doctorEl = root.querySelector('[data-spx-doctor]');
    const listEl = root.querySelector('[data-spx-list]');
    const emptyEl = root.querySelector('[data-spx-empty]');
    const newRxTrig = root.querySelector('[data-spx-newrx]');

    // ── Modals (built once per instance, appended to <body>) ──
    const medRowsHeadHtml = `
      <div class="spx-med-row" style="margin-bottom:4px;">
        <span style="font-size:9.5px;color:#9aa1b3;font-weight:800;text-transform:uppercase;">Medication</span>
        <span style="font-size:9.5px;color:#9aa1b3;font-weight:800;text-transform:uppercase;">Dosage</span>
        <span style="font-size:9.5px;color:#9aa1b3;font-weight:800;text-transform:uppercase;">Frequency</span>
        <span style="font-size:9.5px;color:#9aa1b3;font-weight:800;text-transform:uppercase;">Duration</span>
        <span></span>
      </div>`;

    const modalsWrap = document.createElement('div');
    modalsWrap.innerHTML = `
      <div class="spx-modal-overlay" id="${instId}-new">
        <div class="spx-modal-box wide">
          <div class="spx-modal-head"><div class="spx-modal-title">New prescription</div>
            <div class="spx-modal-close" data-spx-close="${instId}-new"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="spx-form-row">
            <div class="spx-form-group"><label class="spx-form-label">Prescribing doctor</label>
              <select class="spx-form-select" id="${instId}-f-doctor">${DOCTORS.map(d => `<option>${_esc(d)}</option>`).join('')}</select></div>
            <div class="spx-form-group"><label class="spx-form-label">Status</label>
              <select class="spx-form-select" id="${instId}-f-status">${STATUSES.map(s => `<option value="${_esc(s.id)}">${_esc(s.label)}</option>`).join('')}</select></div>
          </div>
          <label class="spx-form-label">Medications</label>
          <div id="${instId}-med-rows-head">${medRowsHeadHtml}</div>
          <div id="${instId}-med-rows"></div>
          <div class="spx-add-med-btn" id="${instId}-add-med"><i class="fa-solid fa-plus"></i> Add another medication</div>
          <div class="spx-form-group" style="margin-top:14px;">
            <label class="spx-form-label">Notes (optional)</label>
            <input class="spx-form-input" id="${instId}-f-notes" placeholder="Instructions for patient or pharmacy…">
          </div>
          <div class="spx-modal-actions">
            <div class="spx-btn-secondary" data-spx-close="${instId}-new">Cancel</div>
            <div class="spx-btn-primary" id="${instId}-new-submit"><i class="fa-solid fa-check"></i> Save Prescription</div>
          </div>
        </div>
      </div>
      <div class="spx-modal-overlay" id="${instId}-view">
        <div class="spx-modal-box wide">
          <div class="spx-modal-head"><div class="spx-modal-title">Full Prescription</div>
            <div class="spx-modal-close" data-spx-close="${instId}-view"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="spx-doc" id="${instId}-view-doc"></div>
          <div class="spx-modal-actions">
            <div class="spx-btn-secondary" id="${instId}-view-print"><i class="fa-solid fa-print"></i> Print</div>
          </div>
        </div>
      </div>`;
    while (modalsWrap.firstChild) document.body.appendChild(modalsWrap.firstChild);

    function modal(id) { return document.getElementById(instId + '-' + id); }
    document.querySelectorAll('[data-spx-close]').forEach(btn => {
      if (!btn.dataset.spxClose.startsWith(instId)) return;
      btn.addEventListener('click', () => document.getElementById(btn.dataset.spxClose).classList.remove('open'));
    });
    ['new', 'view'].forEach(name => {
      const ov = modal(name);
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });

    // ── Filtering ──
    function getFiltered() {
      const q = state.search.trim().toLowerCase();
      return prescriptions.filter(p => {
        if (state.status !== 'all' && p.status !== state.status) return false;
        if (state.doctor !== 'all' && p.doctor !== state.doctor) return false;
        if (q) {
          const inNo = p.rxNo.toLowerCase().includes(q);
          const inMed = p.meds.some(m => (m.name || '').toLowerCase().includes(q));
          if (!inNo && !inMed) return false;
        }
        return true;
      }).sort((a, b) => b.ts - a.ts);
    }

    function renderStats() {
      const total = prescriptions.length;
      let html = `<div class="spx-stat"><div class="spx-stat-ic spx-ic-purple"><i class="fa-solid fa-prescription"></i></div>
        <div><div class="spx-stat-label">Total Prescriptions</div><div class="spx-stat-value">${total}</div></div></div>`;
      const iconMap = { dispensed: { ic: 'spx-ic-green', fa: 'fa-solid fa-circle-check' }, pending: { ic: 'spx-ic-orange', fa: 'fa-solid fa-hourglass-half' }, active: { ic: 'spx-ic-blue', fa: 'fa-solid fa-rotate' } };
      STATUSES.forEach(s => {
        const count = prescriptions.filter(p => p.status === s.id).length;
        const meta = iconMap[s.id] || { ic: 'spx-ic-purple', fa: 'fa-solid fa-circle' };
        html += `<div class="spx-stat"><div class="spx-stat-ic ${meta.ic}"><i class="${meta.fa}"></i></div>
          <div><div class="spx-stat-label">${_esc(s.label)}</div><div class="spx-stat-value">${count}</div></div></div>`;
      });
      statsEl.innerHTML = html;
    }

    function renderItem(p) {
      const meta = STATUS_BY_ID[p.status] || { label: p.status, cls: '' };
      const medsRows = p.meds.map(m => `
        <tr><td>${_esc(m.name)}</td><td>${_esc(m.dosage)}</td><td>${_esc(m.freq)}</td><td>${_esc(m.duration)}</td></tr>
      `).join('');
      let actionBtns = `<div class="spx-detail-btn" data-action="view" data-id="${p.id}"><i class="fa-regular fa-file-pdf"></i> View Full Prescription</div>`;
      if (p.status === 'pending') {
        actionBtns = `<div class="spx-detail-btn refill" data-action="dispense" data-id="${p.id}"><i class="fa-solid fa-basket-shopping"></i> Ready for Pharmacy Pickup</div>` + actionBtns;
      } else if (p.status === 'active') {
        actionBtns = `<div class="spx-detail-btn refill" data-action="refill" data-id="${p.id}"><i class="fa-solid fa-rotate"></i> Request Refill</div>` + actionBtns;
      }
      actionBtns += `<div class="spx-detail-btn" data-action="print" data-id="${p.id}"><i class="fa-solid fa-print"></i> Print</div>`;

      return `
        <div class="spx-item ${p.open ? 'open' : ''}" data-id="${p.id}">
          <div class="spx-item-head" data-toggle="${p.id}">
            <div class="spx-item-ic"><i class="fa-solid fa-pills"></i></div>
            <div class="spx-item-body">
              <div class="spx-item-name">${_esc(p.rxNo)}</div>
              <div class="spx-item-meta">Prescribed by ${_esc(p.doctor)} · ${_esc(p.date)}</div>
            </div>
            <div class="spx-item-right">
              <span class="spx-flag ${meta.cls}">${_esc(meta.label)}</span>
              <i class="fa-solid fa-chevron-down spx-chevron"></i>
            </div>
          </div>
          <div class="spx-item-detail">
            <table class="spx-table">
              <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
              <tbody>${medsRows}</tbody>
            </table>
            ${p.notes ? `<div class="spx-notes"><b>Notes:</b> ${_esc(p.notes)}</div>` : ''}
            <div class="spx-detail-actions">${actionBtns}</div>
          </div>
        </div>`;
    }

    function render() {
      renderStats();
      const filtered = getFiltered();
      listEl.innerHTML = filtered.map(renderItem).join('');
      emptyEl.style.display = filtered.length ? 'none' : 'block';
      attachListeners();
    }

    function attachListeners() {
      root.querySelectorAll('[data-toggle]').forEach(head => {
        head.addEventListener('click', () => {
          const id = Number(head.dataset.toggle);
          const p = prescriptions.find(x => x.id === id);
          p.open = !p.open;
          render();
        });
      });
      root.querySelectorAll('[data-action="view"]').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); openViewModal(Number(b.dataset.id)); });
      });
      root.querySelectorAll('[data-action="print"]').forEach(b => {
        b.addEventListener('click', e => { e.stopPropagation(); printPrescription(Number(b.dataset.id)); });
      });
      root.querySelectorAll('[data-action="dispense"]').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          const p = prescriptions.find(x => x.id === Number(b.dataset.id));
          p.status = 'dispensed';
          _toast(`${p.rxNo} marked as dispensed`);
          render();
          if (typeof options.onDispense === 'function') options.onDispense(p);
        });
      });
      root.querySelectorAll('[data-action="refill"]').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          const p = prescriptions.find(x => x.id === Number(b.dataset.id));
          p.status = 'pending';
          _toast(`Refill requested for ${p.rxNo} — sent to pharmacy`);
          render();
          if (typeof options.onRefill === 'function') options.onRefill(p);
        });
      });
    }

    // ── filters ──
    searchEl.addEventListener('input', e => { state.search = e.target.value; render(); });
    statusEl.addEventListener('change', e => { state.status = e.target.value; render(); });
    doctorEl.addEventListener('change', e => { state.doctor = e.target.value; render(); });

    // ── new prescription modal ──
    function medRowHtml(idx) {
      return `
        <div class="spx-med-row" data-med-row="${idx}">
          <input type="text" placeholder="e.g. Amlodipine 5mg" data-field="name">
          <input type="text" placeholder="e.g. 1 tablet" data-field="dosage">
          <input type="text" placeholder="e.g. Once daily" data-field="freq">
          <input type="text" placeholder="e.g. 30 days" data-field="duration">
          <div class="spx-med-remove" data-remove="${idx}"><i class="fa-solid fa-trash"></i></div>
        </div>`;
    }
    const medRowsEl = document.getElementById(instId + '-med-rows');
    function addMedRow() {
      medRowCount++;
      medRowsEl.insertAdjacentHTML('beforeend', medRowHtml(medRowCount));
      medRowsEl.querySelector(`[data-remove="${medRowCount}"]`).addEventListener('click', function () {
        const idx = this.dataset.remove;
        const row = medRowsEl.querySelector(`[data-med-row="${idx}"]`);
        if (medRowsEl.children.length > 1) row.remove();
        else _toast('At least one medication is required');
      });
    }
    function openNewRxModal() {
      document.getElementById(instId + '-f-doctor').value = DOCTORS[0];
      document.getElementById(instId + '-f-status').value = 'pending';
      document.getElementById(instId + '-f-notes').value = '';
      medRowsEl.innerHTML = '';
      medRowCount = 0;
      addMedRow();
      modal('new').classList.add('open');
    }
    newRxTrig.addEventListener('click', openNewRxModal);
    document.getElementById(instId + '-add-med').addEventListener('click', addMedRow);

    document.getElementById(instId + '-new-submit').addEventListener('click', () => {
      const rows = [...medRowsEl.querySelectorAll('[data-med-row]')];
      const meds = rows.map(r => ({
        name: r.querySelector('[data-field="name"]').value.trim(),
        dosage: r.querySelector('[data-field="dosage"]').value.trim(),
        freq: r.querySelector('[data-field="freq"]').value.trim(),
        duration: r.querySelector('[data-field="duration"]').value.trim()
      })).filter(m => m.name);

      if (meds.length === 0) { _toast('Add at least one medication with a name'); return; }

      const p = _normalize({
        doctor: document.getElementById(instId + '-f-doctor').value,
        status: document.getElementById(instId + '-f-status').value,
        ts: Date.now(),
        open: true,
        meds,
        notes: document.getElementById(instId + '-f-notes').value.trim()
      });
      prescriptions.unshift(p);
      modal('new').classList.remove('open');
      _toast('Prescription saved');
      render();
      if (typeof options.onSave === 'function') options.onSave(p);
    });

    // ── full prescription doc + print ──
    function docHtml(p) {
      const meta = STATUS_BY_ID[p.status] || { label: p.status, cls: '' };
      const medsRows = p.meds.map(m => `
        <tr><td>${_esc(m.name)}</td><td>${_esc(m.dosage)}</td><td>${_esc(m.freq)}</td><td>${_esc(m.duration)}</td></tr>
      `).join('');
      return `
        <div class="spx-doc-head">
          <div>
            <div class="spx-doc-clinic">${_esc(CLINIC_NAME)}</div>
            <div class="spx-doc-clinic-sub">${_esc(CLINIC_ADDRESS)} · ${_esc(CLINIC_PHONE)}</div>
          </div>
          <div class="spx-doc-no">Prescription No.<br><b>${_esc(p.rxNo)}</b></div>
        </div>
        <div class="spx-doc-meta">
          <div class="spx-doc-meta-item"><span>Patient</span>${_esc(PATIENT_NAME)}</div>
          <div class="spx-doc-meta-item"><span>Date issued</span>${_esc(p.date)}</div>
          <div class="spx-doc-meta-item"><span>Prescribing doctor</span>${_esc(p.doctor)}</div>
          <div class="spx-doc-meta-item"><span>Status</span><span class="spx-flag ${meta.cls}">${_esc(meta.label)}</span></div>
        </div>
        <table class="spx-table">
          <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
          <tbody>${medsRows}</tbody>
        </table>
        ${p.notes ? `<div class="spx-notes"><b>Notes:</b> ${_esc(p.notes)}</div>` : ''}
        <div class="spx-doc-sign">
          <div class="spx-doc-sign-line">${_esc(p.doctor)}</div>
          <div class="spx-doc-sign-line">Pharmacist signature</div>
        </div>`;
    }

    let currentViewId = null;
    function openViewModal(id) {
      const p = prescriptions.find(x => x.id === id);
      if (!p) return;
      currentViewId = id;
      document.getElementById(instId + '-view-doc').innerHTML = docHtml(p);
      modal('view').classList.add('open');
      if (typeof options.onView === 'function') options.onView(p);
    }
    document.getElementById(instId + '-view-print').addEventListener('click', () => printPrescription(currentViewId));

    function printPrescription(id) {
      const p = prescriptions.find(x => x.id === id);
      if (!p) return;
      if (typeof options.onPrint === 'function') { options.onPrint(p); return; }
      _printDocument(docHtml(p));
    }

    render();

    // ── Public control object ──
    return {
      setPrescriptions(list) { prescriptions = (list || []).map(_normalize); render(); },
      addPrescription(p) { const rx = _normalize(p || {}); prescriptions.unshift(rx); render(); return rx; },
      getPrescriptions() { return prescriptions; },
      print(id) { printPrescription(id); },
      destroy() {
        ['new', 'view'].forEach(name => { const m = modal(name); if (m) m.remove(); });
        container.innerHTML = '';
      }
    };
  }

  window.ShilohRx = { attach };

})();

/*─── USAGE ────────────────────────────────────────────────────────────────

  <div id="prescriptionsPlaceholder"></div>
  <script src="prescriptions.js"></script>
  <script>
    const rx = ShilohRx.attach('#prescriptionsPlaceholder', {
      patientName: 'Emeka Johnson',
      prescriptions: [
        {
          doctor: 'Dr. Samuel O.', status: 'dispensed', ts: Date.now() - 86400000,
          meds: [
            { name: 'Amlodipine 5mg', dosage: '1 tablet', freq: 'Once daily', duration: '30 days' },
            { name: 'Paracetamol 500mg', dosage: '2 tablets', freq: 'Every 6 hrs as needed', duration: '5 days' }
          ],
          notes: 'Take Amlodipine in the morning. Monitor blood pressure weekly.'
        },
        {
          doctor: 'Dr. Amaka N.', status: 'pending', ts: Date.now(),
          meds: [{ name: 'Folic Acid 5mg', dosage: '1 tablet', freq: 'Once daily', duration: '90 days' }]
        }
      ],
      onSave:     (p) => console.log('saved', p),
      onDispense: (p) => console.log('dispensed', p),
      onRefill:   (p) => console.log('refill requested', p),
      // onPrint is intentionally left out — printing works for real out of the box
    });
  </script>

── MULTIPLE INSTANCES ───────────────────────────────────────────────────────

  Every attach() call is fully isolated (its own state, its own modals,
  namespaced element ids) — attach as many as you like on the same page.
  All instances share one print area, so only one prescription prints at a time.

─────────────────────────────────────────────────────────────────────────*/