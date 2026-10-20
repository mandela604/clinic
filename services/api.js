/**
 * ShilohAPI — shared backend helper (BACKEND-ONLY, no DemoData, no localStorage data fallback).
 * Load this file BEFORE any other service file.
 * localStorage is used ONLY for the auth token, never for data caching.
 */
(function () {
  function toast(msg, type) {
    try {
      var id = 'shiloh-toast';
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.bottom = '24px';
        el.style.transform = 'translateX(-50%)';
        el.style.padding = '12px 18px';
        el.style.borderRadius = '8px';
        el.style.fontSize = '14px';
        el.style.zIndex = '9999';
        el.style.maxWidth = '90vw';
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
        el.style.transition = 'opacity 0.3s';
        document.body.appendChild(el);
      }
      el.textContent = String(msg == null ? '' : msg);
      el.style.background = (type === 'error') ? '#c0392b' : '#2c3e50';
      el.style.color = '#fff';
      el.style.opacity = '1';
      el.style.display = 'block';
      if (el._t) clearTimeout(el._t);
      el._t = setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.style.display = 'none'; }, 300);
      }, 3000);
    } catch (e) {
      try { console.error(msg); } catch (_) {}
    }
  }

  function token() {
    try { return localStorage.getItem('shiloh_token'); }
    catch (e) { return null; }
  }

  function headers(json) {
    var h = {};
    if (json) h['Content-Type'] = 'application/json';
    var t = token();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  async function handle(res) {
    if (res.ok) {
      try { return await res.json(); }
      catch (e) { return {}; }
    }
    var err = {};
    try { err = await res.json(); } catch (e) {}
    var msg = (err && (err.error || err.message)) || ('Request failed (' + res.status + ')');
    throw new Error(msg);
  }

  function defaultBase() {
    // 1) Explicit override always wins
    try { if (window.__SHILOH_API__) return window.__SHILOH_API__; } catch (e) {}
    try {
      var loc = window.location;
      // file:// or local Live Server (any port other than the API port) -> local API
      if (loc.protocol === 'file:') return 'http://localhost:5001/api';
      var host = loc.hostname;
      var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
      if (isLocal && loc.port && loc.port !== '5001') return 'http://localhost:5001/api';
      // Same origin (Express static or Render) -> relative API
      return loc.origin + '/api';
    } catch (e) { return 'http://localhost:5001/api'; }
  }

  window.ShilohAPI = {
    BASE: defaultBase(),
    token: token,
    headers: headers,
    handle: handle,
    toast: toast
  };
})();
