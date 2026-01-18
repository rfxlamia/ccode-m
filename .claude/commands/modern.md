---
description: Launch Claude Code GUI in browser
allowed-tools: Bash(npm:*, npx:*, export:*)
---

Launch the Claude Code GUI server and open in browser.

Run the full development server (Vite frontend + Fastify backend):

```bash
export CLAUDE_PROJECT_PATH="$PWD" && cd ~/.claude/modern && npm run dev
```

This starts:
1. **Vite dev server** at http://localhost:5173 (the GUI)
2. **Fastify backend** at http://localhost:3000 (API)

The CLI session will be spawned in your current project directory.

Open http://localhost:5173 in your browser for the GUI.

Press Ctrl+C to stop both servers.
