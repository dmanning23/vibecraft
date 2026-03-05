# Vibecraft - Technical Documentation

This document explains the Vibecraft codebase for future AI assistants working on this project.

## Project Purpose

Vibecraft visualizes Claude Code's activity in real-time as a 2D village. When Claude uses tools (Read, Edit, Bash, etc.), a character sprite moves to the corresponding building in the village. Multiple Claude instances each get their own character. The user can also send prompts to Claude from the browser via tmux integration.

Scenarios (visual themes) are generated with OpenAI + Stable Diffusion — the village background, buildings, and character sprites are all AI-generated images that match a user-defined description.

## Architecture Overview

```
Claude Code → Hook Script → WebSocket Server → Browser (React)
                  ↓
            events.jsonl (persistent log)
```

### Data Flow

1. **Claude Code** executes tools (Read, Edit, Bash, etc.)
2. **Hook script** (`hooks/vibecraft-hook.sh`) receives JSON via stdin from Claude Code's hook system
3. Hook writes to `~/.vibecraft/data/events.jsonl` AND POSTs to `http://localhost:4003/event`
4. **WebSocket server** (`server/index.ts`) broadcasts events to connected clients
5. **Browser** (`src/main.tsx`) receives events and moves character sprites in the village

**Important:** Both hook and server use `~/.vibecraft/data/` as the data directory.

### Frontend Architecture

The frontend is a React app (`src/main.tsx`). State is managed via React Context (`VillageContext`) and dispatched via a custom `EventBus`.

```
App.tsx
├── VillageProvider (VillageContext — village state)
│   ├── VillageView (canvas area)
│   │   ├── VillageBackground (scenario background image)
│   │   ├── VillageLocations (9 building sprites)
│   │   └── ClaudeCharacter (one sprite per active session)
│   ├── ActivityFeed (event log)
│   ├── SessionPanel (session management sidebar)
│   └── PromptForm (tmux prompt input)
```

**Event flow in the browser:**
```
EventClient (WebSocket)
    ↓ onEvent()
App.tsx → eventBus.emit()
    ↓
soundHandlers.ts    → Tone.js sounds
useEventSubscription.ts → VillageContext dispatch (character movement)
```

### EventBus

`src/events/EventBus.ts` — typed pub/sub. Handlers subscribe with `eventBus.on(type, handler)`.

Active handler files:
- `src/events/handlers/soundHandlers.ts` — tool sounds, lifecycle sounds

Character movement is handled directly in `src/hooks/useEventSubscription.ts` via React dispatch (not EventBus handlers).

## Key Files

### `shared/types.ts`
All TypeScript types shared between server and client:
- `ClaudeEvent` — union of all event types
- `TOOL_STATION_MAP` — maps tool names to station types (Read→bookshelf, etc.)
- `StationType` — the 9 station identifiers
- `ManagedSession` — session state (id, name, tmuxSession, status, claudeSessionId, etc.)
- `ServerMessage` / `ClientMessage` — WebSocket protocol

### `src/config/locations.ts`
Maps tools to village buildings:
- `VillageLocationType` — the 9 location identifiers
- `VILLAGE_LOCATIONS` — position, size, color, icon for each building
- `TOOL_TO_LOCATION` — tool name → village location
- `STATION_TO_LOCATION` — StationType (3D legacy) → VillageLocationType
- `getLocationForTool(tool)` — returns the location for a given tool name

**When adding a new tool mapping:** add it to `TOOL_TO_LOCATION`.

### `src/config/scenarios.ts`
Type definitions for scenarios:
- `ScenarioConfig` — `{ id, name, background, locations[], agents[], generationData? }`
- `AgentConfig` — `{ name?, states: { idle, walking, working, thinking, finished } }`
- `GenerationData` — stored alongside generated scenarios, enables per-asset regeneration

### `public/scenarios.json`
Runtime scenario data. Contains `defaultScenarioId` and a `scenarios` array. Loaded by `useScenario`. Updated by the scenario generator.

### `src/state/VillageContext.tsx`
React context for all village state:

```typescript
interface VillageState {
  characters: Record<string, CharacterState>  // keyed by sessionId
  subagents: SubagentState[]
  activeLocation: VillageLocationType | null
  soundEnabled: boolean
  showLabels: boolean
  zoom: number
}

interface CharacterState {
  location: VillageLocationType
  previousLocation: VillageLocationType | null
  state: ClaudeState           // 'idle' | 'walking' | 'working' | 'thinking' | 'finished'
  isMoving: boolean
  currentTool: string | null
  sessionId: string
  agentIndex: number           // which scenario.agents[] entry to use for sprites
}
```

**Action creators** (`villageActions`):
- `ensureCharacter(sessionId)` — creates a character entry if one doesn't exist yet
- `moveCharacter(sessionId, location)` — starts movement animation
- `finishMoving(sessionId)` — called by CSS transition end
- `setCharacterState(sessionId, state, tool?)` — update state/tool
- `removeCharacter(sessionId)` — remove when session ends
- `spawnSubagent(subagent)` / `removeSubagent(toolUseId)`

### `src/hooks/useEventSubscription.ts`
Subscribes to EventBus and dispatches VillageContext actions:
- `pre_tool_use` → `ensureCharacter` + `moveCharacter` + `setCharacterState('working')`
- `post_tool_use` → `setCharacterState('thinking')`
- `stop` → `moveCharacter(sessionId, 'square')` + `setCharacterState('idle')`
- `user_prompt_submit` → `setCharacterState('thinking')`

### `src/components/Character/ClaudeCharacter.tsx`
Renders all active session characters as CSS-transitioned sprites:
- `ClaudeCharacter` — maps `characters` record → one `SingleCharacter` per session
- `SingleCharacter` — manages its own pixel position state, applies `xOffset` to spread characters that share a location
- Characters at the same location are spread 56px apart (centered on the group)
- Each character uses `scenario.agents[agentIndex % agents.length]` for sprites

### `src/components/Village/VillageView.tsx`
Main village canvas container:
- On `sessions` change, dispatches `ensureCharacter` for each known session so characters appear even when idle
- Renders background, locations, characters in layered divs (z: 10, 20, 30)
- Contains the config hamburger and ConfigPanel drawer

### `src/hooks/useScenario.ts`
Loads `public/scenarios.json` with module-level caching. Persists selected scenario to `localStorage`. `reloadScenarios()` busts the cache and re-fetches (called after generation completes).

### `src/events/EventClient.ts`
WebSocket client:
- Auto-reconnects
- `onEvent(handler)` — single new event
- `onHistory(handler)` — batch of historical events on connect
- `onSessions(handler)` — `ManagedSession[]` updates
- `onRawMessage(handler)` — untyped messages (used for `scenario_generation`, `asset_regeneration`)

### `server/index.ts`
Node.js WebSocket + HTTP server:
- Watches `events.jsonl` with chokidar
- Accepts POST `/event` for real-time hook events
- Manages sessions: create/update/delete, health checks (every 5s via `tmux list-sessions`), working timeout (2 min)
- tmux integration: POST `/prompt`, POST `/cancel`
- POST `/generate-scenario` — starts scenario generation (reads `OPENAI_API_KEY`, `SD_URL` from env)
- POST `/regenerate-asset` — regenerates a single asset (reads `OPENAI_API_KEY`, `SD_URL` from env)

### `server/ScenarioGenerator.ts`
Generates complete scenarios or single assets:
- `generateScenario(request, broadcast)` — full generation: 3 OpenAI planning steps, then SD for background (1) + locations (9) + agents (7×5 states) = 49 steps total
- `regenerateAsset(publicDir, scenariosFile, request, broadcast)` — single asset; calls `rephrasePrompt` via OpenAI to vary the stored SD prompt before regenerating (helps with LoRA failures)
- Images saved to `public/assets/generated/<id>/`
- Progress broadcast via WebSocket `scenario_generation` / `asset_regeneration` messages

### `server/ScenarioPlanner.ts`
OpenAI calls for scenario planning:
- `planMeta(apiKey, description)` → `{ id, name, backgroundPrompt }`
- `planLocations(apiKey, description, scenarioName)` → 9 location plans with SD prompts
- `planAgents(apiKey, description, scenarioName)` → 7 agent physical descriptions
- `rephrasePrompt(apiKey, assetType, originalPrompt)` → varied SD prompt for regeneration

### `src/audio/SoundManager.ts`
Synthesized audio via Tone.js. No audio files — all sounds are Web Audio.

```typescript
soundManager.init()            // Call from user gesture
soundManager.play('bash')      // By sound name
soundManager.playTool('Read')  // By tool name
soundManager.setVolume(0.5)    // 0–1
soundManager.setEnabled(false) // Mute
```

Triggered via `src/events/handlers/soundHandlers.ts`.

### `src/styles/`
Modular CSS, imported in `main.tsx` via `src/styles/index.css`:

| File | Purpose |
|------|---------|
| `base.css` | Reset, layout, animations |
| `sessions.css` | Session panel |
| `feed.css` | Activity feed |
| `prompt.css` | Prompt input |
| `hud.css` | Scene HUD |
| `modals.css` | All modals including create-scenario dialog |

### `hooks/vibecraft-hook.sh`
Bash script capturing Claude Code events. Installed to `~/.vibecraft/hooks/` by `npx vibecraft setup`.
- Reads JSON from stdin, transforms with `jq`, writes to `events.jsonl`, POSTs to server
- Uses `find_tool()` to locate `jq` and `curl` defensively across platforms
- `jq -n -c` for compact single-line JSONL output
- Timestamp fix: `10#$ms_part` to force decimal (prevents octal parse of e.g. `087`)

## Village Locations

| Location | Tool(s) | Description |
|----------|---------|-------------|
| `library` | Read | Where Claude reads files |
| `cottage` | Write, NotebookEdit | Where Claude writes new files |
| `workshop` | Edit | Where Claude edits files |
| `terminal` | Bash | Where Claude runs commands |
| `observatory` | Grep, Glob | Where Claude searches |
| `signal_tower` | WebFetch, WebSearch | Where Claude fetches from the web |
| `town_hall` | Task | Where subagents are spawned |
| `notice_board` | TodoWrite | Where Claude manages tasks |
| `square` | Idle, AskUserQuestion, unknown | Village center (default) |

## Scenario System

Scenarios define the visual theme of the village. Each has:
- A **background** image (wide landscape, 2048×1024)
- **9 location** images (isometric building exteriors, 768×512, background-removed)
- **7 agent** configs, each with 5 state images (idle/walking/working/thinking/finished, 832×1344, background-removed)

**Generation flow:**
1. User opens Config → "Create New Scenario" and enters a description
2. Browser POSTs `{ description }` to `/generate-scenario`
3. Server reads `OPENAI_API_KEY` + `SD_URL` from env, runs generation in background
4. Progress broadcast via `scenario_generation` WebSocket messages
5. On completion, `reloadScenarios()` refreshes `scenarios.json`

**Regeneration:**
- Each asset has a ↻ button in Config → Regenerate panel
- Browser POSTs `{ scenarioId, assetKey }` to `/regenerate-asset`
- Server calls `rephrasePrompt` (OpenAI) to vary the stored SD prompt, then re-runs SD
- `assetKey` format: `'background'` | `'location-{i}'` | `'agent-{i}-{state}'`

**Stored in `generationData`:** `sdUrl`, `description`, `backgroundPrompt`, per-location `sdPrompt`, per-agent `physicalDescription`. This data powers regeneration without re-running OpenAI planning.

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for scenario generation and regeneration |
| `SD_URL` | Stable Diffusion server URL (e.g. `http://localhost:7860`) |
| `VIBECRAFT_PORT` | WebSocket/API server port (default: 4003) |
| `VIBECRAFT_CLIENT_PORT` | Vite dev server port (default: 4002) |
| `VIBECRAFT_EVENTS_FILE` | Event log path (default: `~/.vibecraft/data/events.jsonl`) |
| `VIBECRAFT_SESSIONS_FILE` | Session persistence file (default: `~/.vibecraft/data/sessions.json`) |
| `VIBECRAFT_TMUX_SESSION` | tmux session name for prompt injection (default: `claude`) |
| `VIBECRAFT_DEBUG` | Verbose server logging (default: false) |
| `DEEPGRAM_API_KEY` | Deepgram key for voice input (optional) |

Copy `.env.example` to `.env` and fill in values.

### Data Directory

All runtime data lives in `~/.vibecraft/data/`:
- `events.jsonl` — append-only event log
- `sessions.json` — persisted session state
- `tiles.json` — text tile labels (legacy)

### Central Defaults (`shared/defaults.ts`)

Defines default port/path values. Imported by `server/index.ts` and `vite.config.ts`. Frontend receives port via Vite's `define` at build time.

## State Management

### Session Lifecycle

| Event | Server status | Character state |
|-------|--------------|----------------|
| `user_prompt_submit` | `working` | `thinking` |
| `pre_tool_use` | `working` | `working` (moves to location) |
| `post_tool_use` | `working` | `thinking` |
| `stop` | `idle` | `idle` (returns to square) |
| tmux session gone | `offline` | unchanged |
| 2 min no activity | `idle` | unchanged |

### Multi-Session Characters

Each `ManagedSession` gets a character keyed by `session.claudeSessionId ?? session.id`. `agentIndex` is assigned sequentially as characters are created, cycling through `scenario.agents[]` so each session has a distinct sprite. Characters at the same location are spread horizontally (56px × scale per character).

### Session Persistence

Sessions are saved to `~/.vibecraft/data/sessions.json` on every status change. On server restart they load as `offline`; health checks then update live ones to their real status.

## Common Tasks

### Add a new tool mapping
Edit `TOOL_TO_LOCATION` in `src/config/locations.ts`.

### Add a new village location
1. Add to `VillageLocationType` union in `src/config/locations.ts`
2. Add entry to `VILLAGE_LOCATIONS` with position/size/color/icon
3. Add to `TOOL_TO_LOCATION` for relevant tools
4. Add building image assets to `public/assets/`

### Add a new event handler
```typescript
// In src/events/handlers/myHandlers.ts
import { eventBus } from '../EventBus'
import type { PreToolUseEvent } from '../../../shared/types'

export function registerMyHandlers(): void {
  eventBus.on('pre_tool_use', (event: PreToolUseEvent) => {
    // Handle the event...
  })
}
```
Register it in `src/events/handlers/soundHandlers.ts` (or a new file imported in App.tsx).

### Debugging events
1. Check `~/.vibecraft/data/events.jsonl` for raw events
2. Enable debug: `VIBECRAFT_DEBUG=true npm run dev:server`
3. Browser console shows EventClient logs

## Build & CLI

### npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Vite + tsx watch) |
| `npm run build` | Build both server and client |
| `npm run build:server` | Compile server TypeScript to `dist/server/` |
| `npm run build:client` | Build frontend to `dist/` |

### CLI Commands

```bash
vibecraft                 # Start server
vibecraft setup           # Install hook, configure all 8 hooks in ~/.claude/settings.json
vibecraft --port 4000     # Custom port
vibecraft --help
vibecraft --version
```

### TypeScript Compilation

- **Frontend**: Vite → `dist/`
- **Server**: `tsc -p tsconfig.server.json` → `dist/server/`
- **CLI**: Compiled JS first, falls back to tsx for dev

## Codebase Notes

- `src/entities.bak/` and `src/scene.bak/` — backed-up Three.js 3D code from the previous workshop visualization. Not used.
- `src/main.ts.bak` — backed-up vanilla TS entry point. Not used.
- The active entry point is `src/main.tsx` (React).
