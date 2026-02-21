/**
 * useScenario Hook
 *
 * Returns the active scenario config and a setter that persists to localStorage.
 */

import { useState, useCallback } from 'react'
import { SCENARIOS, getScenario, DEFAULT_SCENARIO_ID, type ScenarioConfig } from '../config/scenarios'

const STORAGE_KEY = 'vibecraft-scenario'

export interface UseScenarioReturn {
  scenario: ScenarioConfig
  scenarioId: string
  setScenario: (id: string) => void
  scenarios: ScenarioConfig[]
}

export function useScenario(): UseScenarioReturn {
  const [scenarioId, setScenarioIdState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SCENARIO_ID
  )

  const setScenario = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setScenarioIdState(id)
  }, [])

  return {
    scenario: getScenario(scenarioId),
    scenarioId,
    setScenario,
    scenarios: SCENARIOS,
  }
}
