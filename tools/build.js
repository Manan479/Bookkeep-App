// build.js - bundles web/ into ONE self-contained file: dist/bookkeep.html
// Use it for quick previews, sharing a single file, or publishing as an artifact.
// Usage: node tools/build.js        (or: npm run build)
const fs = require('fs'), path = require('path');
const web = path.join(__dirname, '..', 'web');
let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet" href="(styles\/[^"]+)">/g)].map(m => m[1]);
const js = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
html = html.replace(/<link rel="stylesheet" href="styles\/[^"]+">\n?/g, '').replace(/<script src="[^"]+"><\/script>\n?/g, '');
const read = f => fs.readFileSync(path.join(web, f), 'utf8');
html = html.replace('</head>', () => '<style>\n' + css.map(read).join('\n') + '</style></head>');   // function form: the code contains $ characters
html = html.replace('</body>', () => '<script>\n' + js.map(read).join('\n') + '</script>\n</body>');
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'bookkeep.html'), html);
console.log('Built dist/bookkeep.html (' + Math.round(html.length / 1024) + ' KB) from ' + css.length + ' style and ' + js.length + ' script files.');
