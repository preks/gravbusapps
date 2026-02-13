/**
 * AI Orchestrator app: overview of plans and plan detail (orchestrator flow).
 * Route by query: no jobId = overview; jobId or plan=new = plan detail.
 */

import React, { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OverviewPage } from './pages/overview-page/OverviewPage'
import { PlanDetailPage } from './pages/plan-detail-page/PlanDetailPage'

const JOB_ID_PARAM = 'jobId'
const PLAN_NEW_PARAM = 'plan'
const PROMPT_PARAM = 'prompt'

function getQueryParams(): { jobId: string | null; planNew: boolean; initialPrompt: string | null } {
  if (typeof window === 'undefined') {
    return { jobId: null, planNew: false, initialPrompt: null }
  }
  const params = new URLSearchParams(window.location.search)
  const jobId = params.get(JOB_ID_PARAM)
  const planNew = params.get(PLAN_NEW_PARAM) === 'new'
  const initialPrompt = params.get(PROMPT_PARAM)
  return { jobId, planNew, initialPrompt }
}

export const AIOrchestrator: React.FC<BusinessAppContextProps> = context => {
  const { jobId, planNew, initialPrompt } = getQueryParams()

  const showPlanDetail = Boolean(jobId) || planNew

  const handleNewPlan = useCallback(() => {
    navigateTo(buildPlatformUrl(`/platform/create/ai-orchestrator?${PLAN_NEW_PARAM}=new`))
  }, [])

  const handleBackToOverview = useCallback(() => {
    navigateTo(buildPlatformUrl('/platform/create/ai-orchestrator'))
  }, [])

  const handleOpenPlan = useCallback((jobId: string) => {
    navigateTo(buildPlatformUrl(`/platform/create/ai-orchestrator?jobId=${encodeURIComponent(jobId)}`))
  }, [])

  if (showPlanDetail) {
    return (
      <PlanDetailPage
        accessToken={context.accessToken ?? ''}
        userInfo={context.userInfo}
        jobId={jobId}
        initialPrompt={initialPrompt ?? undefined}
        onBack={handleBackToOverview}
      />
    )
  }

  return <OverviewPage accessToken={context.accessToken ?? ''} onNewPlan={handleNewPlan} onOpenPlan={handleOpenPlan} />
}

export default AIOrchestrator
