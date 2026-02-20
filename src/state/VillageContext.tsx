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
  sessionId: string | null
}

export interface SubagentState {
  id: string
  toolUseId: string
  description: string
  location: VillageLocationType
  state: ClaudeState
}

export interface VillageState {
  /** Main Claude character */
  character: CharacterState
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
  | { type: 'MOVE_TO_LOCATION'; payload: { location: VillageLocationType } }
  | { type: 'SET_CHARACTER_STATE'; payload: { state: ClaudeState; tool?: string } }
  | { type: 'FINISH_MOVING' }
  | { type: 'SET_SESSION'; payload: { sessionId: string } }
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
  character: {
    location: 'square',
    previousLocation: null,
    state: 'idle',
    isMoving: false,
    currentTool: null,
    sessionId: null,
  },
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
    case 'MOVE_TO_LOCATION': {
      const { location } = action.payload
      if (location === state.character.location) {
        return state
      }
      return {
        ...state,
        character: {
          ...state.character,
          previousLocation: state.character.location,
          location,
          isMoving: true,
        },
        activeLocation: location,
      }
    }

    case 'SET_CHARACTER_STATE': {
      const { state: newState, tool } = action.payload
      return {
        ...state,
        character: {
          ...state.character,
          state: newState,
          currentTool: tool ?? state.character.currentTool,
        },
      }
    }

    case 'FINISH_MOVING': {
      return {
        ...state,
        character: {
          ...state.character,
          isMoving: false,
        },
      }
    }

    case 'SET_SESSION': {
      return {
        ...state,
        character: {
          ...state.character,
          sessionId: action.payload.sessionId,
        },
      }
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
  moveToLocation: (location: VillageLocationType) => ({
    type: 'MOVE_TO_LOCATION' as const,
    payload: { location },
  }),

  setCharacterState: (state: ClaudeState, tool?: string) => ({
    type: 'SET_CHARACTER_STATE' as const,
    payload: { state, tool },
  }),

  finishMoving: () => ({
    type: 'FINISH_MOVING' as const,
  }),

  setSession: (sessionId: string) => ({
    type: 'SET_SESSION' as const,
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
