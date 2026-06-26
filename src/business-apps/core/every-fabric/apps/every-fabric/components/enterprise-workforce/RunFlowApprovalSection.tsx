// Interactive Approve/Reject for a flow-engine human APPROVAL task waiting on a
// workflow the run triggered (the Enpal MEDIUM "Human Approval of Proposed
// Patch" step). Same surface as the email-compose approval, but the interrupt
// lives in the Flow Engine: the proposed patch is the preceding step's captured
// data (read-only) and the decision is submitted via the task complete/reject
// API, auto-claiming first when the task is in CLAIM mode.

import { Button, Textarea, useTranslation } from '@newwork/nw-design-system'
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'

import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import translations from '../../_i18n'
import { FlowStepResult } from './flow-detail/FlowStepResult'
import { useFlowStepResult } from './flow-detail/useFlowStepResult'
import { useFlowTaskApproval } from './flow-detail/useFlowTaskApproval'
import { useRunFlowApprovals, type RunFlowApproval } from './flow-detail/runFlowApprovals'
import type { WorkforceRun } from './workforceTypes'

export interface RunFlowApprovalSectionProps {
  run: WorkforceRun
  accessToken: string
  onRefreshAfterSubmit: () => Promise<void>
}

interface FlowApprovalCardProps {
  approval: RunFlowApproval
  accessToken: string
  onResolved: () => Promise<void>
}

const FlowApprovalCard: React.FC<FlowApprovalCardProps> = ({ approval, accessToken, onResolved }) => {
  const { t } = useTranslation(translations)
  const { step, flowId, flowName, prevStepReference } = approval
  const taskId = step.taskId ?? step.taskBusinessId ?? ''
  const approvalStepReference = `step_${step.stepIndex}`

  const { getUserProfileBrief } = useEnterpriseAgentClient(accessToken)
  const { approve, reject } = useFlowTaskApproval(accessToken)
  const stepResult = useFlowStepResult({
    workflowId: flowId,
    stepReference: prevStepReference,
    accessToken,
    enabled: Boolean(prevStepReference)
  })
  const approvalStepConfig = useFlowStepResult({
    workflowId: flowId,
    stepReference: approvalStepReference,
    accessToken,
    enabled: Boolean(prevStepReference)
  })

  const [comment, setComment] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getUserProfileBrief()
      .then(profile => {
        if (!cancelled) setUserId(profile.user_id)
      })
      .catch(() => {
        if (!cancelled) setUserId(null)
      })
    return () => {
      cancelled = true
    }
  }, [getUserProfileBrief])

  const submit = useCallback(
    async (decision: 'approve' | 'reject') => {
      if (!taskId) {
        setError(t('approval-flow-missing-task-id'))
        return
      }
      if (!userId) {
        setError(t('approval-flow-missing-user'))
        return
      }
      setError(null)
      setIsSubmitting(true)
      try {
        const target = {
          taskId,
          userId,
          assignmentMode: step.assignmentMode,
          assignmentStatus: step.assignmentStatus,
          assignedUserId: step.assignedUserId,
          comment: comment.trim() || undefined
        }
        if (decision === 'approve') {
          await approve(target)
        } else {
          await reject(target)
        }
        await onResolved()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('approval-flow-submit-fail'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [approve, reject, comment, onResolved, step, t, taskId, userId]
  )

  const actionsDisabled = isSubmitting || !userId

  return (
    <div
      className="gba:space-y-3 gba:rounded-lg gba:border gba:border-amber-500/40 gba:bg-amber-500/5 gba:px-3 gba:py-3"
      data-testid="flow-approval-card"
    >
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-amber-900 gba:dark:text-amber-100">{step.title}</span>
        <span className="gba:text-[11px] gba:text-amber-700 gba:dark:text-amber-200">{flowName}</span>
      </div>

      {prevStepReference && (
        <div className="gba:rounded-md gba:border gba:border-amber-500/30 gba:bg-background gba:px-3 gba:py-2">
          <FlowStepResult
            data={stepResult.data}
            isLoading={stepResult.isLoading || approvalStepConfig.isLoading}
            error={stepResult.error}
            accessToken={accessToken}
            emptyLabel={t('approval-flow-empty-proposal')}
            resultDisplayOverride={approvalStepConfig.data?.resultDisplay}
          />
        </div>
      )}

      <Textarea
        value={comment}
        onChange={event => setComment(event.target.value)}
        placeholder={t('approval-comment-placeholder')}
        rows={2}
        data-testid="flow-approval-comment"
      />

      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Button onClick={() => void submit('approve')} disabled={actionsDisabled} data-testid="flow-approval-approve">
          <CheckCircleIcon className="gba:size-4" />
          {t('approval-approve')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => void submit('reject')}
          disabled={actionsDisabled}
          data-testid="flow-approval-reject"
        >
          <XCircleIcon className="gba:size-4" />
          {t('approval-reject')}
        </Button>
        {isSubmitting && (
          <span className="gba:text-[11px] gba:text-muted-foreground" data-testid="flow-approval-submitting">
            {t('approval-submitting')}
          </span>
        )}
      </div>

      {error && (
        <div
          className="gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  )
}

export interface RunFlowApprovalViewProps {
  approvals: RunFlowApproval[]
  accessToken: string
  onResolved: () => Promise<void>
}

/**
 * Presentational list of waiting flow approvals. Kept separate from the polling
 * container so surfaces that already detect approvals (e.g. the Digital
 * Workplace dialog, which needs to know whether any are pending to hide its
 * "done" state) can render the same UI without a second poller.
 */
export const RunFlowApprovalView: React.FC<RunFlowApprovalViewProps> = ({ approvals, accessToken, onResolved }) => {
  const { t } = useTranslation(translations)

  if (approvals.length === 0) return null

  return (
    <section data-testid="workforce-run-detail-flow-approval">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-amber-600 gba:dark:text-amber-400">
        {t('approval-awaiting-title')}
      </h3>
      <div className="gba:space-y-3">
        {approvals.map(approval => (
          <FlowApprovalCard
            key={`${approval.flowId}:${approval.step.stepIndex}`}
            approval={approval}
            accessToken={accessToken}
            onResolved={onResolved}
          />
        ))}
      </div>
    </section>
  )
}

export const RunFlowApprovalSection: React.FC<RunFlowApprovalSectionProps> = ({
  run,
  accessToken,
  onRefreshAfterSubmit
}) => {
  const { approvals, refresh } = useRunFlowApprovals(run, accessToken)

  const onResolved = useCallback(async () => {
    await onRefreshAfterSubmit()
    await refresh()
  }, [onRefreshAfterSubmit, refresh])

  return <RunFlowApprovalView approvals={approvals} accessToken={accessToken} onResolved={onResolved} />
}
