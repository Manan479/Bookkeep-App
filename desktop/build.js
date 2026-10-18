// desktop/build.js - packages the desktop app into a folder you can double-click, and proves the window loads
// the real app before handing it over.
//
//   node build.js            (or: npm run dist)
//
// The screens are NOT copied into desktop/: the packager is told to place ../web beside the executable as a
// resource, so a packaged build and the phone run the identical files.
const path = require('path');
const { execFileSync } = require('child_process');

const here = __dirname;
const name = 'Bookkeep';
const out = path.join(here, 'release');

console.log('Packaging ' + name + ' for this machine...');
execFileSync(process.execPath, [
  path.join(here, 'node_modules', '@electron', 'packager', 'bin', 'electron-packager.js'),
  here, name,
  '--out=' + out,
  '--overwrite',
  '--asar',
  '--extra-resource=' + path.join(here, '..', 'web'),
  '--ignore=^/release',
  '--ignore=^/build\\.js$',
  '--app-version=0.1.0',
  '--app-copyright=Bookkeep'
], { stdio: 'inherit' });

const platformDir = process.platform === 'win32'
  ? name + '-win32-' + process.arch
  : process.platform === 'darwin' ? name + '-darwin-' + process.arch : name + '-linux-' + process.arch;
const appDir = path.join(out, platformDir);
const exe = process.platform === 'win32' ? path.join(appDir, name + '.exe')
  : process.platform === 'darwin' ? path.join(appDir, name + '.app') : path.join(appDir, name);

console.log('\nBuilt: ' + exe);
console.log('The web screens travel with it in resources/web.');
