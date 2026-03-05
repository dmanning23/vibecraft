/**
 * Village State Context
 *
 * React context for managing village state including:
 * - Character position and state
 * - Active locations
 * - Subagents
 * - Sound settings
 */

import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { VillageLocationType } from '../config/locations'
import type { ClaudeState } from '@shared/types'

// ============================================================================
// State Types
// ============================================================================

export interface CharacterState {
  /** Current location in the village */
  location: VillageLocationType
  /** Previous location (for animation) */
  previousLocation: VillageLocationType | null
  /** Character state */
  state: ClaudeState
  /** Is currently moving between locations */
  isMoving: boolean
  /** Current tool being used (if any) */
  currentTool: string | null
  /** Session ID this character belongs to */
  sessionId: string
  /** Index into scenario.agents array for sprite selection */
  agentIndex: number
}

export interface SubagentState {
  id: string
  toolUseId: string
  description: string
  location: VillageLocationType
  state: ClaudeState
}

export interface VillageState {
  /** Per-session Claude characters, keyed by sessionId */
  characters: Record<string, CharacterState>
  /** Active subagents */
  subagents: SubagentState[]
  /** Currently highlighted location */
  activeLocation: VillageLocationType | null
  /** Sound enabled */
  soundEnabled: boolean
  /** Show location labels */
  showLabels: boolean
  /** Zoom level (1 = 100%) */
  zoom: number
}

// ============================================================================
// Actions
// ============================================================================

type VillageAction =
  | { type: 'ENSURE_CHARACTER'; payload: { sessionId: string } }
  | { type: 'MOVE_CHARACTER'; payload: { sessionId: string; location: VillageLocationType } }
  | { type: 'SET_CHARACTER_STATE'; payload: { sessionId: string; state: ClaudeState; tool?: string } }
  | { type: 'FINISH_MOVING'; payload: { sessionId: string } }
  | { type: 'REMOVE_CHARACTER'; payload: { sessionId: string } }
  | { type: 'SPAWN_SUBAGENT'; payload: SubagentState }
  | { type: 'REMOVE_SUBAGENT'; payload: { toolUseId: string } }
  | { type: 'SET_ACTIVE_LOCATION'; payload: { location: VillageLocationType | null } }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_LABELS' }
  | { type: 'SET_ZOOM'; payload: { zoom: number } }
  | { type: 'RESET' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: VillageState = {
  characters: {},
  subagents: [],
  activeLocation: null,
  soundEnabled: true,
  showLabels: true,
  zoom: 1,
}

// ============================================================================
// Reducer
// ============================================================================

function villageReducer(state: VillageState, action: VillageAction): VillageState {
  switch (action.type) {
    case 'ENSURE_CHARACTER': {
      const { sessionId } = action.payload
      if (state.characters[sessionId]) return state
      const agentIndex = Object.keys(state.characters).length
      return {
        ...state,
        characters: {
          ...state.characters,
          [sessionId]: {
            location: 'square',
            previousLocation: null,
            state: 'idle',
            isMoving: false,
            currentTool: null,
            sessionId,
            agentIndex,
          },
        },
      }
    }

    case 'MOVE_CHARACTER': {
      const { sessionId, location } = action.payload
      const char = state.characters[sessionId]
      if (!char || location === char.location) return state
      return {
        ...state,
        characters: {
          ...state.characters,
          [sessionId]: {
            ...char,
            previousLocation: char.location,
            location,
            isMoving: true,
          },
        },
        activeLocation: location,
      }
    }

    case 'SET_CHARACTER_STATE': {
      const { sessionId, state: newState, tool } = action.payload
      const char = state.characters[sessionId]
      if (!char) return state
      return {
        ...state,
        characters: {
          ...state.characters,
          [sessionId]: {
            ...char,
            state: newState,
            currentTool: tool ?? char.currentTool,
          },
        },
      }
    }

    case 'FINISH_MOVING': {
      const { sessionId } = action.payload
      const char = state.characters[sessionId]
      if (!char) return state
      return {
        ...state,
        characters: {
          ...state.characters,
          [sessionId]: {
            ...char,
            isMoving: false,
          },
        },
      }
    }

    case 'REMOVE_CHARACTER': {
      const next = { ...state.characters }
      delete next[action.payload.sessionId]
      return { ...state, characters: next }
    }

    case 'SPAWN_SUBAGENT': {
      // Don't add duplicates
      if (state.subagents.some(s => s.toolUseId === action.payload.toolUseId)) {
        return state
      }
      return {
        ...state,
        subagents: [...state.subagents, action.payload],
      }
    }

    case 'REMOVE_SUBAGENT': {
      return {
        ...state,
        subagents: state.subagents.filter(s => s.toolUseId !== action.payload.toolUseId),
      }
    }

    case 'SET_ACTIVE_LOCATION': {
      return {
        ...state,
        activeLocation: action.payload.location,
      }
    }

    case 'TOGGLE_SOUND': {
      return {
        ...state,
        soundEnabled: !state.soundEnabled,
      }
    }

    case 'TOGGLE_LABELS': {
      return {
        ...state,
        showLabels: !state.showLabels,
      }
    }

    case 'SET_ZOOM': {
      return {
        ...state,
        zoom: Math.max(0.5, Math.min(2, action.payload.zoom)),
      }
    }

    case 'RESET': {
      return initialState
    }

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

interface VillageContextValue {
  state: VillageState
  dispatch: React.Dispatch<VillageAction>
}

const VillageContext = createContext<VillageContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

interface VillageProviderProps {
  children: ReactNode
}

export function VillageProvider({ children }: VillageProviderProps) {
  const [state, dispatch] = useReducer(villageReducer, initialState)

  return (
    <VillageContext.Provider value={{ state, dispatch }}>
      {children}
    </VillageContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useVillage() {
  const context = useContext(VillageContext)
  if (!context) {
    throw new Error('useVillage must be used within a VillageProvider')
  }
  return context
}

// ============================================================================
// Action Creators (for convenience)
// ============================================================================

export const villageActions = {
  ensureCharacter: (sessionId: string) => ({
    type: 'ENSURE_CHARACTER' as const,
    payload: { sessionId },
  }),

  moveCharacter: (sessionId: string, location: VillageLocationType) => ({
    type: 'MOVE_CHARACTER' as const,
    payload: { sessionId, location },
  }),

  setCharacterState: (sessionId: string, state: ClaudeState, tool?: string) => ({
    type: 'SET_CHARACTER_STATE' as const,
    payload: { sessionId, state, tool },
  }),

  finishMoving: (sessionId: string) => ({
    type: 'FINISH_MOVING' as const,
    payload: { sessionId },
  }),

  removeCharacter: (sessionId: string) => ({
    type: 'REMOVE_CHARACTER' as const,
    payload: { sessionId },
  }),

  spawnSubagent: (subagent: SubagentState) => ({
    type: 'SPAWN_SUBAGENT' as const,
    payload: subagent,
  }),

  removeSubagent: (toolUseId: string) => ({
    type: 'REMOVE_SUBAGENT' as const,
    payload: { toolUseId },
  }),

  setActiveLocation: (location: VillageLocationType | null) => ({
    type: 'SET_ACTIVE_LOCATION' as const,
    payload: { location },
  }),

  toggleSound: () => ({
    type: 'TOGGLE_SOUND' as const,
  }),

  toggleLabels: () => ({
    type: 'TOGGLE_LABELS' as const,
  }),

  setZoom: (zoom: number) => ({
    type: 'SET_ZOOM' as const,
    payload: { zoom },
  }),

  reset: () => ({
    type: 'RESET' as const,
  }),
}
