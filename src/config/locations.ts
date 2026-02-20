/**
 * Village Location Configuration
 *
 * Maps Claude tools to village building locations.
 * Each location has a position, name, and visual style.
 */

import type { ToolName, StationType } from '@shared/types'

// ============================================================================
// Village Location Types
// ============================================================================

export type VillageLocationType =
  | 'library'        // Read
  | 'cottage'        // Write
  | 'workshop'       // Edit
  | 'terminal'       // Bash
  | 'observatory'    // Grep/Glob
  | 'signal_tower'   // WebFetch/WebSearch
  | 'town_hall'      // Task
  | 'notice_board'   // TodoWrite
  | 'square'         // Idle/center

export interface VillageLocation {
  id: VillageLocationType
  name: string
  description: string
  /** Position in the village grid (percentage from left/top) */
  position: {
    x: number  // 0-100 (percentage)
    y: number  // 0-100 (percentage)
  }
  /** Size of the building */
  size: {
    width: number   // pixels at 1x scale
    height: number  // pixels at 1x scale
  }
  /** Color theme for this location */
  color: string
  /** Icon/emoji for this location */
  icon: string
  /** Asset filename */
  asset: string
}

// ============================================================================
// Location Definitions
// ============================================================================

export const VILLAGE_LOCATIONS: Record<VillageLocationType, VillageLocation> = {
  library: {
    id: 'library',
    name: 'The Library',
    description: 'Where Claude reads files',
    position: { x: 15, y: 25 },
    size: { width: 120, height: 140 },
    color: '#8B4513',  // Saddle brown
    icon: '📚',
    asset: 'library.png',
  },
  cottage: {
    id: 'cottage',
    name: "Writer's Cottage",
    description: 'Where Claude writes new files',
    position: { x: 35, y: 20 },
    size: { width: 100, height: 120 },
    color: '#DEB887',  // Burlywood
    icon: '🏠',
    asset: 'cottage.png',
  },
  workshop: {
    id: 'workshop',
    name: 'The Workshop',
    description: 'Where Claude edits files',
    position: { x: 85, y: 25 },
    size: { width: 130, height: 140 },
    color: '#CD853F',  // Peru
    icon: '🔧',
    asset: 'workshop.png',
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal Tower',
    description: 'Where Claude runs commands',
    position: { x: 10, y: 60 },
    size: { width: 100, height: 160 },
    color: '#2F4F4F',  // Dark slate gray
    icon: '💻',
    asset: 'terminal.png',
  },
  observatory: {
    id: 'observatory',
    name: 'The Observatory',
    description: 'Where Claude searches files',
    position: { x: 65, y: 15 },
    size: { width: 110, height: 150 },
    color: '#4682B4',  // Steel blue
    icon: '🔭',
    asset: 'observatory.png',
  },
  signal_tower: {
    id: 'signal_tower',
    name: 'Signal Tower',
    description: 'Where Claude fetches from the web',
    position: { x: 90, y: 55 },
    size: { width: 80, height: 180 },
    color: '#6A5ACD',  // Slate blue
    icon: '📡',
    asset: 'antenna.png',
  },
  town_hall: {
    id: 'town_hall',
    name: 'Town Hall',
    description: 'Where Claude spawns subagents',
    position: { x: 50, y: 50 },
    size: { width: 150, height: 160 },
    color: '#DAA520',  // Goldenrod
    icon: '🏛️',
    asset: 'townhall.png',
  },
  notice_board: {
    id: 'notice_board',
    name: 'Notice Board',
    description: 'Where Claude manages tasks',
    position: { x: 30, y: 70 },
    size: { width: 80, height: 100 },
    color: '#8FBC8F',  // Dark sea green
    icon: '📋',
    asset: 'noticeboard.png',
  },
  square: {
    id: 'square',
    name: 'Village Square',
    description: 'Where Claude idles',
    position: { x: 50, y: 75 },
    size: { width: 200, height: 100 },
    color: '#F5DEB3',  // Wheat
    icon: '🏘️',
    asset: 'square.png',
  },
}

// ============================================================================
// Tool to Location Mapping
// ============================================================================

/** Map from StationType (3D) to VillageLocationType (2D) */
export const STATION_TO_LOCATION: Record<StationType, VillageLocationType> = {
  bookshelf: 'library',
  desk: 'cottage',
  workbench: 'workshop',
  terminal: 'terminal',
  scanner: 'observatory',
  antenna: 'signal_tower',
  portal: 'town_hall',
  taskboard: 'notice_board',
  center: 'square',
}

/** Map tool name directly to village location */
export const TOOL_TO_LOCATION: Record<string, VillageLocationType> = {
  Read: 'library',
  Write: 'cottage',
  Edit: 'workshop',
  Bash: 'terminal',
  Grep: 'observatory',
  Glob: 'observatory',
  WebFetch: 'signal_tower',
  WebSearch: 'signal_tower',
  Task: 'town_hall',
  TodoWrite: 'notice_board',
  AskUserQuestion: 'square',
  NotebookEdit: 'cottage',
}

/** Get location for a tool */
export function getLocationForTool(tool: string): VillageLocationType {
  return TOOL_TO_LOCATION[tool] ?? 'square'
}

/** Get location data for a tool */
export function getLocationDataForTool(tool: string): VillageLocation {
  const locationId = getLocationForTool(tool)
  return VILLAGE_LOCATIONS[locationId]
}

// ============================================================================
// Location Utilities
// ============================================================================

/** Get all locations as an array */
export function getAllLocations(): VillageLocation[] {
  return Object.values(VILLAGE_LOCATIONS)
}

/** Get location by ID */
export function getLocationById(id: VillageLocationType): VillageLocation {
  return VILLAGE_LOCATIONS[id]
}

/** Calculate pixel position for a location given container dimensions */
export function getLocationPixelPosition(
  location: VillageLocation,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: (location.position.x / 100) * containerWidth,
    y: (location.position.y / 100) * containerHeight,
  }
}
