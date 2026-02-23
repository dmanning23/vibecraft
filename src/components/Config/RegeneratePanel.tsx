/**
 * RegeneratePanel
 *
 * Shows thumbnails for all generated assets in a scenario (background,
 * 9 locations, 7 agents × 5 states) with per-asset regenerate buttons.
 *
 * Displayed inside ConfigPanel when the selected scenario has generationData.
 */

import React, { useState } from 'react'
import type { ScenarioConfig } from '../../config/scenarios'
import type { AssetRegenerationUpdate } from '@shared/types'

const AGENT_STATES = ['idle', 'walking', 'working', 'thinking', 'finished'] as const

interface RegeneratePanelProps {
  scenario: ScenarioConfig
  regenStatus: Record<string, 'loading' | 'done' | 'error'>
  regenTimestamps: Record<string, number>
  onRegenerate: (assetKey: string) => void
}

function assetSrc(path: string, bust?: number): string {
  return bust ? `${path}?t=${bust}` : path
}

function RegenThumb({
  src,
  label,
  assetKey,
  status,
  onRegen,
}: {
  src: string
  label: string
  assetKey: string
  status?: 'loading' | 'done' | 'error'
  onRegen: () => void
}) {
  return (
    <div className="regen-thumb" title={label}>
      <img src={src} alt={label} className="regen-thumb-img" />
      <div className="regen-thumb-overlay">
        {status === 'loading' ? (
          <span className="regen-spinner">↻</span>
        ) : (
          <button
            className={`regen-btn ${status === 'done' ? 'done' : ''} ${status === 'error' ? 'error' : ''}`}
            onClick={onRegen}
            title={`Regenerate ${label}`}
          >
            {status === 'error' ? '!' : '↻'}
          </button>
        )}
      </div>
      <div className="regen-thumb-label">{label}</div>
    </div>
  )
}

export const RegeneratePanel: React.FC<RegeneratePanelProps> = ({
  scenario,
  regenStatus,
  regenTimestamps,
  onRegenerate,
}) => {
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null)
  const gen = scenario.generationData!
  const sid = scenario.id

  const status = (key: string) => regenStatus[`${sid}::${key}`]
  const bust = (key: string) => regenTimestamps[`${sid}::${key}`]

  return (
    <div className="regen-panel">

      {/* Background */}
      <div className="regen-section-title">Background</div>
      <div className="regen-row">
        <RegenThumb
          src={assetSrc(scenario.background, bust('background'))}
          label="Background"
          assetKey="background"
          status={status('background')}
          onRegen={() => onRegenerate('background')}
        />
      </div>

      {/* Locations */}
      <div className="regen-section-title">Locations</div>
      <div className="regen-grid-3">
        {scenario.locations.map((imgPath, i) => {
          const key = `location-${i}`
          const name = gen.locations[i]?.name ?? `Location ${i}`
          return (
            <RegenThumb
              key={key}
              src={assetSrc(imgPath, bust(key))}
              label={name}
              assetKey={key}
              status={status(key)}
              onRegen={() => onRegenerate(key)}
            />
          )
        })}
      </div>

      {/* Agents */}
      <div className="regen-section-title">Agents</div>
      {scenario.agents.map((agent, i) => {
        const agentName = agent.name ?? gen.agents[i]?.name ?? `Agent ${i}`
        const isExpanded = expandedAgent === i
        return (
          <div key={i} className="regen-agent">
            <button
              className="regen-agent-header"
              onClick={() => setExpandedAgent(isExpanded ? null : i)}
            >
              <span>{isExpanded ? '▾' : '▸'} {agentName}</span>
            </button>
            {isExpanded && (
              <div className="regen-grid-5">
                {AGENT_STATES.map(state => {
                  const key = `agent-${i}-${state}`
                  const imgPath = agent.states[state]
                  return (
                    <RegenThumb
                      key={key}
                      src={assetSrc(imgPath, bust(key))}
                      label={state}
                      assetKey={key}
                      status={status(key)}
                      onRegen={() => onRegenerate(key)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Parse an asset_regeneration WebSocket update into the key used by this panel */
export function regenKey(update: AssetRegenerationUpdate): string {
  return `${update.scenarioId}::${update.assetKey}`
}
