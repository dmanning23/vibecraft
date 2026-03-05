/**
 * CreateScenarioDialog
 *
 * Modal for generating a new scenario. Only requires a description —
 * OPENAI_API_KEY and SD_URL are read from the server's environment.
 */

import React, { useState } from 'react'

interface CreateScenarioDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Called instead of onClose when generation is successfully kicked off */
  onCreated?: () => void
}

export const CreateScenarioDialog: React.FC<CreateScenarioDialogProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = !submitting && description.trim() !== ''

  const handleCreate = async () => {
    if (!canCreate) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? `Server error ${res.status}`)
        return
      }
      // Server responds 202 immediately; progress arrives via WebSocket
      if (onCreated) onCreated()
      else onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  return (
    <div className="create-scenario-overlay" onClick={handleBackdropClick}>
      <div className="create-scenario-dialog">

        <div className="create-scenario-header">
          <h3 className="create-scenario-title">Create New Scenario</h3>
          <button className="config-panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="create-scenario-body">

          <div className="create-scenario-field">
            <label className="create-scenario-label">Scenario Description</label>
            <textarea
              className="create-scenario-textarea"
              placeholder="Describe your scenario… e.g. 'A cozy medieval village with a blacksmith, tavern, and wizard's tower'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="create-scenario-error">{error}</div>
          )}

        </div>

        <div className="create-scenario-footer">
          <button className="create-scenario-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="create-scenario-submit"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            {submitting ? 'Starting…' : 'Create!'}
          </button>
        </div>

      </div>
    </div>
  )
}
