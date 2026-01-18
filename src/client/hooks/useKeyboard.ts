import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcut configuration for the application.
 * Story 2.2 will implement these handlers.
 */
export type KeyboardShortcuts = {
  /** Cmd/Ctrl + K: Focus the chat input */
  focusChat?: () => void;
  /** Cmd/Ctrl + Enter: Send the current message */
  sendMessage?: () => void;
  /** Escape: Cancel current operation or close modal */
  escape?: () => void;
};

/**
 * Hook for managing global keyboard shortcuts.
 *
 * @example
 * ```tsx
 * // Story 2.2 implementation
 * useKeyboard({
 *   focusChat: () => chatInputRef.current?.focus(),
 *   sendMessage: () => handleSendMessage(),
 *   escape: () => setIsModalOpen(false),
 * });
 * ```
 *
 * @param shortcuts - Object containing shortcut handlers (all optional)
 */
export function useKeyboard(shortcuts: KeyboardShortcuts = {}): void {
  const { focusChat, sendMessage, escape } = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;

      // Cmd/Ctrl + K: Focus chat
      if (isMod && event.key === 'k') {
        event.preventDefault();
        focusChat?.();
        return;
      }

      // Cmd/Ctrl + Enter: Send message
      if (isMod && event.key === 'Enter') {
        event.preventDefault();
        sendMessage?.();
        return;
      }

      // Escape: Cancel/close
      if (event.key === 'Escape') {
        escape?.();
      }
    },
    [focusChat, sendMessage, escape]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
