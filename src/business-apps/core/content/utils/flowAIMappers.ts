/**
 * Shared mapping utilities for converting AI-generated flow responses
 * into strongly-typed Flow Engine step structures.
 *
 * Used by GenerateFlowDialog and PolicyFlowsPanel.
 */
import {
  AssignmentMode,
  FlowStepType,
  type FlowStep,
  type InputBlock,
  InputType
} from '@/common/network/flows/FlowTemplateClient'

/** Map a loose string to a valid InputType, defaulting to TEXT. */
export const mapInputType = (value?: string | null): InputType => {
  const v = String(value || '').toUpperCase()
  return (InputType as any)[v] || InputType.TEXT
}

/** Map a loose string to a valid FlowStepType, defaulting to TASK. */
export const mapStepType = (value?: string | null): FlowStepType => {
  const v = String(value || '').toUpperCase()
  return (FlowStepType as any)[v] || FlowStepType.TASK
}

/** Map a loose string to a valid AssignmentMode, defaulting to CLAIM. */
export const mapAssignmentMode = (value?: string | null): AssignmentMode => {
  const v = String(value || '').toUpperCase()
  return (AssignmentMode as any)[v] || AssignmentMode.CLAIM
}

/** Convert an AI-generated template response into properly typed FlowStep[]. */
export const toFlowSteps = (aiTemplate: any): FlowStep[] => {
  const rawSteps: any[] = Array.isArray(aiTemplate?.steps) ? aiTemplate.steps : []
  return rawSteps.map((s, idx) => {
    const form: InputBlock[] | undefined = Array.isArray(s.inputs)
      ? s.inputs.map((i: any) => ({
          type: mapInputType(i.type),
          name: i.name || `input_${idx + 1}`,
          label: i.label || i.name || `Input ${idx + 1}`,
          required: Boolean(i.required),
          options: Array.isArray(i.options) ? i.options : undefined
        }))
      : undefined

    return {
      type: mapStepType(s.type),
      title: s.title || `Step ${idx + 1}`,
      message: s.message || undefined,
      form,
      links: Array.isArray(s.links) ? s.links : undefined,
      assignment: {
        targets: null,
        assignmentMode: mapAssignmentMode(s.assignmentMode),
        allowReassignment: true
      }
    }
  })
}

/** Build a standard AI prompt for generating a flow from a policy. */
export const buildPolicyFlowPrompt = (opts: {
  policyTitle?: string | null
  policyContent?: string | null
  policyRootId: string
  policyVersionId: string
}): string => {
  const title = opts.policyTitle || ''
  const content = opts.policyContent || ''
  return [
    'Create a flow template to operationalize the following policy.',
    '',
    'Requirements:',
    '- Keep it practical and actionable',
    '- Include clear steps with titles and messages',
    '- Use ACKNOWLEDGE step type when the policy requires explicit confirmation',
    '- Use CLAIM assignment mode for general inbox tasks (runtime assignment)',
    '',
    `Policy title: ${title}`,
    `Policy root id: ${opts.policyRootId}`,
    `Policy version id: ${opts.policyVersionId}`,
    '',
    'Policy content:',
    content
  ]
    .filter(Boolean)
    .join('\n')
}
