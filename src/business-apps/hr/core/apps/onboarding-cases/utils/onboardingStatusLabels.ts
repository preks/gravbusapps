export enum OnboardingFlowStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Failed = 'FAILED'
}

const flowStatusTranslationKeys: Record<OnboardingFlowStatus, string> = {
  [OnboardingFlowStatus.Pending]: 'hr-onboarding-flow-status-pending',
  [OnboardingFlowStatus.InProgress]: 'hr-onboarding-flow-status-in-progress',
  [OnboardingFlowStatus.Completed]: 'hr-onboarding-flow-status-completed',
  [OnboardingFlowStatus.Failed]: 'hr-onboarding-flow-status-failed'
}

const flowStatusAliases: Record<string, OnboardingFlowStatus> = {
  PENDING: OnboardingFlowStatus.Pending,
  IN_PROGRESS: OnboardingFlowStatus.InProgress,
  COMPLETED: OnboardingFlowStatus.Completed,
  FAILED: OnboardingFlowStatus.Failed
}

const normalizeBackendStatus = (status: string | undefined) =>
  String(status || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

const formatBackendStatusFallback = (status: string | undefined) => {
  const value = String(status || '-')
    .replace(/_/g, ' ')
    .toLowerCase()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export const formatOnboardingFlowStatusLabel = (status: string | undefined, t: (key: string) => string) => {
  const mappedStatus = flowStatusAliases[normalizeBackendStatus(status)]
  if (!mappedStatus) return formatBackendStatusFallback(status)

  return t(flowStatusTranslationKeys[mappedStatus])
}
