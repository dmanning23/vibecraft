/**
 * SessionPanel Component
 *
 * Displays and manages Claude Code sessions.
 * React port of the vanilla sessions panel.
 */

import React from 'react'
import type { ManagedSession, SessionStatus } from '@shared/types'

interface SessionPanelProps {
  sessions: ManagedSession[]
  selectedSessionId: string | null
  onSessionSelect: (sessionId: string | null) => void
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  sessions,
  selectedSessionId,
  onSessionSelect,
}) => {
  const activeSessions = sessions.filter(s => s.status !== 'offline')

  return (
    <div id="sessions-panel">
      <div id="sessions-list">
        {/* All Sessions option */}
        <div
          className={`session-item all-sessions ${selectedSessionId === null ? 'active' : ''}`}
          data-session="all"
          onClick={() => onSessionSelect(null)}
        >
          <div className="session-hotkey">0</div>
          <div className="session-icon">📋</div>
          <div className="session-info">
            <div className="session-name">All Sessions</div>
            <div className="session-detail" id="all-sessions-count">
              {activeSessions.length === 0
                ? 'No active sessions'
                : `${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''}`
              }
            </div>
          </div>
        </div>

        {/* Individual sessions */}
        <div id="managed-sessions">
          {sessions.map((session, index) => (
            <SessionItem
              key={session.id}
              session={session}
              index={index + 1}
              isSelected={selectedSessionId === session.id}
              onSelect={() => onSessionSelect(session.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Individual session item

interface SessionItemProps {
  session: ManagedSession
  index: number
  isSelected: boolean
  onSelect: () => void
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  index,
  isSelected,
  onSelect,
}) => {
  const statusIcon = getStatusIcon(session.status)
  const statusClass = getStatusClass(session.status)

  return (
    <div
      className={`session-item ${statusClass} ${isSelected ? 'active' : ''}`}
      data-session={session.id}
      onClick={onSelect}
      title={`${session.name}\n${session.cwd || 'Unknown directory'}\nStatus: ${session.status}`}
    >
      <div className="session-hotkey">{index <= 9 ? index : ''}</div>
      <div className={`session-status-dot ${statusClass}`}></div>
      <div className="session-info">
        <div className="session-name">
          {statusIcon} {session.name}
        </div>
        <div className="session-detail">
          {session.currentTool ? (
            <span className="session-tool">{session.currentTool}</span>
          ) : (
            <span className="session-status-text">{formatStatus(session.status)}</span>
          )}
          {session.cwd && (
            <span className="session-cwd">{formatPath(session.cwd)}</span>
          )}
        </div>
      </div>
      {session.tokens && (
        <div className="session-tokens">
          ⚡ {formatTokens(session.tokens.current)}
        </div>
      )}
    </div>
  )
}

// Utility functions

function getStatusIcon(status: SessionStatus): string {
  switch (status) {
    case 'idle': return '😊'
    case 'working': return '⚡'
    case 'waiting': return '⏳'
    case 'offline': return '💤'
    default: return '🔵'
  }
}

function getStatusClass(status: SessionStatus): string {
  switch (status) {
    case 'idle': return 'status-idle'
    case 'working': return 'status-working'
    case 'waiting': return 'status-waiting'
    case 'offline': return 'status-offline'
    default: return ''
  }
}

function formatStatus(status: SessionStatus): string {
  switch (status) {
    case 'idle': return 'Idle'
    case 'working': return 'Working...'
    case 'waiting': return 'Waiting for input'
    case 'offline': return 'Offline'
    default: return status
  }
}

function formatPath(path: string): string {
  // Shorten home directory
  const home = '/Users/'
  if (path.startsWith(home)) {
    const parts = path.slice(home.length).split('/')
    if (parts.length > 1) {
      return `~/${parts.slice(1).join('/')}`
    }
    return `~`
  }
  // Get last 2 path components
  const parts = path.split('/')
  if (parts.length > 2) {
    return `.../${parts.slice(-2).join('/')}`
  }
  return path
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return String(tokens)
}
