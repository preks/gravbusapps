/**
 * Pure mapping functions from orchestrator ComponentSpec sub-specs
 * to the props expected by the ai-builder preview components.
 */

import type { DataModelPreviewDefinition } from '@/common/components/ai-builder/data-model-preview/dataModelPreviewTypes'
import type { FunctionDefinition } from '@/common/components/ai-builder/function-preview/FunctionPreview'
import type { FlowPreviewTemplate, FlowPreviewStep } from '@/common/components/ai-builder/flow-preview/flowPreviewTypes'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { DataModelSpec, FunctionSpec, FlowSpec, FlowStepSpec, AgentSpec } from '../../types/components'

const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'TEXT',
  number: 'NUMBER',
  date: 'DATE',
  boolean: 'CHECKBOX',
  select: 'SELECT',
  // REFERENCE is kept distinct so the preview knows to skip it in GraphQL scalar queries
  reference: 'REFERENCE'
}

export function mapDataModelSpec(spec: DataModelSpec): DataModelPreviewDefinition {
  return {
    key: spec.identifier,
    namespace: spec.namespace,
    display_name: spec.name,
    description: spec.description,
    modelType: spec.modelType,
    columns: spec.fields.map(f => ({
      name: f.name,
      label: f.label,
      type: FIELD_TYPE_MAP[f.type] ?? 'TEXT',
      required: f.required,
      options: f.options?.map(o => ({ value: o.value, label: o.label }))
    }))
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
  return {
    type: spec.flowType ?? 'TEMPLATE',
    name: spec.name,
    description: spec.description,
    version: 1,
    steps: spec.steps.map(mapFlowStep)
  }
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
