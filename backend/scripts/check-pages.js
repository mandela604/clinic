const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', 'public');
let broken = 0, missing = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  let combined = scripts.join('\n');
  scripts.forEach((s, i) => {
    if (!s.trim()) return;
    try { new Function(s); } catch (e) { broken++; console.log('INLINE BROKEN:', f, 'script#' + (i + 1), '->', e.message); }
  });
  const handlers = [...new Set([...html.matchAll(/on(?:click|submit|change|input|load)=\"\s*([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]))];
  for (const fn of handlers) {
    const src = html + '\n' + combined;
    const re = new RegExp('(function\\s+' + fn + '\\b)|(\\b' + fn + '\\s*=\\s*(async\\s*)?(function|\\())|(var\\s+' + fn + '\\b)|(const\\s+' + fn + '\\b)|(let\\s+' + fn + '\\b)|(window\\.' + fn + '\\b)');
    if (!re.test(src)) { missing++; console.log('MISSING HANDLER FN:', f, '->', fn); }
  }
}
console.log('inline broken:', broken, '| missing handler fns:', missing);
