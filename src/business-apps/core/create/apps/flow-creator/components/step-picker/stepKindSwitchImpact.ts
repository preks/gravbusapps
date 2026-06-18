import type { StepKindId } from './stepKindTypes'

export type StepKindSwitchConfirmLevel = 'none' | 'soft' | 'destructive'

const USER_TASK_KINDS = new Set<StepKindId>(['user-task', 'information', 'acknowledge'])

const USER_DECISION_KINDS = new Set<StepKindId>(['approval', 'decision-user'])

const DECISION_KINDS = new Set<StepKindId>(['approval', 'decision-user', 'decision-ai', 'decision-logic'])

const AUTOMATION_TASK_KINDS = new Set<StepKindId>(['function', 'connector', 'ai-agent', 'ai-task-expert'])

export function isUserTaskKind(kindId: StepKindId): boolean {
  return USER_TASK_KINDS.has(kindId)
}

export function isDecisionKind(kindId: StepKindId): boolean {
  return DECISION_KINDS.has(kindId)
}

export function isAutomationTaskKind(kindId: StepKindId): boolean {
  return AUTOMATION_TASK_KINDS.has(kindId)
}

/** Function and connector are separate step kinds; do not cross-switch on change. */
export function isFunctionConnectorCrossSwitch(from: StepKindId, to: StepKindId): boolean {
  return (from === 'function' && to === 'connector') || (from === 'connector' && to === 'function')
}

export function isStepKindChangeAllowed(from: StepKindId | undefined, to: StepKindId): boolean {
  if (!from) return true
  if (from === to) return true
  if (isFunctionConnectorCrossSwitch(from, to)) return false
  return true
}

export function getStepKindSwitchConfirmLevel(
  from: StepKindId | undefined,
  to: StepKindId
): StepKindSwitchConfirmLevel {
  if (!from || from === to) return 'none'
  if (!isStepKindChangeAllowed(from, to)) return 'none'
  if (isUserTaskKind(from) && isUserTaskKind(to)) return 'soft'
  if (USER_DECISION_KINDS.has(from) && USER_DECISION_KINDS.has(to)) return 'soft'
  return 'destructive'
}
