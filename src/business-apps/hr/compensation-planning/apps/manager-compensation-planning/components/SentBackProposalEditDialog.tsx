import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
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
import {
  GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_ALLOCATION_AMOUNTS_BY_ORG_UNIT_BUDGET_ID,
  GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID
} from '../../../queries/budgetPlanQueries'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { refreshOrgUnitAllocationAmountFromEmployees } from '../../../utils/reduceOrgUnitBudgetPoolByAmount'
import { computeManagerProposalAmountsFromIncrease } from '../utils/buildManagerEmployeeBudgetSaveBody'
import { buildSentBackEmployeeProposalRevisionBody } from '../utils/buildSentBackEmployeeProposalRevisionBody'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'
import translations from '../_i18n'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

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
  const [departmentSalaryCap, setDepartmentSalaryCap] = useState<number | null>(null)
  const [sumAllocationsOnDepartment, setSumAllocationsOnDepartment] = useState<number | null>(null)
  const [departmentBudgetContextLoading, setDepartmentBudgetContextLoading] = useState(false)

  useEffect(() => {
    if (!open || !row) {
      return
    }
    setIncreaseRaw(String(row.proposedSalaryIncreaseAmount))
    setJustification(row.justification ?? '')
    setError(null)
  }, [open, row])

  useEffect(() => {
    if (!open) {
      setDepartmentSalaryCap(null)
      setSumAllocationsOnDepartment(null)
      setDepartmentBudgetContextLoading(false)
      return
    }
    if (!accessToken) {
      return
    }
    const planOuId = row?.compensationBudgetPlanOrganizationalUnitId?.trim() ?? ''
    if (planOuId === '') {
      setDepartmentSalaryCap(null)
      setSumAllocationsOnDepartment(null)
      return
    }

    let cancelled = false
    setDepartmentBudgetContextLoading(true)
    ;(async () => {
      try {
        const [ouRes, allocRes] = await Promise.all([
          graphqlClient.request<{
            CompensationBudgetPlanOrganizationalUnit: Array<{ salaryBudgetAmount: unknown }>
          }>(GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID, { id: planOuId }),
          graphqlClient.request<{
            CompensationBudgetPlanEmployee: Array<{ allocationAmount: unknown }>
          }>(GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_ALLOCATION_AMOUNTS_BY_ORG_UNIT_BUDGET_ID, {
            orgUnitBudgetId: planOuId
          })
        ])
        if (cancelled) {
          return
        }
        const ou = ouRes.CompensationBudgetPlanOrganizationalUnit?.[0]
        const cap = ou != null ? roundMoney2(num(ou.salaryBudgetAmount)) : null
        const total = (allocRes.CompensationBudgetPlanEmployee ?? []).reduce(
          (sum, r) => roundMoney2(sum + roundMoney2(num(r.allocationAmount))),
          0
        )
        setDepartmentSalaryCap(cap)
        setSumAllocationsOnDepartment(roundMoney2(total))
      } catch {
        if (!cancelled) {
          setDepartmentSalaryCap(null)
          setSumAllocationsOnDepartment(null)
        }
      } finally {
        if (!cancelled) {
          setDepartmentBudgetContextLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, accessToken, row?.compensationBudgetPlanOrganizationalUnitId, graphqlClient])

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

  const departmentOverBudgetInfo = useMemo(() => {
    if (
      departmentBudgetContextLoading ||
      departmentSalaryCap == null ||
      sumAllocationsOnDepartment == null ||
      row == null ||
      preview == null
    ) {
      return null
    }
    const currentAlloc = roundMoney2(num(row.allocationAmount))
    const proposed = roundMoney2(preview.proposedSalaryIncreaseAmount)
    const projectedTotal = roundMoney2(sumAllocationsOnDepartment - currentAlloc + proposed)
    const cap = roundMoney2(departmentSalaryCap)
    if (projectedTotal <= cap) {
      return null
    }
    return {
      projectedTotal,
      cap,
      over: roundMoney2(projectedTotal - cap)
    }
  }, [departmentBudgetContextLoading, departmentSalaryCap, preview, row, sumAllocationsOnDepartment])

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

        {(row.reviewNotes ?? '').trim() === '' ? null : (
          <div className="gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:p-3">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t('sent-back-edit-review-notes')}</p>
            <p className="gba:mt-1 gba:text-sm gba:text-foreground">{row.reviewNotes}</p>
          </div>
        )}

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

        {departmentOverBudgetInfo ? (
          <div data-testid="sent-back-edit-department-budget-warning">
            <Alert>
              <AlertDescription>
                {t('sent-back-edit-exceeds-department-budget', {
                  total: formatCurrency(departmentOverBudgetInfo.projectedTotal, currencyCode),
                  cap: formatCurrency(departmentOverBudgetInfo.cap, currencyCode),
                  over: formatCurrency(departmentOverBudgetInfo.over, currencyCode)
                })}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {teamMember ? null : <p className="gba:text-sm gba:text-destructive">{t('sent-back-edit-missing-member')}</p>}

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
