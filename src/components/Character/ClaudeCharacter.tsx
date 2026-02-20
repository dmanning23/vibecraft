/**
 * ClaudeCharacter Component
 *
 * 2D sprite-based character that moves between village locations.
 * Uses CSS transitions for smooth movement animation.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useVillage, villageActions, type CharacterState, type SubagentState } from '../../state/VillageContext'
import { VILLAGE_LOCATIONS, type VillageLocationType } from '../../config/locations'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'
import './ClaudeCharacter.css'

interface ClaudeCharacterProps {
    gameSize: GameWindowSize
    character: CharacterState
    subagents: SubagentState[]
}

export const ClaudeCharacter: React.FC<ClaudeCharacterProps> = ({
    gameSize,
    character,
    subagents,
}) => {
    const { dispatch } = useVillage()
    const [position, setPosition] = useState({ x: 0, y: 0 })

    // Calculate character position based on current location
    useEffect(() => {
        const location = VILLAGE_LOCATIONS[character.location]
        if (location) {
            const x = (location.position.x / 100) * gameSize.width
            const y = (location.position.y / 100) * gameSize.height + 50 * gameSize.scale // Offset to stand in front of building
            setPosition({ x, y })
        }
    }, [character.location, gameSize])

    // Handle transition end
    const handleTransitionEnd = useCallback(() => {
        if (character.isMoving) {
            dispatch(villageActions.finishMoving())
        }
    }, [character.isMoving, dispatch])

    const characterSize = 64 * gameSize.scale

    return (
        <div
            className="claude-character-layer"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: gameSize.width,
                height: gameSize.height,
                zIndex: 30,
                pointerEvents: 'none',
            }}
        >
            {/* Main Claude character */}
            <div
                className={`claude-character ${character.state} ${character.isMoving ? 'moving' : ''}`}
                style={{
                    position: 'absolute',
                    left: position.x - characterSize / 2,
                    top: position.y - characterSize,
                    width: characterSize,
                    height: characterSize * 1.5,
                    transition: character.isMoving ? 'left 0.8s ease-in-out, top 0.8s ease-in-out' : 'none',
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                <CharacterSprite
                    state={character.state}
                    isMoving={character.isMoving}
                    size={characterSize}
                    currentTool={character.currentTool}
                    scale={gameSize.scale}
                />

                {/* State indicator */}
                <StateIndicator
                    state={character.state}
                    scale={gameSize.scale}
                />

                {/* Current tool indicator */}
                {character.currentTool && character.state === 'working' && (
                    <div
                        className="tool-indicator"
                        style={{
                            position: 'absolute',
                            top: -30 * gameSize.scale,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '2px 6px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: '#fff',
                            borderRadius: 4,
                            fontSize: 10 * gameSize.scale,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {character.currentTool}
                    </div>
                )}
            </div>

            {/* Subagents */}
            {subagents.map((subagent, index) => (
                <SubagentCharacter
                    key={subagent.id}
                    subagent={subagent}
                    index={index}
                    gameSize={gameSize}
                />
            ))}
        </div>
    )
}

// Character sprite component

interface CharacterSpriteProps {
    state: CharacterState['state']
    isMoving: boolean
    size: number
    currentTool: string | null
    scale: number
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({
    state,
    isMoving,
    size,
    currentTool,
    scale
}) => {
    // Color based on state
    const getBodyColor = () => {
        if (isMoving) return '#E6C994'        // Light tan (moving)
        switch (state) {
            case 'idle': return '#D4A574'       // Warm beige
            case 'working': return '#FF8C42'    // Orange (active)
            case 'thinking': return '#9B59B6'   // Purple (thinking)
            case 'finished': return '#27AE60'   // Green (finished)
            default: return '#D4A574'
        }
    }

    const headSize = size * 0.4
    const bodyHeight = size * 0.5
    const bodyWidth = size * 0.5

    return (
        <div
            className="character-sprite"
            style={{
                width: size,
                height: size * 1.5,
                position: 'relative',
            }}
        >
            <img
                src={'public/assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/agents/Aiko_Takahashi/icon/388339b0-8656-40cc-a3b2-6b725a1df44e.png'}
                width={128 * (scale || 1)}
                height={224 * (scale || 1)}
            />
        </div>
    )
}

// State indicator component

interface StateIndicatorProps {
    state: CharacterState['state']
    scale: number
}

const StateIndicator: React.FC<StateIndicatorProps> = ({ state, scale }) => {
    const getEmoji = () => {
        switch (state) {
            case 'idle': return '😊'
            case 'working': return '⚡'
            case 'thinking': return '💭'
            case 'finished': return '✓'
            default: return ''
        }
    }

    if (state === 'idle') return null

    return (
        <div
            className={`state-indicator ${state}`}
            style={{
                position: 'absolute',
                top: -10 * scale,
                right: -5 * scale,
                fontSize: 20 * scale,
                animation: state === 'thinking' ? 'float 1.5s ease-in-out infinite' : undefined,
            }}
        >
            {getEmoji()}
        </div>
    )
}

// Subagent character component

interface SubagentCharacterProps {
    subagent: SubagentState
    index: number
    gameSize: GameWindowSize
}

const SubagentCharacter: React.FC<SubagentCharacterProps> = ({
    subagent,
    index,
    gameSize,
}) => {
    const location = VILLAGE_LOCATIONS[subagent.location]
    if (!location) return null

    // Position subagents in a fan around the town hall
    const angle = (index * 30 - 45) * (Math.PI / 180)
    const distance = 80 * gameSize.scale
    const x = (location.position.x / 100) * gameSize.width + Math.cos(angle) * distance
    const y = (location.position.y / 100) * gameSize.height + Math.sin(angle) * distance + 60 * gameSize.scale

    const characterSize = 40 * gameSize.scale

    // Subagent colors
    const colors = ['#3498DB', '#2ECC71', '#E91E63', '#9B59B6', '#F1C40F', '#00BCD4']
    const color = colors[index % colors.length]

    return (
        <div
            className="subagent-character"
            style={{
                position: 'absolute',
                left: x - characterSize / 2,
                top: y - characterSize,
                width: characterSize,
                height: characterSize * 1.2,
                opacity: 0.9,
            }}
        >
            {/* Mini character */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                }}
            >
                {/* Head */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: characterSize * 0.5,
                        height: characterSize * 0.5,
                        background: color,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.5)',
                    }}
                />
                {/* Body */}
                <div
                    style={{
                        position: 'absolute',
                        top: characterSize * 0.4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: characterSize * 0.4,
                        height: characterSize * 0.5,
                        background: color,
                        borderRadius: '30% 30% 20% 20%',
                        border: '2px solid rgba(255,255,255,0.5)',
                    }}
                />
            </div>

            {/* Label */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -15 * gameSize.scale,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '1px 4px',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    borderRadius: 3,
                    fontSize: 8 * gameSize.scale,
                    whiteSpace: 'nowrap',
                    maxWidth: 80 * gameSize.scale,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {subagent.description}
            </div>
        </div>
    )
}

// Utility function to adjust color brightness
function adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '')
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
