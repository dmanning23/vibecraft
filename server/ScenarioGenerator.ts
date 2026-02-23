/**
 * ScenarioGenerator
 *
 * Generates a new scenario by:
 * 1. Calling ScenarioPlanner (OpenAI) to produce meta, locations, and agents
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
import { planMeta, planLocations, planAgents } from './ScenarioPlanner.js'

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
    const inputBlob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' })
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

const AGENT_NEGATIVE = 'BadDream, UnrealisticDream, multiple figures, blurry, low quality, watermark, cropped figure, cut off, partial figure, partial body, cut off feet'

function buildAgentPrompt(physicalDescription: string, stateSuffix: string): string {
    return `${physicalDescription}, (${stateSuffix}: 1.5) (full body shot: 1.2), full body shot from head to toe, entire figure visible, full length portrait, feet, black background`
}

// ============================================================================
// Main generation flow
// ============================================================================

/** State-specific prompt suffixes appended to the base agent portrait prompt */
const AGENT_STATE_SUFFIXES: Record<string, string> = {
    idle: 'standing natural',
    walking: 'running',
    working: 'focused, staring at hands, scowling',
    thinking: 'head in hands, confused',
    finished: 'triumphant, fist pump, cheering',
}

const AGENT_STATES = Object.keys(AGENT_STATE_SUFFIXES) as Array<keyof typeof AGENT_STATE_SUFFIXES>

export async function generateScenario(
    request: GenerationRequest,
    broadcast: ProgressBroadcast,
): Promise<void> {
    const { openaiKey, sdUrl, description } = request
    const publicDir = getPublicDir()
    const scenariosFile = join(publicDir, 'scenarios.json')

    // Steps: 3 planning + 1 background + 9 locations + (7 agents × 5 states) + 1 save = 49
    const TOTAL = 49
    let step = 0

    log(`=== Starting scenario generation ===`)
    log(`  sdUrl:       ${sdUrl}`)
    log(`  description: ${description}`)
    log(`  publicDir:   ${publicDir}`)

    try {
        // ── Steps 1–3: Planning (3 focused OpenAI calls) ──────────────────────────
        log(`\n── Step ${step + 1}/${TOTAL}: Planning scenario meta ──`)
        broadcast(++step, TOTAL, 'Planning scenario...', 'planning')
        const meta = await planMeta(openaiKey, description)

        log(`\n── Step ${step + 1}/${TOTAL}: Planning locations ──`)
        broadcast(++step, TOTAL, 'Planning locations...', 'planning')
        const locations = await planLocations(openaiKey, description, meta.name)

        log(`\n── Step ${step + 1}/${TOTAL}: Planning agents ──`)
        broadcast(++step, TOTAL, 'Planning agents...', 'planning')
        const agents = await planAgents(openaiKey, description, meta.name)

        // Ensure unique ID and set up directories
        const id = `${meta.id}_${randomUUID().slice(0, 8)}`
        const assetBase = join(publicDir, 'assets', 'generated', id)
        log(`Scenario id: ${id}`)
        log(`Asset base:  ${assetBase}`)

        mkdirSync(join(assetBase, 'scenario'), { recursive: true })
        mkdirSync(join(assetBase, 'locations'), { recursive: true })
        for (let i = 0; i < agents.length; i++) {
            mkdirSync(join(assetBase, 'agents', String(i)), { recursive: true })
        }

        const relBase = `assets/generated/${id}`

        // ── Step 4: Background ────────────────────────────────────────────────────
        log(`\n── Step ${step + 1}/${TOTAL}: Background ──`)
        broadcast(++step, TOTAL, 'Generating background...', 'generating')
        const bgImage = await generateImage(
            sdUrl,
            buildBackgroundPrompt(meta.backgroundPrompt),
            2048,
            1024,
            { negativePrompt: BACKGROUND_NEGATIVE, model: SHARED_MODEL, steps: 40, cfgScale: 7 },
        )
        const bgPath = join(assetBase, 'scenario', 'background.png')
        writeFileSync(bgPath, bgImage)
        log(`Background saved: ${bgPath}`)
        const backgroundRel = `${relBase}/scenario/background.png`

        // ── Steps 5–13: Locations (9) ─────────────────────────────────────────────
        const locationPaths: string[] = []
        for (let i = 0; i < locations.length; i++) {
            const loc = locations[i]
            log(`\n── Step ${step + 1}/${TOTAL}: Location ${i + 1}/${locations.length} — "${loc.name}" (${loc.stationType}) ──`)
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

        // ── Steps 14–48: Agents (7 × 5 states) ────────────────────────────────────
        const agentConfigs: Array<{ states: Record<string, string> }> = []
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i]
            log(`\n── Agent ${i + 1}/${agents.length}: "${agent.name}" ──`)
            log(`  physicalDescription: ${agent.physicalDescription}`)
            const states: Record<string, string> = {}
            for (const stateName of AGENT_STATES) {
                const statePrompt = buildAgentPrompt(agent.physicalDescription, AGENT_STATE_SUFFIXES[stateName])
                log(`\n── Step ${step + 1}/${TOTAL}: Agent "${agent.name}" — state: ${stateName} ──`)
                broadcast(++step, TOTAL, `Generating ${agent.name} (${stateName})...`, 'generating')
                const rawAgent = await generateImage(
                    sdUrl,
                    statePrompt,
                    832,
                    1344,
                    { negativePrompt: AGENT_NEGATIVE, model: AGENT_MODEL, steps: 50, cfgScale: 7 },
                )
                const img = await stripBackground(rawAgent)
                const imgPath = join(assetBase, 'agents', String(i), `${stateName}.png`)
                writeFileSync(imgPath, img)
                log(`Agent image saved: ${imgPath}`)
                states[stateName] = `${relBase}/agents/${i}/${stateName}.png`
            }
            agentConfigs.push({ states })
        }

        // ── Step 49: Save ──────────────────────────────────────────────────────────
        log(`\n── Step ${step + 1}/${TOTAL}: Saving scenarios.json ──`)
        broadcast(++step, TOTAL, 'Saving scenario...', 'saving')

        const newScenario = {
            id,
            name: meta.name,
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

        log(`\n=== Generation complete: "${meta.name}" ===`)
        broadcast(TOTAL, TOTAL, `"${meta.name}" is ready!`, 'complete')
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause
            ? ` — cause: ${(err as NodeJS.ErrnoException).cause}`
            : ''
        logError(`at step ${step}/${TOTAL}`, err)
        broadcast(step, TOTAL, message + cause, 'error', message + cause)
    }
}
