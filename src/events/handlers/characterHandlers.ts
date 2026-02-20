/**
 * Character Movement Event Handlers
 *
 * In village mode, character movement is handled by React via useEventSubscription.
 * This file provides sound effects for movement.
 */

import { eventBus } from '../EventBus'
import { soundManager } from '../../audio'
import type { PreToolUseEvent } from '../../../shared/types'
import { getStationForTool } from '../../../shared/types'

/**
 * Register character movement event handlers
 * In village mode, this only handles sound effects.
 * React's useEventSubscription handles actual character movement.
 */
export function registerCharacterHandlers(): void {
  // Play walking sound when tool starts (character will move)
  eventBus.on('pre_tool_use', (event: PreToolUseEvent, ctx) => {
    const station = getStationForTool(event.tool)

    // Play walking sound when moving to a new station
    if (station !== 'center' && ctx.soundEnabled) {
      soundManager.play('walking')
    }
  })
}
