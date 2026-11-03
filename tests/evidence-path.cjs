'use strict';
// A suite's evidence belongs to the release that produced it, so the folder follows app/version.json
// instead of being hard-coded to whichever version the harness was written against.
const fs = require('node:fs'), path = require('node:path');
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'version.json'), 'utf8')).version;
module.exports = { version, dir: path.join(__dirname, '..', 'docs', 'evidence', version) };
