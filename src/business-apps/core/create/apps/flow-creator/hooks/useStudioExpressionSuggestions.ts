import { useMemo } from 'react'
import { InputType, type InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { useExpressionSuggestions } from '@/common/components/flow/expression-editor'
import type { ExpressionSuggestionItem, ExpressionValueType } from '@/common/components/flow/expression-editor'
import { useFlowStudioStore } from './useFlowStudioStore'

function labelForField(field: InputBlock): string {
  const label = String(field.label ?? '').trim()
  if (label) return label
  return String(field.name || '').trim() || 'Field'
}

/**
 * Build expression suggestions for Flow Studio:
 * - Trigger (start node form) suggestions -> `$workflow.input.formData.<field>`
 * - Step (task form fields) suggestions -> `$steps.step_N.formData.<field>`
 */
export function useStudioExpressionSuggestions(): ExpressionSuggestionItem[] {
  const nodes = useFlowStudioStore(s => s.nodes)

  const { triggerFields, steps } = useMemo(() => {
    const mapInputTypeToValueType = (type: InputType): ExpressionValueType => {
      switch (type) {
        case InputType.NUMBER:
          return 'number'
        case InputType.DATE:
          return 'date'
        case InputType.DATETIME:
          return 'datetime'
        case InputType.CHECKBOX:
          return 'boolean'
        case InputType.TEXT:
        case InputType.TEXTAREA:
        case InputType.SELECT:
        case InputType.MULTISELECT:
        case InputType.RADIO:
        case InputType.FILE:
        case InputType.SIGNATURE:
        default:
          return 'string'
      }
    }

    const triggerFields: Array<{
      id: string
      label: string
      path: string
      kind?: 'formData'
      dataType?: ExpressionValueType
    }> = []
    const steps: Array<{
      reference: string
      label: string
      fields?: Array<{ name: string; label?: string; dataType?: ExpressionValueType }>
    }> = []

    const startNode = nodes.find(n => n.type === 'start')
    const startConfig = startNode?.config?.nodeType === 'start' ? startNode.config : undefined
    const startFields = startConfig?.form ?? []

    for (let i = 0; i < startFields.length; i++) {
      const f = startFields[i]
      const name = String(f.name || '').trim()
      if (!name) continue
      triggerFields.push({
        id: `${name}-${i}`,
        label: `Trigger — ${labelForField(f)}`,
        path: name,
        kind: 'formData',
        dataType: mapInputTypeToValueType(f.type)
      })
    }

    const taskNodes = nodes.filter(n => n.type === 'task' && n.config?.nodeType === 'task')
    for (let i = 0; i < taskNodes.length; i++) {
      const task = taskNodes[i]!
      const cfg = task.config as any
      const fields = Array.isArray(cfg.form)
        ? (cfg.form as InputBlock[])
            .map(f => {
              const fieldName = String(f.name || '').trim()
              if (!fieldName) return null
              return {
                name: fieldName,
                label: String(f.label ?? '').trim() || undefined,
                dataType: mapInputTypeToValueType(f.type)
              }
            })
            .filter(Boolean)
        : []
      steps.push({
        reference: `step_${i}`,
        label: cfg.title || task.label || `Step ${i + 1}`,
        fields
      })
    }

    return { triggerFields, steps }
  }, [nodes])

  return useExpressionSuggestions({ triggerFields, steps })
}
