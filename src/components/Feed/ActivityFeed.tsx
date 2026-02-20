/**
 * ActivityFeed Component
 *
 * Displays a scrollable feed of Claude Code events.
 * React port of the vanilla FeedManager.
 */

import React, { useEffect, useRef, useState } from 'react'
import type { ClaudeEvent, PreToolUseEvent, PostToolUseEvent, StopEvent, UserPromptSubmitEvent } from '@shared/types'
import { getToolIcon, getToolColor } from '../../utils/ToolUtils'

interface ActivityFeedProps {
  events: ClaudeEvent[]
  selectedSessionId: string | null
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  events,
  selectedSessionId,
}) => {
  const feedRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Filter events by selected session
  const filteredEvents = selectedSessionId
    ? events.filter(e => e.sessionId === selectedSessionId)
    : events

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [filteredEvents, autoScroll])

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
    setShowScrollButton(!isAtBottom)
  }

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
      setAutoScroll(true)
      setShowScrollButton(false)
    }
  }

  return (
    <div id="activity-feed-wrapper">
      <div
        id="activity-feed"
        ref={feedRef}
        onScroll={handleScroll}
      >
        {filteredEvents.length === 0 ? (
          <div id="feed-empty">
            <div id="feed-empty-icon">🏘️</div>
            <h3>Waiting for activity</h3>
            <p>Start using Claude Code to see events here</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <FeedItem key={`${event.id}-${index}`} event={event} />
          ))
        )}
      </div>

      {showScrollButton && (
        <button
          id="feed-scroll-bottom"
          onClick={scrollToBottom}
          style={{ display: 'block' }}
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}

// Individual feed item component

interface FeedItemProps {
  event: ClaudeEvent
}

const FeedItem: React.FC<FeedItemProps> = ({ event }) => {
  const renderContent = () => {
    switch (event.type) {
      case 'pre_tool_use':
        return <ToolStartItem event={event as PreToolUseEvent} />
      case 'post_tool_use':
        return <ToolEndItem event={event as PostToolUseEvent} />
      case 'stop':
        return <StopItem event={event as StopEvent} />
      case 'user_prompt_submit':
        return <PromptItem event={event as UserPromptSubmitEvent} />
      case 'notification':
        return <NotificationItem event={event} />
      case 'session_start':
        return <SessionStartItem event={event} />
      case 'session_end':
        return <SessionEndItem event={event} />
      default:
        return <GenericItem event={event} />
    }
  }

  return (
    <div className={`feed-item feed-${event.type}`}>
      {renderContent()}
    </div>
  )
}

// Tool start item

const ToolStartItem: React.FC<{ event: PreToolUseEvent }> = ({ event }) => {
  const icon = getToolIcon(event.tool)
  const color = getToolColor(event.tool)

  return (
    <div className="feed-tool-start">
      <span className="feed-icon" style={{ color }}>{icon}</span>
      <div className="feed-content">
        <span className="feed-tool-name">{event.tool}</span>
        <span className="feed-tool-detail">{formatToolInput(event.tool, event.toolInput)}</span>
      </div>
      <span className="feed-time">{formatTime(event.timestamp)}</span>
    </div>
  )
}

// Tool end item

const ToolEndItem: React.FC<{ event: PostToolUseEvent }> = ({ event }) => {
  const icon = event.success ? '✓' : '✗'
  const statusClass = event.success ? 'success' : 'error'

  return (
    <div className={`feed-tool-end ${statusClass}`}>
      <span className={`feed-status-icon ${statusClass}`}>{icon}</span>
      <div className="feed-content">
        <span className="feed-tool-name">{event.tool}</span>
        {event.duration && (
          <span className="feed-duration">{formatDuration(event.duration)}</span>
        )}
      </div>
    </div>
  )
}

// Stop item

const StopItem: React.FC<{ event: StopEvent }> = ({ event }) => (
  <div className="feed-stop">
    <span className="feed-icon">🏁</span>
    <div className="feed-content">
      <span className="feed-label">Claude finished</span>
      {event.response && (
        <div className="feed-response">
          {truncate(event.response, 200)}
        </div>
      )}
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Prompt item

const PromptItem: React.FC<{ event: UserPromptSubmitEvent }> = ({ event }) => (
  <div className="feed-prompt">
    <span className="feed-icon">💬</span>
    <div className="feed-content">
      <span className="feed-label">You</span>
      <div className="feed-prompt-text">{truncate(event.prompt, 300)}</div>
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Notification item

const NotificationItem: React.FC<{ event: ClaudeEvent }> = ({ event }) => (
  <div className="feed-notification">
    <span className="feed-icon">🔔</span>
    <div className="feed-content">
      <span className="feed-label">Notification</span>
      <div className="feed-notification-text">
        {(event as any).message || 'System notification'}
      </div>
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Session start item

const SessionStartItem: React.FC<{ event: ClaudeEvent }> = ({ event }) => (
  <div className="feed-session-start">
    <span className="feed-icon">🚀</span>
    <div className="feed-content">
      <span className="feed-label">Session started</span>
      <span className="feed-session-id">{event.sessionId.slice(0, 8)}</span>
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Session end item

const SessionEndItem: React.FC<{ event: ClaudeEvent }> = ({ event }) => (
  <div className="feed-session-end">
    <span className="feed-icon">👋</span>
    <div className="feed-content">
      <span className="feed-label">Session ended</span>
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Generic item for unknown types

const GenericItem: React.FC<{ event: ClaudeEvent }> = ({ event }) => (
  <div className="feed-generic">
    <span className="feed-icon">📋</span>
    <div className="feed-content">
      <span className="feed-label">{event.type}</span>
    </div>
    <span className="feed-time">{formatTime(event.timestamp)}</span>
  </div>
)

// Utility functions

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function formatToolInput(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case 'Read':
    case 'Write':
    case 'Edit':
      return (input.file_path as string) || ''
    case 'Bash':
      return truncate((input.command as string) || '', 50)
    case 'Grep':
    case 'Glob':
      return (input.pattern as string) || ''
    case 'WebFetch':
    case 'WebSearch':
      return (input.url as string) || (input.query as string) || ''
    case 'Task':
      return (input.description as string) || ''
    default:
      return ''
  }
}
