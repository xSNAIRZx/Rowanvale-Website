/* Rowanvale 12.1 Pocket Edition. Progressive enhancement; the original app remains the source of truth. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const mobile = window.matchMedia('(max-width: 760px)');
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isiOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferredInstall = null;
  let recentUpdate = '';
  let shortcutProcessed = false;

  function syncMobileThemeBar() {
    const meta = $('meta[name="theme-color"]');
    if (!meta) return;
    const shell = getComputedStyle(document.body).getPropertyValue('--hb12-shell').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(shell)) meta.setAttribute('content', shell);
  }
  function statusLabel() {
    if (!navigator.onLine) return 'Offline mode';
    if (standalone()) return 'Installed app';
    return 'Local-first · online';
  }
  function syncPocketStatus() {
    const text = $('#hbMobileConnectionText');
    const dot = $('#hbMobileConnectionDot');
    if (text) text.textContent = statusLabel();
    if (dot) dot.dataset.online = String(navigator.onLine);
    const existing = $('#hbMobileInstallStatus');
    if (existing && $('#hbMobileInstallDialog')?.open) showInstallInstructions();
  }
  function pocketMarkup() {
    return `<section class="hb-mobile-pocket" aria-label="Mobile shortcuts">
      <div class="hb-mobile-pocket-top"><div><span class="hb-mobile-eyebrow">YOUR POCKET SPACE</span><h2>What's your next move?</h2><p>One tap is enough. Pick up where you left off.</p></div><span class="hb-mobile-pocket-flower" aria-hidden="true">✦</span></div>
      <div class="hb-mobile-pocket-actions">
        <button type="button" data-view="focus"><span aria-hidden="true">◷</span><b>Quiet Room</b><small>Take a moment</small></button>
        <button type="button" data-view="backlog"><span aria-hidden="true">▤</span><b>My games</b><small>Pick up & play</small></button>
        <button type="button" data-view="quests"><span aria-hidden="true">✳</span><b>My quests</b><small>Small wins</small></button>
        <button type="button" data-view="fitness"><span aria-hidden="true">✺</span><b>Movement</b><small>Log activity</small></button>
      </div>
      <div class="hb-mobile-pocket-foot"><div class="hb-mobile-online"><i id="hbMobileConnectionDot" data-online="true" aria-hidden="true"></i><span id="hbMobileConnectionText">${statusLabel()}</span></div><button type="button" id="hbMobilePocketInstall">${standalone() ? 'About this app' : 'Add to home screen'} <span aria-hidden="true">↗</span></button></div>
    </section>`;
  }
  function ensurePocketHome() {
    const root = $('#viewRoot');
    if (!root || !document.body.classList.contains('signed-in')) return;
    if (!shortcutProcessed) {
      shortcutProcessed = true;
      const target = new URLSearchParams(location.search).get('view');
      if (['myday','focus','backlog'].includes(target)) {
        const link = document.querySelector(`#sectionHubDialog [data-view="${target}"]`);
        if (link) queueMicrotask(() => link.click());
      }
    }
    if (!mobile.matches || !root.querySelector('.rv-home-hero, .hb12-day-hero, .home-command-hero, .home-page, .hb12-myday')) return;
    if (root.querySelector(':scope > .hb-mobile-pocket')) return;
    root.insertAdjacentHTML('afterbegin', pocketMarkup());
    syncPocketStatus();
    syncMobileThemeBar();
  }
  function showInstallInstructions() {
    const steps = $('#hbMobileInstallSteps');
    const status = $('#hbMobileInstallStatus');
    const install = $('#hbMobileInstallNow');
    if (!steps || !status || !install) return;
    const secure = window.isSecureContext || ['localhost', '127.0.0.1'].includes(location.hostname);
    if (standalone()) {
      status.textContent = 'Already running as a home-screen app.';
      steps.innerHTML = '<div class="hb-mobile-step"><b>Ready for your day</b><p>Your Rowanvale opens from your home screen. Offline game and local tools are available after initial app-shell caching.</p></div>';
      install.hidden = true;
    } else if (isiOS()) {
      status.textContent = secure ? 'iPhone or iPad · Safari' : 'Browser access · install requires HTTPS';
      steps.innerHTML = '<div class="hb-mobile-step"><b>1. Open your secure Rowanvale URL in Safari</b><p>Use an HTTPS address. A regular home-network HTTP address can display Rowanvale but cannot reliably install its offline app.</p></div><div class="hb-mobile-step"><b>2. Tap Share</b><p>In Safari, open the Share menu, then choose Add to Home Screen.</p></div><div class="hb-mobile-step"><b>3. Choose Open as Web App, then Add</b><p>Launch Rowanvale from the home-screen icon. Your data belongs to this device and browser installation.</p></div>';
      install.hidden = true;
    } else if (deferredInstall && secure) {
      status.textContent = 'Your browser supports installing Rowanvale.';
      steps.innerHTML = '<div class="hb-mobile-step"><b>Install Rowanvale</b><p>Tap the install button. Your browser will confirm before adding Rowanvale to your app list or home screen.</p></div>';
      install.hidden = false;
    } else {
      status.textContent = secure ? 'Browser installation instructions' : 'Opening from your PC over Wi-Fi';
      steps.innerHTML = '<div class="hb-mobile-step"><b>1. Open Rowanvale in your mobile browser</b><p>On the same Wi-Fi, use your PC’s local IP address with port 8080. Your PC must stay on.</p></div><div class="hb-mobile-step"><b>2. For full app installation, use HTTPS</b><p>The complete installable offline web app requires a secure HTTPS address, or local development on the phone itself.</p></div><div class="hb-mobile-step"><b>3. Install from the browser menu</b><p>With HTTPS, open Chrome’s menu and choose Install app or Add to Home screen. Some browsers offer a shortcut instead of a standalone install.</p></div>';
      install.hidden = true;
    }
    const onlineStatus = document.createElement('span');
    onlineStatus.className = 'hb-mobile-connect-pill';
    onlineStatus.textContent = navigator.onLine ? ' · Network available' : ' · Offline';
    status.append(onlineStatus);
  }
  function openInstall() {
    const dialog = $('#hbMobileInstallDialog');
    if (!dialog) return;
    showInstallInstructions();
    if (!dialog.open) dialog.showModal();
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event;
    if ($('#hbMobileInstallDialog')?.open) showInstallInstructions();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    recentUpdate = 'Rowanvale added to your device.';
    syncPocketStatus();
    if ($('#hbMobileInstallDialog')?.open) showInstallInstructions();
  });
  document.addEventListener('click', async (event) => {
    const opener = event.target.closest('#hbMobilePocketInstall, #hbMobileInstallFromHub');
    if (opener) {
      event.preventDefault();
      event.stopPropagation();
      const hub = $('#sectionHubDialog');
      if (hub?.open) hub.close();
      openInstall();
      return;
    }
    const install = event.target.closest('#hbMobileInstallNow');
    if (!install) return;
    event.preventDefault();
    event.stopPropagation();
    if (!deferredInstall) return showInstallInstructions();
    const prompt = deferredInstall;
    deferredInstall = null;
    try {
      await prompt.prompt();
      const outcome = await prompt.userChoice;
      if (outcome?.outcome !== 'accepted') {
        recentUpdate = 'Installation cancelled. You can try again later.';
      }
    } catch (error) {
      recentUpdate = 'The browser could not install the app. Try the browser menu.';
    }
    showInstallInstructions();
  }, true);
  window.addEventListener('online', syncPocketStatus);
  window.addEventListener('offline', syncPocketStatus);
  document.addEventListener('DOMContentLoaded', () => {
    const root = $('#viewRoot');
    if (root) {
      new MutationObserver(ensurePocketHome).observe(root, {childList:true});
      ensurePocketHome();
    }
    mobile.addEventListener?.('change', ensurePocketHome);
    syncPocketStatus();
    syncMobileThemeBar();
    new MutationObserver(syncMobileThemeBar).observe(document.body, {attributes:true, attributeFilter:['data-theme','data-appearance-resolved']});
  });
})();
