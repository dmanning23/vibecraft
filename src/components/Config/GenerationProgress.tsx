/**
 * GenerationProgress
 *
 * Floating progress banner shown over the village scene while a new
 * scenario is being generated. Disappears automatically on completion
 * or error.
 */

import React from 'react'
import type { ScenarioGenerationUpdate } from '../../../shared/types'

interface GenerationProgressProps {
  update: ScenarioGenerationUpdate | null
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ update }) => {
  if (!update) return null

  const pct = update.total > 0 ? Math.round((update.step / update.total) * 100) : 0
  const isError = update.status === 'error'
  const isDone = update.status === 'complete'

  return (
    <div className={`generation-progress ${isError ? 'error' : ''} ${isDone ? 'done' : ''}`}>
      <div className="generation-progress-header">
        <span className="generation-progress-icon">
          {isError ? '✕' : isDone ? '✓' : '⚙'}
        </span>
        <span className="generation-progress-title">
          {isError ? 'Generation failed' : isDone ? 'Scenario ready!' : 'Generating scenario…'}
        </span>
        <span className="generation-progress-pct">{pct}%</span>
      </div>

      <div className="generation-progress-bar-track">
        <div
          className="generation-progress-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="generation-progress-message">{update.message}</div>
    </div>
  )
}
