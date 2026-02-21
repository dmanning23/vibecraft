/**
 * Village Layout Utility
 *
 * Computes staggered grid positions for village locations.
 * Shared between VillageLocations (rendering) and ClaudeCharacter (movement).
 * Ported from OverworldLocations.js.
 */

import type { VillageLocation } from '../config/locations'
import type { GameWindowSize } from '../hooks/useGameWindowSize'

export interface PositionedLocation {
  location: VillageLocation
  x: number
  y: number
}

export function computeVillageLayout(
  locations: VillageLocation[],
  gameSize: GameWindowSize
): PositionedLocation[] {
  const locationWidth = gameSize.width / 4.5
  const locationHeight = gameSize.height / 4.5
  const positioned: PositionedLocation[] = []

  if (locations.length >= 9) {
    const locationStartX =
      gameSize.width / 2 - locationWidth / 2 - ((3 * locationWidth) / 2 - locationWidth / 4)

    let currentX = locationStartX
    let currentY = gameSize.height * 0.12

    for (let i = 0; i < 3; i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }

    currentY += locationHeight
    currentX = locationStartX + locationWidth / 2
    for (let i = 3; i < 6; i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }

    currentY += locationHeight
    currentX = locationStartX
    for (let i = 6; i < locations.length; i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }
  } else if (locations.length % 2 !== 0) {
    // Odd count
    const locationStartX =
      gameSize.width / 2 -
      locationWidth / 2 -
      ((locations.length / 2) * locationWidth) / 2 -
      locationWidth / 4

    let currentX = locationStartX
    let currentY = gameSize.height * 0.2

    for (let i = 0; i <= Math.floor(locations.length / 2); i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }

    currentY += locationHeight
    currentX = locationStartX + locationWidth / 2
    for (let i = Math.floor(locations.length / 2) + 1; i < locations.length; i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }
  } else {
    // Even count
    const locationStartX =
      gameSize.width / 2 -
      locationWidth / 2 -
      ((locations.length / 2) * locationWidth) / 2 -
      locationWidth / 4

    let currentX = locationStartX
    let currentY = gameSize.height * 0.2

    for (let i = 0; i < Math.floor(locations.length / 2); i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }

    currentY += locationHeight
    currentX = locationStartX + locationWidth / 2
    for (let i = Math.floor(locations.length / 2); i < locations.length; i++) {
      positioned.push({ location: locations[i], x: currentX, y: currentY })
      currentX += locationWidth
    }
  }

  return positioned
}

/** Look up the computed pixel position for a specific location id. */
export function getComputedPosition(
  locationId: string,
  locations: VillageLocation[],
  gameSize: GameWindowSize
): { x: number; y: number } | null {
  const layout = computeVillageLayout(locations, gameSize)
  const found = layout.find((p) => p.location.id === locationId)
  return found ? { x: found.x, y: found.y } : null
}
