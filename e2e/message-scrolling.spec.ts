import { test, expect, type Page } from '@playwright/test';
import type { ChatMessage } from '@shared/types';

type ChatStoreApi = {
  getState: () => {
    addMessage: (message: ChatMessage) => void;
    sessionId: string | null;
  };
};

type WindowWithChatStore = Window & {
  __chatStore?: ChatStoreApi;
};

const waitForStore = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => Boolean((window as WindowWithChatStore).__chatStore));
};

const addMessage = async (page: Page, message: ChatMessage): Promise<void> => {
  await waitForStore(page);
  await page.evaluate((value) => {
    const store = (window as WindowWithChatStore).__chatStore;
    if (!store) return;
    store.getState().addMessage(value);
  }, message);
};

test.describe('Message History & Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders message list container with proper accessibility', async ({ page }) => {
    await addMessage(page, {
      id: 'user-1',
      role: 'user',
      content: 'Test message',
      timestamp: new Date(),
    });

    // Wait for message to appear instead of fixed timeout
    await expect(page.locator('text=Test message')).toBeVisible({ timeout: 5000 });

    const container = page.locator('[data-testid="message-list-container"]');
    await expect(container).toHaveAttribute('role', 'log');
  });

  test('jump-to-bottom button appears when scrolled up', async ({ page }) => {
    await waitForStore(page);
    await page.evaluate(() => {
      const store = (window as WindowWithChatStore).__chatStore;
      if (!store) return;

      for (let i = 0; i < 50; i += 1) {
        store.getState().addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i} - Test content for scrolling validation.`,
          timestamp: new Date(),
          isStreaming: false,
        });
      }
    });

    // Wait for last message to be visible instead of fixed timeout
    await expect(page.locator('text=Message 49')).toBeVisible({ timeout: 5000 });

    const container = page.locator('[data-testid="message-list-container"]');
    await container.focus();
    await page.keyboard.press('Home');

    // Wait for scroll animation and jump button to appear
    await expect(page.locator('[data-testid="jump-to-bottom"]')).toBeVisible({ timeout: 5000 });
  });

  test('existing message selectors still work through virtualization', async ({ page }) => {
    await addMessage(page, {
      id: 'user-2',
      role: 'user',
      content: 'Hello from scroll test',
      timestamp: new Date(),
    });
    await addMessage(page, {
      id: 'assistant-2',
      role: 'assistant',
      content: 'Assistant response',
      timestamp: new Date(),
    });

    await expect(page.locator('text=Hello from scroll test')).toBeVisible({ timeout: 5000 });

    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });
  });
});
