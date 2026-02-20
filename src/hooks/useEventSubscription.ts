/**
 * useEventSubscription Hook
 *
 * Connects React components to the EventBus.
 * Handles subscription/unsubscription on mount/unmount.
 */

import { useEffect, useCallback } from 'react'
import { eventBus, type EventType, type EventHandler } from '../events/EventBus'
import { useVillage, villageActions, type SubagentState } from '../state/VillageContext'
import { getLocationForTool, type VillageLocationType } from '../config/locations'
import type { PreToolUseEvent, PostToolUseEvent, StopEvent, ClaudeEvent } from '@shared/types'

/**
 * Subscribe to EventBus events and update village state
 */
export function useEventSubscription() {
  const { dispatch } = useVillage()

  useEffect(() => {
    // Handle pre_tool_use - move character to location
    const unsubPreTool = eventBus.on('pre_tool_use', (event: PreToolUseEvent) => {
      const location = getLocationForTool(event.tool)

      // Move character to the tool's location
      dispatch(villageActions.moveToLocation(location))
      dispatch(villageActions.setCharacterState('working', event.tool))
      dispatch(villageActions.setSession(event.sessionId))

      // Handle Task tool - spawn subagent
      if (event.tool === 'Task') {
        const input = event.toolInput as { description?: string; subagent_type?: string }
        const subagent: SubagentState = {
          id: event.toolUseId,
          toolUseId: event.toolUseId,
          description: input.description || 'Subagent',
          location: 'town_hall',
          state: 'working',
        }
        dispatch(villageActions.spawnSubagent(subagent))
      }
    })

    // Handle post_tool_use - update state after tool completes
    const unsubPostTool = eventBus.on('post_tool_use', (event: PostToolUseEvent) => {
      // Clear working state (but don't move to idle yet)
      dispatch(villageActions.setCharacterState('thinking'))

      // Handle Task tool completion - remove subagent
      if (event.tool === 'Task') {
        dispatch(villageActions.removeSubagent(event.toolUseId))
      }
    })

    // Handle stop - return to village square
    const unsubStop = eventBus.on('stop', (event: StopEvent) => {
      dispatch(villageActions.moveToLocation('square'))
      dispatch(villageActions.setCharacterState('idle'))
    })

    // Handle user prompt - set thinking state
    const unsubPrompt = eventBus.on('user_prompt_submit', () => {
      dispatch(villageActions.setCharacterState('thinking'))
    })

    return () => {
      unsubPreTool()
      unsubPostTool()
      unsubStop()
      unsubPrompt()
    }
  }, [dispatch])
}

/**
 * Subscribe to a specific event type
 */
export function useEventHandler<T extends EventType>(
  type: T,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
) {
  const memoizedHandler = useCallback(handler, deps)

  useEffect(() => {
    const unsubscribe = eventBus.on(type, memoizedHandler)
    return unsubscribe
  }, [type, memoizedHandler])
}
