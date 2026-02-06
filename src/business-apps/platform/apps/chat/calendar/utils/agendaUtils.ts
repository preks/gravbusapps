/**
 * Agenda utilities for calendar meetings
 * Separated to avoid circular dependency issues with barrel exports
 */

// Agenda item for meeting planning
export interface AgendaItem {
  id: string
  title: string
  duration?: number // minutes
  description?: string
  assigneeId?: string // optional - user ID of assigned participant
}

/**
 * Extract agenda items from meeting metadata
 * @param metadata - Meeting metadata object
 * @returns Array of agenda items, or empty array if none
 */
export const getAgendaFromMetadata = (metadata?: Record<string, any>): AgendaItem[] => {
  if (!metadata?.agenda || !Array.isArray(metadata.agenda)) {
    return []
  }
  return metadata.agenda as AgendaItem[]
}

/**
 * Calculate total duration of all agenda items
 * @param agenda - Array of agenda items
 * @returns Total duration in minutes
 */
export const getTotalAgendaDuration = (agenda: AgendaItem[]): number => {
  return agenda.reduce((total, item) => total + (item.duration || 0), 0)
}
