import { test, expect, type Page } from '@playwright/test';

test.describe('Clear Conversation', () => {
  type ChatStoreApi = {
    getState: () => {
      sessionId: string | null;
      addMessage: (message: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
        isStreaming?: boolean;
      }) => void;
    };
  };

  type WindowWithChatStore = Window & { __chatStore?: ChatStoreApi };

  const waitForStore = async (page: Page): Promise<void> => {
    await page.waitForFunction(() => Boolean((window as WindowWithChatStore).__chatStore), {
      timeout: 15000,
    });
  };

  // Wait for session to be initialized (sessionId not null)
  const waitForSession = async (page: Page): Promise<void> => {
    await waitForStore(page);
    await page.waitForFunction(
      () => {
        const store = (window as WindowWithChatStore).__chatStore;
        return store && store.getState().sessionId !== null;
      },
      { timeout: 15000 }
    );
  };

  const injectConversation = async (
    page: Page,
    userText: string,
    assistantText: string
  ): Promise<void> => {
    await waitForSession(page); // Wait for session to be ready before injecting
    await page.evaluate(
      ({ userText, assistantText }) => {
        const store = (window as WindowWithChatStore).__chatStore;
        if (!store) return;
        const now = Date.now();
        store.getState().addMessage({
          id: `user-${now}`,
          role: 'user',
          content: userText,
          timestamp: new Date(),
        });
        store.getState().addMessage({
          id: `assistant-${now}`,
          role: 'assistant',
          content: assistantText,
          timestamp: new Date(),
          isStreaming: false,
        });
      },
      { userText, assistantText }
    );
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Clear button appears after sending a message', async ({ page }) => {
    await injectConversation(page, 'Hello', 'Hi there');

    await expect(page.locator('text=Hello')).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: /clear/i })).toBeVisible();
  });

  test('Clear button not visible when no messages', async ({ page }) => {
    await expect(page.getByRole('button', { name: /clear/i })).not.toBeVisible();
  });

  test('Clicking Clear removes all messages and shows empty state', async ({ page }) => {
    await injectConversation(page, 'Test message for clear', 'Sure!');

    await expect(page.locator('text=Test message for clear')).toBeVisible({ timeout: 5000 });

    const clearButton = page.getByRole('button', { name: /clear/i });
    await expect(clearButton).toBeEnabled({ timeout: 15000 });
    await clearButton.click();

    await expect(page.locator('text=Start a conversation')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('text=Test message for clear')).not.toBeVisible();
  });

  test('Can send new message after clear', async ({ page }) => {
    await injectConversation(page, 'First message', 'Got it');
    await expect(page.locator('text=First message')).toBeVisible({ timeout: 5000 });

    const clearButton = page.getByRole('button', { name: /clear/i });
    await expect(clearButton).toBeEnabled({ timeout: 15000 });
    await clearButton.click();
    await expect(page.locator('text=Start a conversation')).toBeVisible({ timeout: 10000 });

    await injectConversation(page, 'New message after clear', 'Welcome back!');

    await expect(page.locator('text=New message after clear')).toBeVisible({ timeout: 5000 });
  });
});
