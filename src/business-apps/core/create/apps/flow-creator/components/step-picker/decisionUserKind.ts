import type { DecisionNodeConfig } from '../../types/studioTypes'
import type { StepKindInsertPayload } from './stepKindTypes'

export function isApprovalUserDecision(config: DecisionNodeConfig): boolean {
  return config.decisionMode === 'USER' && config.userConfig?.userDecisionType === 'APPROVAL'
}

export function userDecisionBranchLabels(
  preset: Extract<StepKindInsertPayload, { nodeType: 'decision' }>['userDecisionPreset']
): [string, string] {
  return preset === 'CUSTOM' ? ['Option 1', 'Option 2'] : ['Approve', 'Reject']
}
