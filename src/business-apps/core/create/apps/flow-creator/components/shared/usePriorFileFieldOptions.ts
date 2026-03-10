import { useMemo } from 'react'
import { InputType, type InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { buildStepIndexByNodeId } from '../../utils/studioStepOrder'

export type PriorFileFieldOption = {
  /** Stable id for selects/keys */
  id: string
  /** Human label shown in dropdown */
  label: string
  /** Field label used as default link name */
  fieldLabel: string
  /** Expression inserted into link.url */
  expression: string
}

function safeLabelForField(field: InputBlock): string {
  const label = String(field.label || '').trim()
  if (label) return label
  const name = String(field.name || '').trim()
  return name || 'File'
}

function isFileField(field: InputBlock): boolean {
  return field?.type === InputType.FILE
}

/**
 * Build a list of FILE upload fields that occur before the current node in template order.
 * Includes start form FILE fields as a "Start" source.
 */
export function usePriorFileFieldOptions(currentNodeId: string): PriorFileFieldOption[] {
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)

  return useMemo(() => {
    const options: PriorFileFieldOption[] = []
    const stepIndexByNodeId = buildStepIndexByNodeId(nodes as any, edges as any)
    const currentStepIndex = stepIndexByNodeId.get(currentNodeId)

    // Start form FILE fields
    const startNode = nodes.find(n => n.type === 'start')
    const startForm = startNode?.config?.nodeType === 'start' ? (startNode.config.form ?? []) : []
    for (const f of startForm) {
      if (!f || !isFileField(f)) continue
      const name = String(f.name || '').trim()
      if (!name) continue
      const fieldLabel = safeLabelForField(f)
      options.push({
        id: `start:${name}`,
        label: `Start — ${fieldLabel}`,
        fieldLabel,
        expression: `{{$workflow.input.inputValues.${name}}}`
      })
    }

    // Prior task nodes FILE fields
    for (const n of nodes) {
      if (n.type !== 'task') continue
      if (n.id === currentNodeId) continue
      const idx = stepIndexByNodeId.get(n.id)
      if (typeof idx !== 'number') continue
      if (typeof currentStepIndex === 'number' && typeof idx === 'number' && idx >= currentStepIndex) continue

      const cfg: any = n.config
      const form = cfg?.nodeType === 'task' ? (cfg.form ?? []) : []
      if (!Array.isArray(form) || form.length === 0) continue

      for (const f of form) {
        if (!f || !isFileField(f)) continue
        const name = String(f.name || '').trim()
        if (!name) continue
        const fieldLabel = safeLabelForField(f)
        const stepLabel = String((cfg?.title || n.label || 'Step') as string).trim() || 'Step'
        const stepIndexText = `#${idx + 1}`
        options.push({
          id: `step:${n.id}:${name}`,
          label: `${stepLabel} ${stepIndexText} — ${fieldLabel}`.trim(),
          fieldLabel,
          expression: `{{$steps.step_${idx}.formData.${name}}}`
        })
      }
    }

    return options
  }, [currentNodeId, edges, nodes])
}
