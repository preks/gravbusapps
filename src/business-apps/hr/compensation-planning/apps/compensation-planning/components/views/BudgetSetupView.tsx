import React, { useCallback, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import { useBudgetSetupForCompany } from '../../hooks/useBudgetSetupForCompany'
import { useOverviewCompanyStatisticsData } from '../../hooks/useOverviewCompanyStatisticsData'
import { useCompensationPlanningStore } from '../../hooks/useCompensationPlanningStore'
import { CompensationCycleSelector } from '../shared/CompensationCycleSelector'
import { BudgetSetupCreatePlanDialog } from './BudgetSetupCreatePlanDialog'
import type { CreatePlanFormValues } from './budgetSetupCreatePlanSchema'
import type { BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { BudgetSetupNavToDepartmentsCard } from './BudgetSetupNavToDepartmentsCard'
import { BudgetSetupPlansTable } from './BudgetSetupPlansTable'
import { OverviewCompanyKpiAndMixGrid } from './OverviewCompanyKpiAndMixGrid'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'
import translations from '../../_i18n'

export interface BudgetSetupViewProps {
  accessToken: string
  companyId: string
  companyName?: string
  /** Company selector in the plans table toolbar (aligned with DataDisplay; same company drives KPIs via `companyId`). */
  companyToolbar?: React.ReactNode
}

export const BudgetSetupView: React.FC<BudgetSetupViewProps> = ({
  accessToken,
  companyId,
  companyName,
  companyToolbar
}) => {
  const { t } = useTranslation(translations)
  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)
  const [editingCompanyRow, setEditingCompanyRow] = useState<CompensationBudgetPlanCompanyRow | null>(null)
  const budgetSetupSection = useCompensationPlanningStore(s => s.budgetSetupSection)
  const setBudgetSetupSection = useCompensationPlanningStore(s => s.setBudgetSetupSection)
  const goToDepartments = useCallback(() => {
    setBudgetSetupSection('departments')
  }, [setBudgetSetupSection])
  const backToBudgetSetupMain = useCallback(() => {
    setBudgetSetupSection('main')
  }, [setBudgetSetupSection])

  const {
    plans,
    selectedBudgetPlanId,
    selectBudgetPlan,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRowsList,
    creatingPlan,
    error,
    createPlan,
    updateCompanyBudgetRow
  } = useBudgetSetupForCompany(accessToken, companyId)

  const handleBudgetSetupDialogOpenChange = useCallback((open: boolean) => {
    setCreatePlanDialogOpen(open)
    if (!open) {
      setEditingCompanyRow(null)
    }
  }, [])

  const handleEditCompanyBudgetRow = useCallback(
    (tableRow: BudgetSetupPlanTableRow) => {
      const full = companyBudgetPlanRows.find(r => r.id === tableRow.id)
      if (full) {
        setEditingCompanyRow(full)
        setCreatePlanDialogOpen(true)
      }
    },
    [companyBudgetPlanRows]
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

  const overviewStats = useOverviewCompanyStatisticsData(accessToken, companyId, t('overview-org-unit-unassigned'))

  const currentSalaryCost = overviewStats.totalSalaryCost
  const currencyCode = overviewStats.currency

  const tableLoading = loadingPlans || loadingCompanyRowsList || overviewStats.loading

  const cycleToolbar = (
    <CompensationCycleSelector
      plans={plans}
      plansLoading={loadingPlans}
      selectedPlanId={selectedBudgetPlanId}
      onPlanChange={selectBudgetPlan}
      t={t}
      variant="toolbar"
    />
  )

  const toolbarEnd = (
    <Button
      type="button"
      variant="default"
      className="gba:shrink-0"
      disabled={creatingPlan}
      onClick={() => {
        setEditingCompanyRow(null)
        setCreatePlanDialogOpen(true)
      }}
      data-testid="budget-setup-create-new-budget-plan"
    >
      {t('budget-setup-create-new-budget-plan')}
    </Button>
  )

  const showTeamStats = !overviewStats.loading && !overviewStats.error

  return (
    <div className="gba:space-y-6" data-testid="budget-setup-view">
      <BudgetSetupCreatePlanDialog
        accessToken={accessToken}
        open={createPlanDialogOpen}
        onOpenChange={handleBudgetSetupDialogOpenChange}
        creating={creatingPlan}
        onCreate={createPlan}
        companyId={companyId}
        annualSalaryCost={currentSalaryCost}
        currencyCode={currencyCode}
        companyName={companyName}
        plans={plans}
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

      {overviewStats.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-setup-team-error-title')}</AlertTitle>
          <AlertDescription>{overviewStats.error}</AlertDescription>
        </Alert>
      ) : null}

      {companyToolbar ? (
        <div
          className="gba:flex gba:w-full gba:flex-wrap gba:items-center gba:justify-end gba:gap-2"
          data-testid="budget-setup-company-selector-row"
        >
          {companyToolbar}
        </div>
      ) : null}

      {budgetSetupSection === 'departments' ? (
        <div className="gba:space-y-4" data-testid="budget-setup-departments-view">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="gba:gap-2"
              onClick={backToBudgetSetupMain}
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
          {showTeamStats ? (
            <OverviewOrgUnitSalaryCard
              rows={overviewStats.orgUnitSalaryRows}
              totalSalaryAcrossUnits={overviewStats.totalSalaryAcrossOrgUnits}
              totalBonusAcrossUnits={overviewStats.totalBonusAcrossOrgUnits}
              currency={overviewStats.currency}
              teamMemberCount={overviewStats.teamMemberCount}
            />
          ) : null}
        </div>
      ) : (
        <>
          <div className="gba:space-y-6" data-testid="budget-setup-company-overview-blocks">
            <OverviewCompanyKpiAndMixGrid data={overviewStats} t={t} />
          </div>

          <BudgetSetupPlansTable
            companyId={companyId}
            companyBudgetPlanRows={companyBudgetPlanRows}
            currencyCode={currencyCode}
            plans={plans}
            loading={tableLoading}
            error={null}
            cycleToolbar={cycleToolbar}
            toolbarEnd={toolbarEnd}
            onEditRow={handleEditCompanyBudgetRow}
            selectedCompensationPlanId={selectedBudgetPlanId}
          />

          {showTeamStats ? <BudgetSetupNavToDepartmentsCard onOpen={goToDepartments} /> : null}
        </>
      )}
    </div>
  )
}
