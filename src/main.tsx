/**
 * Vibecraft Village - React Entry Point
 *
 * 2D village visualization of Claude Code activity.
 * Replaces the Three.js 3D workshop with a React-based village view.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

// Mount the React app
const container = document.getElementById('app')
if (!container) {
  throw new Error('Failed to find #app element')
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
