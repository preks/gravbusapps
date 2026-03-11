/**
 * Hook that provides categorized expression suggestion items.
 * Builds suggestions from workflow context, step outputs, catalog data, etc.
 */

import { useMemo } from 'react'
import type { ExpressionSuggestionItem, ExpressionValueType } from './types/expressionTypes'

interface StepInfo {
  reference: string
  label: string
  fields?: Array<{ name: string; label?: string; dataType?: ExpressionValueType }>
  outputs?: Array<{ path: string; label?: string; dataType?: ExpressionValueType }>
}

interface UseExpressionSuggestionsOptions {
  /** Fields coming from the start trigger (manual form, webhook payload, etc.) */
  triggerFields?: Array<{
    id: string
    label: string
    path: string
    kind?: 'formData' | 'inputData' | 'inputValues'
    dataType?: ExpressionValueType
  }>
  /** Steps in the current flow */
  steps?: StepInfo[]
  /** Additional catalog fields */
  catalogFields?: Array<{ id: string; label: string; path: string }>
  /** Additional entity fields */
  entityFields?: Array<{ id: string; label: string; path: string }>
  /** Additional orgchart fields */
  orgchartFields?: Array<{ id: string; label: string; path: string }>
}

/** Standard workflow-level expressions available in every flow */
const WORKFLOW_SUGGESTIONS: ExpressionSuggestionItem[] = [
  {
    id: 'wf-initiator-id',
    label: 'Initiator ID',
    expression: '$workflow.initiator',
    source: 'workflow',
    description: 'User ID of the person who started the flow'
  },
  {
    id: 'wf-initiator-name',
    label: 'Initiator Name',
    expression: '$workflow.initiator.name',
    source: 'workflow',
    description: 'Display name of the person who started the flow'
  },
  {
    id: 'wf-initiator-display-name',
    label: 'Initiator Display Name',
    expression: '$workflow.initiatorDisplayName',
    source: 'workflow',
    description: 'Display name alias for the flow initiator'
  },
  {
    id: 'wf-name',
    label: 'Workflow Name',
    expression: '$workflow.name',
    source: 'workflow',
    description: 'Name of the current workflow instance'
  },
  {
    id: 'wf-id',
    label: 'Flow ID',
    expression: '$workflow.id',
    source: 'workflow',
    description: 'Unique identifier for this flow instance'
  },
  {
    id: 'wf-status',
    label: 'Workflow Status',
    expression: '$workflow.status',
    source: 'workflow',
    description: 'Current workflow execution status'
  },
  {
    id: 'wf-correlation-id',
    label: 'Correlation ID',
    expression: '$workflow.correlationId',
    source: 'workflow',
    description: 'Correlation ID of this workflow instance'
  }
]

function expressionToDisplayFallback(expression: string): string {
  const parts = String(expression || '').split('.')
  if (parts.length <= 2) return expression
  return `${parts[1]}.${parts[parts.length - 1]}`
}

function getExpressionAliases(expression: string): string[] {
  const expr = String(expression || '').trim()
  if (!expr) return []

  const aliases = new Set<string>([expr])

  const triggerInputValuesMatch = expr.match(/^\$workflow\.input\.inputValues\.(.+)$/)
  if (triggerInputValuesMatch) {
    const suffix = triggerInputValuesMatch[1]
    aliases.add(`$workflow.input.${suffix}`)
    aliases.add(`$workflow.input.formData.${suffix}`)
    aliases.add(`$workflow.input.inputData.${suffix}`)
  }

  const stepResultMatch = expr.match(/^\$steps\.([^.]+)\.resultData\.(.+)$/)
  if (stepResultMatch) {
    aliases.add(`$steps.${stepResultMatch[1]}.${stepResultMatch[2]}`)
  }

  return Array.from(aliases)
}

function buildSuggestionLabelLookup(items: ExpressionSuggestionItem[]): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const item of items) {
    const expression = String(item.expression || '').trim()
    const label = String(item.label || '').trim()
    if (!expression || !label) continue

    for (const alias of getExpressionAliases(expression)) {
      if (!lookup.has(alias)) lookup.set(alias, label)
    }
  }

  return lookup
}

function resolveEmbeddedExpressionLabels(text: string, lookup: Map<string, string>): string {
  const raw = String(text || '')
  if (!raw.includes('{{')) return raw

  return raw.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const normalizedExpression = String(expr || '').trim()
    if (!normalizedExpression) return match
    return lookup.get(normalizedExpression) || expressionToDisplayFallback(normalizedExpression)
  })
}

function buildStepSuggestions(steps: StepInfo[]): ExpressionSuggestionItem[] {
  const items: ExpressionSuggestionItem[] = []

  for (const step of steps) {
    // Add common step-level expressions
    items.push(
      {
        id: `step-${step.reference}-status`,
        label: `${step.label} - Status`,
        expression: `$steps.${step.reference}.status`,
        source: 'steps',
        description: `Execution status of "${step.label}"`
      },
      {
        id: `step-${step.reference}-completedBy`,
        label: `${step.label} - Completed By`,
        expression: `$steps.${step.reference}.completedBy`,
        source: 'steps',
        description: `Who completed "${step.label}"`
      },
      {
        id: `step-${step.reference}-comment`,
        label: `${step.label} - Comment`,
        expression: `$steps.${step.reference}.comment`,
        source: 'steps',
        dataType: 'string',
        description: `Comment entered when completing or rejecting "${step.label}"`
      }
    )

    // Add field-level expressions
    if (step.fields) {
      for (const field of step.fields) {
        const fieldName = String(field.name || '').trim()
        if (!fieldName) continue
        items.push({
          id: `step-${step.reference}-${fieldName}`,
          label: `${step.label} - ${field.label || fieldName}`,
          expression: `$steps.${step.reference}.formData.${fieldName}`,
          source: 'steps',
          dataType: field.dataType ?? 'unknown',
          description: `Field "${field.label || fieldName}" from "${step.label}"`
        })
      }
    }

    if (step.outputs) {
      for (const output of step.outputs) {
        const outputPath = String(output.path || '').trim()
        if (!outputPath) continue
        const outputSegments = outputPath.split('.').filter(Boolean)
        const label = String(output.label || '').trim() || outputSegments[outputSegments.length - 1] || outputPath
        items.push({
          id: `step-${step.reference}-result-${outputPath}`,
          label: `${step.label} - ${label}`,
          expression: `$steps.${step.reference}.resultData.${outputPath}`,
          source: 'steps',
          dataType: output.dataType ?? 'unknown',
          description: `Output "${outputPath}" from "${step.label}"`
        })
      }
    }
  }

  return items
}

function resolveSuggestionDisplayText(items: ExpressionSuggestionItem[]): ExpressionSuggestionItem[] {
  const lookup = buildSuggestionLabelLookup(items)

  return items.map(item => ({
    ...item,
    label: resolveEmbeddedExpressionLabels(item.label, lookup),
    ...(item.description ? { description: resolveEmbeddedExpressionLabels(item.description, lookup) } : {})
  }))
}

export function useExpressionSuggestions(options: UseExpressionSuggestionsOptions = {}): ExpressionSuggestionItem[] {
  const { triggerFields = [], steps = [], catalogFields = [], entityFields = [], orgchartFields = [] } = options

  return useMemo(() => {
    const items: ExpressionSuggestionItem[] = [...WORKFLOW_SUGGESTIONS]

    // Trigger-derived suggestions (start-node/manual form/webhook)
    for (const field of triggerFields) {
      const kind = field.kind ?? 'formData'
      items.push({
        id: `trigger-${field.id}`,
        label: field.label,
        expression: `$workflow.input.${kind}.${field.path}`,
        source: 'trigger',
        dataType: field.dataType ?? 'unknown',
        description: 'Trigger input'
      })
    }

    // Add step-derived suggestions
    items.push(...buildStepSuggestions(steps))

    // Add catalog suggestions
    for (const field of catalogFields) {
      items.push({
        id: `catalog-${field.id}`,
        label: field.label,
        expression: `$catalog.${field.path}`,
        source: 'catalog',
        description: `Catalog: ${field.label}`
      })
    }

    // Add entity suggestions
    for (const field of entityFields) {
      items.push({
        id: `entity-${field.id}`,
        label: field.label,
        expression: `$entity.${field.path}`,
        source: 'entity',
        description: `Entity: ${field.label}`
      })
    }

    // Add orgchart suggestions
    for (const field of orgchartFields) {
      items.push({
        id: `orgchart-${field.id}`,
        label: field.label,
        expression: `$orgchart.${field.path}`,
        source: 'orgchart',
        description: `Org Chart: ${field.label}`
      })
    }

    return resolveSuggestionDisplayText(items)
  }, [triggerFields, steps, catalogFields, entityFields, orgchartFields])
}
