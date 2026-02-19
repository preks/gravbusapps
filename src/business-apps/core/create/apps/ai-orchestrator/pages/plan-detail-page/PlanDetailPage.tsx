/**
 * Plan detail page: full orchestrator flow (idle → analyzing → review → building → complete/error).
 * When jobId is in the URL, the plan is loaded and the review state is shown.
 */

import React from 'react'
import { OrchestratorViewConversational } from '../../features/orchestrator/views'

export interface PlanDetailPageProps {
  accessToken: string
  userInfo?: any
  /** From URL query: open this plan (load and show review) */
  jobId: string | null
  initialPrompt?: string
  onBack: () => void
}

export const PlanDetailPage: React.FC<PlanDetailPageProps> = ({
  accessToken,
  userInfo,
  jobId,
  initialPrompt,
  onBack
}) => {
  return (
    <OrchestratorViewConversational
      accessToken={accessToken}
      userInfo={userInfo}
      initialPrompt={initialPrompt ?? ''}
      initialJobId={jobId ?? undefined}
      onBack={onBack}
      data-testid="ai-orchestrator-plan-detail"
    />
  )
}
