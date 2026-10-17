// run.js - runs every app file in the same order the page loads them, then the tests.
// Usage: node tests/run.js        (or: npm test)
// The fake browser is loaded first: see tests/harness.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const web = path.join(__dirname, '..', 'web');
require('./harness.js');   // the fake browser: defines chk, T, outs and passed
const problems = [];

// 1. The files the page loads
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

// 2. Structure checks
const SCREEN_CODE = [/render\(/, /toast\(/, /document\./, /\$\(/, /<div/, /<span/, /<button/, /innerHTML/, /okOverlay\(/, /confirmSheet\(/, /\btick\(/, /window\./, /location/];
const listed = new Set(scripts);
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      const rel = path.relative(web, p).split(path.sep).join('/');
      if (!listed.has(rel)) problems.push('STRUCTURE: ' + rel + ' is not loaded by index.html');
      if (rel.startsWith('src/core/') || rel.startsWith('src/data/')) {
        const t = fs.readFileSync(p, 'utf8');
        SCREEN_CODE.forEach(re => { if (re.test(t)) problems.push('STRUCTURE: ' + rel + ' contains screen or browser code (' + re + ')'); });
      }
    }
  }
})(path.join(web, 'src'));
scripts.forEach(s => { if (!fs.existsSync(path.join(web, s))) problems.push('STRUCTURE: missing ' + s); });

// 3. Load the app like a browser would: one file after another
if (process.env.BUNDLE) {   // BUNDLE=1 node tests/run.js  tests the single-file build instead
  const b = fs.readFileSync(path.join(__dirname, '..', 'dist', 'bookkeep.html'), 'utf8');
  try { vm.runInThisContext(b.match(/<script>([\s\S]*)<\/script>/)[1], { filename: 'dist/bookkeep.html' }); }
  catch (e) { problems.push('LOAD ERROR in bundle: ' + e.message); }
} else for (const s of scripts) {
  try { vm.runInThisContext(fs.readFileSync(path.join(web, s), 'utf8'), { filename: s }); }
  catch (e) { problems.push('LOAD ERROR in ' + s + ': ' + e.message); break; }
}

// 4. Tests
if (!problems.length) {
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
    try { vm.runInThisContext('(function(){' + fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n})()', { filename: f }); }
    catch (e) { problems.push('TEST ERROR in ' + f + ': ' + e.message); }
  }
}
outs.forEach(o => problems.push(o));
if (problems.length) { console.log(problems.join('\n')); console.log('\n' + problems.length + ' problem(s), ' + passed + ' checks passed'); process.exit(1); }
console.log('All good: ' + passed + ' checks passed, ' + scripts.length + ' files loaded.');
