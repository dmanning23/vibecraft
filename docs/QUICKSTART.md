# Vibecraft Quick Start

## TL;DR

```bash
# Install deps (macOS)
brew install jq tmux

# Configure hooks (once)
npx vibecraft setup

# Run
npx vibecraft
```

Open http://localhost:4003 and use Claude Code normally. Your agent will appear as a character walking around the village.

---

## Not working?

| Problem | Fix |
|---------|-----|
| "jq not found" | `brew install jq` or `apt install jq` |
| No WebSocket connection | Is `npx vibecraft` running? Did you run `setup`? |
| No events appearing | Restart Claude Code after running `setup` |
| Wrong port | Default is 4003, check your URL |

## Want custom scenarios?

Add to `.env`:
```
OPENAI_API_KEY=sk-...
SD_URL=http://localhost:7860
```

Then use the ☰ menu in the app to generate a new scenario. See [SETUP.md](./SETUP.md) for details.

## Full guide

See [SETUP.md](./SETUP.md)
