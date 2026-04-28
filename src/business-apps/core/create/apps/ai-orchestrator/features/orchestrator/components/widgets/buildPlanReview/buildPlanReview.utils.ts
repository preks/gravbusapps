/**
 * Utility functions and constants for BuildPlanReview
 */

import { Monitor, Bot, Code2, Workflow, Database, type LucideIcon } from 'lucide-react'
import type { ComponentType, BuildPlan } from '../../../types'

// Icon mapping for component types
export const typeIcons: Record<ComponentType, LucideIcon> = {
  screen: Monitor,
  agent: Bot,
  function: Code2,
  flow: Workflow,
  data_model: Database
}

// Labels for component types — `agent` value resolved via translation when consumer provides `t`.
export const typeLabels: Record<ComponentType, string> = {
  screen: 'Screen',
  agent: 'Agent',
  function: 'Function',
  flow: 'Flow',
  data_model: 'Data Model'
}

/**
 * Build labels with translated `agent` (Enterprise Agent rename).
 * Other labels remain untranslated as pre-existing pattern.
 */
export const buildTypeLabels = (t: (key: string) => string): Record<ComponentType, string> => ({
  ...typeLabels,
  agent: t('type-label-agent')
})

/**
 * Get component description (user-friendly if available)
 */
export const getComponentDescription = (comp: BuildPlan['components'][0]): string => {
  return comp.userFriendlyDescription || comp.description
}

/**
 * Group components by type
 */
export const groupComponentsByType = (
  components: BuildPlan['components']
): Record<ComponentType, BuildPlan['components']> => {
  return components.reduce(
    (acc, comp) => {
      if (!acc[comp.type]) acc[comp.type] = []
      acc[comp.type].push(comp)
      return acc
    },
    {} as Record<ComponentType, BuildPlan['components']>
  )
}
