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

  // Use btoa to create base64 encoded hash
  // In production, consider using a proper hashing library like crypto-js
  return btoa(JSON.stringify(content))
}
