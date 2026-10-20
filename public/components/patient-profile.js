/**
 * patient-profile.js — Shiloh Reusable Patient Profile Component
 * ─────────────────────────────────────────────────────────────────────
 * Built the same way as comment-section.js: drop one
 *   <script src="patient-profile.js"></script>
 * in any page, then attach it to a placeholder element. It renders the
 * patient header card, tabs, demographic/contact panels, summary mini
 * cards, recent-visits / recent-prescriptions tables, quick actions, and
 * the allergies / chronic conditions / emergency-contact side panels.
 *
 * The SIDEBAR / SIDE MENU is intentionally NOT part of this component —
 * keep that in the host page's own layout, exactly like before.
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *   <main class="your-main-content-area">
 *     <div id="patientProfilePlaceholder"></div>
 *   </main>
 *   <script src="patient-profile.js"></script>
 *   <script>
 *     const pp = ShilohPatientProfile.attach('#patientProfilePlaceholder', {
 *       breadcrumb: 'Dashboard / Patients / All Patients / Patient Profile',
 *       patient: { ...see shape below... },
 *       tabs: ['Overview','Visit History','Medical History','Documents',
 *              'Appointments','Lab Results','Prescriptions','Billing',
 *              'Notes','Vitals Trend'],
 *       activeTab: 'Overview',
 *       visits: [ { no, date, department, doctor, status } ],
 *       prescriptions: [ { no, date, doctor, status } ],
 *
 *       onBack:            () => history.back(),
 *       onPrintProfile:    () => window.print(),
 *       onPrintId:         () => { ... },
 *       onActions:         () => { ... open your actions dropdown ... },
 *       onTabChange:       (tabName) => { ... load that tab's content ... },
 *       onEditSection:     (sectionKey) => { ... 'demographic'|'contact'|'allergies'|'chronic'|'emergency' },
 *       onQuickAction:     (actionKey) => { ... 'checkin'|'book'|'visit'|'print'|'more' },
 *       onSummaryClick:    (cardKey) => { ... 'visits'|'appointments'|'labs'|'prescriptions'|'bills'|'payments' },
 *       onViewAllVisits:   () => { ... },
 *       onViewAllPrescriptions: () => { ... },
 *       onPhotoEdit:       () => { ... },
 *     });
 *
 *     pp.setPatient(newPatientObj);      // replace patient data, re-render
 *     pp.setTab('Visit History');        // programmatically switch tabs
 *     pp.setVisits(newVisitsArray);
 *     pp.setPrescriptions(newRxArray);
 *     pp.getPatient();                   // read current in-memory state
 *     pp.destroy();                      // remove and clean up
 *
 * ── PATIENT SHAPE (any field can be omitted — sensible blanks are used) ──
 *   {
 *     photo, name, status,               // status: text shown in the green pill
 *     hospitalNo,
 *     age, gender, dob, bloodGroup,      // meta row under the name
 *     phonePrimary, phoneSecondary, email, address, lastVisit, registeredOn,
 *
 *     demographicLeft:  [ { label, value }, ... ],
 *     demographicRight: [ { label, value }, ... ],
 *
 *     summary: [
 *       { key, icon, iconColor, iconBg, label, value, linkText },
 *       ...
 *     ],
 *
 *     quickActions: [ { key, icon, iconBg, className, label }, ... ],
 *
 *     allergies:          'No known allergies',
 *     chronicConditions:  'No chronic conditions recorded',
 *
 *     emergencyContact: { name, relationship, phone, address },
 *   }
 *
 * This component does NOT know about your backend — it just renders
 * whatever patient/visits/prescriptions data you pass in and calls your
 * hooks so the host page can wire up navigation, editing, and actions.
 */

(function () {
  'use strict';

  if (window.__shilohPatientProfile) return;
  window.__shilohPatientProfile = true;

  // ══════════════════════════════════════════════════════════════════════
  // CSS  (ppc- prefixed, scoped under .ppc-wrap, self-contained)
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .ppc-wrap{
      --ppc-navy:#0b1a4d; --ppc-blue-accent:#2f6fed; --ppc-bg:#f4f6fb;
      --ppc-card:#ffffff; --ppc-border:#eef0f6; --ppc-text-dark:#1c2440;
      --ppc-text-mid:#6b7280; --ppc-text-light:#9aa1b3;
      --ppc-green:#12b76a; --ppc-green-bg:#e9f9f0;
      --ppc-blue:#2f6fed; --ppc-blue-bg:#eaf1ff;
      --ppc-purple:#8b5cf6; --ppc-purple-bg:#f4efff;
      --ppc-orange:#f79009; --ppc-orange-bg:#fff4e5;
      --ppc-pink:#ee46bc; --ppc-pink-bg:#fdeefa;
      --ppc-red:#f04438; --ppc-red-bg:#feecec;
      font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      color:var(--ppc-text-dark); font-size:13px; box-sizing:border-box;
    }
    .ppc-wrap *, .ppc-wrap *::before, .ppc-wrap *::after{box-sizing:border-box;}

    .ppc-topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:16px;flex-wrap:wrap;}
    .ppc-topbar-left{display:flex;align-items:flex-start;gap:14px;}
    .ppc-back-btn{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--ppc-border);border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:700;color:var(--ppc-text-dark);white-space:nowrap;cursor:pointer;margin-top:2px;}
    .ppc-back-btn i{color:var(--ppc-text-mid);font-size:11px;}
    .ppc-page-title{font-size:20px;font-weight:800;color:var(--ppc-text-dark);line-height:1.25;}
    .ppc-breadcrumb{font-size:11.5px;color:var(--ppc-text-light);font-weight:600;margin-top:3px;}
    .ppc-topbar-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;}
    .ppc-btn-outline{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--ppc-border);border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:var(--ppc-text-dark);white-space:nowrap;cursor:pointer;}
    .ppc-btn-outline i{color:var(--ppc-text-mid);font-size:12px;}
    .ppc-btn-primary{display:flex;align-items:center;gap:8px;background:var(--ppc-blue-accent);border:1px solid var(--ppc-blue-accent);border-radius:10px;padding:10px 16px;font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;cursor:pointer;box-shadow:0 4px 10px rgba(47,111,237,0.28);}
    .ppc-btn-primary i{font-size:10px;}

    .ppc-patient-card{background:var(--ppc-card);border:1px solid var(--ppc-border);border-radius:14px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px;flex-wrap:wrap;}
    .ppc-patient-id-block{display:flex;align-items:center;gap:16px;}
    .ppc-patient-photo{position:relative;flex-shrink:0;}
    .ppc-patient-photo img{width:74px;height:74px;border-radius:14px;object-fit:cover;}
    .ppc-photo-edit{position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:var(--ppc-blue-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid #fff;cursor:pointer;}
    .ppc-patient-name-row{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;}
    .ppc-patient-name{font-size:19px;font-weight:800;color:var(--ppc-text-dark);}
    .ppc-badge-status{background:var(--ppc-green-bg);color:#0a8a52;font-size:11px;font-weight:700;padding:4px 11px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;}
    .ppc-badge-status i{font-size:8px;}
    .ppc-hosp-label{font-size:10.5px;color:var(--ppc-text-light);font-weight:600;margin-bottom:2px;}
    .ppc-hosp-no-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
    .ppc-hosp-no{font-size:13px;font-weight:800;color:var(--ppc-blue);}
    .ppc-qr-icon-btn{width:24px;height:24px;border-radius:6px;background:var(--ppc-blue-bg);color:var(--ppc-blue);display:flex;align-items:center;justify-content:center;font-size:11px;}
    .ppc-patient-meta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
    .ppc-meta-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ppc-text-mid);font-weight:600;}
    .ppc-meta-item i{font-size:11px;color:var(--ppc-text-light);}

    .ppc-contact-grid{display:flex;gap:34px;flex-wrap:wrap;}
    .ppc-contact-item{display:flex;align-items:flex-start;gap:9px;}
    .ppc-contact-item i{width:30px;height:30px;border-radius:8px;background:var(--ppc-blue-bg);color:var(--ppc-blue);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:1px;}
    .ppc-contact-label{font-size:10.5px;color:var(--ppc-text-light);font-weight:600;margin-bottom:2px;}
    .ppc-contact-value{font-size:12.5px;font-weight:700;color:var(--ppc-text-dark);}

    .ppc-tabs-bar{display:flex;align-items:center;gap:4px;background:var(--ppc-card);border:1px solid var(--ppc-border);border-radius:14px;padding:6px;margin-bottom:18px;overflow-x:auto;}
    .ppc-tab-item{padding:9px 16px;border-radius:9px;font-size:12.5px;font-weight:700;color:var(--ppc-text-mid);white-space:nowrap;cursor:pointer;}
    .ppc-tab-item.active{background:var(--ppc-blue-accent);color:#fff;box-shadow:0 4px 10px rgba(47,111,237,0.3);}
    .ppc-tab-item:hover:not(.active){color:var(--ppc-text-dark);}

    .ppc-profile-grid{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;}
    .ppc-left-col{display:flex;flex-direction:column;gap:16px;min-width:0;}
    .ppc-right-col{display:flex;flex-direction:column;gap:16px;}

    .ppc-panel{background:var(--ppc-card);border:1px solid var(--ppc-border);border-radius:14px;padding:18px 20px;}
    .ppc-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:10px;}
    .ppc-panel-title{font-size:14px;font-weight:800;color:var(--ppc-text-dark);}
    .ppc-edit-link{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--ppc-blue);border:1px solid var(--ppc-blue-bg);background:var(--ppc-blue-bg);padding:6px 12px;border-radius:8px;cursor:pointer;}
    .ppc-view-all-link{font-size:11.5px;font-weight:700;color:var(--ppc-blue);background:none;border:none;padding:0;cursor:pointer;}

    .ppc-info-two-col{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;}
    .ppc-info-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--ppc-border);gap:10px;}
    .ppc-info-row:last-child{border-bottom:none;}
    .ppc-info-label{font-size:12px;color:var(--ppc-text-mid);font-weight:600;flex-shrink:0;}
    .ppc-info-value{font-size:12px;color:var(--ppc-text-dark);font-weight:700;text-align:right;}

    .ppc-contact-address-grid{display:flex;flex-direction:column;gap:14px;}
    .ppc-ca-row{display:flex;align-items:flex-start;gap:11px;}
    .ppc-ca-ic{width:32px;height:32px;border-radius:9px;background:var(--ppc-blue-bg);color:var(--ppc-blue);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
    .ppc-ca-label{font-size:10.5px;color:var(--ppc-text-light);font-weight:600;margin-bottom:2px;}
    .ppc-ca-value{font-size:12.5px;color:var(--ppc-text-dark);font-weight:700;}
    .ppc-ca-divider{border-top:1px solid var(--ppc-border);margin:2px 0;}

    .ppc-summary-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;}
    .ppc-summary-card{border:1px solid var(--ppc-border);border-radius:12px;padding:13px 12px;display:flex;flex-direction:column;gap:6px;}
    .ppc-summary-ic{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;}
    .ppc-summary-label{font-size:10.5px;color:var(--ppc-text-mid);font-weight:700;}
    .ppc-summary-value{font-size:19px;font-weight:800;color:var(--ppc-text-dark);}
    .ppc-summary-link{font-size:10.5px;color:var(--ppc-blue);font-weight:700;display:flex;align-items:center;gap:3px;margin-top:auto;background:none;border:none;padding:0;cursor:pointer;}

    .ppc-wrap table{width:100%;border-collapse:collapse;}
    .ppc-wrap thead th{text-align:left;font-size:10.5px;letter-spacing:.03em;color:var(--ppc-text-light);text-transform:uppercase;font-weight:700;padding:8px 6px;border-bottom:1px solid var(--ppc-border);}
    .ppc-wrap tbody td{padding:11px 6px;border-bottom:1px solid var(--ppc-border);font-size:12.5px;vertical-align:middle;color:var(--ppc-text-dark);font-weight:600;}
    .ppc-wrap tbody tr:last-child td{border-bottom:none;}
    .ppc-badge-pill{background:var(--ppc-green-bg);color:#0a8a52;font-size:11px;font-weight:700;padding:4px 11px;border-radius:20px;display:inline-block;}

    .ppc-two-table-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

    .ppc-qa-grid{display:flex;flex-direction:column;gap:9px;}
    .ppc-qa-btn{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;}
    .ppc-qa-ic{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;flex-shrink:0;}
    .ppc-qa-more{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-radius:11px;border:1px solid var(--ppc-border);font-size:12.5px;font-weight:700;color:var(--ppc-text-mid);margin-top:2px;cursor:pointer;}

    .ppc-simple-note{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ppc-text-mid);font-weight:600;}
    .ppc-simple-note i{color:var(--ppc-green);font-size:13px;}

    .ppc-emg-list{display:flex;flex-direction:column;gap:10px;}
    .ppc-emg-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--ppc-border);gap:10px;}
    .ppc-emg-row:last-child{border-bottom:none;padding-bottom:0;}
    .ppc-emg-label{font-size:11.5px;color:var(--ppc-text-light);font-weight:600;flex-shrink:0;}
    .ppc-emg-value{font-size:12px;color:var(--ppc-text-dark);font-weight:700;text-align:right;max-width:60%;}

    @media (max-width:1200px){
      .ppc-profile-grid{grid-template-columns:1fr;}
      .ppc-summary-grid{grid-template-columns:repeat(3,1fr);}
      .ppc-two-table-grid{grid-template-columns:1fr;}
    }
    @media (max-width:720px){
      .ppc-info-two-col{grid-template-columns:1fr;}
      .ppc-summary-grid{grid-template-columns:repeat(2,1fr);}
      .ppc-contact-grid{gap:18px;}
    }
  `;

  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const el = document.createElement('style');
    el.id = 'ppc-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ── Sensible defaults so the component renders something reasonable
  //     even if the host page only supplies partial data ──
  const DEFAULT_QUICK_ACTIONS = [
    { key: 'checkin', icon: 'fa-solid fa-check', iconBg: 'var(--ppc-green)', className: 'ppc-qa-checkin', label: 'Check In Patient' },
    { key: 'book', icon: 'fa-regular fa-calendar-plus', iconBg: 'var(--ppc-purple)', className: 'ppc-qa-book', label: 'Book Appointment' },
    { key: 'visit', icon: 'fa-solid fa-plus', iconBg: 'var(--ppc-blue)', className: 'ppc-qa-visit', label: 'Create Visit' },
    { key: 'print', icon: 'fa-solid fa-print', iconBg: 'var(--ppc-orange)', className: 'ppc-qa-print', label: 'Print Patient Card' },
  ];
  const DEFAULT_SUMMARY = [
    { key: 'visits', icon: 'fa-solid fa-user-group', iconColor: 'var(--ppc-purple)', iconBg: 'var(--ppc-purple-bg)', label: 'Total Visits', value: '0', linkText: 'View all visits' },
    { key: 'appointments', icon: 'fa-regular fa-calendar', iconColor: 'var(--ppc-blue)', iconBg: 'var(--ppc-blue-bg)', label: 'Appointments', value: '0', linkText: 'View all' },
    { key: 'labs', icon: 'fa-solid fa-flask', iconColor: 'var(--ppc-blue)', iconBg: 'var(--ppc-blue-bg)', label: 'Lab Tests', value: '0', linkText: 'View results' },
    { key: 'prescriptions', icon: 'fa-solid fa-prescription', iconColor: 'var(--ppc-red)', iconBg: 'var(--ppc-red-bg)', label: 'Prescriptions', value: '0', linkText: 'View all' },
    { key: 'bills', icon: 'fa-solid fa-file-invoice', iconColor: 'var(--ppc-orange)', iconBg: 'var(--ppc-orange-bg)', label: 'Total Bills', value: '₦0', linkText: 'View billing' },
    { key: 'payments', icon: 'fa-solid fa-sack-dollar', iconColor: 'var(--ppc-green)', iconBg: 'var(--ppc-green-bg)', label: 'Payments', value: '₦0', linkText: 'View payments' },
  ];
  const DEFAULT_TABS = ['Overview', 'Visit History', 'Medical History', 'Documents', 'Appointments', 'Lab Results', 'Prescriptions', 'Billing', 'Notes', 'Vitals Trend'];

  let _instanceCounter = 0;

  function attach(target, options) {
    options = options || {};
    _injectStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) { console.warn('[ShilohPatientProfile] Target not found:', target); return null; }

    const instId = 'ppc' + (++_instanceCounter);

    let patient = Object.assign({
      photo: 'https://i.pravatar.cc/160?img=12',
      name: 'Unnamed Patient',
      status: 'Active Patient',
      hospitalNo: '—',
      age: '', gender: '', dob: '', bloodGroup: '',
      phonePrimary: '', phoneSecondary: '', email: '', address: '', lastVisit: '', registeredOn: '',
      demographicLeft: [],
      demographicRight: [],
      summary: DEFAULT_SUMMARY,
      quickActions: DEFAULT_QUICK_ACTIONS,
      allergies: 'No known allergies',
      chronicConditions: 'No chronic conditions recorded',
      emergencyContact: { name: '', relationship: '', phone: '', address: '' },
    }, options.patient || {});

    let tabs = options.tabs || DEFAULT_TABS;
    let activeTab = options.activeTab || tabs[0];
    let visits = options.visits || [];
    let prescriptions = options.prescriptions || [];
    const breadcrumb = options.breadcrumb || 'Dashboard / Patients / All Patients / Patient Profile';

    function infoRowsHtml(rows) {
      return (rows || []).map(r => `
        <div class="ppc-info-row"><span class="ppc-info-label">${_esc(r.label)}</span><span class="ppc-info-value">${_esc(r.value)}</span></div>
      `).join('');
    }

    function summaryHtml() {
      return (patient.summary || []).map(s => `
        <div class="ppc-summary-card">
          <div class="ppc-summary-ic" style="background:${s.iconBg || 'var(--ppc-blue-bg)'};color:${s.iconColor || 'var(--ppc-blue)'};"><i class="${s.icon}"></i></div>
          <div class="ppc-summary-label">${_esc(s.label)}</div>
          <div class="ppc-summary-value">${_esc(s.value)}</div>
          <button class="ppc-summary-link" data-ppc-summary="${_esc(s.key)}">${_esc(s.linkText || 'View')} <i class="fa-solid fa-arrow-right" style="font-size:8px;"></i></button>
        </div>
      `).join('');
    }

    function quickActionsHtml() {
      return (patient.quickActions || []).map(qa => `
        <div class="ppc-qa-btn ${qa.className || ''}" data-ppc-qa="${_esc(qa.key)}" style="background:${qa.bg || ''};color:${qa.color || ''};">
          <div class="ppc-qa-ic" style="background:${qa.iconBg || 'var(--ppc-blue)'};"><i class="${qa.icon}"></i></div>${_esc(qa.label)}
        </div>
      `).join('');
    }

    function tabsHtml() {
      return tabs.map(t => `<div class="ppc-tab-item${t === activeTab ? ' active' : ''}" data-ppc-tab="${_esc(t)}">${_esc(t)}</div>`).join('');
    }

    function tableRowsHtml(rows, cols) {
      if (!rows.length) return `<tr><td colspan="${cols}" style="text-align:center;color:var(--ppc-text-light);">No records yet.</td></tr>`;
      return rows.map(r => `
        <tr>
          <td>${_esc(r.no)}</td><td>${_esc(r.date)}</td>
          ${r.department !== undefined ? `<td>${_esc(r.department)}</td>` : ''}
          <td>${_esc(r.doctor)}</td>
          <td><span class="ppc-badge-pill">${_esc(r.status)}</span></td>
        </tr>`).join('');
    }

    function emergencyHtml() {
      const ec = patient.emergencyContact || {};
      return `
        <div class="ppc-emg-row"><span class="ppc-emg-label">Name</span><span class="ppc-emg-value">${_esc(ec.name)}</span></div>
        <div class="ppc-emg-row"><span class="ppc-emg-label">Relationship</span><span class="ppc-emg-value">${_esc(ec.relationship)}</span></div>
        <div class="ppc-emg-row"><span class="ppc-emg-label">Phone</span><span class="ppc-emg-value">${_esc(ec.phone)}</span></div>
        <div class="ppc-emg-row"><span class="ppc-emg-label">Address</span><span class="ppc-emg-value">${_esc(ec.address)}</span></div>
      `;
    }

    function template() {
      return `
        <div class="ppc-wrap" id="${instId}">

          <div class="ppc-topbar">
            <div class="ppc-topbar-left">
              <div class="ppc-back-btn" data-ppc-back><i class="fa-solid fa-arrow-left"></i> Back</div>
              <div>
                <div class="ppc-page-title">Patient Profile</div>
                <div class="ppc-breadcrumb">${_esc(breadcrumb)}</div>
              </div>
            </div>
            <div class="ppc-topbar-actions">
              <div class="ppc-btn-outline" data-ppc-printprofile><i class="fa-solid fa-print"></i> Print Profile</div>
              <div class="ppc-btn-outline" data-ppc-printid><i class="fa-regular fa-id-card"></i> Print ID Card</div>
              <div class="ppc-btn-primary" data-ppc-actions>Actions <i class="fa-solid fa-chevron-down"></i></div>
            </div>
          </div>

          <div class="ppc-patient-card">
            <div class="ppc-patient-id-block">
              <div class="ppc-patient-photo">
                <img src="${_esc(patient.photo)}" alt="${_esc(patient.name)}">
                <div class="ppc-photo-edit" data-ppc-photoedit><i class="fa-solid fa-camera"></i></div>
              </div>
              <div>
                <div class="ppc-patient-name-row">
                  <div class="ppc-patient-name">${_esc(patient.name)}</div>
                  <span class="ppc-badge-status"><i class="fa-solid fa-circle"></i>${_esc(patient.status)}</span>
                </div>
                <div class="ppc-hosp-label">Hospital No.</div>
                <div class="ppc-hosp-no-row">
                  <div class="ppc-hosp-no">${_esc(patient.hospitalNo)}</div>
                  <div class="ppc-qr-icon-btn"><i class="fa-solid fa-qrcode"></i></div>
                </div>
                <div class="ppc-patient-meta-row">
                  <div class="ppc-meta-item"><i class="fa-regular fa-clock"></i>${_esc(patient.age)}</div>
                  <div class="ppc-meta-item"><i class="fa-solid fa-venus-mars"></i>${_esc(patient.gender)}</div>
                  <div class="ppc-meta-item"><i class="fa-regular fa-calendar"></i>${_esc(patient.dob)}</div>
                  <div class="ppc-meta-item"><i class="fa-solid fa-droplet"></i>${_esc(patient.bloodGroup)}</div>
                </div>
              </div>
            </div>

            <div class="ppc-contact-grid">
              <div class="ppc-contact-item"><i class="fa-solid fa-phone"></i><div><div class="ppc-contact-label">Phone (Primary)</div><div class="ppc-contact-value">${_esc(patient.phonePrimary)}</div></div></div>
              <div class="ppc-contact-item"><i class="fa-solid fa-phone"></i><div><div class="ppc-contact-label">Phone (Secondary)</div><div class="ppc-contact-value">${_esc(patient.phoneSecondary)}</div></div></div>
              <div class="ppc-contact-item"><i class="fa-regular fa-envelope"></i><div><div class="ppc-contact-label">Email</div><div class="ppc-contact-value">${_esc(patient.email)}</div></div></div>
              <div class="ppc-contact-item"><i class="fa-solid fa-location-dot"></i><div><div class="ppc-contact-label">Address</div><div class="ppc-contact-value">${patient.address ? _esc(patient.address).replace(/\n/g, '<br>') : ''}</div></div></div>
              <div class="ppc-contact-item"><i class="fa-regular fa-calendar-check"></i><div><div class="ppc-contact-label">Last Visit</div><div class="ppc-contact-value">${_esc(patient.lastVisit)}</div></div></div>
              <div class="ppc-contact-item"><i class="fa-regular fa-clock"></i><div><div class="ppc-contact-label">Registered On</div><div class="ppc-contact-value">${_esc(patient.registeredOn)}</div></div></div>
            </div>
          </div>

          <div class="ppc-tabs-bar" data-ppc-tabsbar>${tabsHtml()}</div>

          <div class="ppc-profile-grid">
            <div class="ppc-left-col">

              <div class="ppc-panel">
                <div class="ppc-panel-head">
                  <div class="ppc-panel-title">Demographic Information</div>
                  <div class="ppc-edit-link" data-ppc-edit="demographic"><i class="fa-solid fa-pen"></i> Edit</div>
                </div>
                <div class="ppc-info-two-col">
                  <div>${infoRowsHtml(patient.demographicLeft)}</div>
                  <div>${infoRowsHtml(patient.demographicRight)}</div>
                </div>
              </div>

              <div class="ppc-panel">
                <div class="ppc-panel-head">
                  <div class="ppc-panel-title">Contact &amp; Address</div>
                  <div class="ppc-edit-link" data-ppc-edit="contact"><i class="fa-solid fa-pen"></i> Edit</div>
                </div>
                <div class="ppc-contact-address-grid">
                  <div class="ppc-ca-row"><div class="ppc-ca-ic"><i class="fa-solid fa-phone"></i></div><div><div class="ppc-ca-label">Phone (Primary)</div><div class="ppc-ca-value">${_esc(patient.phonePrimary)}</div></div></div>
                  <div class="ppc-ca-row"><div class="ppc-ca-ic"><i class="fa-solid fa-phone"></i></div><div><div class="ppc-ca-label">Phone (Secondary)</div><div class="ppc-ca-value">${_esc(patient.phoneSecondary)}</div></div></div>
                  <div class="ppc-ca-row"><div class="ppc-ca-ic"><i class="fa-regular fa-envelope"></i></div><div><div class="ppc-ca-label">Email</div><div class="ppc-ca-value">${_esc(patient.email)}</div></div></div>
                  <div class="ppc-ca-divider"></div>
                  <div class="ppc-ca-row"><div class="ppc-ca-ic"><i class="fa-solid fa-location-dot"></i></div><div><div class="ppc-ca-label">Residential Address</div><div class="ppc-ca-value">${patient.address ? _esc(patient.address).replace(/\n/g, '<br>') : ''}</div></div></div>
                </div>
              </div>

              <div class="ppc-panel">
                <div class="ppc-panel-head"><div class="ppc-panel-title">Summary</div></div>
                <div class="ppc-summary-grid">${summaryHtml()}</div>
              </div>

              <div class="ppc-two-table-grid">
                <div class="ppc-panel">
                  <div class="ppc-panel-head"><div class="ppc-panel-title">Recent Visits</div><button class="ppc-view-all-link" data-ppc-viewall="visits">View All</button></div>
                  <table>
                    <thead><tr><th>Visit No.</th><th>Date</th><th>Department</th><th>Doctor</th><th>Status</th></tr></thead>
                    <tbody data-ppc-visits-body>${tableRowsHtml(visits, 5)}</tbody>
                  </table>
                </div>
                <div class="ppc-panel">
                  <div class="ppc-panel-head"><div class="ppc-panel-title">Recent Prescriptions</div><button class="ppc-view-all-link" data-ppc-viewall="prescriptions">View All</button></div>
                  <table>
                    <thead><tr><th>Prescription No.</th><th>Date</th><th>Doctor</th><th>Status</th></tr></thead>
                    <tbody data-ppc-rx-body>${tableRowsHtml(prescriptions, 4)}</tbody>
                  </table>
                </div>
              </div>

            </div>

            <div class="ppc-right-col">
              <div class="ppc-panel">
                <div class="ppc-panel-head"><div class="ppc-panel-title">Quick Actions</div></div>
                <div class="ppc-qa-grid">
                  ${quickActionsHtml()}
                  <div class="ppc-qa-more" data-ppc-qa="more">More Actions <i class="fa-solid fa-chevron-down" style="font-size:10px;"></i></div>
                </div>
              </div>

              <div class="ppc-panel">
                <div class="ppc-panel-head"><div class="ppc-panel-title">Allergies</div><div class="ppc-edit-link" data-ppc-edit="allergies"><i class="fa-solid fa-pen"></i> Edit</div></div>
                <div class="ppc-simple-note"><i class="fa-solid fa-circle-check"></i>${_esc(patient.allergies)}</div>
              </div>

              <div class="ppc-panel">
                <div class="ppc-panel-head"><div class="ppc-panel-title">Chronic Conditions</div><div class="ppc-edit-link" data-ppc-edit="chronic"><i class="fa-solid fa-pen"></i> Edit</div></div>
                <div class="ppc-simple-note"><i class="fa-solid fa-circle-check"></i>${_esc(patient.chronicConditions)}</div>
              </div>

              <div class="ppc-panel">
                <div class="ppc-panel-head"><div class="ppc-panel-title">Emergency Contact</div><div class="ppc-edit-link" data-ppc-edit="emergency"><i class="fa-solid fa-pen"></i> Edit</div></div>
                <div class="ppc-emg-list">${emergencyHtml()}</div>
              </div>
            </div>
          </div>

        </div>`;
    }

    function render() {
      container.innerHTML = template();
      bindEvents();
    }

    function bindEvents() {
      const root = container.querySelector('#' + instId);
      if (!root) return;

      root.querySelector('[data-ppc-back]')?.addEventListener('click', () => {
        if (typeof options.onBack === 'function') options.onBack();
      });
      root.querySelector('[data-ppc-printprofile]')?.addEventListener('click', () => {
        if (typeof options.onPrintProfile === 'function') options.onPrintProfile();
      });
      root.querySelector('[data-ppc-printid]')?.addEventListener('click', () => {
        if (typeof options.onPrintId === 'function') options.onPrintId();
      });
      root.querySelector('[data-ppc-actions]')?.addEventListener('click', () => {
        if (typeof options.onActions === 'function') options.onActions();
      });
      root.querySelector('[data-ppc-photoedit]')?.addEventListener('click', () => {
        if (typeof options.onPhotoEdit === 'function') options.onPhotoEdit();
      });

      root.querySelector('[data-ppc-tabsbar]')?.addEventListener('click', e => {
        const t = e.target.closest('[data-ppc-tab]');
        if (!t) return;
        activeTab = t.dataset.ppcTab;
        root.querySelectorAll('[data-ppc-tab]').forEach(el => el.classList.toggle('active', el.dataset.ppcTab === activeTab));
        if (typeof options.onTabChange === 'function') options.onTabChange(activeTab);
      });

      root.querySelectorAll('[data-ppc-edit]').forEach(el => {
        el.addEventListener('click', () => {
          if (typeof options.onEditSection === 'function') options.onEditSection(el.dataset.ppcEdit);
        });
      });

      root.querySelectorAll('[data-ppc-qa]').forEach(el => {
        el.addEventListener('click', () => {
          if (typeof options.onQuickAction === 'function') options.onQuickAction(el.dataset.ppcQa);
        });
      });

      root.querySelectorAll('[data-ppc-summary]').forEach(el => {
        el.addEventListener('click', () => {
          if (typeof options.onSummaryClick === 'function') options.onSummaryClick(el.dataset.ppcSummary);
        });
      });

      root.querySelector('[data-ppc-viewall="visits"]')?.addEventListener('click', () => {
        if (typeof options.onViewAllVisits === 'function') options.onViewAllVisits();
      });
      root.querySelector('[data-ppc-viewall="prescriptions"]')?.addEventListener('click', () => {
        if (typeof options.onViewAllPrescriptions === 'function') options.onViewAllPrescriptions();
      });
    }

    render();

    // ── Public control object ──
    return {
      setPatient(p) { patient = Object.assign({}, patient, p || {}); render(); },
      getPatient() { return patient; },
      setTab(tabName) {
        activeTab = tabName;
        const root = container.querySelector('#' + instId);
        root?.querySelectorAll('[data-ppc-tab]').forEach(el => el.classList.toggle('active', el.dataset.ppcTab === activeTab));
      },
      setTabs(newTabs) { tabs = newTabs; render(); },
      setVisits(list) { visits = list || []; const tb = container.querySelector('[data-ppc-visits-body]'); if (tb) tb.innerHTML = tableRowsHtml(visits, 5); },
      setPrescriptions(list) { prescriptions = list || []; const tb = container.querySelector('[data-ppc-rx-body]'); if (tb) tb.innerHTML = tableRowsHtml(prescriptions, 4); },
      destroy() { container.innerHTML = ''; },
    };
  }

  window.ShilohPatientProfile = { attach };

})();