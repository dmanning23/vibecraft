/**
 * ClaudeCharacter Component
 *
 * 2D sprite-based character that moves between village locations.
 * Uses CSS transitions for smooth movement animation.
 *
 * Character images are loaded per-state. To add a new state image:
 *  1. Generate the sprite with Stable Diffusion (see TODO comments below)
 *  2. Place it in public/assets/characters/claude/<state>.png
 *  3. Update CLAUDE_IMAGES below
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useVillage, villageActions, type CharacterState, type SubagentState } from '../../state/VillageContext'
import { getAllLocations } from '../../config/locations'
import { getComputedPosition } from '../../utils/villageLayout'
import type { GameWindowSize } from '../../hooks/useGameWindowSize'
import './ClaudeCharacter.css'

// ---------------------------------------------------------------------------
// Image paths
// TODO: Generate these sprites with Stable Diffusion and drop them here.
// ---------------------------------------------------------------------------

const DEFAULT_CHARACTER_IMAGE = 'assets/downloaded_assets/Neo_Tokyo_65ff27fb6e43ac4559f147fc/agents/Aiko_Takahashi/icon/388339b0-8656-40cc-a3b2-6b725a1df44e.png'

const CLAUDE_IMAGES: Record<CharacterState['state'] | 'walking', string> = {
    // TODO: create assets/characters/claude/idle.png  — character standing relaxed
    idle: DEFAULT_CHARACTER_IMAGE,

    // TODO: create assets/characters/claude/walking.png — character mid-stride
    walking: DEFAULT_CHARACTER_IMAGE,

    // TODO: create assets/characters/claude/working.png — character hunched over desk/tool
    working: DEFAULT_CHARACTER_IMAGE,

    // TODO: create assets/characters/claude/thinking.png — character with hand on chin, thought bubble
    thinking: DEFAULT_CHARACTER_IMAGE,

    // TODO: create assets/characters/claude/finished.png — character arms up, celebratory
    finished: DEFAULT_CHARACTER_IMAGE,
}

// TODO: create assets/characters/subagent/default.png — smaller, simpler subagent sprite
const SUBAGENT_DEFAULT_IMAGE = DEFAULT_CHARACTER_IMAGE

// ---------------------------------------------------------------------------

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
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ state, isMoving, size, scale }) => {
    const imageKey = isMoving ? 'walking' : state
    const src = CLAUDE_IMAGES[imageKey] ?? DEFAULT_CHARACTER_IMAGE

    return (
        <img
            src={src}
            className="character-sprite"
            width={192 * scale}
            height={336 * scale}
            alt={`Claude ${imageKey}`}
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
}

const SubagentCharacter: React.FC<SubagentCharacterProps> = ({ subagent, index, gameSize }) => {
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
            {/* TODO: replace with per-subagent colored sprite variants once generated */}
            <img
                src={SUBAGENT_DEFAULT_IMAGE}
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
