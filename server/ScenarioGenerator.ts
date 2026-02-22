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
import { removeBackground } from '@imgly/background-removal-node'
import { fetch, Agent } from 'undici'

// Long-lived agent with no headers/body timeout for slow SD generations
const sdAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0 })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// Logging
// ============================================================================

function log(msg: string, ...args: unknown[]): void {
  console.log(`[ScenarioGenerator] ${msg}`, ...args)
}

function logError(msg: string, err: unknown): void {
  console.error(`[ScenarioGenerator] ERROR — ${msg}`)
  if (err instanceof Error) {
    console.error(`  message: ${err.message}`)
    if ((err as NodeJS.ErrnoException).cause) {
      console.error(`  cause:   ${(err as NodeJS.ErrnoException).cause}`)
    }
    console.error(`  stack:   ${err.stack}`)
  } else {
    console.error(`  value:   ${String(err)}`)
  }
}

// Resolve the public/ folder relative to this file (server/ -> ../ -> public/)
function getPublicDir(): string {
  const candidates = [
    resolve(__dirname, '../public'),
    resolve(__dirname, '../../public'),
    resolve(process.cwd(), 'public'),
  ]
  const found = candidates.find(existsSync) ?? resolve(process.cwd(), 'public')
  log(`public dir resolved to: ${found}`)
  return found
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
  agents: Array<{ name: string; physicalDescription: string }>
}

// ============================================================================
// OpenAI — plan the scenario
// ============================================================================

async function planScenario(openaiKey: string, description: string): Promise<ScenarioPlan> {
  log(`Calling OpenAI to plan scenario for: "${description}"`)

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
    {
      "name": "<Character Name>",
      "physicalDescription": "<detailed physical description of the character>"
    },
    ... exactly 7 agents
  ]
}
SD prompts should be detailed and vivid, suited for the scenario theme.
Background: wide establishing shot, landscape orientation.
Locations: building exteriors, slightly stylized, game art style.
Agent physicalDescription: write a thorough physical description of the character suitable for use as a Stable Diffusion prompt. Include hair style and color, eye color, skin tone, facial features, clothing style and colors, and any distinguishing accessories or characteristics. Be specific and consistent — this description will be reused across multiple images of the same character and must uniquely identify them.
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
  const plan = JSON.parse(content) as ScenarioPlan

  log(`Plan received — id: "${plan.id}", name: "${plan.name}"`)
  log(`  backgroundPrompt: ${plan.backgroundPrompt}`)
  log(`  locations (${plan.locations.length}):`)
  plan.locations.forEach((l, i) => log(`    [${i}] ${l.name}: ${l.prompt}`))
  log(`  agents (${plan.agents.length}):`)
  plan.agents.forEach((a, i) => log(`    [${i}] ${a.name}: ${a.physicalDescription}`))

  return plan
}

// ============================================================================
// Stable Diffusion — generate one image
// ============================================================================

interface ImageOptions {
  negativePrompt?: string
  model?: string
  steps?: number
  cfgScale?: number
}

async function generateImage(
  sdUrl: string,
  prompt: string,
  width: number,
  height: number,
  options: ImageOptions = {},
): Promise<Buffer> {
  const baseUrl = sdUrl.replace(/\/$/, '')

  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: options.negativePrompt ?? 'blurry, low quality, distorted, text, watermark',
    width,
    height,
    steps: options.steps ?? 25,
    cfg_scale: options.cfgScale ?? 7,
    sampler_name: 'DPM++ 2M Karras',
    save_images: true,
  }

  if (options.model) {
    body.override_settings = { sd_model_checkpoint: options.model }
    body.override_settings_restore_afterwards = true
  }

  log(`SD request → ${baseUrl}/sdapi/v1/txt2img`)
  log(`  model:    ${options.model ?? '(default)'}`)
  log(`  size:     ${width}×${height}`)
  log(`  steps:    ${options.steps ?? 25}  cfg: ${options.cfgScale ?? 7}`)
  log(`  prompt:   ${prompt}`)
  log(`  negative: ${options.negativePrompt ?? 'blurry, low quality, distorted, text, watermark'}`)

  let response: Awaited<ReturnType<typeof fetch>>
  try {
    response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      dispatcher: sdAgent,
    })
  } catch (err) {
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause
      ? ` (cause: ${(err as NodeJS.ErrnoException).cause})`
      : ''
    throw new Error(`Cannot reach Stable Diffusion at ${baseUrl} — is it running? ${err instanceof Error ? err.message : err}${cause}`)
  }

  log(`SD response status: ${response.status}`)

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Stable Diffusion error ${response.status} at ${baseUrl}: ${err}`)
  }

  const data = await response.json() as { images: string[] }
  const imageCount = data.images?.length ?? 0
  log(`SD returned ${imageCount} image(s)`)

  if (!imageCount || !data.images[0]) {
    throw new Error(`Stable Diffusion returned no images (images array was empty or missing)`)
  }

  const imgBuffer = Buffer.from(data.images[0], 'base64')
  log(`SD image decoded: ${imgBuffer.length} bytes`)
  return imgBuffer
}

// ============================================================================
// Background removal
// ============================================================================

async function stripBackground(imageBuffer: Buffer): Promise<Buffer> {
  log(`stripBackground: input ${imageBuffer.length} bytes — running rembg...`)
  // Wrap buffer in a typed Blob so the library can detect the MIME type.
  // Without a type, Buffer (ArrayBuffer.isView) becomes Blob("") which throws
  // "Unsupported format: " inside imageDecode.
  const inputBlob = new Blob([imageBuffer], { type: 'image/png' })
  const blob = await removeBackground(inputBlob, {
    model: 'medium',
    output: { format: 'image/png' },
  })
  const result = Buffer.from(await blob.arrayBuffer())
  log(`stripBackground: output ${result.length} bytes`)
  return result
}

// ============================================================================
// Image preset configs
// ============================================================================

const SHARED_MODEL = 'fantasyWorld_v10.safetensors [524882ba22]'

const BACKGROUND_NEGATIVE = '1girl,text,cropped,word,low quality,normal quality,soft line username,(watermark),(signature),blurry,soft,curved line,sketch,ugly,logo,pixelated,lowres,buildings,(building),'

function buildBackgroundPrompt(userInput: string): string {
  return `(landscape),((nature)),(isometric),Isometric_Setting,<lora:Stylized_Setting_SDXL:1>,${userInput}`
}

const LOCATION_NEGATIVE = 'text,word,monochrome,cropped,low quality,normal quality,soft line,username,(watermark),(signature),blurry,soft,sketch,ugly,logo,pixelated,lowres,out of frame,cut off,blurry,foggy,reflection'

function buildLocationPrompt(userInput: string): string {
  return `(((isometric))),(Isometric_Setting),(building exterior),((black background)),<lora:Stylized_Setting_SDXL:4>,bright colors,${userInput}`
}

const AGENT_MODEL = 'dreamshaperXL_v21TurboDPMSDE.safetensors [4496b36d48]'
const AGENT_NEGATIVE = 'BadDream, UnrealisticDream'

function buildAgentPrompt(physicalDescription: string, stateSuffix: string): string {
  return `(one person),(painterly),(full body),feet,black background,${physicalDescription},${stateSuffix}`
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

  log(`=== Starting scenario generation ===`)
  log(`  sdUrl:       ${sdUrl}`)
  log(`  description: ${description}`)
  log(`  publicDir:   ${publicDir}`)

  try {
    // ── Step 1: Plan ──────────────────────────────────────────────────────────
    log(`\n── Step ${step + 1}/${TOTAL}: Planning ──`)
    broadcast(++step, TOTAL, 'Planning scenario with OpenAI...', 'planning')
    const plan = await planScenario(openaiKey, description)

    // Ensure unique ID
    const id = `${plan.id}_${randomUUID().slice(0, 8)}`
    const assetBase = join(publicDir, 'assets', 'generated', id)
    log(`Scenario id: ${id}`)
    log(`Asset base:  ${assetBase}`)

    mkdirSync(join(assetBase, 'scenario'), { recursive: true })
    mkdirSync(join(assetBase, 'locations'), { recursive: true })
    for (let i = 0; i < plan.agents.length; i++) {
      mkdirSync(join(assetBase, 'agents', String(i)), { recursive: true })
    }

    const relBase = `assets/generated/${id}`

    // ── Step 2: Background ────────────────────────────────────────────────────
    log(`\n── Step ${step + 1}/${TOTAL}: Background ──`)
    broadcast(++step, TOTAL, 'Generating background...', 'generating')
    const bgImage = await generateImage(
      sdUrl,
      buildBackgroundPrompt(plan.backgroundPrompt),
      2048,
      1024,
      { negativePrompt: BACKGROUND_NEGATIVE, model: SHARED_MODEL, steps: 40, cfgScale: 7 },
    )
    const bgPath = join(assetBase, 'scenario', 'background.png')
    writeFileSync(bgPath, bgImage)
    log(`Background saved: ${bgPath}`)
    const backgroundRel = `${relBase}/scenario/background.png`

    // ── Steps 3–8: Locations ──────────────────────────────────────────────────
    const locationPaths: string[] = []
    for (let i = 0; i < plan.locations.length; i++) {
      const loc = plan.locations[i]
      log(`\n── Step ${step + 1}/${TOTAL}: Location ${i + 1}/${plan.locations.length} — "${loc.name}" ──`)
      broadcast(++step, TOTAL, `Generating location: ${loc.name}...`, 'generating')
      const rawLoc = await generateImage(
        sdUrl,
        buildLocationPrompt(loc.prompt),
        768,
        512,
        { negativePrompt: LOCATION_NEGATIVE, model: SHARED_MODEL, steps: 40, cfgScale: 7 },
      )
      const img = await stripBackground(rawLoc)
      const imgPath = join(assetBase, 'locations', `${i}.png`)
      writeFileSync(imgPath, img)
      log(`Location saved: ${imgPath}`)
      locationPaths.push(`${relBase}/locations/${i}.png`)
    }

    // ── Steps 9–43: Agents (5 states each) ────────────────────────────────────
    const agentConfigs: Array<{ states: Record<string, string> }> = []
    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i]
      log(`\n── Agent ${i + 1}/${plan.agents.length}: "${agent.name}" ──`)
      log(`  physicalDescription: ${agent.physicalDescription}`)
      const states: Record<string, string> = {}
      for (const stateName of AGENT_STATES) {
        const statePrompt = buildAgentPrompt(agent.physicalDescription, AGENT_STATE_SUFFIXES[stateName])
        log(`\n── Step ${step + 1}/${TOTAL}: Agent "${agent.name}" — state: ${stateName} ──`)
        broadcast(++step, TOTAL, `Generating ${agent.name} (${stateName})...`, 'generating')
        const rawAgent = await generateImage(
          sdUrl,
          statePrompt,
          768,
          1344,
          { negativePrompt: AGENT_NEGATIVE, model: AGENT_MODEL, steps: 40, cfgScale: 7 },
        )
        const img = await stripBackground(rawAgent)
        const imgPath = join(assetBase, 'agents', String(i), `${stateName}.png`)
        writeFileSync(imgPath, img)
        log(`Agent image saved: ${imgPath}`)
        states[stateName] = `${relBase}/agents/${i}/${stateName}.png`
      }
      agentConfigs.push({ states })
    }

    // ── Step 44: Save ─────────────────────────────────────────────────────────
    log(`\n── Step ${step + 1}/${TOTAL}: Saving scenarios.json ──`)
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
    log(`scenarios.json updated: ${scenariosFile}`)

    log(`\n=== Generation complete: "${plan.name}" ===`)
    broadcast(TOTAL, TOTAL, `"${plan.name}" is ready!`, 'complete')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause
      ? ` — cause: ${(err as NodeJS.ErrnoException).cause}`
      : ''
    logError(`at step ${step}/${TOTAL}`, err)
    broadcast(step, TOTAL, message + cause, 'error', message + cause)
  }
}
