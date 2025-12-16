/**
 * Template Content Hashing Utility
 * Calculates content hash for templates to detect changes
 * Excludes version numbers and timestamps
 */

interface FlowTemplate {
  name: string
  description?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  steps: any[]
  tags?: Record<string, any>
  summaryFields?: any[]
  version?: number
  isDraft?: boolean
}

/**
 * Calculate content hash for a template
 * Excludes version, timestamps, and other metadata that don't affect template content
 */
export function calculateContentHash(template: FlowTemplate): string {
  const content = {
    name: template.name,
    description: template.description,
    type: template.type,
    steps: template.steps,
    tags: template.tags,
    summaryFields: template.summaryFields
  }

  // Use simple hash function that handles all UTF-8 characters safely
  // More reliable than btoa for international characters
  const jsonString = JSON.stringify(content)
  return simpleHash(jsonString)
}

/**
 * Simple hash function as fallback for UTF-8 strings
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
