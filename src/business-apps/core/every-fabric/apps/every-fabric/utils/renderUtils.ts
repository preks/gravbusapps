export type ResultRendererType = 'table' | 'chart' | 'markdown' | 'json' | 'text' | 'expert_output'

/**
 * Detects the best renderer for a tool result value.
 */
export function detectRendererType(result: unknown): ResultRendererType {
  if (result === null || result === undefined) return 'text'

  if (Array.isArray(result)) {
    if (result.length === 0) return 'text'
    const first = result[0]
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      // Check if it looks like a time-series / chart dataset
      const keys = Object.keys(first)
      const hasNumericValue = keys.some(k => typeof (first as Record<string, unknown>)[k] === 'number')
      const hasLabelKey = keys.some(k => ['label', 'name', 'date', 'time', 'period'].includes(k.toLowerCase()))
      if (hasNumericValue && hasLabelKey) return 'chart'
      return 'table'
    }
    return 'text'
  }

  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>
    if ('labels' in obj && 'values' in obj) return 'chart'
    return 'json'
  }

  if (typeof result === 'string') {
    const trimmed = result.trimStart()
    if (trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('|') || trimmed.includes('\n\n'))
      return 'markdown'
    return 'text'
  }

  return 'text'
}

/** Tool category → colour class for badge styling */
export function toolCategoryColor(toolName: string): string {
  if (toolName.startsWith('graphql_')) return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('call_function') || toolName === 'newwork.functions')
    return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('trigger_flow') || toolName === 'newwork.flow') return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('call_expert') || toolName === 'expert.' || toolName === 'newwork.expert')
    return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('knowledge_') || toolName === 'newwork.knowledge') return 'gba:bg-muted gba:text-foreground'
  if (toolName === 'write_todos') return 'gba:bg-muted gba:text-muted-foreground'
  if (toolName === 'save_memory' || toolName === 'search_memory') return 'gba:bg-muted gba:text-foreground'
  if (toolName === 'task') return 'gba:bg-muted gba:text-foreground'
  return 'gba:bg-muted gba:text-muted-foreground'
}

/** Format milliseconds as a human-readable duration string */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/** Format relative time from ISO string */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
