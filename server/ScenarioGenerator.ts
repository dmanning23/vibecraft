/**
 * ScenarioGenerator
 *
 * Generates a new scenario by:
 * 1. Calling OpenAI to produce a structured scenario plan (names + SD prompts)
 * 2. Calling Stable Diffusion for each image (background, locations, agents)
 * 3. Saving images to public/assets/generated/<id>/
 * 4. Appending the new scenario to public/scenarios.json
 *
 * Broadcasts progress updates via the supplied callback throughout.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Resolve the public/ folder relative to this file (server/ -> ../ -> public/)
function getPublicDir(): string {
  // Running as tsx server/index.ts → __dirname = <project>/server
  // Running as dist/server/index.js → __dirname = <project>/dist/server
  const candidates = [
    resolve(__dirname, '../public'),
    resolve(__dirname, '../../public'),
    resolve(process.cwd(), 'public'),
  ]
  return candidates.find(existsSync) ?? resolve(process.cwd(), 'public')
}

// ============================================================================
// Types
// ============================================================================

export interface GenerationRequest {
  openaiKey: string
  sdUrl: string
  description: string
}

export interface ProgressBroadcast {
  (step: number, total: number, message: string, status?: 'planning' | 'generating' | 'saving' | 'complete' | 'error', error?: string): void
}

interface ScenarioPlan {
  id: string
  name: string
  backgroundPrompt: string
  locations: Array<{ name: string; prompt: string }>
  agents: Array<{ name: string; prompt: string }>
}

// ============================================================================
// OpenAI — plan the scenario
// ============================================================================

async function planScenario(openaiKey: string, description: string): Promise<ScenarioPlan> {
  const systemPrompt = `You are a creative director for a 2D village game.
Given a scenario description, output a JSON object with this exact shape:
{
  "id": "<snake_case_id>",
  "name": "<Display Name>",
  "backgroundPrompt": "<Stable Diffusion prompt for a wide landscape background image>",
  "locations": [
    { "name": "<Building Name>", "prompt": "<SD prompt for the building exterior>" },
    ... exactly 6 locations
  ],
  "agents": [
    { "name": "<Character Name>", "prompt": "<SD prompt for a character portrait icon>" },
    ... exactly 7 agents
  ]
}
SD prompts should be detailed and vivid, suited for the scenario theme.
Background: wide establishing shot, landscape orientation.
Locations: building exteriors, slightly stylized, game art style.
Agents: character portrait, upper body, clear face, distinct look.
Respond with ONLY valid JSON, no markdown fences.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description },
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
  const content = data.choices[0].message.content
  return JSON.parse(content) as ScenarioPlan
}

// ============================================================================
// Stable Diffusion — generate one image
// ============================================================================

async function generateImage(
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const baseUrl = sdUrl.replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'blurry, low quality, distorted, text, watermark',
      width,
      height,
      steps: 25,
      cfg_scale: 7,
      sampler_name: 'DPM++ 2M Karras',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Stable Diffusion error ${response.status}: ${err}`)
  }

  const data = await response.json() as { images: string[] }
  return Buffer.from(data.images[0], 'base64')
}

// ============================================================================
// Main generation flow
// ============================================================================

/** State-specific prompt suffixes appended to the base agent portrait prompt */
const AGENT_STATE_SUFFIXES: Record<string, string> = {
  idle:     'standing relaxed, neutral expression, calm natural pose',
  walking:  'mid-stride, walking motion, dynamic movement pose',
  working:  'focused and determined, leaning forward, actively working',
  thinking: 'contemplative expression, hand on chin, lost in thought',
  finished: 'happy and triumphant, satisfied smile, celebratory pose',
}

const AGENT_STATES = Object.keys(AGENT_STATE_SUFFIXES) as Array<keyof typeof AGENT_STATE_SUFFIXES>

export async function generateScenario(
  request: GenerationRequest,
  broadcast: ProgressBroadcast,
): Promise<void> {
  const { openaiKey, sdUrl, description } = request
  const publicDir = getPublicDir()
  const scenariosFile = join(publicDir, 'scenarios.json')

  // Total steps: 1 plan + 1 background + 6 locations + (7 agents × 5 states) + 1 save = 44
  const TOTAL = 44
  let step = 0

  try {
    // ── Step 1: Plan ──────────────────────────────────────────────────────────
    broadcast(++step, TOTAL, 'Planning scenario with OpenAI...', 'planning')
    const plan = await planScenario(openaiKey, description)

    // Ensure unique ID
    const id = `${plan.id}_${randomUUID().slice(0, 8)}`
    const assetBase = join(publicDir, 'assets', 'generated', id)

    mkdirSync(join(assetBase, 'scenario'), { recursive: true })
    mkdirSync(join(assetBase, 'locations'), { recursive: true })
    for (let i = 0; i < plan.agents.length; i++) {
      mkdirSync(join(assetBase, 'agents', String(i)), { recursive: true })
    }

    const relBase = `assets/generated/${id}`

    // ── Step 2: Background ────────────────────────────────────────────────────
    broadcast(++step, TOTAL, 'Generating background...', 'generating')
    const bgImage = await generateImage(sdUrl, plan.backgroundPrompt, 1024, 512)
    writeFileSync(join(assetBase, 'scenario', 'background.png'), bgImage)
    const backgroundRel = `${relBase}/scenario/background.png`

    // ── Steps 3–8: Locations ──────────────────────────────────────────────────
    const locationPaths: string[] = []
    for (let i = 0; i < plan.locations.length; i++) {
      const loc = plan.locations[i]
      broadcast(++step, TOTAL, `Generating location: ${loc.name}...`, 'generating')
      const img = await generateImage(sdUrl, loc.prompt, 512, 341)
      writeFileSync(join(assetBase, 'locations', `${i}.png`), img)
      locationPaths.push(`${relBase}/locations/${i}.png`)
    }

    // ── Steps 9–43: Agents (5 states each) ────────────────────────────────────
    const agentConfigs: Array<{ states: Record<string, string> }> = []
    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i]
      const states: Record<string, string> = {}
      for (const stateName of AGENT_STATES) {
        const statePrompt = `${agent.prompt}, ${AGENT_STATE_SUFFIXES[stateName]}`
        broadcast(++step, TOTAL, `Generating ${agent.name} (${stateName})...`, 'generating')
        const img = await generateImage(sdUrl, statePrompt, 256, 256)
        const imgPath = join(assetBase, 'agents', String(i), `${stateName}.png`)
        writeFileSync(imgPath, img)
        states[stateName] = `${relBase}/agents/${i}/${stateName}.png`
      }
      agentConfigs.push({ states })
    }

    // ── Step 44: Save ─────────────────────────────────────────────────────────
    broadcast(++step, TOTAL, 'Saving scenario...', 'saving')

    const newScenario = {
      id,
      name: plan.name,
      background: backgroundRel,
      locations: locationPaths,
      agents: agentConfigs,
    }

    let scenariosData: { defaultScenarioId: string; scenarios: unknown[] } = {
      defaultScenarioId: 'neo_tokyo',
      scenarios: [],
    }
    if (existsSync(scenariosFile)) {
      scenariosData = JSON.parse(readFileSync(scenariosFile, 'utf-8'))
    }
    scenariosData.scenarios.push(newScenario)
    writeFileSync(scenariosFile, JSON.stringify(scenariosData, null, 2))

    broadcast(TOTAL, TOTAL, `"${plan.name}" is ready!`, 'complete')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    broadcast(step, TOTAL, message, 'error', message)
  }
}
