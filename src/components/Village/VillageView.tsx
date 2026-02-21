/**
 * VillageView Component
 *
 * Main container for the 2D village visualization.
 * Orchestrates background, locations, and character.
 */

import React, { useRef } from 'react'
import { useVillage } from '../../state/VillageContext'
import { useGameWindowSize } from '../../hooks/useGameWindowSize'
import { useEventSubscription } from '../../hooks/useEventSubscription'
import { useScenario } from '../../hooks/useScenario'
import { VillageBackground } from './VillageBackground'
import { VillageLocations } from './VillageLocations'
import { ClaudeCharacter } from '../Character/ClaudeCharacter'
import type { ClaudeEvent, ManagedSession } from '@shared/types'

interface VillageViewProps {
  events: ClaudeEvent[]
  sessions: ManagedSession[]
  selectedSessionId: string | null
  onSessionSelect: (sessionId: string | null) => void
}

export const VillageView: React.FC<VillageViewProps> = ({
  events,
  sessions,
  selectedSessionId,
  onSessionSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { state } = useVillage()
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
            character={state.character}
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
            {state.character.state === 'idle' && !state.character.isMoving && 'Idle in Village Square'}
            {state.character.isMoving && `Walking to ${state.character.location}...`}
            {state.character.state === 'working' && !state.character.isMoving && `Working at ${state.character.location}`}
            {state.character.state === 'thinking' && !state.character.isMoving && 'Thinking...'}
            {state.subagents.length > 0 && ` (${state.subagents.length} subagent${state.subagents.length > 1 ? 's' : ''})`}
          </div>

          {/* Scenario picker */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              gap: 6,
              zIndex: 50,
            }}
          >
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: s.id === scenarioId
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(0,0,0,0.45)',
                  color: '#fff',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  fontWeight: s.id === scenarioId ? 'bold' : 'normal',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
