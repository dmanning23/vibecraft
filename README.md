# Vibecraft

![Vibecraft Screenshot](public/Screenshot_NeoTokyo.png)

**An ant farm for AI agents.**

Instead of watching a wall of scrolling terminal output, your Claude Code instances become little characters running around a neon-lit Neo Tokyo workshop — sprinting to the terminal station when they run a command, ducking into the bookshelf to read a file, stepping through a glowing portal to spawn a subagent. It's the same work, just alive.

Think of it as a gamified window into what your agents are actually doing. Every tool call is a movement, every task is a mission, every subagent is a new street samurai on the floor.

**[Try it instantly at vibecraft.sh](https://vibecraft.sh)** — still connects to your local Claude Code instances!

![Three.js](https://img.shields.io/badge/Three.js-black?logo=threedotjs) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white) ![npm](https://img.shields.io/npm/v/vibecraft)

---

## How It Works

```
Claude Code → Hook Script → WebSocket Server → Browser (Three.js)
```

Claude Code fires hook events on every tool call. A bash hook script captures those events and forwards them to a local WebSocket server, which broadcasts them to the browser. The 3D scene reacts in real time — characters move, stations glow, subagents spawn and despawn.

No files or prompts leave your machine.

---

## Requirements

- **macOS or Linux** (Windows not supported — hooks require bash)
- **Node.js** 18+
- **jq** — for hook scripts (`brew install jq` / `apt install jq`)
- **tmux** — for session management (`brew install tmux` / `apt install tmux`)

## Quick Start

```bash
# 1. Install dependencies
brew install jq tmux       # macOS
# sudo apt install jq tmux  # Ubuntu/Debian

# 2. Configure hooks (one time)
npx vibecraft setup

# 3. Start server
npx vibecraft
```

Open http://localhost:4003 and use Claude Code normally. You'll see your agent move around the workshop as it uses tools.

**From source:**
```bash
git clone https://github.com/nearcyan/vibecraft
cd vibecraft && npm install && npm run dev
# Opens on http://localhost:4002
```

**To uninstall:** `npx vibecraft uninstall` (removes hooks, keeps your data)

---

## Browser Control (Optional)

Run Claude in tmux to send prompts directly from the browser:

```bash
tmux new -s claude
claude
```

Then use the input field in the visualization with "Send to tmux" checked.

---

## Stations

Each agent has a hexagonal zone with 8 workstations. They move between them based on what tool they're running:

| Station | Tools | What it looks like |
|---------|-------|--------------------|
| Bookshelf | Read | Books on shelves |
| Desk | Write | Paper, pencil, ink pot |
| Workbench | Edit | Wrench, gears, bolts |
| Terminal | Bash | Glowing screen |
| Scanner | Grep, Glob | Telescope with lens |
| Antenna | WebFetch, WebSearch | Satellite dish |
| Portal | Task (subagents) | Glowing ring portal |
| Taskboard | TodoWrite | Board with sticky notes |

---

## Features

- **Live character movement** — agents walk to the station matching the active tool
- **Subagent visualization** — mini-agents spawn at the portal when Task spins up parallel work
- **Floating context labels** — file paths and commands appear above active stations
- **Thought bubbles** — agents show a thinking animation while processing
- **Response capture** — Claude's responses stream into the activity feed
- **Attention system** — zones pulse red when a session needs input or finishes
- **Spatial audio** — synthesized sound effects positioned in 3D space ([docs/SOUND.md](docs/SOUND.md))
- **Context-aware animations** — agents celebrate git commits, shake their heads on errors
- **Voice input** — speak prompts with real-time transcription (requires Deepgram API key)
- **Draw mode** — paint hex tiles with colors, 3D stacking, and text labels (press `D`)
- **Zone context menus** — right-click zones for info (`I`) or quick command input (`C`)
- **Station panels** — press `P` to see recent tool history per workstation

---

## Multi-Agent (Multi-clauding)

![Multi-clauding](public/multiclaude.png)

Spawn and direct multiple Claude instances from one view:

1. Click **"+ New"** (or `Alt+N`) to spawn a new session
2. Configure name, directory, and flags (`-r`, `--chrome`, `--dangerously-skip-permissions`)
3. Click a zone or press `1-6` (or `Alt+1-6` in inputs) to select it
4. Send prompts to whichever agent you want

Each session lives in its own hexagonal zone with its own character and status tracking (idle / working / offline). Subagents spawned by Task tool show up as smaller characters inside the parent zone.

See [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md) for the full API and architecture.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` / `Esc` | Switch focus between Workshop and Activity Feed |
| `1-6` | Switch to session (extended: QWERTY, ASDFGH, ZXCVBN rows) |
| `0` / `` ` `` | All sessions / overview |
| `Alt+N` | New session |
| `Alt+A` | Jump to next session needing attention |
| `Alt+R` | Toggle voice input |
| `F` | Toggle follow mode |
| `P` | Toggle station panels |
| `D` | Toggle draw mode |
| `Ctrl+C` | Interrupt active session (or copy if text is selected) |

**Draw mode:** `1-6` colors, `0` eraser, `Q/E` brush size, `R` 3D stacking, `X` clear all

---

## CLI Options

```bash
vibecraft [options]

Options:
  --port, -p <port>    WebSocket server port (default: 4003)
  --help, -h           Show help
  --version, -v        Show version
```

See [docs/SETUP.md](docs/SETUP.md) for detailed setup.
See [CLAUDE.md](CLAUDE.md) for full technical documentation.

Website: https://vibecraft.sh

## License

MIT
