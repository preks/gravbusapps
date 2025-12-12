/**
 * Template Comparison Type Definitions
 * For comparing templates between instances
 */

export type ComparisonStatus =
  | 'IDENTICAL' // Same version, same content
  | 'VERSION_DRIFT' // Different versions
  | 'CONTENT_DRIFT' // Same version, different content
  | 'NEW_IN_SOURCE' // Only in source
  | 'NEW_IN_TARGET' // Only in target
  | 'SOURCE_AHEAD' // Source has newer version
  | 'TARGET_AHEAD' // Target has newer version

export interface TemplateComparison {
  templateId: string
  name: string
  status: ComparisonStatus
  source: TemplateVersion | null
  target: TemplateVersion | null
  versionGap?: number
}

export interface TemplateVersion {
  version: number
  isDraft: boolean
  updatedAt: string
  contentHash: string
  tags?: Record<string, any>
}

export interface ComparisonSummary {
  totalTemplates: number
  sourceCount: number
  targetCount: number
  identical: number
  versionDrift: number
  contentDrift: number
  newInSource: number
  newInTarget: number
  sourceAhead: number
  targetAhead: number
}
