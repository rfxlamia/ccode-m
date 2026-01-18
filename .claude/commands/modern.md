---
description: Launch Claude Code GUI in browser
allowed-tools: Bash(node:*)
---

Launch the Claude Code GUI server and open in browser.

Run the server (it will keep running until user stops it):

```bash
node ~/.claude/modern/dist/cli/modern.js
```

The server will:
1. Start the GUI server on an available port
2. Open your default browser to the GUI
3. Keep running until you press Ctrl+C

If the server is already running, it will reuse the existing instance.
