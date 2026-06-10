import React, { useCallback, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
  Textarea
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, CheckCircleIcon, RobotIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useEnterpriseAgentClient } from '@/business-apps/core/every-fabric/apps/every-fabric/hooks/useEnterpriseAgentClient'
import { RunEmailApprovalSection } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/RunEmailApprovalSection'
import { RunMarkdown } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/RunMarkdown'
import { getComposeEmailPending } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceComposeEmail'
import { runStatusVisual } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/runDisplay'
import {
  extractDraftBody,
  extractDraftSubject
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/run-detail/runDetailFacts'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import { useWorkforceRunDetail } from '../hooks/useWorkforceRunDetail'

const TEST_ID = 'digital-workplace-hitl'

export interface WorkforceHitlDialogProps {
  open: boolean
  sessionId: string | null
  agentId: string | null
  agentName: string
  accessToken: string | undefined
  onClose: () => void
}

/** Free-text HITL answer box used when the pending interrupt is not a structured form. */
const FreeTextResponse: React.FC<{
  run: WorkforceRun
  accessToken: string
  onSubmitted: () => Promise<void>
}> = ({ run, accessToken, onSubmitted }) => {
  const { t } = useWorkplaceTranslation()
  const { replyToInterrupt } = useEnterpriseAgentClient(accessToken)
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const draftSubject = extractDraftSubject(run.pending_structured_input)
  const draftBody = extractDraftBody(run.pending_structured_input)

  const submit = useCallback(async () => {
    const text = value.trim()
    if (!text) return
    setIsSubmitting(true)
    setError(null)
    try {
      await replyToInterrupt(run.session_id, text)
      setValue('')
      await onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('hitl-send-failed'))
    } finally {
      setIsSubmitting(false)
    }
  }, [value, replyToInterrupt, run.session_id, onSubmitted, t])

  return (
    <section className="gba:flex gba:flex-col gba:gap-3" data-testid={`${TEST_ID}-freetext`}>
      <div className="gba:rounded-lg gba:border gba:border-amber-500/40 gba:bg-amber-500/5 gba:px-3 gba:py-3 gba:text-sm gba:text-amber-900 gba:dark:text-amber-100">
        {run.pending_human_question ? (
          <p className="gba:font-medium">{run.pending_human_question}</p>
        ) : (
          <p className="gba:font-medium">{t('hitl-title')}</p>
        )}
        {draftSubject ? (
          <p className="gba:mt-2 gba:text-xs gba:text-amber-700 gba:dark:text-amber-200">
            <span className="gba:font-semibold">{draftSubject}</span>
          </p>
        ) : null}
        {draftBody ? (
          <div className="gba:mt-2 gba:rounded-md gba:border gba:border-amber-500/30 gba:bg-background gba:px-3 gba:py-2 gba:text-foreground">
            <RunMarkdown content={draftBody} />
          </div>
        ) : null}
      </div>

      <Textarea
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={t('hitl-response-placeholder')}
        rows={3}
        data-testid={`${TEST_ID}-freetext-input`}
      />

      {error ? (
        <div
          className="gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="gba:flex gba:justify-end">
        <Button
          onClick={() => void submit()}
          disabled={isSubmitting || value.trim().length === 0}
          data-testid={`${TEST_ID}-freetext-send`}
        >
          {isSubmitting ? t('hitl-sending') : t('hitl-send')}
        </Button>
      </div>
    </section>
  )
}

const StatusPill: React.FC<{ run: WorkforceRun }> = ({ run }) => {
  const visual = runStatusVisual(run.status)
  return (
    <Badge variant="outline" size="sm" className={`gba:shrink-0 ${visual.pillClass}`}>
      {visual.label}
    </Badge>
  )
}

const DialogBody: React.FC<{
  run: WorkforceRun
  accessToken: string
  refresh: () => Promise<unknown>
}> = ({ run, accessToken, refresh }) => {
  const { t } = useWorkplaceTranslation()
  const composePending = getComposeEmailPending(run.pending_structured_input)
  const isWaiting = run.status === 'waiting_for_human'
  const onRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <section>
        <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {t('hitl-task')}
        </h3>
        <p className="gba:max-h-24 gba:overflow-y-auto gba:whitespace-pre-wrap gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:px-3 gba:py-2 gba:text-[13px] gba:leading-relaxed gba:text-foreground">
          {run.input || '—'}
        </p>
      </section>

      {composePending && accessToken ? (
        <RunEmailApprovalSection run={run} accessToken={accessToken} onRefreshAfterSubmit={onRefresh} />
      ) : isWaiting ? (
        <FreeTextResponse run={run} accessToken={accessToken} onSubmitted={onRefresh} />
      ) : (
        <section
          className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:px-4 gba:py-6 gba:text-center"
          data-testid={`${TEST_ID}-resolved`}
        >
          <CheckCircleIcon className="gba:size-7 gba:text-success" weight="fill" />
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('hitl-done-title')}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{t('hitl-done-desc')}</p>
        </section>
      )}

      {run.output ? (
        <section>
          <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
            {t('hitl-result')}
          </h3>
          <div className="gba:max-h-40 gba:overflow-y-auto gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed">
            <RunMarkdown content={run.output} />
          </div>
        </section>
      ) : null}
    </div>
  )
}

/**
 * Inline review of a Digital Workforce HITL run. Loads the run by session id,
 * keeps it fresh while it waits, and lets the user respond (compose_email gets
 * the full approval UX, everything else a free-text answer) without leaving the
 * Digital Workplace. Falls back to a deep link into the full run detail.
 */
const WorkforceHitlDialog: React.FC<WorkforceHitlDialogProps> = ({
  open,
  sessionId,
  agentId,
  agentName,
  accessToken,
  onClose
}) => {
  const { t } = useWorkplaceTranslation()
  const { run, loading, error, refresh } = useWorkforceRunDetail(accessToken, sessionId, open)

  const openFullRun = useCallback(() => {
    if (!sessionId) return
    const params: Record<string, string> = { view: 'enterprise-workforce', runId: sessionId }
    if (agentId) {
      params.agentId = agentId
      params.tab = 'runs'
    }
    navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, params))
  }, [sessionId, agentId])

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent
        className="gba:flex gba:max-h-[85vh] gba:w-full gba:max-w-xl gba:flex-col gba:overflow-hidden"
        data-testid={`${TEST_ID}-dialog`}
      >
        <DialogHeader className="gba:pb-1">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <RobotIcon className="gba:size-4 gba:text-muted-foreground" />
            <span className="gba:min-w-0 gba:flex-1 gba:truncate">{agentName || t('hitl-title')}</span>
            {run ? <StatusPill run={run} /> : null}
          </DialogTitle>
          <DialogDescription className="gba:sr-only">{t('hitl-title')}</DialogDescription>
        </DialogHeader>

        <div className="gba:min-h-0 gba:flex-1 gba:overflow-y-auto gba:pr-1">
          {loading && !run ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner />
            </div>
          ) : error && !run ? (
            <div
              className="gba:rounded-md gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : run && accessToken ? (
            <DialogBody run={run} accessToken={accessToken} refresh={refresh} />
          ) : (
            <div className="gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
              {t('hitl-no-action-desc')}
            </div>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:border-border/60 gba:pt-3">
          <Button variant="ghost" size="sm" onClick={openFullRun} disabled={!sessionId}>
            <ArrowSquareOutIcon className="gba:size-4" />
            {t('hitl-open-full')}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} data-testid={`${TEST_ID}-close`}>
            {t('hitl-close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WorkforceHitlDialog
export { WorkforceHitlDialog }
