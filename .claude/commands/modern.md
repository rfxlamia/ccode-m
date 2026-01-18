---
description: Launch Claude Code GUI in browser
allowed-tools: Bash(npm:*, npx:*)
---

Launch the Claude Code GUI server and open in browser.

Run the server from the modern directory:

```bash
cd ~/.claude/modern && npm run start
```

The server will:
1. Start the GUI server on an available port (default 3000)
2. Open your default browser to the GUI
3. Keep running until you press Ctrl+C

If port 3000 is in use, it will find another available port.
