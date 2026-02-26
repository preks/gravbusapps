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
    id: 'wf-initiator-name',
    label: 'Initiator Name',
    expression: '$workflow.initiator.name',
    source: 'workflow',
    description: 'Name of the person who started the flow'
  },
  {
    id: 'wf-initiator-email',
    label: 'Initiator Email',
    expression: '$workflow.initiator.email',
    source: 'workflow',
    description: 'Email of the person who started the flow'
  },
  {
    id: 'wf-initiator-id',
    label: 'Initiator ID',
    expression: '$workflow.initiator.id',
    source: 'workflow',
    description: 'User ID of the flow initiator'
  },
  {
    id: 'wf-started-at',
    label: 'Started At',
    expression: '$workflow.startedAt',
    source: 'workflow',
    description: 'Timestamp when the flow was started'
  },
  {
    id: 'wf-flow-id',
    label: 'Flow ID',
    expression: '$workflow.flowId',
    source: 'workflow',
    description: 'Unique identifier for this flow instance'
  },
  {
    id: 'wf-template-id',
    label: 'Template ID',
    expression: '$workflow.templateId',
    source: 'workflow',
    description: 'Template identifier for this flow'
  }
]

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
  }

  return items
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

    return items
  }, [triggerFields, steps, catalogFields, entityFields, orgchartFields])
}
