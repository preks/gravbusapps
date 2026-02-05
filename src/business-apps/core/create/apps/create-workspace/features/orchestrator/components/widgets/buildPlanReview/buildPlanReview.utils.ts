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

// Labels for component types
export const typeLabels: Record<ComponentType, string> = {
  screen: 'Screen',
  agent: 'AI Task Expert',
  function: 'Function',
  flow: 'Flow',
  data_model: 'Data Model'
}

/**
 * Get component description (user-friendly if available)
 */
export const getComponentDescription = (comp: BuildPlan['components'][0]): string => {
  return comp.user_friendly_description || comp.description
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
