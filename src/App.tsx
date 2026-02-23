/**
 * Vibecraft Village - Main App Component
 *
 * Orchestrates the village view, activity feed, and session management.
 * Connects to the EventBus and WebSocket client for real-time updates.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { VillageProvider } from './state/VillageContext'
import { VillageView } from './components/Village/VillageView'
import { ActivityFeed } from './components/Feed/ActivityFeed'
import { SessionPanel } from './components/Sessions/SessionPanel'
import { PromptForm } from './components/Prompt/PromptForm'
import { GenerationProgress } from './components/Config/GenerationProgress'
import { EventClient } from './events/EventClient'
import { eventBus } from './events/EventBus'
import { soundManager } from './audio/SoundManager'
import { reloadScenarios } from './hooks/useScenario'
import type { ClaudeEvent, ManagedSession, ScenarioGenerationUpdate, AssetRegenerationUpdate } from '@shared/types'

// Port injected at build time
declare const __VIBECRAFT_DEFAULT_PORT__: number

export const App: React.FC = () => {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<ClaudeEvent[]>([])
  const [sessions, setSessions] = useState<ManagedSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [generationUpdate, setGenerationUpdate] = useState<ScenarioGenerationUpdate | null>(null)
  const generationTimerRef = useRef<number | null>(null)
  const [regenStatus, setRegenStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const [regenTimestamps, setRegenTimestamps] = useState<Record<string, number>>({})

  // Initialize event client
  useEffect(() => {
    const port = __VIBECRAFT_DEFAULT_PORT__ || 4003
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.hostname || 'localhost'
    const wsUrl = `${wsProtocol}//${wsHost}:${port}/ws`

    const client = new EventClient({ url: wsUrl })

    // Connection handlers
    const unsubConnection = client.onConnection((isConnected) => {
      setConnected(isConnected)
      if (isConnected) {
        client.requestHistory(100)
      }
    })

    // Event handlers
    const unsubEvent = client.onEvent((event) => {
      setEvents(prev => [...prev, event])
      // Emit to EventBus for other handlers (sounds, etc.)
      eventBus.emit(event.type as any, event as any, {
        scene: null,
        feedManager: null,
        timelineManager: null,
        session: null,
        soundEnabled,
      })
    })

    // History handler
    const unsubHistory = client.onHistory((historyEvents) => {
      setEvents(prev => [...prev, ...historyEvents])
    })

    // Session updates
    const unsubSessions = client.onSessions((managedSessions) => {
      setSessions(managedSessions)
    })

    // Scenario generation + asset regeneration progress
    const unsubRaw = client.onRawMessage((msg) => {
      if (msg.type === 'scenario_generation') {
        const update = msg.payload as ScenarioGenerationUpdate
        setGenerationUpdate(update)

        if (generationTimerRef.current !== null) {
          window.clearTimeout(generationTimerRef.current)
          generationTimerRef.current = null
        }

        if (update.status === 'complete') {
          reloadScenarios()
          generationTimerRef.current = window.setTimeout(() => {
            setGenerationUpdate(null)
            generationTimerRef.current = null
          }, 4000)
        } else if (update.status === 'error') {
          generationTimerRef.current = window.setTimeout(() => {
            setGenerationUpdate(null)
            generationTimerRef.current = null
          }, 8000)
        }
      }

      if (msg.type === 'asset_regeneration') {
        const update = msg.payload as AssetRegenerationUpdate
        const key = `${update.scenarioId}::${update.assetKey}`
        if (update.status === 'started') {
          setRegenStatus(prev => ({ ...prev, [key]: 'loading' }))
        } else if (update.status === 'complete') {
          setRegenStatus(prev => ({ ...prev, [key]: 'done' }))
          setRegenTimestamps(prev => ({ ...prev, [key]: Date.now() }))
          // Clear 'done' badge after 3 seconds
          window.setTimeout(() => {
            setRegenStatus(prev => {
              const next = { ...prev }
              if (next[key] === 'done') delete next[key]
              return next
            })
          }, 3000)
        } else if (update.status === 'error') {
          setRegenStatus(prev => ({ ...prev, [key]: 'error' }))
        }
      }
    })

    // Connect
    client.connect()

    // Initialize sound
    const initSound = async () => {
      try {
        await soundManager.init()
      } catch (e) {
        console.warn('Sound initialization deferred until user interaction')
      }
    }
    initSound()

    return () => {
      unsubConnection()
      unsubEvent()
      unsubHistory()
      unsubSessions()
      unsubRaw()
      if (generationTimerRef.current !== null) {
        window.clearTimeout(generationTimerRef.current)
      }
      client.disconnect()
    }
  }, [soundEnabled])

  // Handle session selection
  const handleSessionSelect = useCallback((sessionId: string | null) => {
    setSelectedSessionId(sessionId)
  }, [])

  // Trigger single-asset regeneration
  const handleRegenerate = useCallback((scenarioId: string, assetKey: string) => {
    // sdUrl comes from the scenario's generationData — no re-entry needed
    fetch('/scenarios.json')
      .then(r => r.json())
      .then((data: { scenarios: Array<{ id: string; generationData?: { sdUrl: string } }> }) => {
        const scenario = data.scenarios.find(s => s.id === scenarioId)
        const sdUrl = scenario?.generationData?.sdUrl
        if (!sdUrl) {
          console.error(`No sdUrl found for scenario ${scenarioId}`)
          return
        }
        fetch('/regenerate-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdUrl, scenarioId, assetKey }),
        })
      })
      .catch(err => console.error('Failed to start regeneration:', err))
  }, [])

  return (
    <VillageProvider>
      <div className="app-container">
        {/* Left: Village View */}
        <div className="scene-panel" id="scene-panel">
          <VillageView
            events={events}
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSessionSelect={handleSessionSelect}
            soundEnabled={soundEnabled}
            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
            regenStatus={regenStatus}
            regenTimestamps={regenTimestamps}
            onRegenerate={handleRegenerate}
          />

          {/* Scenario generation progress banner */}
          <GenerationProgress update={generationUpdate} />

          {/* Scene HUD */}
          <div id="scene-hud">
            <div className="scene-badge unified-hud">
              <div id="status-dot" className={connected ? 'connected' : 'disconnected'}></div>
              <span id="username" className="hud-user">Village</span>
              <span id="status-text">{connected ? 'Connected' : 'Disconnected'}</span>
              <span className="hud-sep">|</span>
              <span id="token-counter" className="hud-tokens" title="Sessions active">
                {sessions.length} sessions
              </span>
            </div>
          </div>

          {/* Keybind Helper */}
          <div id="keybind-helper">
            <div className="keybind-list">
              <span className="keybind">
                <kbd>1-6</kbd> sessions
              </span>
            </div>
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div className="feed-panel" id="feed-panel">
          <div id="feed-header">
            <h2>Vibecraft Village <span className="muted">(vibecraft.sh)</span></h2>
          </div>

          {/* Session Management */}
          <SessionPanel
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSessionSelect={handleSessionSelect}
          />

          {/* Activity Feed */}
          <ActivityFeed
            events={events}
            selectedSessionId={selectedSessionId}
          />

          {/* Prompt Input */}
          <PromptForm
            selectedSessionId={selectedSessionId}
            sessions={sessions}
          />
        </div>

        {/* Connection overlay when disconnected */}
        {!connected && (
          <div id="not-connected-overlay">
            <div className="not-connected-content">
              <h2>Vibecraft Village</h2>
              <p className="not-connected-description">
                2D visualization of Claude Code activity.
              </p>
              <div className="not-connected-setup">
                <p className="not-connected-setup-label">Get started:</p>
                <div className="not-connected-code">npx vibecraft setup && npx vibecraft</div>
              </div>
              <div className="not-connected-actions">
                <button
                  className="not-connected-btn not-connected-btn-retry"
                  onClick={() => window.location.reload()}
                >
                  Reconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </VillageProvider>
  )
}
