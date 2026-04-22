import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { RestClient } from '@/common/network/rest/RestClient'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { UNASSIGNED_ORG_UNIT_ID } from '../../../../utils/buildOrgUnitDistributionInputs'
import { roundMoney2 } from '../../../../utils/budgetAmountPercentSync'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  saveCompensationBudgetPlanOrganizationalUnit,
  type CompensationBudgetPlanOrganizationalUnitRestPayload
} from '../../../../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import type { CompensationBudgetPlanOrganizationalUnitRow } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import translations from '../../_i18n'

function percentOfPool(amount: number, pool: number): number {
  if (pool <= 0 || !Number.isFinite(amount) || !Number.isFinite(pool)) {
    return 0
  }
  return Math.round((10000 * amount) / pool) / 100
}

/** Selected OUs get new slices; unselected OUs keep their current department `salary_budget_amount` in the total. */
function totalSalaryBudgetDeployedToDepartments(
  selectedOuIds: string[],
  selectedSet: Set<string>,
  allocationByOrgUnitId: ReadonlyMap<string, number>,
  orgUnitBudgetRows: CompensationBudgetPlanOrganizationalUnitRow[]
): number {
  let total = 0
  for (const ouId of selectedOuIds) {
    total = roundMoney2(total + roundMoney2(allocationByOrgUnitId.get(ouId) ?? 0))
  }
  for (const r of orgUnitBudgetRows) {
    if (!selectedSet.has(r.organizationalUnitId)) {
      total = roundMoney2(total + roundMoney2(r.salaryBudgetAmount))
    }
  }
  return total
}

async function saveDistributedOrgUnitRows(
  restClient: RestClient,
  accessToken: string,
  selectedOuIds: string[],
  rowByOuId: ReadonlyMap<string, CompensationBudgetPlanOrganizationalUnitRow>,
  allocationByOrgUnitId: ReadonlyMap<string, number>,
  distributionPool: number,
  companyBudgetRow: CompensationBudgetPlanCompanyRow
): Promise<void> {
  for (const ouId of selectedOuIds) {
    const row = rowByOuId.get(ouId)
    const rawAmount = allocationByOrgUnitId.get(ouId) ?? 0
    const sliceAmount = roundMoney2(rawAmount)
    const isInsert = row == null
    const slicePercent = distributionPool > 0 ? percentOfPool(sliceAmount, distributionPool) : 0
    const unitPayload: CompensationBudgetPlanOrganizationalUnitRestPayload = {
      salaryBudgetAmount: sliceAmount,
      salaryBudgetPercent: slicePercent,
      allocationAmount: 0,
      bonusBudgetAmount: 0,
      bonusBudgetPercent: 0,
      budgetPlanStatus: 'BUDGET_PLAN_DRAFT',
      compensationBudgetPlanCompany: companyBudgetRow.id,
      organizationalUnit: ouId
    }
    if (!isInsert && row) {
      unitPayload.id = row.id
      unitPayload.version = row.version
    }
    await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, {
      changeMode: isInsert ? 'INSERT' : 'UPDATE',
      compensationBudgetPlanOrganizationalUnit: unitPayload
    })
  }
}

export interface BudgetDistributionDistributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  restClient: RestClient
  sortedOrgUnits: CompanyOrganizationalUnit[]
  orgUnitBudgetRows: CompensationBudgetPlanOrganizationalUnitRow[]
  allocationByOrgUnitId: ReadonlyMap<string, number>
  /** Current company salary-increase pool (from `salary_budget_amount` / resolve); basis for OU % and remainder. */
  distributionPool: number | null
  currencyCode: string
  companyBudgetRow: CompensationBudgetPlanCompanyRow | null
  onSaved: () => void | Promise<void>
}

export function BudgetDistributionDistributeDialog({
  open,
  onOpenChange,
  accessToken,
  restClient,
  sortedOrgUnits,
  orgUnitBudgetRows,
  allocationByOrgUnitId,
  distributionPool,
  currencyCode,
  companyBudgetRow,
  onSaved
}: Readonly<BudgetDistributionDistributeDialogProps>) {
  const { t } = useTranslation(translations)
  const [selectedOuIds, setSelectedOuIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /** Avoid resetting checkbox state when parent re-renders while the dialog stays open. */
  const hasInitializedSelectionForOpenRef = useRef(false)

  const saveableOrgUnits = useMemo(() => sortedOrgUnits.filter(u => u.id !== UNASSIGNED_ORG_UNIT_ID), [sortedOrgUnits])

  const rowByOuId = useMemo(() => {
    const map = new Map<string, CompensationBudgetPlanOrganizationalUnitRow>()
    for (const r of orgUnitBudgetRows) {
      map.set(r.organizationalUnitId, r)
    }
    return map
  }, [orgUnitBudgetRows])

  useEffect(() => {
    if (!open) {
      hasInitializedSelectionForOpenRef.current = false
      return
    }
    setErrorMessage(null)
    if (hasInitializedSelectionForOpenRef.current) {
      return
    }
    if (saveableOrgUnits.length === 0) {
      return
    }
    hasInitializedSelectionForOpenRef.current = true
    const next = new Set<string>()
    for (const u of saveableOrgUnits) {
      const raw = allocationByOrgUnitId.get(u.id) ?? 0
      if (roundMoney2(raw) > 0) {
        next.add(u.id)
      }
    }
    setSelectedOuIds(next)
  }, [open, saveableOrgUnits, allocationByOrgUnitId])

  const toggleOu = useCallback((ouId: string, checked: boolean) => {
    setSelectedOuIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(ouId)
      } else {
        next.delete(ouId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedOuIds(new Set(saveableOrgUnits.map(u => u.id)))
  }, [saveableOrgUnits])

  const selectNone = useCallback(() => {
    setSelectedOuIds(new Set())
  }, [])

  const handleSave = useCallback(async () => {
    if (!accessToken) {
      return
    }
    if (!companyBudgetRow) {
      setErrorMessage(t('budget-distribution-distribute-missing-company'))
      return
    }
    if (distributionPool == null || distributionPool <= 0) {
      setErrorMessage(t('budget-distribution-distribute-no-pool'))
      return
    }
    const ids = [...selectedOuIds]
    if (ids.length === 0) {
      setErrorMessage(t('budget-distribution-distribute-none-selected'))
      return
    }

    setSaving(true)
    setErrorMessage(null)

    try {
      const selectedSet = new Set(ids)
      const pool = distributionPool

      await saveDistributedOrgUnitRows(
        restClient,
        accessToken,
        ids,
        rowByOuId,
        allocationByOrgUnitId,
        pool,
        companyBudgetRow
      )

      const totalAllocatedToOrgUnits = totalSalaryBudgetDeployedToDepartments(
        ids,
        selectedSet,
        allocationByOrgUnitId,
        orgUnitBudgetRows
      )

      const companyBody = buildSaveCompensationBudgetPlanCompanyUpdateBody({
        id: companyBudgetRow.id,
        version: companyBudgetRow.version,
        compensationBudgetPlanId: companyBudgetRow.compensationBudgetPlanId,
        companyId: companyBudgetRow.companyId,
        salaryBudgetAmount: roundMoney2(companyBudgetRow.salaryBudgetAmount),
        salaryBudgetPercent: roundMoney2(companyBudgetRow.salaryBudgetPercent),
        allocationAmount: roundMoney2(totalAllocatedToOrgUnits),
        currentTotalSalaryCost: companyBudgetRow.currentTotalSalaryCost,
        currencyRef: companyBudgetRow.currencyRef
      })
      await saveCompensationBudgetPlanCompany(restClient, accessToken, companyBody)

      await onSaved()
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('budget-distribution-distribute-error')
      setErrorMessage(msg)
    } finally {
      setSaving(false)
    }
  }, [
    accessToken,
    allocationByOrgUnitId,
    companyBudgetRow,
    distributionPool,
    onOpenChange,
    onSaved,
    orgUnitBudgetRows,
    restClient,
    rowByOuId,
    selectedOuIds,
    t
  ])

  const poolOk = distributionPool != null && distributionPool > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-h-[85vh] gba:max-w-2xl gba:overflow-y-auto"
        data-testid="budget-distribution-distribute-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('budget-distribution-distribute-dialog-title')}</DialogTitle>
        </DialogHeader>

        <p className="gba:text-sm gba:text-muted-foreground">
          {t('budget-distribution-distribute-dialog-description')}
        </p>

        {sortedOrgUnits.some(u => u.id === UNASSIGNED_ORG_UNIT_ID) ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('budget-distribution-distribute-unassigned-hint')}</p>
        ) : null}

        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            data-testid="budget-distribution-distribute-select-all"
          >
            {t('budget-distribution-distribute-select-all')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectNone}
            data-testid="budget-distribution-distribute-select-none"
          >
            {t('budget-distribution-distribute-select-none')}
          </Button>
        </div>

        {poolOk ? null : (
          <p className="gba:text-sm gba:text-destructive" data-testid="budget-distribution-distribute-pool-warning">
            {t('budget-distribution-distribute-no-pool')}
          </p>
        )}

        {errorMessage ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="budget-distribution-distribute-error-message">
            {errorMessage}
          </p>
        ) : null}

        <ul className="gba:divide-y gba:divide-border gba:rounded-md gba:border gba:border-border">
          {saveableOrgUnits.map(ou => {
            const amount = allocationByOrgUnitId.get(ou.id) ?? 0
            const pct = poolOk && distributionPool != null ? percentOfPool(amount, distributionPool) : null
            const checked = selectedOuIds.has(ou.id)
            return (
              <li key={ou.id} className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={v => toggleOu(ou.id, v === true)}
                  disabled={saving || !poolOk}
                  aria-label={t('budget-distribution-distribute-checkbox-aria', { name: ou.name })}
                  data-testid={`budget-distribution-distribute-row-checkbox-${ou.id}`}
                />
                <div className="gba:min-w-0 gba:flex-1">
                  <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{ou.name}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {formatCurrency(roundMoney2(amount), currencyCode)}
                    {typeof pct === 'number'
                      ? ` · ${t('budget-distribution-distribute-percent-of-pool', { percent: pct })}`
                      : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <DialogFooter className="gba:gap-2 sm:gba:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="budget-distribution-distribute-cancel"
          >
            {t('budget-distribution-distribute-cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !poolOk || !companyBudgetRow || selectedOuIds.size === 0}
            data-testid="budget-distribution-distribute-save"
          >
            {saving ? t('budget-distribution-distribute-saving') : t('budget-distribution-distribute-save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
