/**
 * documents-section.js — Droboard Reusable Documents Component (for patient profiles)
 * ─────────────────────────────────────────────────────────────────────────────────
 * Drop one <script src="documents-section.js"></script> in any page, then:
 *
 *   const ds = DroboardDocuments.attach('#documentsPlaceholder', {
 *     title: 'Documents',
 *     subtitle: 'Lab reports, prescriptions, imaging & ID files',
 *     documents: SEED_DOCS,          // optional initial data, see shape below
 *     categories: [                  // optional — omit to use the default clinic set
 *       { id:'lab',       label:'Lab Report',        icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-lab' },
 *       { id:'rx',        label:'Prescription',       icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-rx' },
 *       { id:'imaging',   label:'Imaging',            icon:'fa-solid fa-file-image', iconCls:'dds-ic-img', tagCls:'dds-cat-imaging' },
 *       { id:'insurance', label:'Insurance',          icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-insurance' },
 *       { id:'id',        label:'ID & Registration',  icon:'fa-solid fa-file-lines', iconCls:'dds-ic-doc', tagCls:'dds-cat-id' },
 *     ],
 *     categoryActions: {             // optional — extra per-category dropdown actions
 *       lab: [{ label:'Share with doctor', icon:'fa-solid fa-share' }],
 *     },
 *     pageSize: 8,
 *     defaultView: 'grid',           // 'grid' | 'list'
 *     defaultSort: 'newest',         // 'newest' | 'oldest' | 'name' | 'size'
 *
 *     onUpload:        (doc) => { ... your API call ... },
 *     onRename:        (doc, oldName, newName) => { ... },
 *     onMove:          (doc, oldCategory, newCategory) => { ... },
 *     onDelete:        (doc) => { ... },
 *     onView:          (doc) => { ... },              // fires when preview modal opens
 *     onDownload:      (doc) => { ... },               // fires after the file is saved
 *     onCategoryAction:(label, doc) => { ... },        // per-category dropdown extras
 *     getDownloadContent: (doc) => 'custom text…',     // override the placeholder file body
 *   });
 *
 *   ds.setDocuments(newList);   // replace all documents, re-render
 *   ds.addDocument({ name:'New Scan.jpg', category:'imaging', sizeKB:900 });
 *   ds.getDocuments();          // read current in-memory state
 *   ds.destroy();               // remove and clean up
 *
 * Document shape (any field can be omitted):
 *   {
 *     id,           // unique — auto-assigned if omitted
 *     name,         // file name shown on the card, e.g. "Full Blood Count Result.pdf"
 *     category,     // one of your categories[].id
 *     date,         // 'YYYY-MM-DD' — defaults to today if omitted
 *     sizeKB,       // number — defaults to a random demo size if omitted
 *     description,  // shown in the preview modal
 *   }
 *
 * This component does NOT know about your backend or real file storage. It keeps
 * its own in-memory document list (mutating what you pass in) and calls your hooks
 * so the host page can persist changes. "Download" saves a small placeholder text
 * file client-side via Blob so the action is real and testable without a server.
 *
 * ── LAYOUT ─────────────────────────────────────────────────────────────────────
 * Header (title + Upload button) → category chips with live counts → search /
 * sort / grid-list toggle → grid or list of document cards → pagination.
 *
 * ── CARD ACTIONS (3-dot menu) ───────────────────────────────────────────────────
 * Every document gets: View / Preview, Download, Rename, Move, Delete — plus
 * any `categoryActions` registered for its category, appended below a divider.
 * Category actions are demo-only by default (they just toast + call
 * `onCategoryAction`) since they depend entirely on what the host app means by
 * "Refill prescription" or "Share with doctor".
 *
 * ── MODALS ───────────────────────────────────────────────────────────────────────
 * Upload / Rename / Move / Preview are built once per instance and appended to
 * <body> (so they render above everything regardless of where the placeholder
 * div sits), namespaced by instance id so multiple instances never collide.
 *
 * ── FILTER + SORT + PAGINATION ─────────────────────────────────────────────────
 * Search matches name, category label and description. Sort: Newest/Oldest
 * (by date), Name (A–Z), or File Size (largest first). Category chips filter
 * in addition to search. Results are paged at `pageSize` (default 8).
 */

(function () {
  'use strict';

  if (window.__droboardDocumentSection) return;
  window.__droboardDocumentSection = true;

  // ══════════════════════════════════════════════════════════════════════
  // CSS  (dds- prefixed, self-contained)
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .dds-wrap{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#1c2440;font-size:13px;}
    .dds-panel{background:#fff;border:1px solid #eef0f6;border-radius:14px;padding:18px 20px;}
    .dds-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px;flex-wrap:wrap;}
    .dds-title{font-size:15px;font-weight:800;color:#1c2440;}
    .dds-sub{font-size:11.5px;color:#9aa1b3;font-weight:600;margin-top:2px;}
    .dds-btn-primary{display:flex;align-items:center;gap:8px;background:#2f6fed;border:1px solid #2f6fed;border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;cursor:pointer;box-shadow:0 4px 10px rgba(47,111,237,0.28);}
    .dds-btn-primary:hover{background:#2660d6;}
    .dds-btn-secondary{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eef0f6;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;color:#6b7280;white-space:nowrap;cursor:pointer;}
    .dds-btn-secondary:hover{background:#f4f6fb;color:#1c2440;}

    .dds-cats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;}
    .dds-cat-chip{display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;font-size:11.5px;font-weight:700;border:1.5px solid #eef0f6;color:#6b7280;cursor:pointer;white-space:nowrap;background:#fff;}
    .dds-cat-chip.on{background:#2f6fed;border-color:#2f6fed;color:#fff;}
    .dds-cat-chip .dds-cat-count{font-size:10px;font-weight:700;opacity:.75;}

    .dds-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;}
    .dds-search{display:flex;align-items:center;gap:8px;background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;flex:1;min-width:200px;}
    .dds-search i{color:#9aa1b3;font-size:12px;}
    .dds-search input{border:none;background:transparent;outline:none;font-size:12.5px;color:#1c2440;width:100%;font-family:inherit;}
    .dds-search input::placeholder{color:#9aa1b3;}
    .dds-select{background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:600;color:#1c2440;cursor:pointer;font-family:inherit;}
    .dds-viewtoggle{display:flex;align-items:center;gap:2px;background:#f4f6fb;border:1px solid #eef0f6;border-radius:10px;padding:3px;}
    .dds-viewtoggle-btn{width:30px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#6b7280;cursor:pointer;}
    .dds-viewtoggle-btn.on{background:#fff;color:#2f6fed;box-shadow:0 1px 4px rgba(0,0,0,.08);}

    .dds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;}
    .dds-grid.hide{display:none;}
    .dds-card{border:1px solid #eef0f6;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;transition:.15s;position:relative;}
    .dds-card:hover{border-color:#eaf1ff;box-shadow:0 4px 14px rgba(47,111,237,0.08);}
    .dds-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
    .dds-file-ic{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
    .dds-ic-pdf{background:#feecec;color:#f04438;}
    .dds-ic-img{background:#eaf1ff;color:#2f6fed;}
    .dds-ic-doc{background:#f4efff;color:#8b5cf6;}
    .dds-file-name{font-size:12.5px;font-weight:700;color:#1c2440;line-height:1.35;word-break:break-word;}
    .dds-file-meta{font-size:10.5px;color:#9aa1b3;font-weight:600;}
    .dds-cat-tag{font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:6px;display:inline-block;width:fit-content;}
    .dds-cat-lab{background:#eaf1ff;color:#1d54c9;}
    .dds-cat-rx{background:#e9f9f0;color:#0a8a52;}
    .dds-cat-id{background:#f4efff;color:#6b3fd6;}
    .dds-cat-insurance{background:#fff4e5;color:#c56c05;}
    .dds-cat-imaging{background:#fdeefa;color:#c2299c;}

    .dds-menu-btn{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#9aa1b3;font-size:12px;flex-shrink:0;cursor:pointer;position:relative;}
    .dds-menu-btn:hover{background:#f4f6fb;color:#1c2440;}
    .dds-dropdown{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:1px solid #eef0f6;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:190px;display:none;z-index:100;padding:4px 0;}
    .dds-dropdown.show{display:block;}
    .dds-dropdown-item{display:flex;align-items:center;gap:10px;padding:8px 14px;font-size:12px;font-weight:600;color:#1c2440;cursor:pointer;border:none;background:transparent;width:100%;font-family:inherit;text-align:left;}
    .dds-dropdown-item:hover{background:#f4f6fb;}
    .dds-dropdown-item i{width:16px;font-size:12px;color:#6b7280;}
    .dds-dropdown-divider{height:1px;background:#eef0f6;margin:4px 8px;}
    .dds-dropdown-item.danger{color:#f04438;}
    .dds-dropdown-item.danger i{color:#f04438;}

    .dds-list{display:none;flex-direction:column;}
    .dds-list.show{display:flex;}
    .dds-row{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid #eef0f6;position:relative;}
    .dds-row:last-child{border-bottom:none;}
    .dds-row .dds-file-ic{width:34px;height:34px;font-size:13px;border-radius:8px;}
    .dds-row-name{flex:1;min-width:0;}
    .dds-row-meta{font-size:10.5px;color:#9aa1b3;font-weight:600;}
    .dds-row-size{font-size:11.5px;color:#6b7280;font-weight:600;width:70px;text-align:right;flex-shrink:0;}
    .dds-row-date{font-size:11.5px;color:#6b7280;font-weight:600;width:100px;text-align:right;flex-shrink:0;}

    .dds-empty{padding:44px 10px;text-align:center;color:#9aa1b3;}
    .dds-empty i{font-size:26px;margin-bottom:10px;display:block;color:#9aa1b3;}
    .dds-empty div{font-size:12.5px;font-weight:600;}

    .dds-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:16px;border-top:1px solid #eef0f6;flex-wrap:wrap;}
    .dds-page-info{font-size:11.5px;color:#9aa1b3;font-weight:600;}
    .dds-page-controls{display:flex;align-items:center;gap:6px;}
    .dds-page-btn{width:30px;height:30px;border-radius:8px;border:1px solid #eef0f6;background:#fff;color:#6b7280;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .dds-page-btn:hover:not(:disabled){border-color:#2f6fed;color:#2f6fed;}
    .dds-page-btn:disabled{opacity:.4;cursor:not-allowed;}
    .dds-page-btn.on{background:#2f6fed;border-color:#2f6fed;color:#fff;}

    /* modals (appended to body, namespaced per instance) */
    .dds-modal-overlay{position:fixed;inset:0;background:rgba(15,20,40,0.45);display:none;align-items:center;justify-content:center;z-index:1900;padding:20px;}
    .dds-modal-overlay.open{display:flex;}
    .dds-modal-box{background:#fff;border-radius:16px;max-width:480px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(10,15,40,0.25);max-height:90vh;overflow-y:auto;font-family:inherit;color:#1c2440;}
    .dds-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
    .dds-modal-title{font-size:15px;font-weight:800;color:#1c2440;}
    .dds-modal-close{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;cursor:pointer;font-size:13px;flex-shrink:0;}
    .dds-modal-close:hover{background:#f4f6fb;}
    .dds-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;}
    .dds-form-group{margin-bottom:14px;}
    .dds-form-label{font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;display:block;}
    .dds-form-input,.dds-form-select,.dds-form-textarea{width:100%;border:1px solid #eef0f6;border-radius:10px;padding:10px 12px;font-family:inherit;font-size:12.5px;color:#1c2440;outline:none;background:#fff;}
    .dds-form-textarea{resize:vertical;min-height:60px;}
    .dds-form-input:focus,.dds-form-select:focus,.dds-form-textarea:focus{border-color:#2f6fed;}
    .dds-preview-box{margin-top:6px;padding:22px;background:#f4f6fb;border-radius:10px;text-align:center;color:#9aa1b3;}
    .dds-preview-box i{font-size:42px;display:block;margin-bottom:10px;}
    .dds-preview-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
    .dds-preview-meta-item{font-size:11.5px;}
    .dds-preview-meta-item span{display:block;font-size:9.5px;color:#9aa1b3;text-transform:uppercase;font-weight:800;letter-spacing:.03em;margin-bottom:2px;}
    .dds-preview-desc{font-size:12px;color:#6b7280;line-height:1.5;margin-bottom:8px;}

    @media (max-width:720px){
      .dds-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));}
      .dds-row-date{display:none;}
      .dds-preview-meta-grid{grid-template-columns:1fr;}
    }
  `;

  const DEFAULT_CATEGORIES = [
    { id:'lab',       label:'Lab Report',        icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-lab' },
    { id:'rx',        label:'Prescription',      icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-rx' },
    { id:'imaging',   label:'Imaging',           icon:'fa-solid fa-file-image', iconCls:'dds-ic-img', tagCls:'dds-cat-imaging' },
    { id:'insurance', label:'Insurance',         icon:'fa-solid fa-file-pdf',   iconCls:'dds-ic-pdf', tagCls:'dds-cat-insurance' },
    { id:'id',        label:'ID & Registration', icon:'fa-solid fa-file-lines',iconCls:'dds-ic-doc', tagCls:'dds-cat-id' }
  ];
  const DEFAULT_CATEGORY_ACTIONS = {
    lab: [
      { label:'Share with doctor', icon:'fa-solid fa-share' },
      { label:'Add to visit notes', icon:'fa-solid fa-note-sticky' }
    ],
    rx: [
      { label:'Refill prescription', icon:'fa-solid fa-rotate' },
      { label:'Print prescription', icon:'fa-solid fa-print' }
    ],
    imaging: [
      { label:'View DICOM', icon:'fa-solid fa-eye' },
      { label:'Add to imaging history', icon:'fa-solid fa-clock-rotate-left' }
    ],
    insurance: [
      { label:'Update coverage', icon:'fa-solid fa-pen' },
      { label:'View policy details', icon:'fa-solid fa-file-contract' }
    ],
    id: [
      { label:'Set as primary ID', icon:'fa-solid fa-star' },
      { label:'Verify document', icon:'fa-solid fa-check-circle' }
    ]
  };

  // ══════════════════════════════════════════════════════════════════════
  // Utils
  // ══════════════════════════════════════════════════════════════════════
  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _escAttr(s) { return _esc(s).replace(/"/g, '&quot;'); }
  function _toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    let el = document.getElementById('ddsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ddsToast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#0b1a4d;color:#fff;padding:11px 20px;border-radius:10px;font-size:12.5px;font-weight:700;box-shadow:0 10px 30px rgba(10,15,40,0.3);opacity:0;pointer-events:none;transition:.22s;z-index:2100;font-family:\'Segoe UI\',sans-serif;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)'; }, 1800);
  }
  function _sizeLabel(kb) { return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'; }
  function _dateLabel(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function _todayIso() { return new Date().toISOString().slice(0, 10); }

  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const el = document.createElement('style');
    el.id = 'dds-styles';
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
    if (!container) { console.warn('[DroboardDocuments] Target not found:', target); return null; }

    const instId = 'dds' + (++_instanceCounter);
    const CATEGORIES = options.categories || DEFAULT_CATEGORIES;
    const CAT_BY_ID = {};
    CATEGORIES.forEach(c => { CAT_BY_ID[c.id] = c; });
    const CATEGORY_ACTIONS = options.categoryActions || DEFAULT_CATEGORY_ACTIONS;
    const PAGE_SIZE = options.pageSize || 8;

    function _normalize(d) {
      return Object.assign({
        id: ++_idCounter,
        name: 'Untitled document',
        category: CATEGORIES[0] ? CATEGORIES[0].id : 'lab',
        date: _todayIso(),
        sizeKB: 80 + Math.floor(Math.random() * 420),
        description: ''
      }, d);
    }

    let documents = (options.documents || []).map(_normalize);
    let state = { search: '', category: 'all', sort: options.defaultSort || 'newest', view: options.defaultView || 'grid', page: 1, openMenuId: null };

    // ── Build shell ──
    container.innerHTML = `
      <div class="dds-wrap" id="${instId}">
        <div class="dds-panel">
          <div class="dds-head">
            <div>
              <div class="dds-title">${_esc(options.title || 'Documents')}</div>
              ${options.subtitle ? `<div class="dds-sub">${_esc(options.subtitle)}</div>` : ''}
            </div>
            <div class="dds-btn-primary" data-dds-upload><i class="fa-solid fa-upload"></i> Upload Document</div>
          </div>
          <div class="dds-cats" data-dds-cats></div>
          <div class="dds-filters">
            <div class="dds-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" data-dds-search placeholder="Search documents…">
            </div>
            <select class="dds-select" data-dds-sort>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A–Z)</option>
              <option value="size">File Size</option>
            </select>
            <div class="dds-viewtoggle">
              <div class="dds-viewtoggle-btn on" data-dds-view="grid"><i class="fa-solid fa-grip"></i></div>
              <div class="dds-viewtoggle-btn" data-dds-view="list"><i class="fa-solid fa-list"></i></div>
            </div>
          </div>
          <div class="dds-grid" data-dds-grid></div>
          <div class="dds-list" data-dds-list></div>
          <div class="dds-empty" data-dds-empty style="display:none;">
            <i class="fa-regular fa-folder-open"></i>
            <div>No documents match your filters</div>
          </div>
          <div class="dds-pagination" data-dds-pagination>
            <div class="dds-page-info" data-dds-pageinfo></div>
            <div class="dds-page-controls" data-dds-pagecontrols></div>
          </div>
        </div>
      </div>`;

    const root       = container.querySelector('#' + instId);
    const catsEl     = root.querySelector('[data-dds-cats]');
    const searchEl   = root.querySelector('[data-dds-search]');
    const sortEl     = root.querySelector('[data-dds-sort]');
    const gridEl     = root.querySelector('[data-dds-grid]');
    const listEl     = root.querySelector('[data-dds-list]');
    const emptyEl    = root.querySelector('[data-dds-empty]');
    const pagBarEl   = root.querySelector('[data-dds-pagination]');
    const pageInfoEl = root.querySelector('[data-dds-pageinfo]');
    const pageCtrlEl = root.querySelector('[data-dds-pagecontrols]');
    const uploadTrig = root.querySelector('[data-dds-upload]');

    // ── Modals (built once per instance, appended to <body>) ──
    const modalsWrap = document.createElement('div');
    modalsWrap.innerHTML = `
      <div class="dds-modal-overlay" id="${instId}-upload">
        <div class="dds-modal-box">
          <div class="dds-modal-head"><div class="dds-modal-title">Upload a document</div>
            <div class="dds-modal-close" data-dds-close="${instId}-upload"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="dds-form-group"><label class="dds-form-label">File name</label>
            <input class="dds-form-input" id="${instId}-f-name" placeholder="e.g. Ultrasound Scan.jpg"></div>
          <div class="dds-form-group"><label class="dds-form-label">Category</label>
            <select class="dds-form-select" id="${instId}-f-category">${CATEGORIES.map(c => `<option value="${c.id}">${_esc(c.label)}</option>`).join('')}</select></div>
          <div class="dds-form-group"><label class="dds-form-label">Description (optional)</label>
            <textarea class="dds-form-textarea" id="${instId}-f-desc" placeholder="Short note about this file…"></textarea></div>
          <div class="dds-modal-actions">
            <div class="dds-btn-secondary" data-dds-close="${instId}-upload">Cancel</div>
            <div class="dds-btn-primary" id="${instId}-upload-submit"><i class="fa-solid fa-check"></i> Upload</div>
          </div>
        </div>
      </div>
      <div class="dds-modal-overlay" id="${instId}-rename">
        <div class="dds-modal-box">
          <div class="dds-modal-head"><div class="dds-modal-title">Rename document</div>
            <div class="dds-modal-close" data-dds-close="${instId}-rename"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="dds-form-group"><label class="dds-form-label">File name</label>
            <input class="dds-form-input" id="${instId}-rename-value"></div>
          <div class="dds-modal-actions">
            <div class="dds-btn-secondary" data-dds-close="${instId}-rename">Cancel</div>
            <div class="dds-btn-primary" id="${instId}-rename-submit"><i class="fa-solid fa-check"></i> Save</div>
          </div>
        </div>
      </div>
      <div class="dds-modal-overlay" id="${instId}-move">
        <div class="dds-modal-box">
          <div class="dds-modal-head"><div class="dds-modal-title">Move document</div>
            <div class="dds-modal-close" data-dds-close="${instId}-move"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="dds-form-group"><label class="dds-form-label">Move to category</label>
            <select class="dds-form-select" id="${instId}-move-category">${CATEGORIES.map(c => `<option value="${c.id}">${_esc(c.label)}</option>`).join('')}</select></div>
          <div class="dds-modal-actions">
            <div class="dds-btn-secondary" data-dds-close="${instId}-move">Cancel</div>
            <div class="dds-btn-primary" id="${instId}-move-submit"><i class="fa-solid fa-check"></i> Move</div>
          </div>
        </div>
      </div>
      <div class="dds-modal-overlay" id="${instId}-preview">
        <div class="dds-modal-box">
          <div class="dds-modal-head"><div class="dds-modal-title" id="${instId}-preview-title">Document Preview</div>
            <div class="dds-modal-close" data-dds-close="${instId}-preview"><i class="fa-solid fa-xmark"></i></div></div>
          <div class="dds-preview-meta-grid" id="${instId}-preview-meta"></div>
          <div class="dds-preview-desc" id="${instId}-preview-desc"></div>
          <div class="dds-preview-box" id="${instId}-preview-box"></div>
          <div class="dds-modal-actions">
            <div class="dds-btn-secondary" id="${instId}-preview-download"><i class="fa-solid fa-download"></i> Download</div>
          </div>
        </div>
      </div>`;
    while (modalsWrap.firstChild) document.body.appendChild(modalsWrap.firstChild);

    function modal(id) { return document.getElementById(instId + '-' + id); }
    document.querySelectorAll('[data-dds-close]').forEach(btn => {
      if (!btn.dataset.ddsClose.startsWith(instId)) return;
      btn.addEventListener('click', () => document.getElementById(btn.dataset.ddsClose).classList.remove('open'));
    });
    ['upload', 'rename', 'move', 'preview'].forEach(name => {
      const ov = modal(name);
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });

    // ── Filtering / sorting ──
    function getFiltered() {
      const q = state.search.trim().toLowerCase();
      let list = documents.filter(d => {
        if (state.category !== 'all' && d.category !== state.category) return false;
        if (q) {
          const meta = CAT_BY_ID[d.category] || {};
          const hay = (d.name + ' ' + (meta.label || '') + ' ' + (d.description || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      list = list.slice().sort((a, b) => {
        if (state.sort === 'newest') return b.date.localeCompare(a.date) || b.id - a.id;
        if (state.sort === 'oldest') return a.date.localeCompare(b.date) || a.id - b.id;
        if (state.sort === 'name') return a.name.localeCompare(b.name);
        if (state.sort === 'size') return b.sizeKB - a.sizeKB;
        return 0;
      });
      return list;
    }

    function renderCatChips() {
      const chips = [{ id: 'all', label: 'All' }].concat(CATEGORIES.map(c => ({ id: c.id, label: c.label })));
      catsEl.innerHTML = chips.map(c => {
        const count = c.id === 'all' ? documents.length : documents.filter(d => d.category === c.id).length;
        return `<div class="dds-cat-chip${state.category === c.id ? ' on' : ''}" data-cat="${c.id}">${_esc(c.label)} <span class="dds-cat-count">${count}</span></div>`;
      }).join('');
      catsEl.querySelectorAll('.dds-cat-chip').forEach(chip => {
        chip.addEventListener('click', () => { state.category = chip.dataset.cat; state.page = 1; render(); });
      });
    }

    function dropdownHtml(doc) {
      const common = [
        { action: 'view', label: 'View / Preview', icon: 'fa-solid fa-eye' },
        { action: 'download', label: 'Download', icon: 'fa-solid fa-download' },
        { action: 'rename', label: 'Rename', icon: 'fa-solid fa-pen' },
        { action: 'move', label: 'Move', icon: 'fa-solid fa-folder-open' },
        { action: 'delete', label: 'Delete', icon: 'fa-solid fa-trash-can', danger: true }
      ];
      const catActions = (CATEGORY_ACTIONS[doc.category] || []).map(a => ({ action: 'cat:' + a.label, label: a.label, icon: a.icon }));
      let html = common.map(a => `<button class="dds-dropdown-item${a.danger ? ' danger' : ''}" data-action="${a.action}" data-id="${doc.id}"><i class="${a.icon}"></i> ${_esc(a.label)}</button>`).join('');
      if (catActions.length) {
        html += '<div class="dds-dropdown-divider"></div>';
        html += catActions.map(a => `<button class="dds-dropdown-item" data-action="${_escAttr(a.action)}" data-id="${doc.id}"><i class="${a.icon}"></i> ${_esc(a.label)}</button>`).join('');
      }
      return html;
    }

    function cardHtml(doc) {
      const meta = CAT_BY_ID[doc.category] || {};
      return `
        <div class="dds-card" data-id="${doc.id}">
          <div class="dds-card-top">
            <div class="dds-file-ic ${meta.iconCls || ''}"><i class="${meta.icon || 'fa-solid fa-file'}"></i></div>
            <div class="dds-menu-btn" data-menu-id="${doc.id}">
              <i class="fa-solid fa-ellipsis-vertical"></i>
              <div class="dds-dropdown ${state.openMenuId === doc.id ? 'show' : ''}">${dropdownHtml(doc)}</div>
            </div>
          </div>
          <div>
            <div class="dds-file-name">${_esc(doc.name)}</div>
            <div class="dds-file-meta">${_dateLabel(doc.date)} · ${_sizeLabel(doc.sizeKB)}</div>
          </div>
          <span class="dds-cat-tag ${meta.tagCls || ''}">${_esc(meta.label || doc.category)}</span>
        </div>`;
    }

    function rowHtml(doc) {
      const meta = CAT_BY_ID[doc.category] || {};
      return `
        <div class="dds-row" data-id="${doc.id}">
          <div class="dds-file-ic ${meta.iconCls || ''}"><i class="${meta.icon || 'fa-solid fa-file'}"></i></div>
          <div class="dds-row-name">
            <div class="dds-file-name">${_esc(doc.name)}</div>
            <div class="dds-row-meta">${_esc(meta.label || doc.category)}</div>
          </div>
          <div class="dds-row-size">${_sizeLabel(doc.sizeKB)}</div>
          <div class="dds-row-date">${_dateLabel(doc.date)}</div>
          <div class="dds-menu-btn" data-menu-id="${doc.id}">
            <i class="fa-solid fa-ellipsis-vertical"></i>
            <div class="dds-dropdown ${state.openMenuId === doc.id ? 'show' : ''}">${dropdownHtml(doc)}</div>
          </div>
        </div>`;
    }

    function render() {
      renderCatChips();
      const filtered = getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      if (state.page < 1) state.page = 1;
      const start = (state.page - 1) * PAGE_SIZE;
      const pageItems = filtered.slice(start, start + PAGE_SIZE);

      gridEl.innerHTML = pageItems.map(cardHtml).join('');
      listEl.innerHTML = pageItems.map(rowHtml).join('');
      gridEl.classList.toggle('hide', state.view !== 'grid');
      listEl.classList.toggle('show', state.view === 'list');
      emptyEl.style.display = filtered.length ? 'none' : 'block';

      if (filtered.length === 0) {
        pagBarEl.style.display = 'none';
      } else {
        pagBarEl.style.display = 'flex';
        const from = start + 1, to = Math.min(start + PAGE_SIZE, filtered.length);
        pageInfoEl.textContent = `Showing ${from}–${to} of ${filtered.length} document${filtered.length === 1 ? '' : 's'}`;
        let btns = `<div class="dds-page-btn" data-prev ${state.page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></div>`;
        for (let p = 1; p <= totalPages; p++) btns += `<div class="dds-page-btn ${p === state.page ? 'on' : ''}" data-page="${p}">${p}</div>`;
        btns += `<div class="dds-page-btn" data-next ${state.page === totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></div>`;
        pageCtrlEl.innerHTML = btns;
      }
      attachRowListeners();
    }

    function attachRowListeners() {
      root.querySelectorAll('[data-menu-id]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(btn.dataset.menuId);
          state.openMenuId = state.openMenuId === id ? null : id;
          render();
        });
      });
      root.querySelectorAll('.dds-dropdown-item').forEach(item => {
        item.addEventListener('click', e => {
          e.stopPropagation();
          const id = Number(item.dataset.id);
          const action = item.dataset.action;
          state.openMenuId = null;
          handleAction(action, id);
        });
      });
      pageCtrlEl.querySelectorAll('[data-page]').forEach(b => {
        b.addEventListener('click', () => { state.page = Number(b.dataset.page); render(); });
      });
      const prev = pageCtrlEl.querySelector('[data-prev]');
      const next = pageCtrlEl.querySelector('[data-next]');
      if (prev) prev.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
      if (next) next.addEventListener('click', () => { state.page++; render(); });
    }

    document.addEventListener('click', () => {
      if (state.openMenuId !== null) { state.openMenuId = null; render(); }
    });

    function handleAction(action, id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      if (action === 'view') return openPreview(id);
      if (action === 'download') return downloadDoc(id);
      if (action === 'rename') return openRenameModal(id);
      if (action === 'move') return openMoveModal(id);
      if (action === 'delete') return deleteDoc(id);
      if (action.indexOf('cat:') === 0) {
        const label = action.slice(4);
        _toast(`${label} — ${doc.name}`);
        if (typeof options.onCategoryAction === 'function') options.onCategoryAction(label, doc);
        return;
      }
    }

    // ── filters ──
    searchEl.addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });
    sortEl.addEventListener('change', e => { state.sort = e.target.value; state.page = 1; render(); });
    sortEl.value = state.sort;
    root.querySelectorAll('[data-dds-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-dds-view]').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        state.view = btn.dataset.ddsView;
        render();
      });
    });

    // ── upload ──
    function openUploadModal() {
      document.getElementById(instId + '-f-name').value = '';
      document.getElementById(instId + '-f-category').value = CATEGORIES[0] ? CATEGORIES[0].id : '';
      document.getElementById(instId + '-f-desc').value = '';
      modal('upload').classList.add('open');
    }
    uploadTrig.addEventListener('click', openUploadModal);
    document.getElementById(instId + '-upload-submit').addEventListener('click', () => {
      const name = document.getElementById(instId + '-f-name').value.trim();
      if (!name) { _toast('Please enter a file name'); return; }
      const doc = _normalize({
        name,
        category: document.getElementById(instId + '-f-category').value,
        date: _todayIso(),
        sizeKB: 80 + Math.floor(Math.random() * 420),
        description: document.getElementById(instId + '-f-desc').value.trim() || 'No description provided.'
      });
      documents.unshift(doc);
      modal('upload').classList.remove('open');
      state.category = 'all';
      state.page = 1;
      _toast('Document uploaded');
      render();
      if (typeof options.onUpload === 'function') options.onUpload(doc);
    });

    // ── rename ──
    let renameTargetId = null;
    function openRenameModal(id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      renameTargetId = id;
      document.getElementById(instId + '-rename-value').value = doc.name;
      modal('rename').classList.add('open');
    }
    document.getElementById(instId + '-rename-submit').addEventListener('click', () => {
      const doc = documents.find(d => d.id === renameTargetId);
      const val = document.getElementById(instId + '-rename-value').value.trim();
      if (!doc || !val) { _toast('Please enter a file name'); return; }
      const oldName = doc.name;
      doc.name = val;
      modal('rename').classList.remove('open');
      _toast('Document renamed');
      render();
      if (typeof options.onRename === 'function') options.onRename(doc, oldName, val);
    });

    // ── move ──
    let moveTargetId = null;
    function openMoveModal(id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      moveTargetId = id;
      document.getElementById(instId + '-move-category').value = doc.category;
      modal('move').classList.add('open');
    }
    document.getElementById(instId + '-move-submit').addEventListener('click', () => {
      const doc = documents.find(d => d.id === moveTargetId);
      if (!doc) return;
      const oldCategory = doc.category;
      doc.category = document.getElementById(instId + '-move-category').value;
      modal('move').classList.remove('open');
      _toast('Moved to ' + (CAT_BY_ID[doc.category] || {}).label);
      render();
      if (typeof options.onMove === 'function') options.onMove(doc, oldCategory, doc.category);
    });

    // ── delete ──
    function deleteDoc(id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      if (!confirm(`Delete "${doc.name}"? This can't be undone.`)) return;
      documents = documents.filter(d => d.id !== id);
      _toast('Document deleted');
      render();
      if (typeof options.onDelete === 'function') options.onDelete(doc);
    }

    // ── preview ──
    function openPreview(id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      const meta = CAT_BY_ID[doc.category] || {};
      document.getElementById(instId + '-preview-title').textContent = doc.name;
      document.getElementById(instId + '-preview-meta').innerHTML = `
        <div class="dds-preview-meta-item"><span>Category</span><span class="dds-cat-tag ${meta.tagCls || ''}">${_esc(meta.label || doc.category)}</span></div>
        <div class="dds-preview-meta-item"><span>Date</span>${_dateLabel(doc.date)}</div>
        <div class="dds-preview-meta-item"><span>Size</span>${_sizeLabel(doc.sizeKB)}</div>
        <div class="dds-preview-meta-item"><span>File</span>${_esc(doc.name)}</div>`;
      document.getElementById(instId + '-preview-desc').textContent = doc.description || '';
      document.getElementById(instId + '-preview-box').innerHTML = `<i class="${meta.icon || 'fa-solid fa-file'}"></i><div>Preview would display the actual document content here.</div>`;
      modal('preview').classList.add('open');
      if (typeof options.onView === 'function') options.onView(doc);
    }
    document.getElementById(instId + '-preview-download').addEventListener('click', () => {
      const title = document.getElementById(instId + '-preview-title').textContent;
      const doc = documents.find(d => d.name === title);
      if (doc) downloadDoc(doc.id);
    });

    // ── download (client-side placeholder file) ──
    function downloadDoc(id) {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;
      const meta = CAT_BY_ID[doc.category] || {};
      const content = typeof options.getDownloadContent === 'function'
        ? options.getDownloadContent(doc)
        : `Document: ${doc.name}\nCategory: ${meta.label || doc.category}\nDate: ${_dateLabel(doc.date)}\nSize: ${_sizeLabel(doc.sizeKB)}\n\n${doc.description || ''}\n\n(This is a placeholder file for demo purposes.)`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      _toast('Downloaded ' + doc.name);
      if (typeof options.onDownload === 'function') options.onDownload(doc);
    }

    render();

    // ── Public control object ──
    return {
      setDocuments(list) { documents = (list || []).map(_normalize); state.page = 1; render(); },
      addDocument(doc) { const d = _normalize(doc || {}); documents.unshift(d); render(); return d; },
      getDocuments() { return documents; },
      destroy() {
        ['upload', 'rename', 'move', 'preview'].forEach(name => { const m = modal(name); if (m) m.remove(); });
        container.innerHTML = '';
      }
    };
  }

  window.DroboardDocuments = { attach };

})();

/*─── USAGE ────────────────────────────────────────────────────────────────

  <div id="documentsPlaceholder"></div>
  <script src="documents-section.js"></script>
  <script>
    const SEED_DOCS = [
      { name:'Full Blood Count Result.pdf', category:'lab', date:'2025-05-16', sizeKB:240, description:'Complete blood count with differential.' },
      { name:'Prescription — RX-000067.pdf', category:'rx', date:'2025-05-16', sizeKB:98, description:'Amlodipine 5mg, 30-day supply.' },
      { name:'Chest X-Ray Scan.jpg', category:'imaging', date:'2025-04-28', sizeKB:1800, description:'Anterior-posterior chest X-ray.' },
    ];

    const ds = DroboardDocuments.attach('#documentsPlaceholder', {
      title: 'Documents',
      subtitle: 'Lab reports, prescriptions, imaging & ID files',
      documents: SEED_DOCS,
      onUpload:   (doc) => console.log('uploaded', doc),
      onRename:   (doc, oldName, newName) => console.log('renamed', oldName, '->', newName),
      onMove:     (doc, oldCat, newCat) => console.log('moved', doc.name, oldCat, '->', newCat),
      onDelete:   (doc) => console.log('deleted', doc),
      onDownload: (doc) => console.log('downloaded', doc),
    });
  </script>

── CUSTOM CATEGORIES ────────────────────────────────────────────────────────

  Pass your own `categories` array to repurpose this for a non-clinical app
  (e.g. contracts, invoices, photos) — the chips, tags, icons and dropdown's
  category-specific actions all key off `category.id`, so anything goes as
  long as each category has { id, label, icon, iconCls, tagCls }.

── MULTIPLE INSTANCES ───────────────────────────────────────────────────────

  Every attach() call is fully isolated (its own state, its own modals,
  namespaced element ids) — attach as many as you like on the same page.

─────────────────────────────────────────────────────────────────────────*/