/**
 * ConfigPanel
 *
 * Slide-out settings drawer. Opens from the left side of the village scene.
 * Contains scenario selection and other configurable options.
 */

import React from 'react'
import type { ScenarioConfig } from '../../config/scenarios'

interface ConfigPanelProps {
  isOpen: boolean
  onClose: () => void
  scenarios: ScenarioConfig[]
  scenarioId: string
  onScenarioChange: (id: string) => void
  soundEnabled: boolean
  onSoundToggle: () => void
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  scenarios,
  scenarioId,
  onScenarioChange,
  soundEnabled,
  onSoundToggle,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`config-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`config-panel ${isOpen ? 'open' : ''}`}>
        <div className="config-panel-header">
          <span className="config-panel-title">Settings</span>
          <button className="config-panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="config-panel-body">

          {/* Scenario selection */}
          <section className="config-section">
            <div className="config-section-title">Scenario</div>
            <div className="config-scenario-grid">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  className={`config-scenario-btn ${s.id === scenarioId ? 'active' : ''}`}
                  onClick={() => { onScenarioChange(s.id); }}
                >
                  <div
                    className="config-scenario-thumb"
                    style={{ backgroundImage: `url(${s.background})` }}
                  />
                  <span className="config-scenario-name">{s.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Audio */}
          <section className="config-section">
            <div className="config-section-title">Audio</div>
            <label className="config-toggle-row">
              <span className="config-toggle-label">
                {soundEnabled ? '🔊' : '🔇'} Sound effects
              </span>
              <div
                className={`config-toggle ${soundEnabled ? 'on' : 'off'}`}
                onClick={onSoundToggle}
                role="switch"
                aria-checked={soundEnabled}
              >
                <div className="config-toggle-thumb" />
              </div>
            </label>
          </section>

        </div>
      </div>
    </>
  )
}
