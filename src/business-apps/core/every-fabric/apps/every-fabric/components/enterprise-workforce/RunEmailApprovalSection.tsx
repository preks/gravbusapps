// Interactive compose_email approval for a Workforce run (same UX as chat).

import React, { useCallback, useState } from 'react'
import { EmailComposerBubble } from '../chat/EmailComposerBubble'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import type { ComposeEmailSubmission } from '../../types/enterpriseAgent'
import { findComposeEmailOutcomeInTrace } from '../../utils/composeEmailTrace'
import { getComposeEmailPending } from './workforceComposeEmail'
import type { WorkforceRun } from './workforceTypes'

export interface RunEmailApprovalSectionProps {
  run: WorkforceRun
  accessToken: string
  onRefreshAfterSubmit: () => Promise<void>
}

export const RunEmailApprovalSection: React.FC<RunEmailApprovalSectionProps> = ({
  run,
  accessToken,
  onRefreshAfterSubmit
}) => {
  const composePending = getComposeEmailPending(run.pending_structured_input)
  const { replyToInterrupt } = useEnterpriseAgentClient(accessToken)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const traceOutcome = findComposeEmailOutcomeInTrace(run.trace)

  const handleSubmit = useCallback(
    async (submission: ComposeEmailSubmission) => {
      if (!accessToken) {
        setSubmitError('Sign in required to send email.')
        return
      }
      setSubmitError(null)
      setIsSubmitting(true)
      try {
        await replyToInterrupt(run.session_id, undefined, submission as Record<string, unknown>)
        await onRefreshAfterSubmit()
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit email.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [accessToken, onRefreshAfterSubmit, replyToInterrupt, run]
  )

  if (!composePending) return null

  return (
    <section data-testid="workforce-run-detail-approval">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-amber-600 gba:dark:text-amber-400">
        Awaiting human approval
      </h3>
      <div className="gba:space-y-3 gba:rounded-lg gba:border gba:border-amber-500/40 gba:bg-amber-500/5 gba:px-3 gba:py-3">
        {run.pending_human_question && (
          <p className="gba:text-xs gba:font-medium gba:text-amber-900 gba:dark:text-amber-100">
            {run.pending_human_question}
          </p>
        )}
        <div data-testid="workforce-run-detail-email-composer">
          <EmailComposerBubble
            draft={composePending.draft}
            rationale={composePending.description}
            accessToken={accessToken}
            traceOutcome={traceOutcome}
            onSubmit={submission => {
              void handleSubmit(submission)
            }}
          />
        </div>
        {isSubmitting && (
          <p className="gba:text-[11px] gba:text-muted-foreground" data-testid="workforce-run-email-submitting">
            Submitting…
          </p>
        )}
        {submitError && (
          <div
            className="gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        )}
      </div>
    </section>
  )
}
