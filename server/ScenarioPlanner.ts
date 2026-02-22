/**
 * ScenarioPlanner
 *
 * Handles all OpenAI calls for scenario planning. Each call is focused on
 * one concern: scenario meta, location theming, or agent creation.
 *
 * The 9 station roles are hardcoded here to match the village simulation.
 * OpenAI is asked to produce thematic variants of each role — not to invent
 * new ones — so the generated scenario always maps cleanly to the game.
 */

// ============================================================================
// Station roles — mirrors StationType in shared/types.ts
// ============================================================================

export interface StationRole {
    type: string
    role: string
    function: string
}

/** The 9 fixed stations in the village sim, in index order. */
export const STATION_ROLES: StationRole[] = [
    {
        type: 'center',
        role: 'Central plaza or town square',
        function: 'Where agents idle and gather between tasks',
    },
    {
        type: 'bookshelf',
        role: 'Library or archive',
        function: 'Where agents read files and gather knowledge',
    },
    {
        type: 'desk',
        role: 'Writing studio or scriptorium',
        function: 'Where agents create and write new files',
    },
    {
        type: 'workbench',
        role: 'Workshop or forge',
        function: 'Where agents edit and repair existing work',
    },
    {
        type: 'terminal',
        role: 'Command center or control room',
        function: 'Where agents run commands and scripts',
    },
    {
        type: 'scanner',
        role: 'Observatory or watchtower',
        function: 'Where agents search and scan for patterns in data',
    },
    {
        type: 'antenna',
        role: 'Communications tower or relay station',
        function: 'Where agents fetch data from the outside world',
    },
    {
        type: 'portal',
        role: 'Gateway or summoning circle',
        function: 'Where new sub-agents are spawned and dismissed',
    },
    {
        type: 'taskboard',
        role: 'Mission board or planning hall',
        function: 'Where agents track and manage their task lists',
    },
]

// ============================================================================
// Output types
// ============================================================================

export interface ScenarioMeta {
    id: string
    name: string
    backgroundPrompt: string
}

export interface LocationPlan {
    stationType: string
    name: string
    prompt: string
}

export interface AgentPlan {
    name: string
    physicalDescription: string
}

// ============================================================================
// Shared OpenAI helper
// ============================================================================

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.9,
            response_format: { type: 'json_object' },
        }),
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenAI error ${response.status}: ${err}`)
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    return data.choices[0].message.content
}

// ============================================================================
// Planning calls
// ============================================================================

/** Plan scenario name, id, and background image prompt. */
export async function planMeta(apiKey: string, description: string): Promise<ScenarioMeta> {
    const system = `You are a creative director for a village life simulation game.
Given a scenario theme, output a JSON object:
{
  "id": "<snake_case_id — short, no spaces>",
  "name": "<Display Name — 2-4 words>",
  "backgroundPrompt": "<Stable Diffusion prompt for a wide landscape establishing shot of this world>"
}
The background should evoke the overall environment and atmosphere of the setting.
Respond with ONLY valid JSON, no markdown fences.`

    const raw = await callOpenAI(apiKey, system, description)
    const meta = JSON.parse(raw) as ScenarioMeta
    console.log(`[ScenarioPlanner] meta — id: "${meta.id}", name: "${meta.name}"`)
    console.log(`[ScenarioPlanner]   backgroundPrompt: ${meta.backgroundPrompt}`)
    return meta
}

/** Plan the 9 themed location names and SD prompts, one per station role. */
export async function planLocations(apiKey: string, description: string, scenarioName: string): Promise<LocationPlan[]> {
    const roleList = STATION_ROLES.map((r, i) =>
        `  ${i + 1}. ${r.type} — ${r.role}: ${r.function}`
    ).join('\n')

    const system = `You are a creative director for a village life simulation game called "${scenarioName}".
The village has exactly 9 fixed locations, each with a specific function. Your job is to give each one
a thematic name and Stable Diffusion image prompt that fits the scenario, while preserving its function.

The 9 locations in order (you must return exactly 9, in the same order):
${roleList}

Output a JSON object with a "locations" array of exactly 9 items:
{
  "locations": [
    { "name": "<themed name for this location>", "prompt": "<SD prompt for the building exterior>" },
    ...
  ]
}

SD prompts: building exterior, stylized game art style, vivid and thematic. Each building should look
distinct and visually communicate its function while fitting the scenario's visual theme.
Respond with ONLY valid JSON, no markdown fences.`

    const raw = await callOpenAI(apiKey, system, description)
    const parsed = JSON.parse(raw) as { locations: Array<{ name: string; prompt: string }> }

    if (!Array.isArray(parsed.locations) || parsed.locations.length !== 9) {
        throw new Error(`planLocations: expected 9 locations, got ${parsed.locations?.length ?? 0}`)
    }

    const locations: LocationPlan[] = parsed.locations.map((loc, i) => ({
        stationType: STATION_ROLES[i].type,
        name: loc.name,
        prompt: loc.prompt,
    }))

    console.log(`[ScenarioPlanner] locations (${locations.length}):`)
    locations.forEach((l, i) => console.log(`[ScenarioPlanner]   [${i}] ${l.stationType} → "${l.name}": ${l.prompt}`))

    return locations
}

/** Plan 7 agent characters with detailed physical descriptions for SD. */
export async function planAgents(apiKey: string, description: string, scenarioName: string): Promise<AgentPlan[]> {
    const system = `You are a creative director for a village life simulation game called "${scenarioName}".
Create 7 unique villager characters that fit the scenario's theme and visual style.

Output a JSON object with an "agents" array of exactly 7 items:
{
  "agents": [
    {
      "name": "<Character Name>",
      "physicalDescription": "<detailed physical description for Stable Diffusion>"
    },
    ...
  ]
}

physicalDescription guidelines:
- Write as a Stable Diffusion prompt — descriptive phrases, not sentences
- Include: hair style and color, eye color, skin tone, clothing style and colors, accessories
- Be specific and visually distinctive — this description generates multiple images of the same character
- Match the scenario's art style and setting (clothing, gear, era, etc.)
- Each character should look clearly different from the others

Respond with ONLY valid JSON, no markdown fences.`

    const raw = await callOpenAI(apiKey, system, description)
    const parsed = JSON.parse(raw) as { agents: AgentPlan[] }

    if (!Array.isArray(parsed.agents) || parsed.agents.length !== 7) {
        throw new Error(`planAgents: expected 7 agents, got ${parsed.agents?.length ?? 0}`)
    }

    console.log(`[ScenarioPlanner] agents (${parsed.agents.length}):`)
    parsed.agents.forEach((a, i) => console.log(`[ScenarioPlanner]   [${i}] ${a.name}: ${a.physicalDescription}`))

    return parsed.agents
}
