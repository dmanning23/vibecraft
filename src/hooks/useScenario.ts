/**
 * useScenario Hook
 *
 * Returns the active scenario config and a setter that persists to localStorage.
 * Scenario data is loaded at runtime from /scenarios.json.
 */

import { useState, useEffect, useCallback } from 'react'
import type { ScenarioConfig } from '../config/scenarios'

const STORAGE_KEY = 'vibecraft-scenario'

interface ScenariosData {
  defaultScenarioId: string
  scenarios: ScenarioConfig[]
}

// Module-level cache so subsequent renders skip the fetch
let cache: ScenariosData | null = null
let fetchPromise: Promise<ScenariosData> | null = null

// Listeners notified when reloadScenarios() is called
const reloadListeners: Set<() => void> = new Set()

function fetchScenarios(): Promise<ScenariosData> {
  if (cache) return Promise.resolve(cache)
  if (!fetchPromise) {
    fetchPromise = fetch('/scenarios.json')
      .then((r) => r.json() as Promise<ScenariosData>)
      .then((data) => {
        cache = data
        return data
      })
  }
  return fetchPromise
}

/** Force-reload scenarios.json and notify all active hooks. */
export function reloadScenarios(): void {
  cache = null
  fetchPromise = null
  for (const cb of reloadListeners) cb()
}

export interface UseScenarioReturn {
  scenario: ScenarioConfig | null
  scenarioId: string
  setScenario: (id: string) => void
  scenarios: ScenarioConfig[]
}

export function useScenario(): UseScenarioReturn {
  const [data, setData] = useState<ScenariosData | null>(cache)

  const [scenarioId, setScenarioIdState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ?? data?.defaultScenarioId ?? 'neo_tokyo'
  })

  useEffect(() => {
    const load = () => {
      fetchScenarios().then((loaded) => {
        setData(loaded)
        // If localStorage has no preference, switch to the JSON's default
        if (!localStorage.getItem(STORAGE_KEY)) {
          setScenarioIdState(loaded.defaultScenarioId)
        }
      })
    }

    if (!cache) load()

    // Register so reloadScenarios() triggers a fresh fetch
    reloadListeners.add(load)
    return () => { reloadListeners.delete(load) }
  }, [])

  const setScenario = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setScenarioIdState(id)
  }, [])

  const scenarios = data?.scenarios ?? []
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0] ?? null

  return { scenario, scenarioId, setScenario, scenarios }
}
