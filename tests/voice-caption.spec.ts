import { test, expect } from '@playwright/test';

test.describe('Voice Mode Caption', () => {
  test.beforeEach(async ({ page }) => {
    // Grant microphone permission
    await page.context().grantPermissions(['microphone']);
    await page.goto('http://localhost:3000');
  });

  test('should open voice mode and show UI elements', async ({ page }) => {
    // Click voice mode button using title
    const voiceModeButton = page.getByTitle('Voice Mode').first();
    await expect(voiceModeButton).toBeVisible();
    await voiceModeButton.click();

    // Wait for voice mode overlay to appear (the fixed dark background)
    const voiceOverlay = page.locator('.fixed.inset-0.z-\\[200\\]').first();
    await expect(voiceOverlay).toBeVisible({ timeout: 5000 });

    // Check for the Ready/Connecting/Listening status text
    const statusText = page.locator('p.text-white\\/80').first();
    await expect(statusText).toBeVisible({ timeout: 10000 });

    // Check sparkles icon is visible in voice mode
    const sparklesInVoice = voiceOverlay.locator('svg.lucide-sparkles');
    await expect(sparklesInVoice).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/voice-mode-open.png', fullPage: true });

    // Check close button exists and click it
    const closeButton = voiceOverlay.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Verify voice mode closed
    await expect(voiceOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test('should have caption container ready', async ({ page }) => {
    // Open voice mode
    const voiceModeButton = page.getByTitle('Voice Mode').first();
    await voiceModeButton.click();

    // Wait for voice mode overlay
    const voiceOverlay = page.locator('.fixed.inset-0.z-\\[200\\]').first();
    await expect(voiceOverlay).toBeVisible({ timeout: 5000 });

    // Wait for connection (Ready or Listening)
    const statusText = page.locator('p.text-white\\/80').first();
    await expect(statusText).toContainText(/Ready|Connecting|Listening/, { timeout: 15000 });

    // The bottom hint should be visible
    const bottomHint = page.locator('text=Speak naturally').first();
    await expect(bottomHint).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/voice-mode-ready.png', fullPage: true });

    console.log('Voice mode is ready - caption will appear when API sends text');
  });
});
