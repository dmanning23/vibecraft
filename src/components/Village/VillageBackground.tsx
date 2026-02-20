/**
 * VillageBackground Component
 *
 * Renders the village background image with proper scaling.
 */

import React from 'react'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'

interface VillageBackgroundProps {
    gameSize: GameWindowSize
}

export const VillageBackground: React.FC<VillageBackgroundProps> = ({ gameSize }) => {
    // For now, render a gradient background
    // TODO: Replace with actual village background image
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
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/scenario/e87c184b-9253-499d-8521-2bd92c5be22a.png`}
                width={gameSize.width}
                height={gameSize.height}
                className="absolute z-10"
                alt="Background"
            />

        </div>
    )
}
