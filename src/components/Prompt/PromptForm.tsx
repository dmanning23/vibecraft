/**
 * PromptForm Component
 *
 * Input form for sending prompts to Claude Code sessions.
 * React port of the vanilla prompt form.
 */

import React, { useState, useRef, useCallback } from 'react'
import type { ManagedSession } from '@shared/types'

interface PromptFormProps {
  selectedSessionId: string | null
  sessions: ManagedSession[]
}

export const PromptForm: React.FC<PromptFormProps> = ({
  selectedSessionId,
  sessions,
}) => {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get selected session
  const selectedSession = selectedSessionId
    ? sessions.find(s => s.id === selectedSessionId)
    : null

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      const endpoint = selectedSession
        ? `/api/sessions/${selectedSession.id}/prompt`
        : '/api/prompt'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          send: true,
        }),
      })

      if (response.ok) {
        setPrompt('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      } else {
        console.error('Failed to send prompt:', await response.text())
      }
    } catch (error) {
      console.error('Error sending prompt:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [prompt, isSubmitting, selectedSession])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }, [handleSubmit])

  // Handle cancel (send Ctrl+C)
  const handleCancel = useCallback(async () => {
    if (!selectedSession) return

    try {
      await fetch(`/api/sessions/${selectedSession.id}/cancel`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error canceling:', error)
    }
  }, [selectedSession])

  const isWorking = selectedSession?.status === 'working'

  return (
    <div id="prompt-container">
      <form id="prompt-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            id="prompt-input"
            placeholder={selectedSession ? `Message ${selectedSession.name}...` : 'Prompt...'}
            autoComplete="off"
            rows={1}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          id="prompt-submit"
          disabled={!prompt.trim() || isSubmitting}
        >
          <span className="btn-icon">↗</span> Send
        </button>
        {isWorking && (
          <button
            type="button"
            id="prompt-cancel"
            onClick={handleCancel}
            title="Stop Claude (Ctrl+C)"
          >
            <span className="btn-icon">◼</span> Stop
          </button>
        )}
      </form>
      <div id="prompt-options">
        <span id="prompt-target">
          {selectedSession ? (
            <>Sending to <strong>{selectedSession.name}</strong></>
          ) : (
            <>Sending to default session</>
          )}
        </span>
        <span id="prompt-status">
          {isSubmitting ? 'Sending...' : ''}
        </span>
      </div>
    </div>
  )
}
