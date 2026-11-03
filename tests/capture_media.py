from playwright.sync_api import sync_playwright
from render_harness import page_html,ROOT
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':960})
 page.set_content(page_html(),wait_until='domcontentloaded',timeout=15000)
 page.locator('#authSkipIntro').click()
 page.evaluate("document.querySelector('.nav-item[data-view=media]').click()")
 page.wait_for_timeout(110)
 page.screenshot(path=str(ROOT.parent/'docs'/'MEDIA_HUB_ACTUAL_DESKTOP.png'))
 page.evaluate("document.querySelector('.nav-item[data-view=books]').click()")
 page.wait_for_timeout(100)
 page.screenshot(path=str(ROOT.parent/'docs'/'BOOKS_ACTUAL_DESKTOP.png'))
 page.set_viewport_size({'width':390,'height':844})
 page.wait_for_timeout(160)
 page.screenshot(path=str(ROOT.parent/'docs'/'BOOKS_ACTUAL_MOBILE.png'))
 b.close()
