/**
 * ClaudeCharacter Component
 *
 * 2D sprite-based character that moves between village locations.
 * Uses CSS transitions for smooth movement animation.
 * Character and subagent images come from the active ScenarioConfig.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useVillage, villageActions, type CharacterState, type SubagentState } from '../../state/VillageContext'
import { getAllLocations } from '../../config/locations'
import { getComputedPosition } from '../../utils/villageLayout'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'
import type { ScenarioConfig } from '../../config/scenarios'
import './ClaudeCharacter.css'

interface ClaudeCharacterProps {
    gameSize: GameWindowSize
    character: CharacterState
    subagents: SubagentState[]
    scenario: ScenarioConfig
}

export const ClaudeCharacter: React.FC<ClaudeCharacterProps> = ({
    gameSize,
    character,
    subagents,
    scenario,
}) => {
    const { dispatch } = useVillage()
    const [position, setPosition] = useState({ x: 0, y: 0 })

    // Calculate character position based on current location
    useEffect(() => {
        const pos = getComputedPosition(character.location, getAllLocations(), gameSize)
        if (pos) {
            // pos is top-left of building (512×341 at scale). Center on the building.
            const imgW = 512 * gameSize.scale
            const imgH = 341 * gameSize.scale
            setPosition({ x: pos.x + imgW / 2, y: pos.y + imgH / 2 })
        }
    }, [character.location, gameSize])

    const handleTransitionEnd = useCallback(() => {
        if (character.isMoving) {
            dispatch(villageActions.finishMoving())
        }
    }, [character.isMoving, dispatch])

    const characterSize = 96 * gameSize.scale

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
                    left: position.x - characterSize,  // sprite is 192*scale wide; characterSize=96*scale is half
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
                    scale={gameSize.scale}
                    imageUrl={scenario.agents[0]}
                />

                <StateIndicator state={character.state} scale={gameSize.scale} />

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
                    imageUrl={scenario.agents[(index + 1) % scenario.agents.length]}
                />
            ))}
        </div>
    )
}

// ---------------------------------------------------------------------------
// CharacterSprite
// ---------------------------------------------------------------------------

interface CharacterSpriteProps {
    state: CharacterState['state']
    isMoving: boolean
    size: number
    scale: number
    imageUrl: string
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ state, isMoving, scale, imageUrl }) => {
    return (
        <img
            src={imageUrl}
            className="character-sprite"
            width={192 * scale}
            height={336 * scale}
            alt={`Claude ${isMoving ? 'walking' : state}`}
            draggable={false}
        />
    )
}

// ---------------------------------------------------------------------------
// StateIndicator
// ---------------------------------------------------------------------------

interface StateIndicatorProps {
    state: CharacterState['state']
    scale: number
}

const StateIndicator: React.FC<StateIndicatorProps> = ({ state, scale }) => {
    const getEmoji = () => {
        switch (state) {
            case 'working':  return '⚡'
            case 'thinking': return '💭'
            case 'finished': return '✓'
            default: return null
        }
    }

    const emoji = getEmoji()
    if (!emoji) return null

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
            {emoji}
        </div>
    )
}

// ---------------------------------------------------------------------------
// SubagentCharacter
// ---------------------------------------------------------------------------

interface SubagentCharacterProps {
    subagent: SubagentState
    index: number
    gameSize: GameWindowSize
    imageUrl: string
}

const SubagentCharacter: React.FC<SubagentCharacterProps> = ({ subagent, index, gameSize, imageUrl }) => {
    const pos = getComputedPosition(subagent.location, getAllLocations(), gameSize)
    if (!pos) return null

    // pos is top-left of building. Fan subagents around the bottom-center.
    const imgW = 512 * gameSize.scale
    const imgH = 341 * gameSize.scale
    const buildingCenterX = pos.x + imgW / 2
    const buildingBottom = pos.y + imgH

    const angle = (index * 30 - 45) * (Math.PI / 180)
    const distance = 80 * gameSize.scale
    const x = buildingCenterX + Math.cos(angle) * distance
    const y = buildingBottom + Math.sin(angle) * distance + 10 * gameSize.scale

    const characterSize = 60 * gameSize.scale

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
            <img
                src={imageUrl}
                width={characterSize}
                height={characterSize * 1.2}
                alt="subagent"
                draggable={false}
                style={{ display: 'block' }}
            />

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
