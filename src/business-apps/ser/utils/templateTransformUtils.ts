/**
 * Template Transformation Utilities
 *
 * Shared utilities for transforming workflow engine templates to FlowTemplate format.
 * Used by useFlowTemplates, useSharedFlowTemplates, and ServicePortal component.
 */

import { FlowTemplate, DynamicFormField } from '../types/flowTemplate'

/**
 * Transform workflow engine template to FlowTemplate with form schema extraction
 *
 * This function:
 * - Extracts form schema from step_0
 * - Calculates UI metadata (difficulty, estimated duration)
 * - Normalizes field options and validation rules
 *
 * @param engineTemplate - Raw template from workflow engine
 * @returns Transformed FlowTemplate object
 */
export const transformTemplate = (engineTemplate: any): FlowTemplate => {
  // Extract form schema and message from step_0 if it exists
  const step0 = engineTemplate.steps?.[0]
  let formSchema: DynamicFormField[] | undefined
  let step0Message: string | undefined

  if (step0) {
    // Extract message from step 0
    if (step0.message) {
      step0Message = step0.message
    }

    // Extract form schema
    if (step0.form && Array.isArray(step0.form)) {
      formSchema = step0.form.map(
        (field: any): DynamicFormField => ({
          type: field.type || 'TEXT',
          name: field.name || '',
          label: field.label || field.name || '',
          required: field.required || false,
          placeholder: field.placeholder,
          description: field.description,
          dataSource: field.dataSource,
          options: field.options?.map((opt: any) => ({
            value: opt.value || opt,
            label: opt.label || opt.value || opt
          })),
          validation: field.validation || (field.required ? [{ type: 'required' as const }] : undefined)
        })
      )
    }
  }

  // Calculate UI metadata
  const stepCount = engineTemplate.steps?.length || 0
  const estimatedDuration = `${Math.max(1, Math.floor(stepCount * 0.5))}-${stepCount * 1} days`

  let difficulty: 'simple' | 'standard' | 'complex' = 'standard'
  if (stepCount <= 2) difficulty = 'simple'
  else if (stepCount >= 5) difficulty = 'complex'

  return {
    id: engineTemplate.id,
    type: 'TEMPLATE',
    name: engineTemplate.name || 'Untitled Template',
    description: engineTemplate.description || '',
    version: engineTemplate.version || 1,
    steps: engineTemplate.steps || [],
    formSchema,
    step0Message,
    tags: engineTemplate.tags,
    estimatedDuration,
    stepCount,
    metadata: {
      difficulty,
      estimatedTime: estimatedDuration
    }
  }
}
