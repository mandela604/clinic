/**
 * app-shell.js — Shiloh Clinic lightweight "app shell" navigation
 * ─────────────────────────────────────────────────────────────────────
 * Keeps the sidebar/topbar persistent and only fetches + swaps each
 * page's <main>...</main> content, instead of a full page reload.
 * No framework, no build step — every page is still a real, standalone
 * .html file; this just intercepts clicks so navigation feels instant.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 *   1. Include this script on every page (after the sidebar script is fine):
 *        <script src="app-shell.js"></script>
 *   2. Wrap each page's real content in a single <main>...</main> —
 *      that's the element that gets swapped out.
 *   3. Mark any link that should use the fast path with data-link:
 *        <a href="lab-test.html" data-link>New Test Order</a>
 *        <a href="patient-profile.html?hosp=SHC-000123" data-link>...</a>
 *      Sidebar links rendered by shiloh-sidebar.js already carry
 *      data-link automatically.
 *
 * ── BEHAVIOR ─────────────────────────────────────────────────────────────
 * - Click on a[data-link] → fetch the target HTML, swap in its <main>,
 *   update document.title, push the URL to history, scroll to top.
 * - Ctrl/Cmd/Shift/Alt-click, middle-click, or target="_blank" links are
 *   left alone (native browser behavior — open in new tab, etc.).
 * - Cross-origin links are left alone.
 * - If the fetch fails, or the target page has no <main>, falls back to
 *   a normal full navigation (location.href) so nothing ever silently
 *   breaks.
 * - Back/forward (popstate): simplest possible fallback — full reload.
 *   That keeps this file tiny; every page still works perfectly on a
 *   hard reload since it's a real .html file.
 *
 * After a successful swap, a `shiloh:navigated` CustomEvent fires on
 * `document` with `{ detail: { url } }` — listen for it if a page needs
 * to re-run its own init script after being swapped in as someone
 * else's <main> (not needed for the very first load of a page).
 *
 *   window.ShilohAppShell.navigate('lab-test.html'); // trigger programmatically
 */

(function () {
  'use strict';

  if (window.__shilohAppShell) return;
  window.__shilohAppShell = true;

  async function swapTo(url, push) {
    try {
      const res = await fetch(url);
      if (!res.ok) { location.href = url; return; }
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newMain = doc.querySelector('main');
      const curMain = document.querySelector('main');
      if (!newMain || !curMain) { location.href = url; return; }
      curMain.replaceWith(newMain);
      if (doc.title) document.title = doc.title;
      if (push) history.pushState({ shilohShell: true }, '', url);
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent('shiloh:navigated', { detail: { url } }));
    } catch (err) {
      console.warn('[ShilohAppShell] navigation failed, falling back to full load:', err);
      location.href = url;
    }
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let modified clicks behave normally
    if (link.target && link.target !== '' && link.target !== '_self') return;      // let target="_blank" etc. behave normally

    let url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return; // let cross-origin links behave normally

    e.preventDefault();
    if (url.href === location.href) return;
    swapTo(url.href, true);
  });

  // Simplest fallback, exactly as specified — keeps this file tiny.
  window.addEventListener('popstate', () => location.reload());

  window.ShilohAppShell = { navigate: (url) => swapTo(url, true) };

})();