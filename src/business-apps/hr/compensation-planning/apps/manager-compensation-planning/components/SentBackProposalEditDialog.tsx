import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { refreshOrgUnitAllocationAmountFromEmployees } from '../../../utils/reduceOrgUnitBudgetPoolByAmount'
import { computeManagerProposalAmountsFromIncrease } from '../utils/buildManagerEmployeeBudgetSaveBody'
import { buildSentBackEmployeeProposalRevisionBody } from '../utils/buildSentBackEmployeeProposalRevisionBody'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'
import translations from '../_i18n'

export interface SentBackProposalEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  restClient: RestClient
  row: SentBackProposalTableRow | null
  teamMember: TeamMemberCompensationData | null
  currencyCode: string
  onSaved: () => void | Promise<void>
}

export function SentBackProposalEditDialog({
  open,
  onOpenChange,
  accessToken,
  managerEmployeeId,
  restClient,
  row,
  teamMember,
  currencyCode,
  onSaved
}: Readonly<SentBackProposalEditDialogProps>) {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(accessToken ?? '')
  const [increaseRaw, setIncreaseRaw] = useState('')
  const [justification, setJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) {
      return
    }
    setIncreaseRaw(String(row.proposedSalaryIncreaseAmount))
    setJustification(row.justification ?? '')
    setError(null)
  }, [open, row])

  const preview = (() => {
    if (!teamMember) {
      return null
    }
    const n = Number(increaseRaw.replace(',', '.'))
    if (!Number.isFinite(n)) {
      return null
    }
    return computeManagerProposalAmountsFromIncrease(teamMember, n)
  })()

  const handleSave = useCallback(async () => {
    if (!accessToken || !managerEmployeeId || !row || !teamMember) {
      return
    }
    const n = Number(increaseRaw.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      setError(t('sent-back-edit-invalid-increase'))
      return
    }
    const amounts = computeManagerProposalAmountsFromIncrease(teamMember, n)
    const submittedBy =
      row.submittedByEmployeeId && row.submittedByEmployeeId.trim() !== ''
        ? row.submittedByEmployeeId
        : managerEmployeeId

    setSaving(true)
    setError(null)
    try {
      const body = buildSentBackEmployeeProposalRevisionBody(
        row,
        {
          proposedSalaryIncreaseAmount: amounts.proposedSalaryIncreaseAmount,
          proposedSalaryIncreasePercent: amounts.proposedSalaryIncreasePercent,
          proposedNewSalary: amounts.proposedNewSalary,
          justification
        },
        submittedBy,
        new Date().toISOString()
      )
      await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      const planOuRowId = row.compensationBudgetPlanOrganizationalUnitId?.trim() ?? ''
      if (planOuRowId !== '') {
        await refreshOrgUnitAllocationAmountFromEmployees(graphqlClient, restClient, accessToken, planOuRowId)
      }
      await onSaved()
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('sent-back-edit-error-generic')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }, [
    accessToken,
    graphqlClient,
    increaseRaw,
    justification,
    managerEmployeeId,
    onOpenChange,
    onSaved,
    restClient,
    row,
    teamMember,
    t
  ])

  if (row == null) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-h-[90vh] gba:max-w-lg gba:overflow-y-auto"
        data-testid="sent-back-proposal-edit-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('sent-back-edit-title')}</DialogTitle>
        </DialogHeader>

        <p className="gba:text-sm gba:text-muted-foreground">
          {t('sent-back-edit-description', { name: row.employeeDisplayName })}
        </p>

        {(row.reviewNotes ?? '').trim() !== '' ? (
          <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:p-3">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('sent-back-edit-review-notes')}</p>
            <p className="gba:mt-1 gba:text-sm gba:text-foreground">{row.reviewNotes}</p>
          </div>
        ) : null}

        <div className="gba:space-y-2">
          <Label htmlFor="sent-back-increase">{t('sent-back-edit-increase-label')}</Label>
          <Input
            id="sent-back-increase"
            type="text"
            inputMode="decimal"
            value={increaseRaw}
            onChange={e => setIncreaseRaw(e.target.value)}
            disabled={saving || !teamMember}
            data-testid="sent-back-edit-increase-input"
          />
        </div>

        {preview && teamMember ? (
          <div className="gba:space-y-1 gba:text-sm gba:text-muted-foreground">
            <p>
              {t('sent-back-edit-preview-pct')}:{' '}
              <span className="gba:font-medium gba:text-foreground">
                {roundMoney2(preview.proposedSalaryIncreasePercent)}%
              </span>
            </p>
            <p>
              {t('sent-back-edit-preview-new-salary')}:{' '}
              <span className="gba:font-medium gba:text-foreground">
                {formatCurrency(preview.proposedNewSalary, currencyCode)}
              </span>
            </p>
          </div>
        ) : null}

        {!teamMember ? <p className="gba:text-sm gba:text-destructive">{t('sent-back-edit-missing-member')}</p> : null}

        <div className="gba:space-y-2">
          <Label htmlFor="sent-back-justification">{t('sent-back-edit-justification-label')}</Label>
          <Textarea
            id="sent-back-justification"
            value={justification}
            onChange={e => setJustification(e.target.value)}
            disabled={saving}
            rows={4}
            data-testid="sent-back-edit-justification"
          />
        </div>

        {error ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="sent-back-edit-error">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gba:gap-2 sm:gba:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="sent-back-edit-cancel"
          >
            {t('sent-back-edit-cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !teamMember}
            data-testid="sent-back-edit-save"
          >
            {saving ? t('sent-back-edit-saving') : t('sent-back-edit-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
