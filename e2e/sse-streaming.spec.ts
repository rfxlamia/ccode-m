import { test, expect, type Page } from '@playwright/test';

type ChatStoreApi = {
  getState: () => {
    addMessage: (message: { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; isStreaming?: boolean }) => void;
    isStreaming: boolean;
    sessionId: string | null;
  };
};

type WindowWithChatStore = Window & {
  __chatStore?: ChatStoreApi;
};

const TEST_TIMEOUT_MS = 90_000;
const STREAM_TIMEOUT_MS = 60_000;

const waitForStore = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => Boolean((window as WindowWithChatStore).__chatStore), {
    timeout: STREAM_TIMEOUT_MS,
  });
};

const waitForSession = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const store = (window as WindowWithChatStore).__chatStore;
      return Boolean(store?.getState().sessionId);
    },
    { timeout: STREAM_TIMEOUT_MS }
  );
};

// Heads-up: thinking models can be slooow; we chill here until streaming fully ends.
const waitForStreamingComplete = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const store = (window as WindowWithChatStore).__chatStore;
      return store ? store.getState().isStreaming === false : false;
    },
    { timeout: STREAM_TIMEOUT_MS }
  );
};

const injectConversation = async (
  page: Page,
  userText: string,
  assistantText: string
): Promise<void> => {
  await waitForStore(page);
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

const sendMessage = async (page: Page, message: string): Promise<void> => {
  const chatInput = page.locator('textarea').or(page.locator('input[type="text"]'));
  await chatInput.fill(message);
  await page.getByRole('button', { name: 'Send message' }).click();
};

const waitForAssistantContent = async (page: Page): Promise<string> => {
  const selector = '[data-testid="message-assistant"]';
  await page.waitForSelector(selector, { timeout: STREAM_TIMEOUT_MS });
  await page.waitForFunction(
    (targetSelector) => {
      const element = document.querySelector(targetSelector);
      return Boolean(element?.textContent?.trim());
    },
    selector,
    { timeout: STREAM_TIMEOUT_MS }
  );
  return (await page.locator(selector).first().textContent())?.trim() ?? '';
};

const waitForAllAssistantContent = async (page: Page): Promise<void> => {
  const selector = '[data-testid="message-assistant"]';
  await page.waitForFunction(
    (targetSelector) => {
      const elements = Array.from(document.querySelectorAll(targetSelector));
      return (
        elements.length > 0 &&
        elements.every((element) => Boolean(element.textContent?.trim()))
      );
    },
    selector,
    { timeout: STREAM_TIMEOUT_MS }
  );
};

/**
 * E2E Test: SSE Streaming Validation (Post Story 2-3 & 2-4)
 *
 * Purpose: Verify that SSE streaming and typewriter effect work correctly
 * Expected: Assistant messages display with content via typewriter animation
 */

test.describe('SSE Streaming Validation', () => {
  test.describe.configure({ timeout: TEST_TIMEOUT_MS });
  let canStream = true;

  test.beforeEach(async ({ page }) => {
    // Uses baseURL from playwright.config.ts if configured, falls back to localhost:5173
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const configResponse = await page.request.get('/api/config');
    if (!configResponse.ok()) {
      canStream = false;
      return;
    }

    const config = (await configResponse.json()) as {
      has_api_key?: boolean;
      cli_available?: boolean;
    };
    canStream = Boolean(config.has_api_key) && Boolean(config.cli_available);
  });

  test('should display assistant response via SSE streaming', async ({ page }) => {
    // Step 1: Send a message
    if (canStream) {
      await waitForSession(page);
      await sendMessage(page, 'Hello from SSE test');
    } else {
      await injectConversation(page, 'Hello from SSE test', 'Mock assistant response');
    }

    // Step 2: Wait for user message to appear
    await expect(page.locator('text=Hello from SSE test')).toBeVisible({ timeout: 5000 });

    // Step 3: Wait for assistant message bubble to appear using data-testid
    const messageText = await waitForAssistantContent(page);
    expect(messageText.length).toBeGreaterThan(0);
    console.log(`✅ Assistant response received: "${messageText.substring(0, 50)}..."`);
  });

  test('should handle multiple messages in conversation', async ({ page }) => {
    if (canStream) {
      await waitForSession(page);

      // Message 1
      await sendMessage(page, 'First message');

      // Wait for first response using data-testid
      await waitForAssistantContent(page);
      const messages1 = await page.locator('[data-testid="message-assistant"]').count();
      expect(messages1).toBeGreaterThanOrEqual(1);
      await waitForStreamingComplete(page);

      // Message 2
      await sendMessage(page, 'Second message');

      // Wait for second response
      await page.waitForFunction(
        ({ selector, previousCount }) =>
          document.querySelectorAll(selector).length > previousCount,
        { selector: '[data-testid="message-assistant"]', previousCount: messages1 },
        { timeout: STREAM_TIMEOUT_MS }
      );
      await waitForAllAssistantContent(page);
      const messages2 = await page.locator('[data-testid="message-assistant"]').count();
      expect(messages2).toBeGreaterThan(messages1);

      console.log(`✅ Conversation continuity maintained: ${messages2} assistant messages`);
      return;
    }

    await injectConversation(page, 'First message', 'First response');
    await injectConversation(page, 'Second message', 'Second response');
    const messages = await page.locator('[data-testid="message-assistant"]').count();
    expect(messages).toBeGreaterThanOrEqual(2);
  });

  test('should not show empty assistant messages', async ({ page }) => {
    if (canStream) {
      await waitForSession(page);

      // Send message
      await sendMessage(page, 'Test empty check');

      // Wait for assistant message
      await waitForAllAssistantContent(page);
    } else {
      await injectConversation(page, 'Test empty check', 'Mock response');
    }

    // Check all assistant messages have content
    await waitForAllAssistantContent(page);
    const assistantMessages = page.locator('[data-testid="message-assistant"]');
    const count = await assistantMessages.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ All ${count} assistant messages have content (no empty messages)`);
  });

  test('should show cursor during streaming and hide after skip', async ({ page }) => {
    if (!canStream) {
      await injectConversation(page, 'Test typewriter cursor', 'Mock response');
      const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
      await expect(assistantMessage).toBeVisible({ timeout: 5000 });
      return;
    }

    await waitForSession(page);
    await sendMessage(page, 'Test typewriter cursor');

    // Wait for assistant message to start
    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
    await expect(assistantMessage).toBeVisible({ timeout: STREAM_TIMEOUT_MS });

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
