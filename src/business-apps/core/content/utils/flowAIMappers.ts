/**
 * Policy-to-workflow helpers for Every AI integration.
 */
import { openEveryAI } from '@/common/utils/openEveryAI'

/** Markdown chip linking to a content entry by UUID. */
export const buildContentEntryChip = (displayName: string, contentEntryId: string): string => {
  const label = displayName.trim() || 'Policy document'
  return `[${label}](content_entry://${contentEntryId})`
}

/** Build the visible Every AI prompt for creating a flow from a policy. */
export const buildPolicyFlowEveryAIPrompt = (opts: {
  policyTitle?: string | null
  policyRootId: string
  policyVersionId: string
}): string => {
  const chip = buildContentEntryChip(opts.policyTitle || 'Policy document', opts.policyVersionId)
  return `Create a new workflow template for ${chip}. Read this policy and turn it into a clear, practical workflow people can follow.`
}

/** Build the Every AI prompt for refreshing an outdated policy-linked flow. */
export const buildPolicyFlowUpdateEveryAIPrompt = (opts: {
  policyTitle?: string | null
  policyRootId: string
  policyVersionId: string
  existingTemplate: {
    id?: string | null
    name?: string | null
    description?: string | null
    tags?: Record<string, string | undefined> | null
    steps?: unknown
  }
}): string => {
  const chip = buildContentEntryChip(opts.policyTitle || 'Policy document', opts.policyVersionId)
  const existingName = opts.existingTemplate.name?.trim() || 'the linked workflow'
  return `Create a new workflow template for ${chip}. Update "${existingName}" so it matches the current version of this policy.`
}

/** Open Every AI in a fresh chat with a policy-to-flow prompt. */
export const openPolicyFlowInEveryAI = (opts: {
  policyTitle?: string | null
  policyRootId: string
  policyVersionId: string
  mode?: 'create' | 'update'
  existingTemplate?: {
    id?: string | null
    name?: string | null
    description?: string | null
    tags?: Record<string, string | undefined> | null
    steps?: unknown
  }
}): void => {
  const prompt =
    opts.mode === 'update' && opts.existingTemplate
      ? buildPolicyFlowUpdateEveryAIPrompt({
          policyTitle: opts.policyTitle,
          policyRootId: opts.policyRootId,
          policyVersionId: opts.policyVersionId,
          existingTemplate: opts.existingTemplate
        })
      : buildPolicyFlowEveryAIPrompt({
          policyTitle: opts.policyTitle,
          policyRootId: opts.policyRootId,
          policyVersionId: opts.policyVersionId
        })

  openEveryAI({
    prompt,
    newSession: true,
    skills: ['Flows', 'WorkflowManagement']
  })
}
