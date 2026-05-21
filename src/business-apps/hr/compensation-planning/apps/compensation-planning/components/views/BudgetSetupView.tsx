import React, { useCallback, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import { useBudgetSetupForCompany } from '../../hooks/useBudgetSetupForCompany'
import {
  useCompanyCompensationSalaryBaseline,
  useCompanyCompensationSalaryBaselineTotals
} from '../../hooks/useCompanyCompensationSalaryBaseline'
import { useCompensationPlanningStore } from '../../hooks/useCompensationPlanningStore'
import { BudgetSetupCreatePlanDialog } from './BudgetSetupCreatePlanDialog'
import type { CreatePlanFormValues } from './budgetSetupCreatePlanSchema'
import type { BudgetSetupCompanyOption, BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { BudgetSetupPlansTable } from './BudgetSetupPlansTable'
import { BudgetSetupCycleOverview } from './BudgetSetupCycleOverview'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'
import translations from '../../_i18n'

const EXECUTED_STATUS = 'BUDGET_PLAN_EXECUTED'

export interface BudgetSetupViewProps {
  accessToken: string
  companies?: BudgetSetupCompanyOption[]
}

interface BudgetSetupDepartmentsBreakdownProps {
  accessToken: string
  row: BudgetSetupPlanTableRow
  onBack: () => void
  t: (key: string, args?: Record<string, string | number>) => string
}

function BudgetSetupDepartmentsBreakdown({
  accessToken,
  row,
  onBack,
  t
}: Readonly<BudgetSetupDepartmentsBreakdownProps>) {
  const overviewStats = useCompanyCompensationSalaryBaseline(
    accessToken,
    row.companyId,
    t('overview-org-unit-unassigned')
  )

  return (
    <div className="gba:space-y-4" data-testid="budget-setup-departments-view">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Button
          type="button"
          variant="ghost"
          className="gba:gap-2"
          onClick={onBack}
          data-testid="budget-setup-departments-back"
        >
          <ArrowLeftIcon className="gba:size-4" aria-hidden />
          {t('budget-setup-departments-back')}
        </Button>
      </div>

      {overviewStats.loading ? (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      ) : null}

      {overviewStats.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-setup-team-error-title')}</AlertTitle>
          <AlertDescription>{overviewStats.error}</AlertDescription>
        </Alert>
      ) : null}

      {!overviewStats.loading && !overviewStats.error ? (
        <OverviewOrgUnitSalaryCard
          rows={overviewStats.orgUnitSalaryRows}
          totalSalaryAcrossUnits={overviewStats.totalSalaryAcrossOrgUnits}
          totalBonusAcrossUnits={overviewStats.totalBonusAcrossOrgUnits}
          currency={row.displayCurrency}
          teamMemberCount={overviewStats.teamMemberCount}
        />
      ) : null}
    </div>
  )
}

export const BudgetSetupView: React.FC<BudgetSetupViewProps> = ({ accessToken, companies = [] }) => {
  const { t } = useTranslation(translations)
  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)
  const [editingCompanyRow, setEditingCompanyRow] = useState<CompensationBudgetPlanCompanyRow | null>(null)
  const [selectedDepartmentsRow, setSelectedDepartmentsRow] = useState<BudgetSetupPlanTableRow | null>(null)
  const setActiveTab = useCompensationPlanningStore(s => s.setActiveTab)
  const backToCycles = useCallback(() => {
    setActiveTab('overview')
  }, [setActiveTab])

  const {
    plans,
    selectedBudgetPlanId,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRowsList,
    creatingPlan,
    error,
    createPlan,
    updateCompanyBudgetRow
  } = useBudgetSetupForCompany(accessToken)

  const selectedPlan = plans.find(plan => plan.id === selectedBudgetPlanId) ?? null
  const isSelectedCycleExecuted = selectedPlan?.budgetPlanStatus === EXECUTED_STATUS

  const handleBudgetSetupDialogOpenChange = useCallback((open: boolean) => {
    setCreatePlanDialogOpen(open)
    if (!open) {
      setEditingCompanyRow(null)
    }
  }, [])

  const handleEditCompanyBudgetRow = useCallback(
    (tableRow: BudgetSetupPlanTableRow) => {
      if (isSelectedCycleExecuted) {
        return
      }
      const full = companyBudgetPlanRows.find(r => r.id === tableRow.id)
      if (full) {
        setEditingCompanyRow(full)
        setCreatePlanDialogOpen(true)
      }
    },
    [companyBudgetPlanRows, isSelectedCycleExecuted]
  )

  const handleUpdateCompanyBudgetFromDialog = useCallback(
    async (row: CompensationBudgetPlanCompanyRow, values: CreatePlanFormValues) => {
      if (typeof values.salaryBudgetAmount !== 'number' || typeof values.salaryBudgetPercent !== 'number') {
        return false
      }
      const currencyRef = values.currencyRef.trim() === '' ? null : values.currencyRef.trim()
      return updateCompanyBudgetRow(row, {
        salaryBudgetAmount: values.salaryBudgetAmount,
        salaryBudgetPercent: values.salaryBudgetPercent,
        allocationAmount: row.allocationAmount,
        currencyRef
      })
    },
    [updateCompanyBudgetRow]
  )

  const selectedCompanyRow = editingCompanyRow ?? null
  const currencyCode = useMemo(() => {
    const currencyRef =
      selectedCompanyRow?.currencyRef ?? companyBudgetPlanRows.find(row => row.currencyRef)?.currencyRef
    return currencyRef?.split(':').pop()?.trim() || 'EUR'
  }, [companyBudgetPlanRows, selectedCompanyRow])

  const companyIdsInSelectedPlan = useMemo(
    () =>
      selectedBudgetPlanId == null
        ? []
        : [
            ...new Set(
              companyBudgetPlanRows
                .filter(row => row.compensationBudgetPlanId === selectedBudgetPlanId)
                .map(row => row.companyId)
            )
          ],
    [companyBudgetPlanRows, selectedBudgetPlanId]
  )
  const {
    totalSalaryByCompanyId,
    loading: loadingCurrentSalaryTotals,
    error: currentSalaryTotalsError
  } = useCompanyCompensationSalaryBaselineTotals(accessToken, companyIdsInSelectedPlan, selectedBudgetPlanId != null)

  const tableLoading = loadingPlans || loadingCompanyRowsList || loadingCurrentSalaryTotals

  const openDepartmentsBreakdown = useCallback((row: BudgetSetupPlanTableRow) => {
    setSelectedDepartmentsRow(row)
  }, [])

  const toolbarEnd = (
    <Button
      type="button"
      variant="default"
      className="gba:shrink-0"
      disabled={creatingPlan || isSelectedCycleExecuted}
      onClick={() => {
        if (isSelectedCycleExecuted) {
          return
        }
        setEditingCompanyRow(null)
        setCreatePlanDialogOpen(true)
      }}
      data-testid="budget-setup-create-new-budget-plan"
    >
      {t('budget-setup-create-new-budget-plan')}
    </Button>
  )

  return (
    <div className="gba:space-y-6" data-testid="budget-setup-view">
      <BudgetSetupCreatePlanDialog
        accessToken={accessToken}
        open={createPlanDialogOpen}
        onOpenChange={handleBudgetSetupDialogOpenChange}
        creating={creatingPlan}
        onCreate={createPlan}
        companyId=""
        companies={companies}
        allowCompanySelection
        plans={plans}
        companyBudgetPlanRows={companyBudgetPlanRows}
        loadingPlans={loadingPlans}
        defaultCompensationBudgetPlanId={selectedBudgetPlanId}
        editRow={editingCompanyRow}
        onUpdateRow={handleUpdateCompanyBudgetFromDialog}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-setup-error-title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {selectedDepartmentsRow ? (
        <BudgetSetupDepartmentsBreakdown
          accessToken={accessToken}
          row={selectedDepartmentsRow}
          onBack={() => setSelectedDepartmentsRow(null)}
          t={t}
        />
      ) : (
        <>
          {selectedPlan ? (
            <BudgetSetupCycleOverview
              selectedPlan={selectedPlan}
              companyRows={companyBudgetPlanRows}
              fallbackCurrencyCode={currencyCode}
              onBackToCycles={backToCycles}
              t={t}
            />
          ) : null}

          <BudgetSetupPlansTable
            companyId={null}
            companyBudgetPlanRows={companyBudgetPlanRows}
            currencyCode={currencyCode}
            plans={plans}
            companies={companies}
            showCompanyColumn
            loading={tableLoading}
            error={currentSalaryTotalsError}
            toolbarEnd={toolbarEnd}
            onEditRow={handleEditCompanyBudgetRow}
            onOpenDepartmentsBreakdown={openDepartmentsBreakdown}
            selectedCompensationPlanId={selectedBudgetPlanId}
            editDisabled={isSelectedCycleExecuted}
            showCycleColumn={false}
            currentSalaryCostByCompanyId={totalSalaryByCompanyId}
          />
        </>
      )}
    </div>
  )
}
