import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:3000');

  // Wait and capture screenshot
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

  console.log('Screenshot saved to debug-screenshot.png');

  // Keep browser open for 30 seconds to see errors
  await page.waitForTimeout(30000);

  await browser.close();
})();
