/**
 * shiloh-sidebar.js — Shiloh Clinic Reusable Sidebar Nav
 * ─────────────────────────────────────────────────────────────────────
 * Built the same way as dashboard-shell.js: drop one
 *   <script src="shiloh-sidebar.js"></script>
 * near the top of <body>, then call attach() once you have a target
 * element. It renders the navy sidebar (logo, MAIN nav, ADMINISTRATION
 * nav, user block, logout) using real <a href="..."> links — clicking
 * one genuinely navigates the browser to that page (works with
 * ctrl/cmd-click, middle-click, "open in new tab", no-JS fallback).
 * There is no SPA routing here on purpose — every page is its own
 * self-contained .html file that includes this same script.
 *
 * This component renders ONLY the sidebar — pair it with
 * patient-profile.js (or any other page content) in the same page;
 * neither one depends on the other.
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *   <body style="display:flex;min-height:100vh;">
 *     <div id="sidebarPlaceholder"></div>
 *     <main class="your-main-content-area">...</main>
 *   </body>
 *   <script src="shiloh-sidebar.js"></script>
 *   <script>
 *     const sb = ShilohSidebar.attach('#sidebarPlaceholder', {
 *       activeFile: 'patients.html',     // omit to auto-detect from location.pathname
 *       user: { name: 'Receptionist', role: 'Front Desk' },
 *       onLogout: () => { ... },         // optional, else navigates to logout.html
 *       onNavigate: (href) => { ... },   // optional — fires right before navigation, doesn't block it
 *     });
 *
 *     sb.setActive('visits.html');       // programmatically change highlighted item
 *     sb.setUser({ name: 'Dr. Samuel O.', role: 'Physician' });
 *     sb.destroy();
 *
 * ── DEFAULT PAGES IT LINKS TO ─────────────────────────────────────────
 *   MAIN: dashboard.html, patients.html, visits.html, appointments.html,
 *         nursing.html, laboratory.html, pharmacy.html, billing.html,
 *         reports.html
 *   ADMINISTRATION: users.html, roles-permissions.html, settings.html,
 *         audit-logs.html
 *
 * Override wholesale via options.navItems — same shape as DEFAULT_NAV
 * below: an array of { section, items:[{label, href, icon}] } groups.
 * `icon` is raw inline SVG markup (kept dependency-free, no icon font
 * required) — pass your own to swap icon sets.
 */

(function () {
  'use strict';

  if (window.__shilohSidebar) return;
  window.__shilohSidebar = true;

  // ══════════════════════════════════════════════════════════════════════
  // Icons — inline SVG strings (no external icon font dependency)
  // ══════════════════════════════════════════════════════════════════════
  const ICONS = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>`,
    patients: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 14.5c2.5.3 4 2 4 5.5"/></svg>`,
    visits: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    appointments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    nursing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M8 14v2a4 4 0 004 4 4 4 0 004-4v-2M6 21h12"/></svg>`,
    laboratory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6L3 20a1 1 0 001 2h16a1 1 0 001-2L15 8V2M9 2h6"/></svg>`,
    pharmacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/></svg>`,
    billing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/></svg>`,
    roles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z"/></svg>`,
    auditlogs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
  };

  // ══════════════════════════════════════════════════════════════════════
  // Default nav — override wholesale via options.navItems if needed
  // ══════════════════════════════════════════════════════════════════════
  const DEFAULT_NAV = [
    { section: null, items: [
      { label: 'Dashboard', href: 'dashboard.html', icon: ICONS.dashboard },
      { label: 'Patients', href: 'patients.html', icon: ICONS.patients },
      { label: 'Visits', href: 'visits.html', icon: ICONS.visits },
      { label: 'Appointments', href: 'appointments.html', icon: ICONS.appointments },
      { label: 'Nursing', href: 'nursing.html', icon: ICONS.nursing },
      { label: 'Consultation', href: 'consultation.html', icon: ICONS.appointments },
      { label: 'Laboratory', href: 'laboratory.html', icon: ICONS.laboratory },
      { label: 'Pharmacy', href: 'pharmacy.html', icon: ICONS.pharmacy },
      { label: 'Billing', href: 'billing.html', icon: ICONS.billing },
    ] },
    { section: 'ADMINISTRATION', items: [
      { label: 'Admissions', href: 'admissions.html', icon: ICONS.nursing },
      { label: 'Reports', href: 'reports.html', icon: ICONS.reports },
      { label: 'Users', href: 'users.html', icon: ICONS.users },
      { label: 'Roles & Permissions', href: 'roles-permissions.html', icon: ICONS.roles },
      { label: 'Settings', href: 'settings.html', icon: ICONS.settings },
    ] },
  ];

  // ══════════════════════════════════════════════════════════════════════
  // CSS  (ssb- prefixed, scoped under .ssb-wrap, self-contained)
  // ══════════════════════════════════════════════════════════════════════
  const CSS = `
    .ssb-wrap{
      --ssb-navy:#0d1b4c; --ssb-navy-active:#1e3a8a; --ssb-blue:#2563eb;
      --ssb-text:#cbd5e1; --ssb-text-faint:#6b7ba3; --ssb-white:#ffffff;
      font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      width:220px; flex-shrink:0; height:100vh; position:sticky; top:0;
      background:var(--ssb-navy); color:var(--ssb-text);
      display:flex; flex-direction:column; padding:20px 0;
    }
    .ssb-wrap *, .ssb-wrap *::before, .ssb-wrap *::after{box-sizing:border-box;}

    .ssb-logo{display:flex;align-items:center;gap:10px;padding:0 20px 20px 20px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:16px;}
    .ssb-logo-icon{width:36px;height:36px;background:var(--ssb-blue);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .ssb-logo-icon svg{width:20px;height:20px;}
    .ssb-logo-text{color:#fff;font-size:14px;font-weight:600;line-height:1.3;}

    .ssb-section-label{font-size:10.5px;letter-spacing:0.05em;color:var(--ssb-text-faint);padding:10px 20px 6px 20px;font-weight:600;}
    .ssb-nav{overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;}
    .ssb-nav::-webkit-scrollbar{display:none;}
    .ssb-wrap .ssb-item{display:flex;align-items:center;gap:12px;padding:10px 20px;font-size:13.5px;color:var(--ssb-text);text-decoration:none;cursor:pointer;border-left:3px solid transparent;}
    .ssb-wrap .ssb-item svg{width:17px;height:17px;opacity:0.85;flex-shrink:0;}
    .ssb-wrap .ssb-item:hover{background:rgba(255,255,255,0.05);}
    .ssb-wrap .ssb-item.active{background:var(--ssb-navy-active);color:#fff;border-left:3px solid #60a5fa;font-weight:500;}
    .ssb-wrap .ssb-item.active svg{opacity:1;}

    .ssb-bottom{margin-top:auto;}
    .ssb-user-block{display:flex;align-items:center;gap:10px;margin:10px 16px;padding:10px;background:rgba(255,255,255,0.05);border-radius:10px;cursor:pointer;}
    .ssb-user-avatar{width:34px;height:34px;border-radius:50%;background:#2563eb;background-size:cover;background-position:center;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;letter-spacing:.4px;overflow:hidden;}
    .ssb-user-name{color:#fff;font-size:13px;font-weight:600;}
    .ssb-user-role{color:#94a3b8;font-size:11px;}
    .ssb-wrap .ssb-logout{display:flex;align-items:center;gap:12px;padding:12px 20px;font-size:13.5px;color:var(--ssb-text);cursor:pointer;}
    .ssb-wrap .ssb-logout:hover{color:#fff;}
    .ssb-wrap .ssb-logout svg{width:17px;height:17px;}

    @media (max-width:720px){
      .ssb-wrap{display:none;}
    }
  `;

  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const el = document.createElement('style');
    el.id = 'ssb-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function _esc(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function _initials(name) {
    return String(name || '').trim().split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'U';
  }

  function _currentFile() {
    const path = location.pathname.split('/').pop();
    return path || 'index.html';
  }

  let _instanceCounter = 0;

  function attach(target, options) {
    options = options || {};
    _injectStyles();

    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) { console.warn('[ShilohSidebar] Target not found:', target); return null; }

    const instId = 'ssb' + (++_instanceCounter);
    const nav = options.navItems || DEFAULT_NAV;
    let activeFile = options.activeFile || _currentFile();
    let user = Object.assign({ name: 'User', role: '', avatar: null }, options.user || {});
    // Always prefer the actually signed-in account (set at login)
    try {
      const raw = localStorage.getItem('shiloh_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.name || u.username)) {
          user = {
            name: u.name || u.username || 'User',
            role: u.role || u.roleName || '',
            avatar: u.avatar || null
          };
        }
      }
    } catch (e) {}

    function navHtml() {
      return nav.map(group => `
        ${group.section ? `<div class="ssb-section-label">${_esc(group.section)}</div>` : ''}
        ${group.items.map(item => `
          <a class="ssb-item${item.href === activeFile ? ' active' : ''}" href="${_esc(item.href)}" data-ssb-file="${_esc(item.href)}">
            ${item.icon || ''}${_esc(item.label)}
          </a>`).join('')}
      `).join('');
    }

    function userBlockHtml() {
      return `
        <div class="ssb-user-block" id="${instId}-userblock">
          <div class="ssb-user-avatar">${_esc(_initials(user.name))}</div>
          <div>
            <div class="ssb-user-name">${_esc(user.name)}</div>
            <div class="ssb-user-role">${_esc(user.role)}</div>
          </div>
        </div>`;
    }

    function render() {
      container.innerHTML = `
        <aside class="ssb-wrap" id="${instId}">
          <div class="ssb-logo">
            <div class="ssb-logo-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.5-4.5-9.5-9C.5 7.5 3 3.5 7 3.5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8.5C19.5 16.5 12 21 12 21z" fill="#fff"/><path d="M9 12h2v-2h2v2h2v2h-2v2h-2v-2H9v-2z" fill="#2563eb"/></svg></div>
            <div class="ssb-logo-text">Shiloh Clinic &amp;<br>Maternity</div>
          </div>

          <nav class="ssb-nav" id="${instId}-nav">${navHtml()}</nav>

          <div class="ssb-bottom">
            ${userBlockHtml()}
            <a class="ssb-logout" id="${instId}-logout">${ICONS.logout}Logout</a>
          </div>
        </aside>`;
      bindEvents();
    }

    function bindEvents() {
      const navEl = document.getElementById(instId + '-nav');
      if (typeof options.onNavigate === 'function') {
        navEl.querySelectorAll('.ssb-item').forEach(a => {
          a.addEventListener('click', () => options.onNavigate(a.dataset.ssbFile));
        });
      }
      document.getElementById(instId + '-logout').addEventListener('click', () => {
        if (typeof options.onLogout === 'function') return options.onLogout();
        try {
          const token = localStorage.getItem('shiloh_token');
          if (token) {
            fetch('/api/auth/logout', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token },
              keepalive: true
            }).catch(() => {});
          }
          localStorage.removeItem('shiloh_token');
          localStorage.removeItem('shiloh_user');
        } catch (e) {}
        location.href = 'login.html';
      });
      const userBlock = document.getElementById(instId + '-userblock');
      if (userBlock && typeof options.onUserClick === 'function') {
        userBlock.addEventListener('click', () => options.onUserClick());
      }
    }

    render();

    // Scroll active item into view on load
    const activeEl = document.querySelector(`#${instId}-nav .ssb-item.active`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // ── Public control object ──
    return {
      setActive(file) {
        activeFile = file;
        const navEl = document.getElementById(instId + '-nav');
        navEl?.querySelectorAll('.ssb-item').forEach(a => a.classList.toggle('active', a.dataset.ssbFile === file));
      },
      setUser(u) { user = Object.assign({}, user, u || {}); render(); },
      getActive() { return activeFile; },
      destroy() { container.innerHTML = ''; },
    };
  }

  window.ShilohSidebar = { attach, DEFAULT_NAV, ICONS };
  window.ShilohAvatar = { initials: _initials };

})();