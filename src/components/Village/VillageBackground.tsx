/**
 * VillageBackground Component
 *
 * Renders the scenario background image with proper scaling.
 */

import React from 'react'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'
import type { ScenarioConfig } from '../../config/scenarios'

interface VillageBackgroundProps {
  gameSize: GameWindowSize
  scenario: ScenarioConfig
}

export const VillageBackground: React.FC<VillageBackgroundProps> = ({ gameSize, scenario }) => {
  return (
    <div
      className="village-background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: gameSize.width,
        height: gameSize.height,
        zIndex: 10,
      }}
    >
      <img
        src={scenario.background}
        width={gameSize.width}
        height={gameSize.height}
        alt="Background"
        style={{ display: 'block' }}
      />
    </div>
  )
}
