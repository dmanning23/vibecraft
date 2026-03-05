/**
 * VillageView Component
 *
 * Main container for the 2D village visualization.
 * Orchestrates background, locations, and character.
 */

import React, { useRef, useState, useEffect } from 'react'
import { useVillage, villageActions } from '../../state/VillageContext'
import { useGameWindowSize } from '../../hooks/useGameWindowSize'
import { useEventSubscription } from '../../hooks/useEventSubscription'
import { useScenario } from '../../hooks/useScenario'
import { VillageBackground } from './VillageBackground'
import { VillageLocations } from './VillageLocations'
import { ClaudeCharacter } from '../Character/ClaudeCharacter'
import { ConfigPanel } from '../Config/ConfigPanel'
import type { ClaudeEvent, ManagedSession } from '@shared/types'

interface VillageViewProps {
  events: ClaudeEvent[]
  sessions: ManagedSession[]
  selectedSessionId: string | null
  onSessionSelect: (sessionId: string | null) => void
  soundEnabled: boolean
  onSoundToggle: () => void
  regenStatus: Record<string, 'loading' | 'done' | 'error'>
  regenTimestamps: Record<string, number>
  onRegenerate: (scenarioId: string, assetKey: string) => void
}

export const VillageView: React.FC<VillageViewProps> = ({
  events,
  sessions,
  selectedSessionId,
  onSessionSelect,
  soundEnabled,
  onSoundToggle,
  regenStatus,
  regenTimestamps,
  onRegenerate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const { state, dispatch } = useVillage()

  // Create a character for each known session (so they appear even when idle)
  useEffect(() => {
    sessions.forEach(session => {
      const sessionId = session.claudeSessionId ?? session.id
      dispatch(villageActions.ensureCharacter(sessionId))
    })
  }, [sessions, dispatch])
  const gameSize = useGameWindowSize({
    defaultWidth: 2048,
    defaultHeight: 1024,
    containerRef,
  })
  const { scenario, scenarioId, setScenario, scenarios } = useScenario()

  useEventSubscription()

  return (
    <div
      ref={containerRef}
      className="village-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#87CEEB',
      }}
    >
      {/* Hamburger — always visible */}
      <button
        className="config-hamburger"
        onClick={() => setConfigOpen(true)}
        aria-label="Open settings"
      >
        ☰
      </button>

      {/* Config drawer */}
      <ConfigPanel
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        scenarios={scenarios}
        scenarioId={scenarioId}
        onScenarioChange={(id) => { setScenario(id); setConfigOpen(false) }}
        soundEnabled={soundEnabled}
        onSoundToggle={onSoundToggle}
        regenStatus={regenStatus}
        regenTimestamps={regenTimestamps}
        onRegenerate={onRegenerate}
      />

      {scenario && (
        <>
          {/* Background layer - z-index: 10 */}
          <VillageBackground gameSize={gameSize} scenario={scenario} />

          {/* Locations layer - z-index: 20 */}
          <VillageLocations
            gameSize={gameSize}
            activeLocation={state.activeLocation}
            showLabels={state.showLabels}
            scenario={scenario}
          />

          {/* Character layer - z-index: 30 */}
          <ClaudeCharacter
            gameSize={gameSize}
            characters={state.characters}
            subagents={state.subagents}
            scenario={scenario}
          />

          {/* Status overlay */}
          <div
            className="village-status"
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              padding: '4px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: '#fff',
              borderRadius: 4,
              fontSize: 12,
              zIndex: 50,
            }}
          >
            {(() => {
              const chars = Object.values(state.characters)
              if (chars.length === 0) return 'No active sessions'
              const working = chars.filter(c => c.state === 'working' || c.isMoving)
              if (working.length > 0) return `${working.length} session${working.length > 1 ? 's' : ''} working`
              return `${chars.length} session${chars.length > 1 ? 's' : ''} idle`
            })()}
            {state.subagents.length > 0 && ` · ${state.subagents.length} subagent${state.subagents.length > 1 ? 's' : ''}`}
          </div>
        </>
      )}
    </div>
  )
}
