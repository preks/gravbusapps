import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import { useCompensationBudgetPlanEmployeesByOrgUnitIds } from '../../../hooks/useCompensationBudgetPlanEmployeesByOrgUnitIds'
import {
  buildSupervisorApproveEmployeeProposalBody,
  buildSupervisorSendBackEmployeeProposalBody
} from '../../../utils/buildSupervisorEmployeeProposalRestBodies'
import translations from '../_i18n'

export interface SupervisorOrgUnitProposalReviewProps {
  accessToken: string | undefined
  supervisorEmployeeId: string | undefined
  /** `compensation_budget_plan_organizational_unit.id` for this team. */
  planOuRowId: string
  organizationalUnitLabel: string
}

export function SupervisorOrgUnitProposalReview({
  accessToken,
  supervisorEmployeeId,
  planOuRowId,
  organizationalUnitLabel
}: Readonly<SupervisorOrgUnitProposalReviewProps>) {
  const { t } = useTranslation(translations)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const orgUnitIds = useMemo(() => [planOuRowId], [planOuRowId])
  const { rows, loading, error, refetch } = useCompensationBudgetPlanEmployeesByOrgUnitIds(accessToken, orgUnitIds)

  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sendBackOpen, setSendBackOpen] = useState(false)
  const [sendBackNotes, setSendBackNotes] = useState('')

  const submittedRows = useMemo(() => rows.filter(r => r.budgetPlanStatus === 'BUDGET_PLAN_SUBMITTED'), [rows])

  const runApproveAll = useCallback(async () => {
    setActionError(null)
    if (!accessToken || !supervisorEmployeeId) {
      setActionError(t('supervisor-review-no-auth'))
      return
    }
    if (submittedRows.length === 0) {
      setActionError(t('supervisor-review-no-submitted'))
      return
    }
    setBusy(true)
    try {
      for (const row of submittedRows) {
        const body = buildSupervisorApproveEmployeeProposalBody(row, supervisorEmployeeId)
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      await refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('supervisor-review-error-generic')
      setActionError(msg)
    } finally {
      setBusy(false)
    }
  }, [accessToken, refetch, restClient, submittedRows, supervisorEmployeeId, t])

  const runSendBack = useCallback(async () => {
    setActionError(null)
    if (!accessToken || !supervisorEmployeeId) {
      setActionError(t('supervisor-review-no-auth'))
      return
    }
    if (submittedRows.length === 0) {
      setActionError(t('supervisor-review-no-submitted'))
      return
    }
    const notes = sendBackNotes.trim()
    if (notes === '') {
      setActionError(t('supervisor-review-send-back-notes-required'))
      return
    }
    setBusy(true)
    try {
      for (const row of submittedRows) {
        const body = buildSupervisorSendBackEmployeeProposalBody(row, supervisorEmployeeId, notes)
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      setSendBackOpen(false)
      setSendBackNotes('')
      await refetch()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('supervisor-review-error-generic')
      setActionError(msg)
    } finally {
      setBusy(false)
    }
  }, [accessToken, refetch, restClient, sendBackNotes, submittedRows, supervisorEmployeeId, t])

  return (
    <>
      <Card className="gba:w-full gba:shadow-sm" data-testid="supervisor-org-unit-proposal-review">
        <CardHeader className="gba:space-y-1 gba:border-b gba:border-border gba:pb-4">
          <CardTitle className="gba:text-lg">{t('supervisor-review-card-title')}</CardTitle>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{organizationalUnitLabel}</p>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-0 gba:pt-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {actionError ? (
            <Alert variant="destructive" data-testid="supervisor-review-action-error">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}
          {loading ? (
            <div
              className="gba:flex gba:min-h-32 gba:flex-col gba:items-center gba:justify-center gba:gap-2"
              data-testid="supervisor-review-loading"
            >
              <Spinner className="gba:h-8 gba:w-8" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('supervisor-review-loading')}</span>
            </div>
          ) : (
            <>
              <p className="gba:text-sm gba:leading-relaxed gba:text-foreground">
                {t('supervisor-review-submitted-count', { count: submittedRows.length })}
              </p>
              <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-2 gba:border-t gba:border-border gba:pt-4">
                <Button
                  type="button"
                  variant="default"
                  disabled={busy || submittedRows.length === 0}
                  data-testid="supervisor-review-approve-all"
                  onClick={() => void runApproveAll()}
                >
                  {busy ? t('supervisor-review-busy') : t('supervisor-review-approve-all')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || submittedRows.length === 0}
                  data-testid="supervisor-review-send-back-open"
                  onClick={() => setSendBackOpen(true)}
                >
                  {t('supervisor-review-send-back')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}>
        <DialogContent className="gba:max-w-md" data-testid="supervisor-review-send-back-dialog">
          <DialogHeader>
            <DialogTitle>{t('supervisor-review-send-back-title')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={sendBackNotes}
            onChange={e => setSendBackNotes(e.target.value)}
            rows={4}
            placeholder={t('supervisor-review-send-back-placeholder')}
            data-testid="supervisor-review-send-back-notes"
          />
          <DialogFooter className="gba:gap-2">
            <Button type="button" variant="outline" onClick={() => setSendBackOpen(false)}>
              {t('supervisor-review-send-back-cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void runSendBack()}
              disabled={busy}
              data-testid="supervisor-review-send-back-confirm"
            >
              {t('supervisor-review-send-back-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
