/**
 * Utility functions for service requests
 */

/**
 * Format technical template/flow names into readable titles
 * Converts "flow_request_new_hardware" -> "Request New Hardware"
 * Converts "employee-onboarding" -> "Employee Onboarding"
 */
export function formatRequestTitle(name: string): string {
  if (!name) return 'Service Request'

  // Remove common prefixes
  let formatted = name
    .replace(/^flow_/, '')
    .replace(/^request_/, '')
    .replace(/^service_/, '')

  // Replace underscores and hyphens with spaces
  formatted = formatted.replace(/[_-]/g, ' ')

  // Capitalize each word
  formatted = formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return formatted || 'Service Request'
}

/**
 * Extract category from template ID
 */
export function extractCategoryFromTemplate(templateId: string): string {
  const categoryMapping: Record<string, string> = {
    'employee-onboarding': 'hr',
    'employee-offboarding': 'hr',
    onboarding: 'hr',
    offboarding: 'hr',
    hardware: 'it',
    software: 'it',
    access: 'security',
    travel: 'travel',
    working: 'hr',
    time: 'hr',
    leave: 'hr',
    absence: 'hr'
  }

  const lowerTemplateId = (templateId || '').toLowerCase()
  for (const [keyword, category] of Object.entries(categoryMapping)) {
    if (lowerTemplateId.includes(keyword)) {
      return category
    }
  }

  return 'general'
}

/**
 * Map Conductor task/step status to our standard status
 * Handles both task statuses and step statuses from flow.steps
 */
export function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    // Task statuses
    SCHEDULED: 'QUEUED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    TIMED_OUT: 'FAILED',
    CANCELED: 'REJECTED',
    SKIPPED: 'COMPLETED',

    // Step statuses (from flow.steps)
    PENDING: 'QUEUED',
    AVAILABLE: 'QUEUED',
    CLAIMED: 'IN_PROGRESS',
    DONE: 'COMPLETED'
  }
  return statusMap[status] || status
}

/**
 * Map Conductor workflow status to our standard status
 */
export function mapFlowStatus(status: string): 'open' | 'in_progress' | 'completed' | 'canceled' {
  const statusMap: Record<string, 'open' | 'in_progress' | 'completed' | 'canceled'> = {
    RUNNING: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'canceled',
    TIMED_OUT: 'canceled',
    TERMINATED: 'canceled',
    PAUSED: 'open'
  }
  return statusMap[status] || 'open'
}
