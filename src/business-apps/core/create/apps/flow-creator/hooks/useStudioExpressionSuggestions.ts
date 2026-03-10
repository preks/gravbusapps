import { useMemo } from 'react'
import { FlowStepType, InputType, type InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { useExpressionSuggestions } from '@/common/components/flow/expression-editor'
import type { ExpressionSuggestionItem, ExpressionValueType } from '@/common/components/flow/expression-editor'
import { useFlowStudioStore } from './useFlowStudioStore'
import { buildStepIndexByNodeId } from '../utils/studioStepOrder'
import { collectJsonSchemaPaths } from '../components/config-panels/decision/decisionConfigUtils'

function labelForField(field: InputBlock): string {
  const label = String(field.label ?? '').trim()
  if (label) return label
  return String(field.name || '').trim() || 'Field'
}

function getObjectProperty(node: any, key: string): any {
  if (node?.type === 'object' && node?.properties && typeof node.properties === 'object') {
    return node.properties[key]
  }
  return undefined
}

function getSchemaNodeAtPath(root: any, path: string): any {
  if (!root || typeof root !== 'object') return null
  const raw = String(path || '').trim()
  if (!raw) return root

  const parts = raw.split('.').filter(Boolean)
  let cur: any = root
  for (const part0 of parts) {
    if (!cur || typeof cur !== 'object') return null
    const part = String(part0)

    if (part.endsWith('[]')) {
      const key = part.slice(0, -2)
      if (key) cur = getObjectProperty(cur, key)
      cur = cur?.items
      continue
    }

    cur = getObjectProperty(cur, part)
  }

  return cur
}

function inferSchemaValueType(node: any): ExpressionValueType {
  const type = String(node?.type || '').trim()
  const format = String(node?.format || '').trim()
  if (type === 'boolean') return 'boolean'
  if (type === 'number' || type === 'integer') return 'number'
  if (type === 'string') {
    if (format === 'date') return 'date'
    if (format === 'date-time' || format === 'datetime') return 'datetime'
    return 'string'
  }
  return 'unknown'
}

/**
 * Build expression suggestions for Flow Studio:
 * - Trigger (start node form) suggestions -> `$workflow.input.inputValues.<field>`
 * - Step (task form fields) suggestions -> `$steps.step_N.formData.<field>`
 */
export function useStudioExpressionSuggestions(): ExpressionSuggestionItem[] {
  // Subscribe to nodes/edges separately so we don't re-render on unrelated store updates
  // (Zustand compares selector return values by reference).
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)

  const { triggerFields, steps, catalogFields, entityFields, orgchartFields } = useMemo(() => {
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
      kind?: 'inputValues'
      dataType?: ExpressionValueType
    }> = []
    const steps: Array<{
      reference: string
      label: string
      fields?: Array<{ name: string; label?: string; dataType?: ExpressionValueType }>
      outputs?: Array<{ path: string; label?: string; dataType?: ExpressionValueType }>
    }> = []
    const catalogFields: Array<{ id: string; label: string; path: string }> = []
    const entityFields: Array<{ id: string; label: string; path: string }> = []
    const orgchartFields: Array<{ id: string; label: string; path: string }> = []

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
        kind: 'inputValues',
        dataType: mapInputTypeToValueType(f.type)
      })
    }

    const stepIndexByNodeId = buildStepIndexByNodeId(nodes, edges)
    const taskNodes = nodes.filter(n => n.type === 'task' && n.config?.nodeType === 'task')
    for (const task of taskNodes) {
      const cfg = task.config as any
      const stepIndex = stepIndexByNodeId.get(task.id)
      if (typeof stepIndex !== 'number' || Number.isNaN(stepIndex)) continue
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
      const outputSchema =
        cfg.stepType === FlowStepType.FUNCTION
          ? cfg.functionConfig?.outputSchema
          : cfg.stepType === FlowStepType.AI_AGENT || cfg.stepType === FlowStepType.AI_TASK_EXPERT
            ? cfg.agentConfig?.outputSchema
            : null
      const outputs = collectJsonSchemaPaths(outputSchema).map(path => {
        const outputSegments = path.split('.').filter(Boolean)
        return {
          path,
          label: outputSegments[outputSegments.length - 1] || path,
          dataType: inferSchemaValueType(getSchemaNodeAtPath(outputSchema, path))
        }
      })
      steps.push({
        reference: `step_${stepIndex}`,
        label: cfg.title || task.label || `Step ${stepIndex + 1}`,
        fields,
        outputs
      })
    }

    // -------------------------------------------------------------------------------------------------
    // Data sources (Catalog / Entity / Org chart)
    // These are used by the Flow Context Browser ("Data sources" tab) to insert expressions.
    // -------------------------------------------------------------------------------------------------

    const findLikelyIdField = (all: InputBlock[], matcher: (name: string, f: InputBlock) => boolean): string | null => {
      for (const f of all) {
        const name = String(f?.name || '').trim()
        if (!name) continue
        if (matcher(name.toLowerCase(), f)) return name
      }
      return null
    }

    const employeeIdField =
      findLikelyIdField(startFields, (n, f) => {
        const entity = String((f as any)?.dataSource?.entity || '').toLowerCase()
        if (entity.includes('employee')) return true
        return n.includes('employee') && n.includes('id')
      }) || null

    // Org chart (safe defaults)
    const orgchartBase = [
      { id: 'mgr', label: 'Initiator → Manager (User ID)', path: 'managerByUserId[$workflow.initiator]' },
      { id: 'mgr-name', label: 'Initiator → Manager name', path: 'managerByUserId[$workflow.initiator].name' },
      { id: 'mgr-email', label: 'Initiator → Manager email', path: 'managerByUserId[$workflow.initiator].email' },
      {
        id: 'sk',
        label: 'Initiator → Skip-level manager (User ID)',
        path: 'skipLevelManagerByUserId[$workflow.initiator]'
      },
      {
        id: 'sk-name',
        label: 'Initiator → Skip-level manager name',
        path: 'skipLevelManagerByUserId[$workflow.initiator].name'
      },
      {
        id: 'sk-email',
        label: 'Initiator → Skip-level manager email',
        path: 'skipLevelManagerByUserId[$workflow.initiator].email'
      },
      { id: 'dr', label: 'Initiator → Direct reports (User IDs)', path: 'directReportsByUserId[$workflow.initiator]' }
    ]
    for (const f of orgchartBase) orgchartFields.push(f)

    if (employeeIdField) {
      orgchartFields.push(
        {
          id: `userIdByEmployeeId-${employeeIdField}`,
          label: `Convert employeeId → userId (Trigger: ${employeeIdField})`,
          path: `userIdByEmployeeId[$workflow.input.inputValues.${employeeIdField}]`
        },
        {
          id: `managerByEmployeeId-${employeeIdField}`,
          label: `Employee → Manager (User ID) (Trigger: ${employeeIdField})`,
          path: `manager[$workflow.input.inputValues.${employeeIdField}]`
        }
      )
    }

    // Catalog / Entity expressions are now inserted via the Flow Context Browser "Data sources" tree.
    // Keep the suggestion list free of placeholder-based templates (e.g. ID_HERE).

    return { triggerFields, steps, catalogFields, entityFields, orgchartFields }
  }, [edges, nodes])

  return useExpressionSuggestions({ triggerFields, steps, catalogFields, entityFields, orgchartFields })
}
