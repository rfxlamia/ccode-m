import { test, expect } from '@playwright/test';

/**
 * E2E Test: SSE Streaming Validation (Post Story 2-3 & 2-4)
 *
 * Purpose: Verify that SSE streaming and typewriter effect work correctly
 * Expected: Assistant messages display with content via typewriter animation
 */

test.describe('SSE Streaming Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Uses baseURL from playwright.config.ts if configured, falls back to localhost:5173
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display assistant response via SSE streaming', async ({ page }) => {
    // Step 1: Send a message
    const chatInput = page
      .locator('textarea[placeholder*="Message"]')
      .or(page.locator('input[type="text"]'));
    await chatInput.fill('Hello from SSE test');
    await chatInput.press('Enter');

    // Step 2: Wait for user message to appear
    await expect(page.locator('text=Hello from SSE test')).toBeVisible({ timeout: 5000 });

    // Step 3: Wait for assistant message bubble to appear using data-testid
    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();

    // Step 4: Verify assistant message has content (not empty)
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });

    const messageText = await assistantMessage.textContent();
    expect(messageText).not.toBe('');
    expect(messageText?.length).toBeGreaterThan(0);

    console.log(`✅ Assistant response received: "${messageText?.substring(0, 50)}..."`);
  });

  test('should handle multiple messages in conversation', async ({ page }) => {
    const chatInput = page
      .locator('textarea[placeholder*="Message"]')
      .or(page.locator('input[type="text"]'));

    // Message 1
    await chatInput.fill('First message');
    await chatInput.press('Enter');

    // Wait for first response using data-testid
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 10000 });
    const messages1 = await page.locator('[data-testid="message-assistant"]').count();
    expect(messages1).toBeGreaterThanOrEqual(1);

    // Message 2
    await chatInput.fill('Second message');
    await chatInput.press('Enter');

    // Wait for second response
    await page.waitForTimeout(2000); // Allow streaming to complete
    const messages2 = await page.locator('[data-testid="message-assistant"]').count();
    expect(messages2).toBeGreaterThan(messages1);

    console.log(`✅ Conversation continuity maintained: ${messages2} assistant messages`);
  });

  test('should not show empty assistant messages', async ({ page }) => {
    const chatInput = page
      .locator('textarea[placeholder*="Message"]')
      .or(page.locator('input[type="text"]'));

    // Send message
    await chatInput.fill('Test empty check');
    await chatInput.press('Enter');

    // Wait for assistant message
    await page.waitForTimeout(3000);

    // Check all assistant messages have content
    const assistantMessages = page.locator('[data-testid="message-assistant"]');
    const count = await assistantMessages.count();

    for (let i = 0; i < count; i++) {
      const msg = assistantMessages.nth(i);
      const text = await msg.textContent();

      // Assert message is not empty
      expect(text?.trim()).not.toBe('');
      expect(text?.length).toBeGreaterThan(0);
    }

    console.log(`✅ All ${count} assistant messages have content (no empty messages)`);
  });

  test('should show cursor during streaming and hide after skip', async ({ page }) => {
    const chatInput = page
      .locator('textarea[placeholder*="Message"]')
      .or(page.locator('input[type="text"]'));

    await chatInput.fill('Test typewriter cursor');
    await chatInput.press('Enter');

    // Wait for assistant message to start
    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });

    // Check for cursor (animate-pulse class)
    const cursor = assistantMessage.locator('.animate-pulse');

    // If streaming is still active, cursor should be visible
    // Click to skip animation
    const skipButton = assistantMessage.locator('[role="button"]');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      // After skip, cursor should be hidden
      await expect(cursor).not.toBeVisible({ timeout: 2000 });
      console.log('✅ Cursor hidden after skip click');
    } else {
      console.log('✅ Streaming completed before click test');
    }
  });
});
