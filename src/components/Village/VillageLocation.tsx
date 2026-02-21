/**
 * VillageLocation Component
 *
 * Renders a single village building/location.
 */

import React from 'react'
import type { VillageLocation as LocationType } from '../../config/locations'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'

interface VillageLocationProps {
    location: LocationType
    gameSize: GameWindowSize
    isActive: boolean
    showLabel: boolean
    /** Override x position in pixels (from layout algorithm). Falls back to config percentage. */
    x?: number
    /** Override y position in pixels (from layout algorithm). Falls back to config percentage. */
    y?: number
}

export const VillageLocation: React.FC<VillageLocationProps> = ({
    location,
    gameSize,
    isActive,
    showLabel,
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

    // Render different building styles based on location type
    const renderBuilding = () => {
        switch (location.id) {
            case 'library':
                return <LibraryBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'cottage':
                return <CottageBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'workshop':
                return <WorkshopBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'terminal':
                return <TerminalBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'observatory':
                return <ObservatoryBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'signal_tower':
                return <SignalTowerBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'town_hall':
                return <TownHallBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'notice_board':
                return <NoticeBoardBuilding width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            case 'square':
                return <VillageSquare width={width} height={height} isActive={isActive} scale={gameSize.scale} />
            default:
                return <DefaultBuilding width={width} height={height} color={location.color} isActive={isActive} scale={gameSize.scale} />
        }
    }

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
            {renderBuilding()}

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

// Building components for each location type

interface BuildingProps {
    width: number
    height: number
    isActive: boolean
    color?: string
    scale: number
}

const LibraryBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Cyber_Ninja_Dojo/image/e3b0db9d-31b8-4472-b8f6-f7d3d6c9337d.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const CottageBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Cyber_Ninja_Dojo/image/e3b0db9d-31b8-4472-b8f6-f7d3d6c9337d.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const WorkshopBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Cyber_Ninja_Dojo/image/e3b0db9d-31b8-4472-b8f6-f7d3d6c9337d.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const TerminalBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Zenith_Plaza/image/0e22b393-d113-40bb-b9c7-bdae2d185c3c.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const ObservatoryBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Tech_Syndicate_Headquarters/image/219bb24e-9517-47a1-860d-5d406027b8e2.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const SignalTowerBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Sakura_Gardens/image/74e8385c-8703-423e-ba47-1ab29cdab641.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const TownHallBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Nexus_Arcade/image/70914736-12a2-4229-8199-40f9511bf266.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const NoticeBoardBuilding: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Genesis_Tower/image/cac4f9ff-8e98-4a00-8c40-06b8937dea22.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const VillageSquare: React.FC<BuildingProps> = ({ width, height, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Cyber_Ninja_Dojo/image/e3b0db9d-31b8-4472-b8f6-f7d3d6c9337d.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)

const DefaultBuilding: React.FC<BuildingProps> = ({ width, height, color, isActive, scale }) => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div
            className="d-flex">
            <img
                src={`public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/locations/Cyber_Ninja_Dojo/image/e3b0db9d-31b8-4472-b8f6-f7d3d6c9337d.png`}
                width={512 * scale}
                height={341 * scale}
            />
        </div>
    </div>
)
