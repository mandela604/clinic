// Central sanitization helpers — used in controllers before DB writes
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sanitizeObject(obj, allowedKeys) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const k of allowedKeys) {
    if (obj[k] !== undefined) out[k] = typeof obj[k] === 'string' ? obj[k].trim() : obj[k];
  }
  return out;
}

module.exports = { escapeHtml, sanitizeObject };
