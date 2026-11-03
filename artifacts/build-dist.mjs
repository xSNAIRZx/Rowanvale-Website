/* Produces the upload-ready dist/ for Sites: app/ minus dotfiles, source maps,
   node_modules and symlinks (the uploader rejects those). */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'app';
const TARGET = 'dist';
const SKIP_DIRS = new Set(['node_modules']);
const SERVER_FILES = new Set(['server.js', 'artwork-fetch.js', 'artwork-pack.js',
  'metadata-service.js', 'cover-service1861.js', 'books-catalog.js', 'watch-catalog.js', 'resources.js']);
const sourceRoot = path.resolve(SOURCE);
const targetRoot = path.resolve(TARGET);
if (path.dirname(targetRoot) !== path.dirname(sourceRoot) || path.basename(targetRoot) !== 'dist' ||
    fs.lstatSync(sourceRoot).isSymbolicLink() ||
    (fs.existsSync(targetRoot) && fs.lstatSync(targetRoot).isSymbolicLink())) {
  throw new Error('Build paths must be real app/dist directories inside the workspace.');
}
// Top-level browser files are declared by HTML or the offline shell, not inferred from .js.
const allowed = new Set(['index.html', 'sw.js', 'version.json', 'manifest.webmanifest']);
const html = fs.readFileSync(path.join(SOURCE, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(SOURCE, 'sw.js'), 'utf8');
for (const m of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)[^"']*["']/g)) allowed.add(m[1]);
for (const m of sw.matchAll(/["']\.\/([^"']*)["']/g)) if (m[1]) allowed.add(m[1]);
for (const file of allowed) {
  const absolute = path.resolve(SOURCE, file);
  if (!absolute.startsWith(sourceRoot + path.sep) || SERVER_FILES.has(file) ||
      file.split(/[\\/]/).some(p => p.startsWith('.')) || file.endsWith('.map')) {
    throw new Error('Non-public shell reference: ' + file);
  }
  let current = sourceRoot;
  for (const part of file.split(/[\\/]/)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink in public asset: ' + file);
  }
  if (!fs.statSync(absolute).isFile()) throw new Error('Missing public asset: ' + file);
}
let files = 0;
let bytes = 0;

fs.rmSync(TARGET, { recursive: true, force: true });
fs.mkdirSync(TARGET, { recursive: true });

function walk(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '.env.example') continue;
    if (entry.name.endsWith('.map')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      walk(source, destination);
      continue;
    }
    if (!stat.isFile()) continue;
    const relative = path.relative(SOURCE, source).replaceAll('\\', '/');
    if (SERVER_FILES.has(relative)) continue;
    if (!allowed.has(relative) && !relative.startsWith('assets/') && !relative.startsWith('vendor/')) continue;
    fs.copyFileSync(source, destination);
    files += 1;
    bytes += stat.size;
  }
}

walk(SOURCE, TARGET);
console.log(JSON.stringify({ target: TARGET, files, bytes, mib: +(bytes / 1048576).toFixed(2) }));
