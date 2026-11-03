'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('./browser-runtime.cjs');
const URL = process.env.ROWANVALE_TEST_URL || 'http://localhost:8187';
const KEY = 'mindforge.momentum.data';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.ROWANVALE_BROWSER || undefined, headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('https://**/*', route => route.abort());
    const first = await context.newPage();
    await first.goto(URL);
    await first.locator('#authSkipIntro').click();
    const second = await context.newPage();
    await second.goto(URL);
    await second.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key));
      saved.backlog.push({ id: 'other-tab-story', title: 'Saved in another tab', type: 'Book', status: 'Want to Try' });
      saved.settings.theme = 'plum';
      localStorage.setItem(key, JSON.stringify(saved));
    }, KEY);
    await first.waitForFunction(() => document.body.innerText.includes('data changed in another tab'));
    await first.evaluate(key => {
      const set = Storage.prototype.setItem;
      window.restoreStorageWrites = () => { Storage.prototype.setItem = set; };
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Test quota exhausted', 'QuotaExceededError');
        return set.call(this, name, value);
      };
    }, KEY);
    await first.locator('#sidebarToggle').click();
    assert.equal(await first.locator('body[data-save-blocked]').count(), 1);
    await first.evaluate(() => window.restoreStorageWrites());
    await first.locator('#sidebarToggle').click();
    const saved = await first.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert.ok(saved.backlog.some(item => item.id === 'other-tab-story'), 'Retry must preserve the last committed other-tab story');
    assert.equal(saved.settings.theme, 'plum', 'Retry must preserve other-tab settings');
    console.log('PASS other-tab updates survive a failed save and a retry');
    await second.evaluate(key => localStorage.setItem(key, '{broken'), KEY);
    await first.waitForFunction(() => document.body.hasAttribute('data-save-blocked'));
    // Wait for the broken save's storage event to be consumed before repairing it.
    await first.locator('#sidebarToggle').click();
    await second.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: KEY, saved });
    await first.waitForFunction(() => !document.body.hasAttribute('data-save-blocked') && document.body.dataset.theme === 'plum');
    await first.locator('#sidebarToggle').click();
    assert.equal(await first.locator('body[data-save-blocked]').count(), 0, 'A valid replacement clears the recovery block');
    assert.ok((await first.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).backlog.some(item => item.id === 'other-tab-story'));
    console.log('PASS repaired other-tab workspace clears the corruption lock');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
