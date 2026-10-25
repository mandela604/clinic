/**
 * shiloh-table.js — Shiloh Clinic Reusable Data Table
 * ─────────────────────────────────────────────────────────────────────
 * Built the same way as shiloh-sidebar.js: drop one
 *   <script src="shiloh-table.js"></script>
 * on the page, then call attach() once you have a target element. It
 * renders the FULL table surface used on laboratory.html — stat cards,
 * search + filter bar, date-range modal, list/grid toggle, column
 * visibility menu, sortable/paginated table, per-row action menu, CSV
 * export — driven entirely by an `options` object, so the exact same
 * component works for Pharmacy, Appointments, Billing, Visits, etc.
 * without copy-pasting markup or JS per page.
 *
 * This component renders ONLY the table surface — pair it with
 * shiloh-sidebar.js (or any other page chrome) in the same page;
 * neither one depends on the other.
 *
 * ── MINIMAL USAGE ────────────────────────────────────────────────────
 *   <div class="main">
 *     <div id="labTablePlaceholder"></div>
 *   </div>
 *   <script src="shiloh-table.js"></script>
 *   <script>
 *     const tbl = ShilohTable.attach('#labTablePlaceholder', {
 *       storageKey: 'shiloh_lab_orders_v1',   // omit to skip persistence
 *       seedData: DEMO_ORDERS,                // used only on first load
 *       idField: 'id',
 *       pageTitle: 'Laboratory',
 *       breadcrumb: 'Dashboard / Laboratory / Test Orders',
 *       entityName: 'order',
 *       entityNamePlural: 'orders',
 *       newButton: { label: 'New Test Order', href: 'lab-test.html' },
 *
 *       statCards: [
 *         { label:'Pending Tests', icon: ICONS.clock, color:'orange',
 *           compute: rows => rows.filter(r => r.status === 'pending').length,
 *           sub: 'Awaiting sample' },
 *         ...
 *       ],
 *
 *       searchFields: ['id','name','hosp','test'],
 *       searchPlaceholder: 'Search by order ID, patient name, hospital no. or test type...',
 *       dateField: 'date',
 *
 *       selectFilters: [
 *         { key:'test', label:'Test Type', field:'test', options:'auto' },
 *         { key:'priority', label:'Priority', field:'priority',
 *           options:[{value:'routine',label:'Routine'},{value:'urgent',label:'Urgent'},{value:'stat',label:'STAT'}] },
 *         { key:'status', label:'Status', field:'status',
 *           options:[{value:'pending',label:'Pending'},{value:'completed',label:'Completed'}] },
 *       ],
 *
 *       columns: [
 *         { key:'id',      label:'Order ID',      type:'link',      field:'id' },
 *         { key:'patient', label:'Patient',        type:'patient',   nameField:'name', emailField:'email', avatarField:'img' },
 *         { key:'hosp',    label:'Hospital No.',   type:'text',      field:'hosp', hideable:true },
 *         { key:'test',    label:'Test',           type:'titleSub',  titleField:'test', subField:'sample', clickable:true },
 *         { key:'priority',label:'Priority',       type:'chip',      field:'priority', map: PRIORITY_MAP, hideable:true },
 *         { key:'by',      label:'Ordered By',     type:'text',      field:'by', hideable:true },
 *         { key:'time',    label:'Ordered At',     type:'text',      field:'time', hideable:true },
 *         { key:'result',  label:'Result',         type:'result',    field:'result', classField:'resultClass', hideable:true },
 *         { key:'status',  label:'Status',         type:'badge',     field:'status', map: STATUS_MAP },
 *         { key:'actions', label:'Actions',        type:'actions' },
 *       ],
 *
 *       statusField: 'status',
 *       statusOrder: ['pending','collected','progress','completed'],
 *       statusMap: STATUS_MAP,
 *
 *       onView:          row => location.href = 'lab-view.html?order=' + encodeURIComponent(row.id),
 *       onAdvanceStatus: (row, newStatus) => { ... },   // omit to disable "Mark as …"
 *       onDelete:        row => confirm(`Cancel ${row.id}?`), // return false to abort
 *       onPrint:         row => { ... },                // omit to disable "Print Label"
 *       exportFilename:  'lab-test-orders.csv',
 *     });
 *
 *     tbl.getRows();          // current in-memory dataset
 *     tbl.setRows(newList);   // replace dataset, re-render
 *     tbl.addRow(row);
 *     tbl.updateRow(id, patch);
 *     tbl.removeRow(id);
 *     tbl.refresh();          // re-render without changing data
 *     tbl.destroy();
 *
 * ── CELL TYPES ───────────────────────────────────────────────────────
 *   text      { field }                                    plain text
 *   link      { field, cls }                                colored id, click → onView
 *   patient   { nameField, emailField, avatarField }        avatar + name + email
 *   titleSub  { titleField, subField, clickable }           bold title + gray subtitle
 *   chip      { field, map:{value:{label,cls}} }            pill (priority-style)
 *   badge     { field, map:{value:{label,cls}} }             dot + pill (status-style)
 *   result    { field, classField }                         value or "—" dash
 *   custom    { render:(row)=>html }                        anything else
 *   actions   —                                             view icon + ⋮ menu
 *
 * Any column except `actions`/`custom` can set `hideable:true` to appear
 * in the column-visibility (⚙) menu. Columns are also what CSV export
 * is generated from (actions/custom columns are skipped unless you give
 * them `exportField`).
 *
 * ── ROW ACTION MENU ──────────────────────────────────────────────────
 * By default the ⋮ menu offers: View Details, Print Label (if `onPrint`
 * given), "Mark as <next status>" (if `statusOrder` + `onAdvanceStatus`
 * given and the row isn't already at the last status), and a danger
 * Cancel/Delete item (if `onDelete` given). Override entirely with
 * `options.rowActions: row => [{key,label,icon,danger,onClick}]`.
 *
 * ── GRID VIEW ────────────────────────────────────────────────────────
 * A card layout is auto-derived from your columns (patient + titleSub +
 * chip + badge + result, same visual language as the list rows). Pass
 * `options.gridCard: row => html` to fully customize it instead.
 */

(function () {
  'use strict';

  if (window.__shilohTable) return;
  window.__shilohTable = true;

  // ══════════════════════════════════════════════════════════════════════
  // Shared icon set (subset also used by shiloh-sidebar.js's style)
  // ══════════════════════════════════════════════════════════════════════
  const ICONS = {
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.5V19l4 2v-8.5z"/></svg>`,
    reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.5-3.5L23 10M1 14l5 4.5A9 9 0 0020.5 15"/></svg>`,
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    cols: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z"/></svg>`,
    view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    dots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
    print: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a1 1 0 01-1-1v-5a1 1 0 011-1h16a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 14h12v8H6z"/></svg>`,
    advance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    cancel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>`,
    empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6L3 20a1 1 0 001 2h16a1 1 0 001-2L15 8V2M9 2h6"/></svg>`,
  };

  // ══════════════════════════════════════════════════════════════════════
  // CSS — std- prefixed (Shiloh Table), scoped under .std-wrap
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .std-wrap{
      --std-navy:#0d1b4c; --std-navy-active:#1e3a8a; --std-blue:#2563eb; --std-blue-light:#eef2ff;
      --std-text-dark:#1e293b; --std-text-gray:#64748b; --std-border:#e5e7eb; --std-bg:#f5f6f8;
      --std-green:#16a34a; --std-green-bg:#dcfce7; --std-orange:#f97316; --std-orange-bg:#fff1e6;
      --std-purple:#8b5cf6; --std-purple-bg:#f1eaff; --std-pink:#ec4899; --std-pink-bg:#fde8f2;
      --std-red:#ef4444; --std-red-bg:#fee2e2;
      font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color:var(--std-text-dark);
    }
    .std-wrap *, .std-wrap *::before, .std-wrap *::after{box-sizing:border-box;}
    .std-wrap a{text-decoration:none;}

    .std-topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;flex-wrap:wrap;gap:14px;}
    .std-page-title{font-size:22px;font-weight:700;color:#0f172a;}
    .std-breadcrumb{font-size:12.5px;color:var(--std-text-gray);margin-top:4px;}
    .std-topbar-actions{display:flex;gap:10px;flex-wrap:wrap;}
    .std-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;font-size:13.5px;font-weight:500;cursor:pointer;border:1px solid var(--std-border);background:#fff;color:#334155;white-space:nowrap;}
    .std-btn:hover{background:#f8fafc;}
    .std-btn svg{width:15px;height:15px;}
    .std-btn-primary{background:var(--std-blue);color:#fff;border:1px solid var(--std-blue);}
    .std-btn-primary:hover{background:#1d4ed8;}

    .std-stats-row{display:grid;grid-template-columns:repeat(auto-fit, minmax(150px,1fr));gap:14px;margin-bottom:20px;align-items:stretch;}
    .std-stat-card{background:#fff;border:1px solid var(--std-border);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
    .std-stat-top{display:flex;align-items:flex-start;gap:10px;}
    .std-stat-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .std-stat-icon svg{width:17px;height:17px;}
    .std-stat-label{font-size:12px;color:var(--std-text-gray);font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:31px;}
    .std-stat-value{font-size:20px;font-weight:700;color:#0f172a;line-height:1;}
    .std-stat-sub{font-size:10.5px;color:#94a3b8;margin-top:auto;padding-top:2px;}
    .std-icon-blue{background:var(--std-blue-light);color:var(--std-blue);}
    .std-icon-green{background:var(--std-green-bg);color:var(--std-green);}
    .std-icon-orange{background:var(--std-orange-bg);color:var(--std-orange);}
    .std-icon-purple{background:var(--std-purple-bg);color:var(--std-purple);}
    .std-icon-pink{background:var(--std-pink-bg);color:var(--std-pink);}
    .std-icon-red{background:var(--std-red-bg);color:var(--std-red);}

    .std-filter-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
    .std-search-box{flex:1;min-width:260px;position:relative;}
    .std-search-box input{width:100%;padding:10px 38px 10px 14px;border:1px solid var(--std-border);border-radius:8px;font-size:13px;background:#fff;}
    .std-search-box input:focus{outline:none;border-color:var(--std-blue);box-shadow:0 0 0 3px var(--std-blue-light);}
    .std-search-box svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#94a3b8;pointer-events:none;}
    .std-filter-group{display:flex;flex-direction:column;gap:3px;}
    .std-filter-group label{font-size:11.5px;color:var(--std-text-gray);font-weight:500;}
    .std-filter-select{padding:8px 12px;border:1px solid var(--std-border);border-radius:8px;font-size:13px;background:#fff;min-width:120px;color:#334155;}
    .std-icon-btn{width:38px;height:38px;border:1px solid var(--std-border);border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;align-self:flex-end;flex-shrink:0;position:relative;}
    .std-icon-btn:hover{background:#f8fafc;}
    .std-icon-btn svg{width:16px;height:16px;color:#334155;}

    .std-table-card{background:#fff;border:1px solid var(--std-border);border-radius:12px;overflow:visible;}
    .std-table-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;flex-wrap:wrap;gap:10px;}
    .std-table-title{font-size:15px;font-weight:700;color:#0f172a;}
    .std-table-actions{display:flex;gap:8px;align-items:center;position:relative;}
    .std-view-toggle{display:flex;border:1px solid var(--std-border);border-radius:8px;overflow:hidden;}
    .std-view-toggle .std-icon-btn{border:none;border-radius:0;width:34px;height:34px;align-self:auto;}
    .std-view-toggle .std-icon-btn.selected{background:var(--std-blue-light);}
    .std-view-toggle .std-icon-btn.selected svg{color:var(--std-blue);}

    .std-table-scroll{overflow-x:auto;max-width:100%;border-radius:0 0 12px 12px;}
    .std-table-scroll::-webkit-scrollbar{height:8px;}
    .std-table-scroll::-webkit-scrollbar-track{background:#f1f5f9;}
    .std-table-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px;}
    .std-table-scroll::-webkit-scrollbar-thumb:hover{background:#94a3b8;}

    .std-wrap table{width:100%;min-width:900px;border-collapse:collapse;}
    .std-wrap thead tr{border-top:1px solid var(--std-border);border-bottom:1px solid var(--std-border);background:#fafbfc;}
    .std-wrap th{text-align:left;padding:11px 12px;font-size:11.5px;color:#64748b;font-weight:600;white-space:nowrap;}
    .std-wrap td{padding:11px 12px;font-size:13px;border-bottom:1px solid var(--std-border);white-space:nowrap;color:#334155;}
    .std-wrap tbody tr:hover{background:#fafbfc;}
    .std-patient-cell{display:flex;align-items:center;gap:10px;}
    .std-avatar{width:34px;height:34px;border-radius:50%;background:#cbd5e1;background-size:cover;background-position:center;flex-shrink:0;}
    .std-patient-name{font-weight:600;color:#0f172a;font-size:13px;}
    .std-patient-sub{font-size:11.5px;color:#94a3b8;}
    .std-link-cell{font-weight:600;color:var(--std-blue);font-size:12.5px;cursor:pointer;}
    .std-link-cell:hover{text-decoration:underline;}

    .std-titlesub-cell{display:flex;flex-direction:column;gap:1px;}
    .std-titlesub-title{font-weight:600;color:#0f172a;font-size:12.5px;}
    .std-clickable{cursor:pointer;}
    .std-clickable:hover{color:var(--std-blue);text-decoration:underline;}
    .std-titlesub-sub{font-size:10.5px;color:#94a3b8;}

    .std-result-value{font-weight:700;font-size:12.5px;}
    .std-result-dash{color:#cbd5e1;font-size:13px;}

    .std-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;white-space:nowrap;}
    .std-badge .std-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
    .std-chip{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;}

    .std-row-actions{display:flex;gap:6px;align-items:center;}
    .std-row-actions .std-icon-btn{width:30px;height:30px;align-self:auto;}
    .std-row-actions svg{width:14px;height:14px;}

    .std-table-empty{padding:50px 20px;text-align:center;color:#94a3b8;}
    .std-table-empty svg{width:30px;height:30px;margin-bottom:10px;color:#cbd5e1;}
    .std-table-empty p{font-size:12.5px;font-weight:600;}

    .std-table-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;flex-wrap:wrap;gap:10px;}
    .std-footer-text{font-size:12.5px;color:var(--std-text-gray);}
    .std-pagination{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
    .std-page-btn{min-width:32px;height:32px;padding:0 8px;border:1px solid var(--std-border);border-radius:7px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#334155;cursor:pointer;user-select:none;}
    .std-page-btn:hover:not(.disabled):not(.active){background:var(--std-bg);}
    .std-page-btn.active{background:var(--std-blue);color:#fff;border-color:var(--std-blue);}
    .std-page-btn.disabled{opacity:.4;cursor:not-allowed;}
    .std-page-ellipsis{padding:0 4px;color:#94a3b8;font-size:13px;font-weight:600;}
    .std-per-page{padding:7px 10px;border:1px solid var(--std-border);border-radius:7px;font-size:12.5px;color:#334155;background:#fff;cursor:pointer;}

    .std-orders-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:14px;padding:16px 20px;width:100%;max-width:100%;}
    .std-order-card{border:1px solid var(--std-border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0;}
    .std-order-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
    .std-order-card .std-patient-cell{min-width:0;}
    .std-order-card .std-patient-name, .std-order-card .std-patient-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .std-order-card-meta{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#64748b;}
    .std-order-card-row{display:flex;justify-content:space-between;align-items:center;gap:8px;}
    .std-order-card-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--std-border);}
    .std-order-card-empty{grid-column:1 / -1;}

    .std-dropdown-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:190px;background:#fff;border:1px solid var(--std-border);border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.12);padding:6px;z-index:60;display:none;}
    .std-dropdown-menu.open{display:block;}
    .std-column-toggle-row{display:flex;align-items:center;gap:8px;padding:7px 10px;font-size:13px;color:#334155;}
    .std-column-toggle-row input{cursor:pointer;}

    .std-action-menu{position:fixed;min-width:190px;background:#fff;border:1px solid var(--std-border);border-radius:10px;box-shadow:0 10px 28px rgba(15,23,42,0.16);padding:6px;z-index:300;display:none;}
    .std-action-menu.open{display:block;}
    .std-action-menu-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;font-size:13px;color:#334155;cursor:pointer;white-space:nowrap;}
    .std-action-menu-item svg{width:14px;height:14px;flex-shrink:0;}
    .std-action-menu-item:hover{background:var(--std-blue-light);color:var(--std-blue);}
    .std-action-menu-item.danger{color:var(--std-red);}
    .std-action-menu-item.danger:hover{background:var(--std-red-bg);}
    .std-action-menu-sep{height:1px;background:var(--std-border);margin:5px 3px;}

    .std-modal-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,0.45);align-items:center;justify-content:center;z-index:1000;padding:16px;}
    .std-modal-overlay.open{display:flex;}
    .std-modal-box{background:#fff;border-radius:12px;width:100%;max-width:380px;box-shadow:0 20px 40px rgba(15,23,42,0.2);overflow:hidden;}
    .std-modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--std-border);}
    .std-modal-title{font-size:15px;font-weight:700;color:#0f172a;}
    .std-modal-close{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;font-size:18px;line-height:1;}
    .std-modal-close:hover{background:var(--std-bg);}
    .std-modal-body{padding:18px;display:flex;flex-direction:column;gap:14px;}
    .std-modal-body .std-filter-group{gap:5px;}
    .std-modal-body .std-filter-select{width:100%;}
    .std-modal-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 18px;border-top:1px solid var(--std-border);}

    .std-toast{position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 18px;border-radius:9px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:1200;opacity:0;transform:translateY(10px);transition:all .2s ease;pointer-events:none;}
    .std-toast.show{opacity:1;transform:translateY(0);}
  `;

  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const el = document.createElement('style');
    el.id = 'std-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ══════════════════════════════════════════════════════════════════════
  // Utils
  // ══════════════════════════════════════════════════════════════════════
  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _get(row, field) { return field ? row[field] : undefined; }
  function _toastMsg(container, msg) {
    const t = container.querySelector('[data-std-toast]');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  let _instanceCounter = 0;

  // ══════════════════════════════════════════════════════════════════════
  // attach()
  // ══════════════════════════════════════════════════════════════════════
  function attach(target, options) {
    options = options || {};
    _injectStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) { console.warn('[ShilohTable] Target not found:', target); return null; }

    const instId = 'std' + (++_instanceCounter);
    const idField = options.idField || 'id';
    const entityName = options.entityName || 'item';
    const entityNamePlural = options.entityNamePlural || (entityName + 's');
    const columns = options.columns || [];
    const storageKey = options.storageKey || null;

    // ── Data layer ──
    function loadRows() {
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) return JSON.parse(raw);
        } catch (e) {}
      }
      const seed = (options.seedData || []).slice();
      if (storageKey) saveRows(seed);
      return seed;
    }
    function saveRows(list) {
      if (!storageKey) return;
      try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch (e) {}
    }

    let allRows = loadRows();
    let rows = allRows.slice();     // after filters
    let currentPage = 1;
    let perPage = 10;
    let currentView = 'list';
    let dateFrom = null, dateTo = null;
    let hiddenCols = [];
    const state = { search: '' };
    (options.selectFilters || []).forEach(f => { state[f.key] = 'All'; });

    // ── Shell ──
    const hideableCols = columns.filter(c => c.hideable);
    const selectFilters = options.selectFilters || [];

    container.innerHTML = `
      <div class="std-wrap" id="${instId}">
        <div class="std-topbar">
          <div>
            <div class="std-page-title">${_esc(options.pageTitle || '')}</div>
            ${options.breadcrumb ? `<div class="std-breadcrumb">${_esc(options.breadcrumb)}</div>` : ''}
          </div>
          <div class="std-topbar-actions" data-std-topactions>
            ${options.onExport !== false ? `<div class="std-btn" data-std-topexport>${ICONS.export}Export</div>` : ''}
            ${(options.topActions || []).map((a, i) => `<div class="std-btn" data-std-topaction="${i}">${a.icon || ''}${_esc(a.label)}</div>`).join('')}
            ${options.newButton ? (options.newButton.href
              ? `<a href="${_esc(options.newButton.href)}" class="std-btn std-btn-primary" data-link>${ICONS.plus}${_esc(options.newButton.label)}</a>`
              : `<div class="std-btn std-btn-primary" data-std-newbtn>${ICONS.plus}${_esc(options.newButton.label)}</div>`) : ''}
          </div>
        </div>

        ${(options.statCards && options.statCards.length) ? `<div class="std-stats-row" data-std-stats></div>` : ''}

        <div class="std-filter-bar">
          <div class="std-search-box">
            <input type="text" data-std-search placeholder="${_esc(options.searchPlaceholder || 'Search...')}">
            ${ICONS.search}
          </div>
          ${selectFilters.map(f => `
            <div class="std-filter-group">
              <label>${_esc(f.label)}</label>
              <select class="std-filter-select" data-std-filter="${f.key}">
                <option value="All">All</option>
                ${f.options === 'auto' ? '' : f.options.map(o => `<option value="${_esc(o.value)}">${_esc(o.label)}</option>`).join('')}
              </select>
            </div>`).join('')}
          ${options.dateField ? `<div class="std-btn" data-std-morefilters style="align-self:flex-end;">${ICONS.filter}More Filters</div>` : ''}
          <div class="std-icon-btn" data-std-resetfilters title="Reset filters">${ICONS.reset}</div>
        </div>

        <div class="std-table-card">
          <div class="std-table-header">
            <div class="std-table-title" data-std-tabletitle>${_esc(entityNamePlural)} (0)</div>
            <div class="std-table-actions">
              ${options.onExport !== false ? `<div class="std-btn" data-std-tableexport>${ICONS.export}Export</div>` : ''}
              <div class="std-view-toggle">
                <div class="std-icon-btn selected" data-std-listview>${ICONS.list}</div>
                <div class="std-icon-btn" data-std-gridview>${ICONS.grid}</div>
              </div>
              ${hideableCols.length ? `
              <div class="std-icon-btn" data-std-colsbtn title="Columns">${ICONS.cols}</div>
              <div class="std-dropdown-menu" data-std-colsmenu></div>` : ''}
            </div>
          </div>

          <div class="std-table-scroll" data-std-listwrap>
            <table>
              <thead><tr data-std-thead></tr></thead>
              <tbody data-std-tbody></tbody>
            </table>
          </div>

          <div class="std-orders-grid" data-std-grid style="display:none;"></div>

          <table style="display:none;"><tbody data-std-fullbody></tbody></table>

          <div class="std-table-footer">
            <div class="std-footer-text" data-std-footertext>Showing 0 of 0 ${_esc(entityNamePlural)}</div>
            <div class="std-pagination">
              <div class="std-pagination" data-std-pagebtns></div>
              <select class="std-per-page" data-std-perpage>
                <option value="5">5 / page</option>
                <option value="10" selected>10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      ${options.dateField ? `
      <div class="std-modal-overlay" data-std-datemodal>
        <div class="std-modal-box">
          <div class="std-modal-header">
            <div class="std-modal-title">Filter by Date Range</div>
            <div class="std-modal-close" data-std-dateclose">&times;</div>
          </div>
          <div class="std-modal-body">
            <div class="std-filter-group"><label>From</label><input type="date" class="std-filter-select" data-std-datefrom></div>
            <div class="std-filter-group"><label>To</label><input type="date" class="std-filter-select" data-std-dateto></div>
          </div>
          <div class="std-modal-footer">
            <div class="std-btn" data-std-dateclear>Clear</div>
            <div class="std-btn std-btn-primary" data-std-dateapply>Apply</div>
          </div>
        </div>
      </div>` : ''}

      <div class="std-action-menu" data-std-rowmenu></div>
      <div class="std-toast" data-std-toast></div>
    `;

    // fix a stray quote typo defensively (kept markup readable above)
    container.innerHTML = container.innerHTML.replace('data-std-dateclose">', 'data-std-dateclose>');

    const $ = sel => container.querySelector(sel);
    const theadRow = $('[data-std-thead]');
    const tbody = $('[data-std-tbody]');
    const gridEl = $('[data-std-grid]');
    const fullBody = $('[data-std-fullbody]');

    // ── Header row ──
    theadRow.innerHTML = columns.map(c => `<th${c.hideable ? ` data-col="${c.key}"` : ''}>${_esc(c.label)}</th>`).join('');

    // ── Filter option population ──
    selectFilters.forEach(f => {
      if (f.options !== 'auto') return;
      const sel = container.querySelector(`[data-std-filter="${f.key}"]`);
      const values = Array.from(new Set(allRows.map(r => _get(r, f.field)))).filter(v => v != null).sort();
      sel.innerHTML = '<option value="All">All</option>' + values.map(v => `<option value="${_esc(v)}">${_esc(v)}</option>`).join('');
    });

    // ── Column visibility menu ──
    function renderColsMenu() {
      const menu = $('[data-std-colsmenu]');
      if (!menu) return;
      menu.innerHTML = hideableCols.map(c => `
        <label class="std-column-toggle-row">
          <input type="checkbox" data-col-key="${c.key}" ${hiddenCols.includes(c.key) ? '' : 'checked'}>
          ${_esc(c.label)}
        </label>`).join('');
      menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const key = cb.dataset.colKey;
          if (cb.checked) hiddenCols = hiddenCols.filter(k => k !== key);
          else if (!hiddenCols.includes(key)) hiddenCols.push(key);
          applyColumnVisibility();
        });
      });
    }
    function applyColumnVisibility() {
      hideableCols.forEach(c => {
        const hidden = hiddenCols.includes(c.key);
        container.querySelectorAll(`[data-col="${c.key}"]`).forEach(node => { node.style.display = hidden ? 'none' : ''; });
      });
    }
    renderColsMenu();

    // ── Filtering ──
    function applyFilters() {
      const q = state.search.trim().toLowerCase();
      rows = allRows.filter(r => {
        if (options.dateField) {
          const d = _get(r, options.dateField);
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > dateTo) return false;
        }
        for (const f of selectFilters) {
          if (state[f.key] !== 'All' && String(_get(r, f.field)) !== state[f.key]) return false;
        }
        if (q) {
          const hay = (options.searchFields || []).map(fld => _get(r, fld)).join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      currentPage = 1;
      renderAll();
    }

    // ── Stats ──
    function renderStats() {
      const wrap = $('[data-std-stats]');
      if (!wrap || !options.statCards) return;
      wrap.innerHTML = options.statCards.map(sc => `
        <div class="std-stat-card">
          <div class="std-stat-top">
            <div class="std-stat-icon std-icon-${sc.color || 'blue'}">${sc.icon || ''}</div>
            <div class="std-stat-label">${_esc(sc.label)}</div>
          </div>
          <div class="std-stat-value">${_esc(sc.compute ? sc.compute(allRows) : (sc.value != null ? sc.value : ''))}</div>
          ${sc.sub ? `<div class="std-stat-sub">${_esc(typeof sc.sub === 'function' ? sc.sub(allRows) : sc.sub)}</div>` : ''}
        </div>`).join('');
    }

    // ── Cell renderers ──
    function cellHtml(col, row) {
      switch (col.type) {
        case 'index': return '';
        case 'text': return _esc(_get(row, col.field));
        case 'link': return `<span class="std-link-cell" data-std-viewtrigger>${_esc(_get(row, col.field))}</span>`;
        case 'patient': {
          const rawName = _get(row, col.nameField);
          const name = _esc(rawName);
          const sub = col.emailField ? _esc(_get(row, col.emailField)) : '';
          const av = col.avatarField ? _get(row, col.avatarField) : null;
          const avUrl = typeof av === 'string' ? av : '';
          const initials = window.ShilohAvatar ? window.ShilohAvatar.initials(rawName) : '?';
          return `<div class="std-patient-cell">
            <div class="std-avatar" style="${avUrl ? `background-image:url('${_esc(avUrl)}')` : 'display:flex;align-items:center;justify-content:center;background:#e0e9ff;color:#1d4ed8;font-weight:800;font-size:11px;'}">${avUrl ? '' : _esc(initials)}</div>
            <div><div class="std-patient-name">${name}</div>${sub ? `<div class="std-patient-sub">${sub}</div>` : ''}</div>
          </div>`;
        }
        case 'titleSub': {
          const title = _esc(_get(row, col.titleField));
          const sub = col.subField ? _esc(_get(row, col.subField)) : '';
          return `<div class="std-titlesub-cell">
            <div class="std-titlesub-title${col.clickable ? ' std-clickable' : ''}"${col.clickable ? ' data-std-viewtrigger' : ''}>${title}</div>
            ${sub ? `<div class="std-titlesub-sub">${sub}</div>` : ''}
          </div>`;
        }
        case 'chip': {
          const v = _get(row, col.field);
          const m = (col.map || {})[v] || { label: v, cls: '' };
          return `<span class="std-chip" style="${m.cls ? '' : 'background:#f1f5f9;color:#64748b;'}" class="std-chip ${m.cls || ''}">${_esc(m.label)}</span>`;
        }
        case 'badge': {
          const v = _get(row, col.field);
          const m = (col.map || {})[v] || { label: v, cls: '' };
          return `<span class="std-badge ${m.cls || ''}"><span class="std-dot"></span>${_esc(m.label)}</span>`;
        }
        case 'result': {
          const v = _get(row, col.field);
          if (!v) return `<span class="std-result-dash">—</span>`;
          const cls = col.classField ? _get(row, col.classField) : '';
          return `<span class="std-result-value" style="color:${cls === 'critical' ? 'var(--std-red)' : cls === 'normal' ? 'var(--std-green)' : 'inherit'}">${_esc(v)}</span>`;
        }
        case 'custom': return col.render ? col.render(row) : '';
        case 'actions': return `<div class="std-row-actions">
            <div class="std-icon-btn" data-std-viewtrigger title="View">${ICONS.view}</div>
            <div class="std-icon-btn" data-std-menutrigger title="More">${ICONS.dots}</div>
          </div>`;
        default: return _esc(_get(row, col.field));
      }
    }

    function rowHtml(row, rowNum) {
      return `<tr data-id="${_esc(_get(row, idField))}">
        ${columns.map(c => {
          if (c.key === '#' || c.type === 'index') return `<td>${rowNum}</td>`;
          return `<td${c.hideable ? ` data-col="${c.key}"` : ''}>${cellHtml(c, row)}</td>`;
        }).join('')}
      </tr>`;
    }

    function plainRowHtml(row) {
      const exportCols = columns.filter(c => c.type !== 'actions');
      return `<tr>${exportCols.map(c => `<td>${_esc(cellPlainText(c, row))}</td>`).join('')}</tr>`;
    }
    function cellPlainText(col, row) {
      if (col.exportField) return _get(row, col.exportField);
      switch (col.type) {
        case 'patient': return _get(row, col.nameField);
        case 'titleSub': return _get(row, col.titleField);
        case 'chip': case 'badge': { const v = _get(row, col.field); const m = (col.map || {})[v]; return m ? m.label : v; }
        case 'result': return _get(row, col.field) || '-';
        case 'custom': return '';
        default: return _get(row, col.field);
      }
    }

    // ── Default grid card (auto-derived from columns) ──
    function defaultCardHtml(row) {
      const patientCol = columns.find(c => c.type === 'patient');
      const chipCol = columns.find(c => c.type === 'chip');
      const titleSubCol = columns.find(c => c.type === 'titleSub');
      const badgeCol = columns.find(c => c.type === 'badge');
      const resultCol = columns.find(c => c.type === 'result');
      const linkCol = columns.find(c => c.type === 'link');
      return `<div class="std-order-card" data-id="${_esc(_get(row, idField))}">
        <div class="std-order-card-top">
          ${patientCol ? cellHtml(patientCol, row) : ''}
          ${chipCol ? cellHtml(chipCol, row) : ''}
        </div>
        ${titleSubCol ? `<div class="std-order-card-meta">${cellHtml(titleSubCol, row)}</div>` : ''}
        <div class="std-order-card-row">
          ${linkCol ? cellHtml(linkCol, row) : `<span></span>`}
          ${badgeCol ? cellHtml(badgeCol, row) : ''}
        </div>
        <div class="std-order-card-footer">
          ${resultCol ? cellHtml(resultCol, row) : '<span></span>'}
          <div class="std-row-actions">
            <div class="std-icon-btn" data-std-viewtrigger title="View">${ICONS.view}</div>
            <div class="std-icon-btn" data-std-menutrigger title="More">${ICONS.dots}</div>
          </div>
        </div>
      </div>`;
    }
    function cardHtml(row) { return options.gridCard ? options.gridCard(row) : defaultCardHtml(row); }

    // ── Pagination ──
    function renderPagination(totalPages) {
      const wrap = $('[data-std-pagebtns]');
      if (rows.length === 0) { wrap.innerHTML = ''; return; }
      let pages = [];
      if (totalPages <= 7) pages = Array.from({ length: totalPages }, (_, i) => i + 1);
      else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1), end = Math.min(totalPages - 1, currentPage + 1);
        for (let p = start; p <= end; p++) pages.push(p);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }
      let html = `<div class="std-page-btn ${currentPage === 1 ? 'disabled' : ''}" data-page="prev">&lt;</div>`;
      pages.forEach(p => {
        html += p === '...' ? `<div class="std-page-ellipsis">…</div>` : `<div class="std-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</div>`;
      });
      html += `<div class="std-page-btn ${currentPage === totalPages ? 'disabled' : ''}" data-page="next">&gt;</div>`;
      wrap.innerHTML = html;
    }
    $('[data-std-pagebtns]').addEventListener('click', e => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.classList.contains('disabled')) return;
      const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
      const val = btn.dataset.page;
      if (val === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (val === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = Number(val);
      renderTable();
    });
    $('[data-std-perpage]').addEventListener('change', e => { perPage = Number(e.target.value); currentPage = 1; renderTable(); });

    // ── Main table render ──
    function renderTable() {
      $('[data-std-tabletitle]').textContent = `${entityNamePlural.charAt(0).toUpperCase() + entityNamePlural.slice(1)} (${rows.length})`;
      const colCount = columns.length;

      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}"><div class="std-table-empty">${ICONS.empty}<p>No ${_esc(entityNamePlural)} found</p></div></td></tr>`;
        gridEl.innerHTML = `<div class="std-order-card-empty"><div class="std-table-empty">${ICONS.empty}<p>No ${_esc(entityNamePlural)} found</p></div></div>`;
        $('[data-std-footertext]').textContent = `No ${entityNamePlural} found`;
        renderPagination(1);
        fullBody.innerHTML = '';
        return;
      }

      const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;
      const startIdx = (currentPage - 1) * perPage;
      const pageItems = rows.slice(startIdx, startIdx + perPage);
      const endIdx = startIdx + pageItems.length;

      tbody.innerHTML = pageItems.map((r, i) => rowHtml(r, startIdx + i + 1)).join('');
      gridEl.innerHTML = pageItems.map(cardHtml).join('');
      $('[data-std-footertext]').textContent = `Showing ${startIdx + 1} to ${endIdx} of ${rows.length} ${entityNamePlural}`;
      renderPagination(totalPages);
      applyColumnVisibility();
      fullBody.innerHTML = rows.map(plainRowHtml).join('');
    }

    function renderAll() { renderStats(); renderTable(); }

    // ── View toggle ──
    function setView(view) {
      currentView = view;
      const isGrid = view === 'grid';
      $('[data-std-listwrap]').style.display = isGrid ? 'none' : 'block';
      gridEl.style.display = isGrid ? 'grid' : 'none';
      $('[data-std-listview]').classList.toggle('selected', !isGrid);
      $('[data-std-gridview]').classList.toggle('selected', isGrid);
    }
    $('[data-std-listview]').addEventListener('click', () => setView('list'));
    $('[data-std-gridview]').addEventListener('click', () => setView('grid'));

    // ── CSV export ──
    function tableToCsv() {
      const headerRow = `<tr>${columns.filter(c => c.type !== 'actions').map(c => `<th>${c.label}</th>`).join('')}</tr>`;
      const wrapTable = document.createElement('table');
      wrapTable.innerHTML = `<thead>${headerRow}</thead><tbody>${fullBody.innerHTML}</tbody>`;
      const rowsEls = Array.from(wrapTable.querySelectorAll('tr'));
      return rowsEls.map(tr => Array.from(tr.querySelectorAll('th,td')).map(cell => `"${cell.textContent.trim().replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    function downloadCsv(csv, filename) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    function exportCsv() {
      if (typeof options.onExport === 'function') { options.onExport(rows); return; }
      downloadCsv(tableToCsv(), options.exportFilename || (entityNamePlural + '.csv'));
      _toastMsg(container, `Exported ${rows.length} ${rows.length !== 1 ? entityNamePlural : entityName}`);
    }
    if (options.onExport !== false) {
      $('[data-std-topexport]')?.addEventListener('click', exportCsv);
      $('[data-std-tableexport]')?.addEventListener('click', exportCsv);
    }

    // ── Top action buttons ──
    (options.topActions || []).forEach((a, i) => {
      container.querySelector(`[data-std-topaction="${i}"]`)?.addEventListener('click', () => a.onClick && a.onClick(rows));
    });
    if (options.newButton && !options.newButton.href) {
      $('[data-std-newbtn]')?.addEventListener('click', () => options.newButton.onClick && options.newButton.onClick());
    }

    // ── Search & filters ──
    $('[data-std-search]').addEventListener('input', e => { state.search = e.target.value; applyFilters(); });
    selectFilters.forEach(f => {
      container.querySelector(`[data-std-filter="${f.key}"]`).addEventListener('change', e => { state[f.key] = e.target.value; applyFilters(); });
    });
    $('[data-std-resetfilters]').addEventListener('click', () => {
      state.search = '';
      selectFilters.forEach(f => { state[f.key] = 'All'; container.querySelector(`[data-std-filter="${f.key}"]`).value = 'All'; });
      dateFrom = null; dateTo = null;
      $('[data-std-search]').value = '';
      applyFilters();
      _toastMsg(container, 'Filters reset');
    });

    // ── Date range modal ──
    if (options.dateField) {
      const overlay = $('[data-std-datemodal]');
      const openModal = () => { $('[data-std-datefrom]').value = dateFrom || ''; $('[data-std-dateto]').value = dateTo || ''; overlay.classList.add('open'); };
      const closeModal = () => overlay.classList.remove('open');
      $('[data-std-morefilters]').addEventListener('click', openModal);
      container.querySelector('[data-std-dateclose]').addEventListener('click', closeModal);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
      $('[data-std-dateapply]').addEventListener('click', () => {
        dateFrom = $('[data-std-datefrom]').value || null;
        dateTo = $('[data-std-dateto]').value || null;
        applyFilters(); closeModal();
      });
      $('[data-std-dateclear]').addEventListener('click', () => {
        dateFrom = null; dateTo = null;
        $('[data-std-datefrom]').value = ''; $('[data-std-dateto]').value = '';
        applyFilters();
      });
    }

    // ── Columns menu toggle ──
    $('[data-std-colsbtn]')?.addEventListener('click', e => { e.stopPropagation(); $('[data-std-colsmenu]').classList.toggle('open'); });

    // ── Row action menu (⋮) ──
    const statusOrder = options.statusOrder || null;
    const statusMap = options.statusMap || {};
    const statusField = options.statusField || null;

    function nextStatus(row) {
      if (!statusOrder || !statusField) return null;
      const idx = statusOrder.indexOf(_get(row, statusField));
      if (idx === -1 || idx === statusOrder.length - 1) return null;
      return statusOrder[idx + 1];
    }

    function defaultRowActions(row) {
      const items = [{ key: 'view', label: 'View Details', icon: ICONS.view }];
      if (typeof options.onPrint === 'function') items.push({ key: 'print', label: 'Print Label', icon: ICONS.print });
      const ns = nextStatus(row);
      if (ns && typeof options.onAdvanceStatus === 'function') {
        const lbl = (statusMap[ns] && statusMap[ns].label) || ns;
        items.push({ key: 'advance', label: `Mark as ${lbl}`, icon: ICONS.advance });
      }
      if (typeof options.onDelete === 'function') items.push({ key: 'delete', label: 'Cancel', icon: ICONS.cancel, danger: true, sep: true });
      return items;
    }

    let menuRowId = null;
    function openActionMenu(id, anchorEl) {
      const row = allRows.find(r => String(_get(r, idField)) === String(id));
      if (!row) return;
      menuRowId = id;
      const items = options.rowActions ? options.rowActions(row) : defaultRowActions(row);
      const menu = $('[data-std-rowmenu]');
      menu.innerHTML = items.map(it => `${it.sep ? '<div class="std-action-menu-sep"></div>' : ''}
        <div class="std-action-menu-item${it.danger ? ' danger' : ''}" data-menu-key="${it.key}">${it.icon || ''}${_esc(it.label)}</div>`).join('');
      const rect = anchorEl.getBoundingClientRect();
      menu.style.display = 'block';
      const menuWidth = menu.offsetWidth || 190;
      let left = rect.right - menuWidth; if (left < 8) left = 8;
      let top = rect.bottom + 6; if (top + 180 > window.innerHeight) top = rect.top - 6 - 180;
      menu.style.left = left + 'px'; menu.style.top = top + 'px';
      menu.classList.add('open');
      menu.querySelectorAll('[data-menu-key]').forEach(node => {
        node.addEventListener('click', () => { runRowAction(node.dataset.menuKey, row, items); closeActionMenu(); });
      });
    }
    function closeActionMenu() { $('[data-std-rowmenu]').classList.remove('open'); menuRowId = null; }

    function runRowAction(key, row, items) {
      const custom = items.find(it => it.key === key && typeof it.onClick === 'function');
      if (custom) { custom.onClick(row); return; }
      if (key === 'view') { triggerView(row); }
      else if (key === 'print') { options.onPrint && options.onPrint(row); }
      else if (key === 'advance') {
        const ns = nextStatus(row);
        if (ns) {
          row[statusField] = ns;
          saveRows(allRows);
          options.onAdvanceStatus && options.onAdvanceStatus(row, ns);
          const lbl = (statusMap[ns] && statusMap[ns].label) || ns;
          _toastMsg(container, `${_get(row, idField)} marked as ${lbl}`);
          applyFilters();
        }
      } else if (key === 'delete') {
        const ok = options.onDelete(row);
        if (ok === false) return;
        allRows = allRows.filter(r => String(_get(r, idField)) !== String(_get(row, idField)));
        saveRows(allRows);
        _toastMsg(container, `${_get(row, idField)} cancelled`);
        applyFilters();
      }
    }

    function triggerView(row) {
      if (typeof options.onView === 'function') options.onView(row);
    }

    document.addEventListener('click', e => {
      if (!e.target.closest('[data-std-rowmenu]') && !e.target.closest('[data-std-menutrigger]')) closeActionMenu();
      if (!e.target.closest('[data-std-colsmenu]') && !e.target.closest('[data-std-colsbtn]')) $('[data-std-colsmenu]')?.classList.remove('open');
    });

    function handleRowClick(e) {
      const viewTrigger = e.target.closest('[data-std-viewtrigger]');
      const menuTrigger = e.target.closest('[data-std-menutrigger]');
      const rowEl = e.target.closest('[data-id]');
      if (!rowEl) return;
      const id = rowEl.dataset.id;
      const row = allRows.find(r => String(_get(r, idField)) === String(id));
      if (!row) return;
      if (viewTrigger) triggerView(row);
     else if (menuTrigger) {
  e.stopPropagation();
  if (menuRowId === id && $('[data-std-rowmenu]').classList.contains('open')) {
    closeActionMenu();
  } else {
    openActionMenu(id, menuTrigger);
  }
}
    }
    tbody.addEventListener('click', handleRowClick);
    gridEl.addEventListener('click', handleRowClick);

    // ── Init ──
    setView('list');
    applyFilters();

    // ── Public control object ──
    return {
      getRows() { return allRows; },
      setRows(list) { allRows = list.slice(); saveRows(allRows); applyFilters(); },
      addRow(row) { allRows.push(row); saveRows(allRows); applyFilters(); },
      updateRow(id, patch) {
        const row = allRows.find(r => String(_get(r, idField)) === String(id));
        if (row) { Object.assign(row, patch); saveRows(allRows); applyFilters(); }
      },
      removeRow(id) { allRows = allRows.filter(r => String(_get(r, idField)) !== String(id)); saveRows(allRows); applyFilters(); },
      refresh() { renderAll(); },
      exportCsv,
      destroy() { closeActionMenu(); container.innerHTML = ''; },
    };
  }

  window.ShilohTable = { attach, ICONS };

})();