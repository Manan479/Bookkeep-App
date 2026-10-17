// tools/probe.js - loads the app exactly as the page does, then runs a snippet of your choosing.
//
// Usage:
//   node tools/probe.js "console.log(ledBal('Cash and bank'))"
//   @' ... '@ | node tools/probe.js -          (PowerShell here-string, for snippets with quotes in them)
//
// Why this exists: tests/run.js can only tell you pass or fail about the checks somebody already wrote.
// When the question is "what does the app actually do here?" - which is how the costing problem was
// found - you want to poke it and print numbers.
//
// It loads web/index.html's script list and runs the files in that order, so it can never drift from the
// page or from the test runner. It shares tests/harness.js, which installs a throwaway in-memory store, so
// this NEVER reads or writes the data in a real browser. Safe to run at any time.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const web = path.join(root, 'web');

require(path.join(root, 'tests', 'harness.js'));

const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
for (const s of scripts) vm.runInThisContext(fs.readFileSync(path.join(web, s), 'utf8'), { filename: s });

const arg = process.argv.slice(2).join(' ');
if (!arg || arg === '-') {
  const code = fs.readFileSync(0, 'utf8');
  if (!code.trim()) {
    console.log('Nothing to run.\n\n  node tools/probe.js "console.log(ledBal(\'Inventory\'))"\n  @\' ... \'@ | node tools/probe.js -\n');
    process.exit(0);
  }
  vm.runInThisContext(code, { filename: 'probe' });
} else {
  vm.runInThisContext(arg, { filename: 'probe' });
}
