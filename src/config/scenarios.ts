/**
 * Scenario Configuration Types
 *
 * Scenario data is loaded at runtime from /scenarios.json (public/).
 * Location images are cycled (mod) if a scenario has fewer than the number of village locations.
 * Agent images follow the same cycling pattern for subagents.
 */

/** Per-state image paths for a single agent */
export interface AgentConfig {
  states: {
    idle: string
    walking: string
    working: string
    thinking: string
    finished: string
  }
}

export interface ScenarioConfig {
  id: string
  name: string
  /** Background image path (relative to public/) */
  background: string
  /** Location images, cycled across the 9 village locations */
  locations: string[]
  /** Agent configs — index 0 = main character, rest = subagents (cycled) */
  agents: AgentConfig[]
}
