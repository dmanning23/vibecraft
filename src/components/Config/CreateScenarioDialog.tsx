/**
 * CreateScenarioDialog
 *
 * Modal for generating a new scenario. Requires an OpenAI key,
 * a Stable Diffusion URL, and a text description before the
 * Create button becomes active.
 */

import React, { useState } from 'react'

interface CreateScenarioDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateScenarioDialog: React.FC<CreateScenarioDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [openaiKey, setOpenaiKey] = useState('')
  const [sdUrl, setSdUrl] = useState('')
  const [description, setDescription] = useState('')

  const canCreate = openaiKey.trim() !== '' && sdUrl.trim() !== '' && description.trim() !== ''

  const handleCreate = () => {
    if (!canCreate) return
    // TODO: wire up generation
    console.log('Generate scenario', { openaiKey, sdUrl, description })
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
            <label className="create-scenario-label">OpenAI API Key</label>
            <input
              type="password"
              className="create-scenario-input"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="create-scenario-field">
            <label className="create-scenario-label">Stable Diffusion URL</label>
            <input
              type="text"
              className="create-scenario-input"
              placeholder="http://localhost:7860"
              value={sdUrl}
              onChange={(e) => setSdUrl(e.target.value)}
            />
          </div>

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
            Create!
          </button>
        </div>

      </div>
    </div>
  )
}
