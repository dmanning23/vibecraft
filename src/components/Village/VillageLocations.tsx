/**
 * VillageLocations Component
 *
 * Renders all village buildings/locations on the map using a staggered grid
 * layout (ported from OverworldLocations.js).
 */

import React from 'react'
import { VillageLocation } from './VillageLocation'
import { getAllLocations, type VillageLocationType } from '../../config/locations'
import { computeVillageLayout } from '../../utils/villageLayout'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'
import type { ScenarioConfig } from '../../config/scenarios'

interface VillageLocationsProps {
  gameSize: GameWindowSize
  activeLocation: VillageLocationType | null
  showLabels: boolean
  scenario: ScenarioConfig
}

export const VillageLocations: React.FC<VillageLocationsProps> = ({
  gameSize,
  activeLocation,
  showLabels,
  scenario,
}) => {
  const positioned = computeVillageLayout(getAllLocations(), gameSize)

  return (
    <div
      className="village-locations"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: gameSize.width,
        height: gameSize.height,
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      {positioned.map(({ location, x, y }, index) => (
        <VillageLocation
          key={location.id}
          location={location}
          gameSize={gameSize}
          isActive={activeLocation === location.id}
          showLabel={showLabels}
          x={x}
          y={y}
          imageUrl={scenario.locations[index % scenario.locations.length]}
        />
      ))}
    </div>
  )
}
