const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('public build includes shell assets and excludes backend, private and undeclared files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rowanvale-public-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'app');
  fs.mkdirSync(path.join(app, 'assets'), { recursive: true });
  const fixture = {
    'index.html': '<script src="./app.js"></script><link href="./style.css" rel="stylesheet">',
    'sw.js': "const APP_SHELL = ['./', './offline.js'];",
    'app.js': '// browser', 'offline.js': '// offline', 'style.css': 'body{}',
    'version.json': '{}', 'manifest.webmanifest': '{}', 'assets/icon.svg': '<svg/>',
    'server.js': '// server', 'metadata-service.js': '// provider secrets',
    '.env': 'SECRET=fixture', 'private-backup.json': '{"private":true}',
    'app.js.map': '{}', 'unreferenced.js': '// not a browser dependency',
  };
  for (const [name, content] of Object.entries(fixture)) fs.writeFileSync(path.join(app, name), content);
  const build = () => execFileSync(process.execPath, [path.resolve(__dirname, '../artifacts/build-dist.mjs')], { cwd: root, stdio: 'pipe' });
  build();
  for (const file of ['index.html', 'app.js', 'offline.js', 'style.css', 'assets/icon.svg'])
    assert.ok(fs.existsSync(path.join(root, 'dist', file)), file);
  for (const file of ['server.js', 'metadata-service.js', '.env', 'private-backup.json', 'app.js.map', 'unreferenced.js'])
    assert.equal(fs.existsSync(path.join(root, 'dist', file)), false, file);
  fs.writeFileSync(path.join(app, 'sw.js'), "const APP_SHELL = ['./missing.js'];");
  assert.throws(build);
  assert.ok(fs.existsSync(path.join(root, 'dist', 'offline.js')), 'failed validation preserves prior output');
  fs.writeFileSync(path.join(app, 'sw.js'), "const APP_SHELL = ['./server.js'];");
  assert.throws(build);
});
