/**
 * AI Orchestrator app: always renders the plan detail flow (with IdleCanvas as the landing state).
 * The old OverviewPage is no longer used — the IdleCanvas serves as the entry point.
 */

import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PlanDetailPage } from './pages/plan-detail-page/PlanDetailPage'

const JOB_ID_PARAM = 'jobId'
const SESSION_ID_PARAM = 'sessionId'
const PROMPT_PARAM = 'prompt'

function getQueryParams(): { jobId: string | null; sessionId: string | null; initialPrompt: string | null } {
  if (typeof globalThis.window === 'undefined') {
    return { jobId: null, sessionId: null, initialPrompt: null }
  }
  const params = new URLSearchParams(globalThis.location.search)
  return {
    jobId: params.get(JOB_ID_PARAM),
    sessionId: params.get(SESSION_ID_PARAM),
    initialPrompt: params.get(PROMPT_PARAM)
  }
}

export const AIOrchestrator: React.FC<BusinessAppContextProps> = context => {
  // Capture URL params only on mount — replaceState during session must not re-trigger restore
  const [{ jobId, sessionId, initialPrompt }] = useState(() => getQueryParams())

  return (
    <div className="gba:h-full gba:w-full">
      <PlanDetailPage
        accessToken={context.accessToken ?? ''}
        userInfo={context.userInfo}
        jobId={jobId}
        sessionId={sessionId}
        initialPrompt={initialPrompt ?? undefined}
      />
    </div>
  )
}

export default AIOrchestrator
