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
import type { ScenarioConfig, AgentConfig } from '../../config/scenarios'
import './ClaudeCharacter.css'

interface ClaudeCharacterProps {
    gameSize: GameWindowSize
    characters: Record<string, CharacterState>
    subagents: SubagentState[]
    scenario: ScenarioConfig
}

export const ClaudeCharacter: React.FC<ClaudeCharacterProps> = ({
    gameSize,
    characters,
    subagents,
    scenario,
}) => {
    const characterEntries = Object.values(characters)

    // Spread characters that share a location so they don't overlap.
    // Group by target location (use previousLocation while moving so the
    // spread is computed against where they're heading).
    const locationGroups: Record<string, string[]> = {}
    for (const c of characterEntries) {
        const loc = c.location
        if (!locationGroups[loc]) locationGroups[loc] = []
        locationGroups[loc].push(c.sessionId)
    }

    const SPREAD = 56 * gameSize.scale  // px between characters in a group

    const getOffset = (character: CharacterState): number => {
        const group = locationGroups[character.location] ?? []
        const idx = group.indexOf(character.sessionId)
        const n = group.length
        return (idx - (n - 1) / 2) * SPREAD
    }

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
            {/* One character per active session */}
            {characterEntries.map((character) => (
                <SingleCharacter
                    key={character.sessionId}
                    character={character}
                    gameSize={gameSize}
                    agent={scenario.agents[character.agentIndex % scenario.agents.length]}
                    xOffset={getOffset(character)}
                />
            ))}

            {/* Subagents */}
            {subagents.map((subagent, index) => (
                <SubagentCharacter
                    key={subagent.id}
                    subagent={subagent}
                    index={index}
                    gameSize={gameSize}
                    agent={scenario.agents[(index + 1) % scenario.agents.length]}
                />
            ))}
        </div>
    )
}

// ---------------------------------------------------------------------------
// SingleCharacter - one character per session
// ---------------------------------------------------------------------------

interface SingleCharacterProps {
    character: CharacterState
    gameSize: GameWindowSize
    agent: AgentConfig
    xOffset: number
}

const SingleCharacter: React.FC<SingleCharacterProps> = ({ character, gameSize, agent, xOffset }) => {
    const { dispatch } = useVillage()
    const [position, setPosition] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const pos = getComputedPosition(character.location, getAllLocations(), gameSize)
        if (pos) {
            const imgW = 640 * gameSize.scale
            const imgH = 427 * gameSize.scale
            setPosition({ x: pos.x + imgW / 2, y: pos.y + imgH / 2 })
        }
    }, [character.location, gameSize])

    const handleTransitionEnd = useCallback(() => {
        if (character.isMoving) {
            dispatch(villageActions.finishMoving(character.sessionId))
        }
    }, [character.isMoving, character.sessionId, dispatch])

    const characterSize = 96 * gameSize.scale

    return (
        <div
            className={`claude-character ${character.state} ${character.isMoving ? 'moving' : ''}`}
            style={{
                position: 'absolute',
                left: position.x - characterSize + xOffset,
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
                scale={gameSize.scale}
                agent={agent}
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
    )
}

// ---------------------------------------------------------------------------
// CharacterSprite
// ---------------------------------------------------------------------------

interface CharacterSpriteProps {
    state: CharacterState['state']
    isMoving: boolean
    scale: number
    agent: AgentConfig
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ state, isMoving, scale, agent }) => {
    const stateKey = isMoving ? 'walking' : state
    const imageUrl = agent.states[stateKey] ?? agent.states.idle
    return (
        <img
            src={imageUrl}
            className="character-sprite"
            width={192 * scale}
            height={336 * scale}
            alt={`Claude ${stateKey}`}
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
    agent: AgentConfig
}

const SubagentCharacter: React.FC<SubagentCharacterProps> = ({ subagent, index, gameSize, agent }) => {
    const imageUrl = agent.states[subagent.state] ?? agent.states.idle
    const pos = getComputedPosition(subagent.location, getAllLocations(), gameSize)
    if (!pos) return null

    // pos is top-left of building. Fan subagents around the bottom-center.
    const imgW = 640 * gameSize.scale
    const imgH = 427 * gameSize.scale
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
