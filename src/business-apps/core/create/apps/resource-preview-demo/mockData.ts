import type { FlowPreviewTemplate, FlowPreviewStep } from '@/common/components/ai-builder/flow-preview'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { FunctionDefinition } from '@/common/components/ai-builder/function-preview'
import type { DataModelPreviewDefinition } from '@/common/components/ai-builder/data-model-preview'
import type { ComponentSpec } from '../ai-orchestrator/features/orchestrator/types'

export interface DemoMockResult {
  flow?: FlowPreviewTemplate
  agent?: { prompt: PromptODM; paramKeys: string[] }
  function?: FunctionDefinition
  data_model?: DataModelPreviewDefinition
}

function flowStepFromSpec(step: {
  type: string
  title: string
  message?: string
  assignmentMode?: string
  dueInMinutes?: number
  branches?: { condition: string; nextStep: number }[]
  defaultNextStep?: number | null
  nextStep?: number | null
}): FlowPreviewStep {
  const base: FlowPreviewStep = {
    type: (step.type as FlowPreviewStep['type']) ?? 'TASK',
    title: step.title,
    message: step.message,
    dueInMinutes: step.dueInMinutes,
    assignment: step.assignmentMode ? { targets: null, assignmentMode: step.assignmentMode } : undefined,
    nextStep: step.nextStep ?? (step.branches ? null : undefined),
    branches: step.branches,
    defaultNextStep: step.defaultNextStep
  }
  return base
}

function extractParamKeysFromTemplate(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g)
  return matches ? [...new Set(matches.map(m => m.slice(1, -1)))] : ['query']
}

function fieldTypeLabel(t: string): string {
  const map: Record<string, string> = {
    text: 'TEXT',
    number: 'NUMBER',
    date: 'DATE',
    boolean: 'CHECKBOX',
    select: 'SELECT'
  }
  return map[t] ?? 'TEXT'
}

/**
 * Build demo mock for common ai-builder previews from a ComponentSpec.
 */
export function buildMockForComponent(component: ComponentSpec): DemoMockResult | null {
  const id = component.createdId || component.existingId || component.id
  if (component.type === 'flow' && component.flowSpec) {
    const spec = component.flowSpec
    const steps = (spec.steps ?? []).map(s => flowStepFromSpec(s as Parameters<typeof flowStepFromSpec>[0]))
    const triggers = spec.triggers?.length
      ? spec.triggers.map(t => ({ id: t.id, type: t.type, name: t.name, config: t.config ?? {} }))
      : [{ id: 'manual', type: 'MANUAL_FORM' as const, name: 'Manual', config: {} }]
    const template: FlowPreviewTemplate = {
      name: spec.name,
      description: spec.description,
      type: (spec.flowType as 'TEMPLATE' | 'SELF_SERVICE') ?? 'TEMPLATE',
      version: 1,
      steps,
      start: { triggers }
    }
    return { flow: template }
  }
  if (component.type === 'agent' && component.agentSpec) {
    const spec = component.agentSpec
    const paramKeys = extractParamKeysFromTemplate(spec.userPromptTemplate)
    const prompt: PromptODM = {
      name: spec.name,
      description: spec.description,
      user_content: { template: spec.userPromptTemplate, parameters: paramKeys },
      system_content: spec.systemPrompt ? { template: spec.systemPrompt, parameters: [] } : null,
      model: { id: spec.modelId ?? '', collection: 'models' },
      version: 1,
      workspace: { id: 'mock', collection: 'workspaces' },
      specialty: spec.specialty,
      response_style: spec.responseStyle,
      citation_mode: spec.citationMode,
      agent_type: spec.agentType,
      response_schema: spec.responseSchema ?? null
    }
    return { agent: { prompt, paramKeys } }
  }
  if (component.type === 'function' && component.functionSpec) {
    const spec = component.functionSpec
    const props =
      (spec.inputSchema &&
        typeof spec.inputSchema === 'object' &&
        (spec.inputSchema as { properties?: Record<string, unknown> }).properties) ??
      {}
    const inputSchema = { type: 'object' as const, properties: props }
    return {
      function: {
        id: id ?? 'mock-fn',
        name: spec.name,
        description: spec.description ?? null,
        source: spec.sourceCode ?? '',
        inputSchema,
        outputSchema:
          spec.outputSchema && typeof spec.outputSchema === 'object'
            ? (spec.outputSchema as Record<string, unknown>)
            : undefined,
        agentEnabled: spec.agentEnabled,
        workflowEnabled: spec.workflowEnabled
      }
    }
  }
  if (component.type === 'data_model' && component.dataModelSpec) {
    const spec = component.dataModelSpec
    const columns = (spec.fields ?? []).map(f => ({
      name: f.name,
      label: f.label,
      type: fieldTypeLabel(f.type),
      required: f.required,
      options: (f as { options?: { value: string; label: string }[] }).options
    }))
    const definition: DataModelPreviewDefinition = {
      key: spec.identifier ?? spec.name.toLowerCase().replace(/\s+/g, '_'),
      namespace: spec.namespace ?? 'default',
      display_name: spec.name,
      description: spec.description,
      columns
    }
    return { data_model: definition }
  }
  return null
}
