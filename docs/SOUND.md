# Sound System

This document explains Vibecraft's audio architecture, including synthesized sounds and spatial audio positioning.

## Overview

Vibecraft uses **Tone.js** for programmatic sound synthesis. No audio files are needed - all sounds are generated in real-time using Web Audio API.

```
Event (tool use, stop, etc.)
    ↓
EventBus handler (soundHandlers.ts)
    ↓
soundManager.play(name, { zoneId })
    ↓
Calculate spatial params (if positional)
    ↓
Route through Tone.Panner
    ↓
Play synthesized sound
```

## Files

| File | Purpose |
|------|---------|
| `src/audio/SoundManager.ts` | Sound definitions, playback, spatial integration |
| `src/audio/SpatialAudioContext.ts` | Listener tracking, distance/pan calculations |
| `src/audio/VoiceInput.ts` | Deepgram voice input integration |
| `src/audio/index.ts` | Barrel exports |
| `src/events/handlers/soundHandlers.ts` | Event-to-sound mapping |

## Sound Catalog

### Tools (10)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `read` | Read tool | Two-tone sine (A4→C5) |
| `write` | Write tool | Triple square blip (E5, E5, G5) |
| `edit` | Edit tool | Double triangle tap (E4→G4) |
| `bash` | Bash tool | DataBurst - 5 rapid sawtooth blips (C5) |
| `grep` | Grep tool | Sweep with "found it" blip |
| `glob` | Glob tool | Alias for grep |
| `webfetch` | WebFetch tool | Ascending arpeggio (C5→E5→G5→C6) |
| `websearch` | WebSearch tool | Alias for webfetch |
| `task` | Task tool | FM synth sweep (C3→C4) |
| `todo` | TodoWrite tool | Triple checkbox tick (E4, E4, G4) |

### Tool Results (2)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `success` | post_tool_use (success=true) | Rising chime (C5→G5) |
| `error` | post_tool_use (success=false) | Descending buzz (A2→F2) |

### Session Events (4)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `prompt` | user_prompt_submit | Gentle acknowledgment (G4→D5) |
| `stop` | stop event | Completion chord (E4→G4→C5) |
| `thinking` | Claude thinking state | Ambient two-tone (D4, F4) |
| `notification` | notification event | Double ping (A4, A4) |

### Zones (2, legacy)

These sounds exist in the codebase but are not currently triggered by the 2D village UI.

| Sound | Description |
|-------|-------------|
| `zone_create` | Rising staggered chord (C4→E4→G4→C5) |
| `zone_delete` | Descending minor (G4→Eb4→C4→G3) |

### Subagents (2)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `spawn` | Task tool starts | Ethereal rise (C4→G5) |
| `despawn` | Task tool completes | Ethereal fall (G4→C3) |

### Character (1)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `walking` | Claude moves to station | Soft double footstep (D4, D4) |

### UI Interactions (6)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `click` | UI click | Soft pop/tap |
| `modal_open` | Modal appears | Soft whoosh up |
| `modal_cancel` | Modal dismissed | Descending tone |
| `modal_confirm` | Modal confirmed | Ascending triad |
| `hover` | Hover interaction | Distance-based pitch tick |
| `focus` | Focus transition | Quick whoosh/zoom |

### Special (4)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `git_commit` | Bash with `git commit` | Satisfying fanfare (G→B→D→G + shimmer) |
| `intro` | App startup | Jazz Cmaj9 chord bloom |
| `voice_start` | Voice recording starts | Ascending beep (C5→E5) |
| `voice_stop` | Voice recording stops | Descending beep (E5→C5) |

### Draw Mode (1)

| Sound | Trigger | Description |
|-------|---------|-------------|
| `clear` | Clear all painted hexes | Descending sweep |

## Spatial Audio

The audio system supports two modes per sound — `positional` (volume/pan based on source location) and `global` (always centered, full volume). The infrastructure exists in `SpatialAudioContext.ts` but positional audio is not actively wired up in the current 2D village UI; all sounds effectively play as global.

### Mode Assignments

**Positional sounds** (intended to be zone-aware):
- All tool sounds: `read`, `write`, `edit`, `bash`, `grep`, `glob`, `webfetch`, `websearch`, `task`, `todo`
- Tool results: `success`, `error`
- Session events: `prompt`, `stop`, `thinking`
- Subagents: `spawn`, `despawn`
- Character: `walking`

**Global sounds** (always centered):
- Special: `git_commit`, `intro`
- System: `notification`
- UI: `click`, `modal_open`, `modal_cancel`, `modal_confirm`, `hover`, `focus`
- Voice: `voice_start`, `voice_stop`
- Draw: `clear`

## Usage

### Basic Playback

```typescript
import { soundManager } from './audio'

// Initialize (must be from user gesture)
await soundManager.init()

// Play by name (global)
soundManager.play('git_commit')

// Play with spatial positioning
soundManager.play('bash', { zoneId: 'session-123' })

// Play tool sound
soundManager.playTool('Read', { zoneId })

// Play result sound
soundManager.playResult(success, { zoneId })
```

### Event Handler Integration

```typescript
// In soundHandlers.ts
eventBus.on('pre_tool_use', (event, ctx) => {
  if (!ctx.soundEnabled) return
  const spatial = ctx.session?.id ? { zoneId: ctx.session.id } : undefined
  soundManager.playTool(event.tool, spatial)
})
```

### Spatial Configuration

```typescript
// Connect zone resolver (once at startup)
soundManager.setZonePositionResolver((zoneId) => {
  return scene.getZoneWorldPosition(zoneId)
})

// Connect focused zone resolver
soundManager.setFocusedZoneResolver(() => {
  return scene.focusedZoneId
})

// Toggle spatial audio
soundManager.setSpatialEnabled(false)
```

## Volume Levels

Sounds use consistent dB levels:

| Level | dB | Use Case |
|-------|-----|----------|
| `QUIET` | -20 | Background/ambient |
| `SOFT` | -16 | Subtle feedback (walking) |
| `NORMAL` | -12 | Standard UI feedback |
| `PROMINENT` | -10 | Important events |
| `LOUD` | -8 | Major events |

## Adding New Sounds

1. Add sound name to `SoundName` type in `SoundManager.ts`
2. Add spatial mode to `SOUND_SPATIAL_MODE` map
3. Add tool mapping to `TOOL_SOUND_MAP` (if it's a tool)
4. Add sound definition to `sounds` object
5. Call from appropriate event handler

Example:

```typescript
// 1. Add to SoundName type
export type SoundName = ... | 'my_new_sound'

// 2. Add spatial mode
const SOUND_SPATIAL_MODE: Record<SoundName, SpatialMode> = {
  ...
  my_new_sound: 'positional',  // or 'global'
}

// 3. Add sound definition
private sounds: Record<SoundName, () => void> = {
  ...
  my_new_sound: () => {
    const synth = this.createDisposableSynth(
      { type: 'sine', attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      VOL.NORMAL
    )
    synth.triggerAttackRelease('C5', '8n')
  },
}
```

## Design Philosophy

- **Digital theme**: Clean synth tones, quick response
- **Non-intrusive**: Sounds complement, don't distract
- **User control**: Toggle in settings, volume slider
