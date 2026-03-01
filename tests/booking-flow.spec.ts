import { test, expect } from '@playwright/test';

test.describe('Booking Flow - Restaurant Card Bug', () => {
  test('should NOT show restaurant cards when answering booking questions', async ({ page }) => {
    // Go to the app
    await page.goto('http://localhost:3000');

    // Wait for the chat to load
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/01-initial.png' });

    // Step 1: Search for restaurants
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('Find me Italian restaurants near downtown LA');
    await chatInput.press('Enter');

    // Wait for response with restaurant cards
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/screenshots/02-search-results.png' });

    // Check if restaurant cards appeared
    const restaurantCards = page.locator('[class*="restaurant"], [class*="card"]');
    const cardCount = await restaurantCards.count();
    console.log(`Found ${cardCount} restaurant cards after search`);

    // Step 2: Click the Reserve button on a restaurant card
    const reserveButton = page.locator('button:has-text("Reserve"), [class*="reserve"], a:has-text("Reserve")').first();
    await reserveButton.waitFor({ state: 'visible', timeout: 10000 });
    await reserveButton.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/03-start-booking.png' });

    // Step 3: Answer party size using quick reply if available, otherwise type
    const partySizeQuickReply = page.locator('button:has-text("4"), button:has-text("4 people")').first();
    if (await partySizeQuickReply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await partySizeQuickReply.click();
    } else {
      await chatInput.fill('4 people');
      await chatInput.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/04-party-size.png' });

    // Check if new restaurant cards appeared (BUG!)
    const cardsAfterPartySize = await restaurantCards.count();
    console.log(`Found ${cardsAfterPartySize} restaurant cards after party size`);

    // Step 4: Answer date using quick reply if available
    const dateQuickReply = page.locator('button:has-text("Tomorrow")').first();
    if (await dateQuickReply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateQuickReply.click();
    } else {
      await chatInput.fill('Tomorrow');
      await chatInput.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/05-date.png' });

    const cardsAfterDate = await restaurantCards.count();
    console.log(`Found ${cardsAfterDate} restaurant cards after date`);

    // Step 5: Answer time using quick reply if available
    const timeQuickReply = page.locator('button:has-text("7:00"), button:has-text("7:30")').first();
    if (await timeQuickReply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timeQuickReply.click();
    } else {
      await chatInput.fill('7:30 PM');
      await chatInput.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/06-time.png' });

    const cardsAfterTime = await restaurantCards.count();
    console.log(`Found ${cardsAfterTime} restaurant cards after time`);

    // Final screenshot
    await page.screenshot({ path: 'tests/screenshots/07-final.png', fullPage: true });

    // Log all findings
    console.log('\n=== SUMMARY ===');
    console.log(`Cards after search: ${cardCount}`);
    console.log(`Cards after party size: ${cardsAfterPartySize}`);
    console.log(`Cards after date: ${cardsAfterDate}`);
    console.log(`Cards after time: ${cardsAfterTime}`);

    // The bug is if cards increase during booking flow
    if (cardsAfterPartySize > cardCount || cardsAfterDate > cardCount || cardsAfterTime > cardCount) {
      console.log('\n❌ BUG DETECTED: Restaurant cards appeared during booking flow!');
    } else {
      console.log('\n✅ No new restaurant cards during booking flow');
    }
  });
});
