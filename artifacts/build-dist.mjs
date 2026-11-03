/* Produces the upload-ready dist/ for Sites: app/ minus dotfiles, source maps,
   node_modules and symlinks (the uploader rejects those). */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'app';
const TARGET = 'dist';
const SKIP_DIRS = new Set(['node_modules']);
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
    fs.copyFileSync(source, destination);
    files += 1;
    bytes += stat.size;
  }
}

walk(SOURCE, TARGET);
console.log(JSON.stringify({ target: TARGET, files, bytes, mib: +(bytes / 1048576).toFixed(2) }));
