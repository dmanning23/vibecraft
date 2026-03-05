# Vibecraft

![Vibecraft Screenshot](public/Screenshot_NeoTokyo.png)

**An ant farm for AI agents.**

Instead of watching a wall of scrolling terminal output, your Claude Code instances become little characters running around a living village — sprinting to the terminal when they run a command, ducking into the library to read a file, heading to town hall to spawn a subagent. It's the same work, just alive.

Run multiple Claude instances and each one gets its own character, moving independently through the same village. Think of it as a gamified window into what your agents are actually doing.

**[Try it instantly at vibecraft.sh](https://vibecraft.sh)** — still connects to your local Claude Code instances!

![React](https://img.shields.io/badge/React-blue?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white) ![npm](https://img.shields.io/npm/v/vibecraft)

---

## How It Works

```
Claude Code → Hook Script → WebSocket Server → Browser (React)
```

Claude Code fires hook events on every tool call. A bash hook script captures those events and forwards them to a local WebSocket server, which broadcasts them to the browser. Character sprites move to the matching village location in real time.

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

Open http://localhost:4003 and use Claude Code normally. You'll see your agent move around the village as it uses tools.

**From source:**
```bash
git clone https://github.com/nearcyan/vibecraft
cd vibecraft && npm install && npm run dev
# Opens on http://localhost:4002
```

**To uninstall:** `npx vibecraft uninstall` (removes hooks, keeps your data)

---

## Multiple Instances

Run multiple Claude Code instances simultaneously and each one appears as its own character in the village, moving independently based on what it's doing. Characters spread out when they're at the same location so you can always tell them apart.

To send prompts to a specific instance, run Claude in a named tmux session:

```bash
tmux new -s claude
claude
```

Then use the session panel to select which instance to talk to.

---

## Village Locations

Characters move between 9 locations based on the active tool:

| Location | Tools |
|----------|-------|
| Library | Read |
| Writer's Cottage | Write |
| Workshop | Edit |
| Terminal Tower | Bash |
| Observatory | Grep, Glob |
| Signal Tower | WebFetch, WebSearch |
| Town Hall | Task (subagents) |
| Notice Board | TodoWrite |
| Village Square | Idle / default |

---

## Features

- **Per-session characters** — each Claude instance gets its own sprite, moving independently
- **Live character movement** — agents walk to the building matching the active tool
- **Subagent visualization** — mini-agents appear at Town Hall when Task spins up parallel work
- **Activity feed** — full log of tool calls, prompts, and responses per session
- **Session management** — spawn and manage multiple Claude instances from one view
- **Attention system** — sessions pulse when they need input or finish a task
- **Sound effects** — synthesized audio feedback on tool calls and state changes
- **Custom scenarios** — generate entirely new visual themes with OpenAI + Stable Diffusion
- **Per-asset regeneration** — re-roll any individual character or building image if the generation misfired

---

## Custom Scenarios

Vibecraft can generate entirely new visual themes — different art styles, settings, and characters — using OpenAI and Stable Diffusion.

### Stable Diffusion Setup

Vibecraft uses **AUTOMATIC1111 (A1111)** with the `--api` flag enabled.

**1. Install A1111** if you haven't already — follow the [AUTOMATIC1111 installation guide](https://github.com/AUTOMATIC1111/stable-diffusion-webui).

**2. Enable the API.** Add `--api` to your launch arguments:

- **macOS/Linux:** edit `webui-user.sh` and add to `COMMANDLINE_ARGS`:
  ```bash
  export COMMANDLINE_ARGS="--api"
  ```
- **Windows:** edit `webui-user.bat`:
  ```bat
  set COMMANDLINE_ARGS=--api
  ```

Then launch A1111 normally. The API will be available at `http://localhost:7860` by default.

**3. Install required models and LoRAs** into your A1111 models folder:

> **TODO:** paste model and LoRA download links here

**4. Set `SD_URL`** in your `.env` to point at your A1111 instance:

```
SD_URL=http://localhost:7860
```

If A1111 is running on a different machine or port, update the URL accordingly.

---

**Setup (one time):** add to your `.env`:
```
OPENAI_API_KEY=sk-...
SD_URL=http://localhost:7860
```

Then open the ☰ menu in the app and click **Create New Scenario**. Describe the world you want:

> *"A cozy underwater kingdom with coral buildings and bioluminescent lighting"*
> *"A retro 80s cyberpunk city with neon signs and rain-slicked streets"*

OpenAI plans the scenario and generates Stable Diffusion prompts. SD generates the background, all 9 building exteriors, and 7 characters with 5 animation states each (idle, walking, working, thinking, finished). Background removal runs automatically on characters and buildings.

If a generation goes sideways (LoRA didn't trigger, wrong composition), hit ↻ on any individual asset to regenerate just that image. OpenAI automatically rewrites the prompt with fresh phrasing before re-running SD.

---

## Browser Prompt Input (Optional)

Run Claude in tmux to send prompts directly from the browser:

```bash
tmux new -s claude
claude
```

Then use the prompt input at the bottom of the activity feed. The selected session receives the prompt via tmux.

---

## CLI Options

```bash
vibecraft [options]

Options:
  --port, -p <port>    WebSocket server port (default: 4003)
  --help, -h           Show help
  --version, -v        Show version
```

See [CLAUDE.md](CLAUDE.md) for full technical documentation.

Website: https://vibecraft.sh

## License

MIT
