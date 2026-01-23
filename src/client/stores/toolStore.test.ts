import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolStore } from './toolStore';

describe('useToolStore', () => {
  beforeEach(() => {
    act(() => {
      useToolStore.setState({
        tools: [],
        nextId: 0,
      });
    });
  });

  it('should add tool uses with sequential ids and pending status', () => {
    const { result } = renderHook(() => useToolStore());
    const baseTool = {
      toolName: 'Read',
      toolInput: { file_path: '/tmp/example.txt' },
      timestamp: new Date(),
    };

    act(() => {
      result.current.addToolUse(baseTool);
      result.current.addToolUse({ ...baseTool, toolName: 'Write' });
    });

    expect(result.current.tools).toHaveLength(2);
    expect(result.current.tools[0]?.id).toBe('tool-0');
    expect(result.current.tools[0]?.status).toBe('pending');
    expect(result.current.tools[0]?.isExpanded).toBe(false);
    expect(result.current.tools[1]?.id).toBe('tool-1');
  });

  it('should update oldest pending tool with result', () => {
    const { result } = renderHook(() => useToolStore());
    const baseTool = {
      toolName: 'Read',
      toolInput: { file_path: '/tmp/example.txt' },
      timestamp: new Date(),
    };

    act(() => {
      result.current.addToolUse(baseTool);
      result.current.addToolUse({ ...baseTool, toolName: 'Bash' });
      result.current.updateToolResult('ok', true);
    });

    expect(result.current.tools[0]?.status).toBe('complete');
    expect(result.current.tools[0]?.result).toBe('ok');
    expect(result.current.tools[0]?.isCached).toBe(true);
    expect(result.current.tools[1]?.status).toBe('pending');
  });

  it('should set error on oldest pending tool', () => {
    const { result } = renderHook(() => useToolStore());
    const baseTool = {
      toolName: 'Read',
      toolInput: { file_path: '/tmp/example.txt' },
      timestamp: new Date(),
    };

    act(() => {
      result.current.addToolUse(baseTool);
      result.current.addToolUse({ ...baseTool, toolName: 'Edit' });
      result.current.setToolError('boom');
    });

    expect(result.current.tools[0]?.status).toBe('error');
    expect(result.current.tools[0]?.errorMessage).toBe('boom');
    expect(result.current.tools[1]?.status).toBe('pending');
  });

  it('should toggle expanded state by id', () => {
    const { result } = renderHook(() => useToolStore());
    const baseTool = {
      toolName: 'Read',
      toolInput: { file_path: '/tmp/example.txt' },
      timestamp: new Date(),
    };

    act(() => {
      result.current.addToolUse(baseTool);
    });

    expect(result.current.tools[0]?.isExpanded).toBe(false);

    act(() => {
      result.current.toggleExpanded('tool-0');
    });

    expect(result.current.tools[0]?.isExpanded).toBe(true);
  });

  it('should clear tools and reset nextId', () => {
    const { result } = renderHook(() => useToolStore());
    const baseTool = {
      toolName: 'Read',
      toolInput: { file_path: '/tmp/example.txt' },
      timestamp: new Date(),
    };

    act(() => {
      result.current.addToolUse(baseTool);
    });

    expect(result.current.tools).toHaveLength(1);
    expect(result.current.nextId).toBe(1);

    act(() => {
      result.current.clearTools();
    });

    expect(result.current.tools).toEqual([]);
    expect(result.current.nextId).toBe(0);
  });
});
