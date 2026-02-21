/**
 * VillageLocation Component
 *
 * Renders a single village building/location using the active scenario's image.
 */

import React from 'react'
import type { VillageLocation as LocationType } from '../../config/locations'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'

interface VillageLocationProps {
  location: LocationType
  gameSize: GameWindowSize
  isActive: boolean
  showLabel: boolean
  /** Image URL from the active scenario (cycled by index in VillageLocations) */
  imageUrl: string
  /** Override x position in pixels (top-left, from layout algorithm) */
  x?: number
  /** Override y position in pixels (top-left, from layout algorithm) */
  y?: number
}

export const VillageLocation: React.FC<VillageLocationProps> = ({
  location,
  gameSize,
  isActive,
  showLabel,
  imageUrl,
  x: xProp,
  y: yProp,
}) => {
  // Image dimensions drive layout — all buildings render at this size
  const width = 512 * gameSize.scale
  const height = 341 * gameSize.scale

  // xProp/yProp from the layout algorithm are TOP-LEFT pixel coordinates.
  // Config percentage positions are CENTER percentages, so offset by half the image.
  const left = xProp !== undefined
    ? xProp
    : (location.position.x / 100) * gameSize.width - width / 2
  const top = yProp !== undefined
    ? yProp
    : (location.position.y / 100) * gameSize.height - height / 2

  return (
    <div
      className={`village-location ${isActive ? 'active' : ''}`}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <img
        src={imageUrl}
        width={width}
        height={height}
        alt={location.name}
        draggable={false}
        style={{ display: 'block' }}
      />

      {/* Label */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: -28 * gameSize.scale,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: '#fff',
            borderRadius: 4,
            fontSize: 16 * gameSize.scale,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {location.icon} {location.name}
        </div>
      )}

      {/* Active indicator glow */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 6,
            border: '2px solid rgba(255, 215, 0, 0.9)',
            boxShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
            pointerEvents: 'none',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}
