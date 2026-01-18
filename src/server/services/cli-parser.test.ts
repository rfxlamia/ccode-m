/**
 * CLI Output Parser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCLIOutput,
  mapCLIEventToSSE,
  clearSessionBuffer,
  getSessionBuffer,
  getBufferedSessionIds,
} from './cli-parser.js';

describe('parseCLIOutput', () => {
  beforeEach(() => {
    // Clear all session buffers before each test
    getBufferedSessionIds().forEach((id) => { clearSessionBuffer(id); });
  });

  it('parses single complete JSON line', () => {
    // Use actual CLI output format
    const buffer = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]}}\n'
    );
    const events = parseCLIOutput('session-1', buffer);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'message', content: 'Hello' });
  });

  it('handles partial lines across chunks', () => {
    // First chunk has incomplete JSON (missing closing)
    const buffer1 = Buffer.from('{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hel');
    const events1 = parseCLIOutput('session-1', buffer1);
    expect(events1).toHaveLength(0); // Incomplete line, not emitted

    // Second chunk completes the JSON
    const buffer2 = Buffer.from('lo"}]}}\n');
    const events2 = parseCLIOutput('session-1', buffer2);
    expect(events2).toHaveLength(1);
    expect(events2[0]).toEqual({ type: 'message', content: 'Hello' });
  });

  it('isolates buffers between different sessions', () => {
    const buffer1 = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Session1"}]}}\n'
    );
    const buffer2 = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Session2"}]}}\n'
    );

    parseCLIOutput('session-1', buffer1);
    parseCLIOutput('session-2', buffer2);

    // Each session should have its own buffer
    expect(getSessionBuffer('session-1')).toBe('');
    expect(getSessionBuffer('session-2')).toBe('');
  });

  it('skips empty lines', () => {
    const buffer = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi"}]}}\n\n\n'
    );
    const events = parseCLIOutput('session-1', buffer);

    expect(events).toHaveLength(1);
  });

  it('handles multiple lines in single chunk', () => {
    const buffer = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Line1"}]}}\n{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Line2"}]}}\n'
    );
    const events = parseCLIOutput('session-1', buffer);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'message', content: 'Line1' });
    expect(events[1]).toEqual({ type: 'message', content: 'Line2' });
  });

  it('handles parse errors gracefully', () => {
    const buffer = Buffer.from(
      '{"invalid json"}\n{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"OK"}]}}\n'
    );
    const events = parseCLIOutput('session-1', buffer);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'message', content: 'OK' });
  });
});

describe('mapCLIEventToSSE', () => {
  it('maps assistant message event', () => {
    const cliEvent = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
      },
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).not.toBeNull();
    expect(event?.type).toBe('message');
    if (event?.type === 'message') {
      expect(event.content).toBe('Hello!');
    }
  });

  it('maps result/success event with usage', () => {
    const cliEvent = {
      type: 'result',
      subtype: 'success',
      result: 'Done',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).not.toBeNull();
    expect(event?.type).toBe('complete');
    if (event?.type === 'complete') {
      expect(event.input_tokens).toBe(100);
      expect(event.output_tokens).toBe(50);
    }
  });

  it('maps tool_use event from message content', () => {
    const cliEvent = {
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: 'Read',
            input: { file_path: '/test.txt' },
          },
        ],
      },
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).not.toBeNull();
    expect(event?.type).toBe('tool_use');
    if (event?.type === 'tool_use') {
      expect(event.tool_name).toBe('Read');
      expect(event.tool_input).toEqual({ file_path: '/test.txt' });
    }
  });

  it('maps tool_result event', () => {
    const cliEvent = {
      type: 'tool_result',
      result: 'File content',
      is_cached: false,
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).not.toBeNull();
    expect(event?.type).toBe('tool_result');
    if (event?.type === 'tool_result') {
      expect(event.tool_output).toBe('File content');
      expect(event.is_cached).toBe(false);
    }
  });

  it('skips system/init events', () => {
    const cliEvent = {
      type: 'system',
      subtype: 'init',
      session_id: 'abc',
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).toBeNull();
  });

  it('returns null for unknown event types', () => {
    const cliEvent = {
      type: 'unknown',
      data: 'something',
    };

    const event = mapCLIEventToSSE(cliEvent, 'session-1');

    expect(event).toBeNull();
  });
});

describe('clearSessionBuffer', () => {
  it('removes specified session buffer', () => {
    const buffer = Buffer.from(
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"test"}]}}\n'
    );
    parseCLIOutput('session-1', buffer);

    expect(getSessionBuffer('session-1')).toBe('');

    // Add more data to session
    parseCLIOutput('session-1', Buffer.from('partial'));

    clearSessionBuffer('session-1');

    expect(getSessionBuffer('session-1')).toBe('');
  });

  it('leaves other session buffers intact', () => {
    parseCLIOutput('session-1', Buffer.from('data1'));
    parseCLIOutput('session-2', Buffer.from('data2'));

    clearSessionBuffer('session-1');

    // Session 2 buffer should still exist
    expect(getSessionBuffer('session-2')).toBe('data2');
  });
});

describe('getBufferedSessionIds', () => {
  it('returns empty array when no buffers exist', () => {
    // Clear any existing buffers
    getBufferedSessionIds().forEach((id) => { clearSessionBuffer(id); });

    const ids = getBufferedSessionIds();
    expect(ids).toEqual([]);
  });

  it('returns all buffered session ids', () => {
    // Clear first
    getBufferedSessionIds().forEach((id) => { clearSessionBuffer(id); });

    parseCLIOutput('session-a', Buffer.from('da'));
    parseCLIOutput('session-b', Buffer.from('db'));

    const ids = getBufferedSessionIds();

    expect(ids).toContain('session-a');
    expect(ids).toContain('session-b');
  });
});
