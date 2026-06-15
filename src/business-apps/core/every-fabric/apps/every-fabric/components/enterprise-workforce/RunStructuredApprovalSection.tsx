// Interactive structured-input / tool-permission HITL approval for a Workforce
// run (same UX as Every Fabric chat). Mirrors RunEmailApprovalSection but for
// the generic `ask_human_structured` forms (with optional preview block) and
// `tool_permission_request` cards, so MEDIUM-risk proposals can be reviewed and
// approved/edited/rejected directly in the run detail and the digital workplace.

import React, { useCallback, useState } from 'react'

import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { StructuredInputForm } from '../renderers/StructuredInputForm'
import { ToolPermissionRequest } from '../renderers/ToolPermissionRequest'
import { getStructuredInputPending } from './workforceStructuredInput'
import type { WorkforceRun } from './workforceTypes'

export interface RunStructuredApprovalSectionProps {
  run: WorkforceRun
  accessToken: string
  onRefreshAfterSubmit: () => Promise<void>
}

export const RunStructuredApprovalSection: React.FC<RunStructuredApprovalSectionProps> = ({
  run,
  accessToken,
  onRefreshAfterSubmit
}) => {
  const pending = getStructuredInputPending(run.pending_structured_input)
  const { replyToInterrupt } = useEnterpriseAgentClient(accessToken)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitPayload = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!accessToken) {
        setSubmitError('Sign in required to respond.')
        return
      }
      setSubmitError(null)
      setIsSubmitting(true)
      try {
        await replyToInterrupt(run.session_id, undefined, payload)
        await onRefreshAfterSubmit()
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit your response.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [accessToken, onRefreshAfterSubmit, replyToInterrupt, run.session_id]
  )

  if (!pending) return null

  const isToolPermission = pending.form_id === 'tool_permission_request'

  return (
    <section data-testid="workforce-run-detail-structured-approval">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-amber-600 gba:dark:text-amber-400">
        Awaiting human approval
      </h3>
      <div className="gba:space-y-3">
        {isToolPermission ? (
          <ToolPermissionRequest
            request={pending}
            accessToken={accessToken}
            onSubmit={payload => void submitPayload(payload)}
          />
        ) : (
          <StructuredInputForm
            formId={pending.form_id}
            title={pending.title}
            description={pending.description}
            fields={pending.fields}
            allowPartialSubmit={pending.allow_partial_submit}
            accessToken={accessToken}
            toolRef={pending.tool_ref}
            requestStatus={pending.request_status}
            preview={pending.preview}
            onSubmit={(values, aiDelegated) => {
              const payload = aiDelegated.length > 0 ? { ...values, _ai_should_fill: aiDelegated } : values
              void submitPayload(payload)
            }}
            onCancel={pending.tool_ref ? () => void submitPayload({ action: 'cancel' }) : undefined}
          />
        )}
        {isSubmitting && (
          <p className="gba:text-[11px] gba:text-muted-foreground" data-testid="workforce-run-structured-submitting">
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
