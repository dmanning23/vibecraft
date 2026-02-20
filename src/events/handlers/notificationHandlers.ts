/**
 * Zone Notification Event Handlers
 *
 * In village mode, notifications are handled by React components.
 * This file is kept for compatibility but does nothing.
 */

/**
 * Register notification-related event handlers
 * (Placeholder for village mode - notifications handled by React)
 */
export function registerNotificationHandlers(): void {
  // In village mode, notifications are handled by React components
  // via the VillageContext state and ActivityFeed component.
  // This handler is a no-op placeholder.
}

// Format helpers (used by React components)

export function formatFileChange(
  fileName: string,
  { added, removed, lines }: { added?: number; removed?: number; lines?: number }
): string {
  let result = fileName
  if (lines !== undefined) {
    result += ` (${lines} lines)`
  } else if (added !== undefined || removed !== undefined) {
    const parts: string[] = []
    if (added && added > 0) parts.push(`+${added}`)
    if (removed && removed > 0) parts.push(`-${removed}`)
    if (parts.length > 0) result += ` ${parts.join(', ')}`
  }
  return result
}

export function formatCommandResult(command: string): string {
  const firstLine = command.split('\n')[0]
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
}

export function formatSearchResult(pattern: string, matchCount?: number): string {
  let result = pattern.length > 30 ? pattern.slice(0, 30) + '...' : pattern
  if (matchCount !== undefined) {
    result += ` (${matchCount} matches)`
  }
  return result
}
