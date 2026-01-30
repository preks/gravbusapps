/**
 * Case Management Helper Functions
 */

import { Case, CaseStatus, LinkedFlow } from '../types'
import { TERMINAL_FLOW_STATES } from './constants'

/**
 * Check if a flow is in a terminal state
 */
export const isFlowTerminal = (flow: LinkedFlow | null | undefined): boolean => {
  if (!flow || !flow.status) return false
  return TERMINAL_FLOW_STATES.includes(flow.status)
}

/**
 * Check if a case can be completed
 * All active (non-removed) flows must be in terminal state
 */
export const canCompleteCase = (caseData: Case): boolean => {
  const activeFlows = caseData.state.linkedFlows.filter(flow => !flow.removedAt)

  if (activeFlows.length === 0) {
    return true // No flows to block completion
  }

  return activeFlows.every(isFlowTerminal)
}

/**
 * Get blocking flows (non-terminal active flows)
 */
export const getBlockingFlows = (caseData: Case): LinkedFlow[] => {
  return caseData.state.linkedFlows.filter(flow => !flow.removedAt && !isFlowTerminal(flow))
}

/**
 * Format case ID for display
 * Shows as "CASE-xxxxxxxx" where xxxxxxxx is the last 8 characters of the UUID
 */
export const formatCaseId = (caseId: string): string => {
  if (!caseId) return 'CASE-????????'

  // Get last 8 characters (without dashes if UUID)
  const cleanId = caseId.replace(/-/g, '')
  const lastEight = cleanId.slice(-8).toUpperCase()

  return `CASE-${lastEight}`
}

/**
 * Get status color for badge
 */
export const getStatusColor = (status: CaseStatus): string => {
  const statusMap: Record<CaseStatus, string> = {
    open: 'blue',
    in_progress: 'yellow',
    blocked: 'red',
    completed: 'green',
    cancelled: 'gray'
  }
  return statusMap[status] || 'gray'
}

/**
 * Format date for display
 */
export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`

  return formatDate(d)
}

/**
 * Calculate average completion time in hours
 */
export const calculateAverageCompletionTime = (cases: Case[]): number => {
  const completedCases = cases.filter(c => c.state.metadata?.status === 'completed')

  if (completedCases.length === 0) return 0

  const totalTime = completedCases.reduce((sum, c) => {
    const created = new Date(c.createdAt).getTime()
    const updated = new Date(c.updatedAt).getTime()
    return sum + (updated - created)
  }, 0)

  const avgMs = totalTime / completedCases.length
  return Math.round(avgMs / (1000 * 60 * 60)) // Convert to hours
}

/**
 * Get case priority badge color
 */
export const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
  const colorMap = {
    low: 'gray',
    medium: 'blue',
    high: 'red'
  }
  return colorMap[priority] || 'gray'
}

/**
 * Sort cases by various criteria
 */
export const sortCases = (
  cases: Case[],
  sortBy: 'created' | 'updated' | 'status' | 'priority',
  direction: 'asc' | 'desc' = 'desc'
): Case[] => {
  const sorted = [...cases].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'status':
        comparison = (a.state.metadata?.status || '').localeCompare(b.state.metadata?.status || '')
        break
      case 'priority':
        const priorityOrder = { low: 1, medium: 2, high: 3 }
        const aPriority = priorityOrder[a.state.metadata?.priority || 'low']
        const bPriority = priorityOrder[b.state.metadata?.priority || 'low']
        comparison = aPriority - bPriority
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Filter cases by search term
 */
export const filterCasesBySearch = (cases: Case[], searchTerm: string): Case[] => {
  if (!searchTerm.trim()) return cases

  const term = searchTerm.toLowerCase()

  return cases.filter(c => {
    const title = c.state.metadata?.title?.toLowerCase() || ''
    const description = c.state.metadata?.description?.toLowerCase() || ''
    const caseId = c.caseId.toLowerCase()

    return title.includes(term) || description.includes(term) || caseId.includes(term)
  })
}
