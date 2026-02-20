/**
 * VillageLocations Component
 *
 * Renders all village buildings/locations on the map.
 */

import React from 'react'
import { VillageLocation } from './VillageLocation'
import { getAllLocations, type VillageLocationType } from '../../config/locations'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'

interface VillageLocationsProps {
  gameSize: GameWindowSize
  activeLocation: VillageLocationType | null
  showLabels: boolean
}

export const VillageLocations: React.FC<VillageLocationsProps> = ({
  gameSize,
  activeLocation,
  showLabels,
}) => {
  const locations = getAllLocations()

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
      {locations.map((location) => (
        <VillageLocation
          key={location.id}
          location={location}
          gameSize={gameSize}
          isActive={activeLocation === location.id}
          showLabel={showLabels}
        />
      ))}
    </div>
  )
}
