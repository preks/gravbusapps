/**
 * Comparison Engine Service
 * Compares templates between instances to detect differences
 */

import { TemplateComparison, ComparisonStatus, ComparisonSummary } from '../types/comparison'
import { calculateContentHash } from '../utils/templateHash'

interface FlowTemplate {
  id?: string
  name: string
  description?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  steps: any[]
  version: number
  tags?: Record<string, any>
  summaryFields?: any[]
  isDraft?: boolean
  updatedAt?: string
}

export const comparisonEngine = {
  /**
   * Compare two template lists
   */
  compareTemplateLists(sourceTemplates: FlowTemplate[], targetTemplates: FlowTemplate[]): TemplateComparison[] {
    const sourceMap = new Map(sourceTemplates.map(t => [t.id || t.name, t]))
    const targetMap = new Map(targetTemplates.map(t => [t.id || t.name, t]))

    const allTemplateIds = new Set([...sourceMap.keys(), ...targetMap.keys()])
    const comparisons: TemplateComparison[] = []

    for (const templateId of allTemplateIds) {
      const source = sourceMap.get(templateId)
      const target = targetMap.get(templateId)

      comparisons.push(this.compareTemplate(templateId, source, target))
    }

    return comparisons.sort((a, b) => a.name.localeCompare(b.name))
  },

  /**
   * Compare a single template
   */
  compareTemplate(
    templateId: string,
    source: FlowTemplate | undefined,
    target: FlowTemplate | undefined
  ): TemplateComparison {
    // Only in source
    if (source && !target) {
      return {
        templateId,
        name: source.name,
        status: 'NEW_IN_SOURCE',
        source: {
          version: source.version,
          isDraft: source.isDraft || false,
          updatedAt: source.updatedAt || new Date().toISOString(),
          contentHash: calculateContentHash(source)
        },
        target: null
      }
    }

    // Only in target
    if (!source && target) {
      return {
        templateId,
        name: target.name,
        status: 'NEW_IN_TARGET',
        source: null,
        target: {
          version: target.version,
          isDraft: target.isDraft || false,
          updatedAt: target.updatedAt || new Date().toISOString(),
          contentHash: calculateContentHash(target)
        }
      }
    }

    // Both exist - compare versions and content
    if (source && target) {
      const sourceHash = calculateContentHash(source)
      const targetHash = calculateContentHash(target)

      let status: ComparisonStatus
      let versionGap: number | undefined

      if (source.version === target.version) {
        status = sourceHash === targetHash ? 'IDENTICAL' : 'CONTENT_DRIFT'
      } else if (source.version > target.version) {
        status = 'SOURCE_AHEAD'
        versionGap = source.version - target.version
      } else {
        status = 'TARGET_AHEAD'
        versionGap = target.version - source.version
      }

      // If versions differ but content is same, it's version drift
      if (status === 'SOURCE_AHEAD' || status === 'TARGET_AHEAD') {
        if (sourceHash === targetHash) {
          status = 'VERSION_DRIFT'
        }
      }

      return {
        templateId,
        name: source.name,
        status,
        source: {
          version: source.version,
          isDraft: source.isDraft || false,
          updatedAt: source.updatedAt || new Date().toISOString(),
          contentHash: sourceHash
        },
        target: {
          version: target.version,
          isDraft: target.isDraft || false,
          updatedAt: target.updatedAt || new Date().toISOString(),
          contentHash: targetHash
        },
        versionGap
      }
    }

    // Should never reach here
    throw new Error('Invalid comparison state')
  },

  /**
   * Generate summary statistics
   */
  generateSummary(comparisons: TemplateComparison[]): ComparisonSummary {
    return {
      totalTemplates: comparisons.length,
      identical: comparisons.filter(c => c.status === 'IDENTICAL').length,
      versionDrift: comparisons.filter(c => c.status === 'VERSION_DRIFT').length,
      contentDrift: comparisons.filter(c => c.status === 'CONTENT_DRIFT').length,
      newInSource: comparisons.filter(c => c.status === 'NEW_IN_SOURCE').length,
      newInTarget: comparisons.filter(c => c.status === 'NEW_IN_TARGET').length,
      sourceAhead: comparisons.filter(c => c.status === 'SOURCE_AHEAD').length,
      targetAhead: comparisons.filter(c => c.status === 'TARGET_AHEAD').length
    }
  }
}
