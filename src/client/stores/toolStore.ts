import { create } from 'zustand';
import type { ToolInvocation } from '@shared/types';

interface ToolState {
  tools: ToolInvocation[];
  nextId: number;
  addToolUse: (tool: Omit<ToolInvocation, 'id' | 'status' | 'isExpanded'>) => void;
  updateToolResult: (result: string, isCached?: boolean) => void;
  setToolError: (errorMessage: string) => void;
  toggleExpanded: (id: string) => void;
  clearTools: () => void;
}

export const useToolStore = create<ToolState>((set) => ({
  tools: [],
  nextId: 0,
  addToolUse: (tool) => {
    set((state) => ({
      tools: [
        ...state.tools,
        {
          ...tool,
          id: `tool-${String(state.nextId)}`,
          status: 'pending',
          isExpanded: false,
        },
      ],
      nextId: state.nextId + 1,
    }));
  },
  updateToolResult: (result, isCached) => {
    set((state) => {
      const pendingIndex = state.tools.findIndex((tool) => tool.status === 'pending');
      if (pendingIndex === -1) {
        return state;
      }
      const updated = [...state.tools];
      const pendingTool = updated[pendingIndex];
      if (!pendingTool) {
        return state;
      }
      updated[pendingIndex] = {
        ...pendingTool,
        status: 'complete',
        result,
        isCached,
      };
      return { tools: updated };
    });
  },
  setToolError: (errorMessage) => {
    set((state) => {
      const pendingIndex = state.tools.findIndex((tool) => tool.status === 'pending');
      if (pendingIndex === -1) {
        return state;
      }
      const updated = [...state.tools];
      const pendingTool = updated[pendingIndex];
      if (!pendingTool) {
        return state;
      }
      updated[pendingIndex] = {
        ...pendingTool,
        status: 'error',
        errorMessage,
      };
      return { tools: updated };
    });
  },
  toggleExpanded: (id) => {
    set((state) => ({
      tools: state.tools.map((tool) =>
        tool.id === id ? { ...tool, isExpanded: !tool.isExpanded } : tool
      ),
    }));
  },
  clearTools: () => {
    set({ tools: [], nextId: 0 });
  },
}));
