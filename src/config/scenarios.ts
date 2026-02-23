/**
 * Scenario Configuration Types
 *
 * Scenario data is loaded at runtime from /scenarios.json (public/).
 * Location images are cycled (mod) if a scenario has fewer than the number of village locations.
 * Agent images follow the same cycling pattern for subagents.
 */

/** Per-state image paths for a single agent */
export interface AgentConfig {
  /** Character name — present in generated scenarios */
  name?: string
  states: {
    idle: string
    walking: string
    working: string
    thinking: string
    finished: string
  }
}

/**
 * OpenAI planning data saved alongside generated scenarios.
 * Used to regenerate individual assets without re-running OpenAI.
 */
export interface GenerationData {
  /** Stable Diffusion URL used during generation */
  sdUrl: string
  /** Original user description */
  description: string
  /** SD prompt for the background image */
  backgroundPrompt: string
  /** One entry per location (9 total, in STATION_ROLES order) */
  locations: Array<{
    stationType: string
    name: string
    sdPrompt: string
  }>
  /** One entry per agent (7 total) */
  agents: Array<{
    name: string
    physicalDescription: string
  }>
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
  /** Present only on generated scenarios — enables per-asset regeneration */
  generationData?: GenerationData
}
