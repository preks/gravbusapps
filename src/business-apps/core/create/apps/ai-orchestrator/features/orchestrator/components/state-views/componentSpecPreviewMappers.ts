/**
 * Pure mapping functions from orchestrator ComponentSpec sub-specs
 * to the props expected by the ai-builder preview components.
 */

import type { DataModelPreviewDefinition } from '@/common/components/ai-builder/data-model-preview/dataModelPreviewTypes'
import type { FunctionDefinition } from '@/common/components/ai-builder/function-preview/FunctionPreview'
import type {
  FlowPreviewTemplate,
  FlowPreviewStep,
  FlowPreviewTriggerType,
  FlowPreviewInputBlock
} from '@/common/components/ai-builder/flow-preview/flowPreviewTypes'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { DataModelSpec, FunctionSpec, FlowSpec, FlowStepSpec, AgentSpec } from '../../types/components'

const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'TEXT',
  number: 'NUMBER',
  date: 'DATE',
  datetime: 'DATETIME',
  boolean: 'CHECKBOX',
  checkbox: 'CHECKBOX', // Support both 'boolean' and 'checkbox'
  select: 'SELECT',
  // REFERENCE is kept distinct so the preview knows to skip it in GraphQL scalar queries
  reference: 'REFERENCE'
}

export function mapDataModelSpec(spec: DataModelSpec): DataModelPreviewDefinition {
  const mappedColumns = spec.fields.map(f => {
    // Convert type to lowercase for case-insensitive lookup
    const mappedType = FIELD_TYPE_MAP[f.type.toLowerCase()] ?? 'TEXT'

    // Handle options: can be strings or objects
    let mappedOptions: Array<{ value: string; label: string }> | undefined
    if (f.options && Array.isArray(f.options)) {
      mappedOptions = f.options.map((o: any) => {
        // If option is a string, use it for both value and label
        if (typeof o === 'string') {
          return { value: o, label: o }
        }
        // If option is an object with code/value, map them
        if (typeof o === 'object' && o !== null) {
          return { value: o.code || o.value, label: o.value || o.label || o.code }
        }
        // Fallback
        return { value: String(o), label: String(o) }
      })
    }

    return {
      name: f.name,
      label: f.label,
      type: mappedType,
      required: f.required,
      options: mappedOptions
    }
  })

  return {
    key: spec.identifier,
    namespace: spec.namespace,
    display_name: spec.name,
    description: spec.description,
    modelType: spec.modelType,
    columns: mappedColumns
  }
}

export function mapFunctionSpec(spec: FunctionSpec, effectiveId: string): FunctionDefinition {
  return {
    id: effectiveId,
    name: spec.name,
    description: spec.description ?? null,
    source: spec.sourceCode,
    inputSchema: spec.inputSchema,
    outputSchema: Object.keys(spec.outputSchema ?? {}).length > 0 ? spec.outputSchema : undefined,
    agentEnabled: spec.agentEnabled,
    workflowEnabled: spec.workflowEnabled
  }
}

function mapFlowStep(step: FlowStepSpec): FlowPreviewStep {
  return {
    title: step.title,
    type: step.type,
    message: step.message,
    dueInMinutes: step.dueInMinutes,
    form: step.form as FlowPreviewStep['form'],
    assignment: { targets: undefined, assignmentMode: step.assignmentMode }
  }
}

export function mapFlowSpec(spec: FlowSpec): FlowPreviewTemplate {
  const result: FlowPreviewTemplate = {
    type: spec.flowType ?? 'TEMPLATE',
    name: spec.name,
    description: spec.description,
    version: 1,
    steps: spec.steps.map(mapFlowStep)
  }
  const start = (
    spec as {
      start?: {
        triggers?: Array<{ id?: string; type: string; name: string; config?: Record<string, unknown> }>
        form?: FlowPreviewInputBlock[]
      }
    }
  ).start
  if (start != null && (start.triggers?.length || start.form?.length)) {
    result.start = {
      triggers: (start.triggers ?? []).map(t => ({
        id: t.id ?? t.type,
        type: t.type as FlowPreviewTriggerType,
        name: t.name ?? t.type,
        config: t.config ?? {}
      })),
      form: start.form
    }
  }
  return result
}

export function mapAgentSpec(spec: AgentSpec): PromptODM {
  return {
    name: spec.name,
    description: spec.description,
    agent_type: spec.agentType,
    system_content: spec.systemPrompt ? { template: spec.systemPrompt, parameters: [] } : null,
    user_content: { template: spec.userPromptTemplate ?? '', parameters: [] },
    tools: Array.isArray(spec.tools) ? spec.tools.join(',') : '',
    model: { id: spec.modelId ?? '', collection: '' },
    version: 1,
    workspace: { id: '', collection: '' },
    specialty: spec.specialty,
    response_style: spec.responseStyle,
    citation_mode: spec.citationMode,
    response_schema: spec.responseSchema ?? null,
    tags: Array.isArray(spec.tags) ? spec.tags : [],
    knowledge_sources: spec.knowledgeSources as PromptODM['knowledge_sources']
  }
}
