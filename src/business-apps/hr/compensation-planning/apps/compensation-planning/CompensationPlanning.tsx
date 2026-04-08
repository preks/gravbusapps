import React, { useCallback, useEffect, useState } from 'react'
import { PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ChartBarIcon, GearIcon, ListChecksIcon, TreeStructureIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'
import { syncCompensationPlanningFromUrl, useCompensationPlanningStore } from './hooks/useCompensationPlanningStore'
import { BudgetPlanSelector } from './components/shared/BudgetPlanSelector'
import { CreateBudgetPlanDialog } from './components/views/CreateBudgetPlanDialog'
import { useBudgetPlansTable, type CompensationBudgetPlanRow } from './hooks/useBudgetPlansTable'
import { OverviewView } from './components/views/OverviewView'
import { BudgetSetupView } from './components/views/BudgetSetupView'
import { SubmissionsView } from './components/views/SubmissionsView'
import { BudgetDistributionView } from './components/views/BudgetDistributionView'
import translations from './_i18n'

export const CompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context
  const employeeId = userInfo?.employeeDetails?.employeeId
  const { t } = useTranslation(translations)

  const viewOptions = [
    { value: 'overview', label: t('tab-overview'), icon: <ChartBarIcon /> },
    { value: 'budget-setup', label: t('tab-budget-setup'), icon: <GearIcon /> },
    { value: 'budget-distribution', label: t('tab-budget-distribution'), icon: <TreeStructureIcon /> },
    { value: 'submissions', label: t('tab-submissions'), icon: <ListChecksIcon /> }
  ]

  const { selectedCompanyId, activeTab, selectCompany, selectBudgetPlan, setActiveTab, selectedBudgetPlanId } =
    useCompensationPlanningStore()

  const { companies, loading: companiesLoading, error: companiesLoadError } = useActiveStructureCompanies(accessToken)

  useEffect(() => {
    if (companiesLoading) return
    if (selectedCompanyId == null) return
    if (companies.length === 0) {
      selectCompany(null)
      return
    }
    if (!companies.some(c => c.id === selectedCompanyId)) {
      selectCompany(null)
    }
  }, [companiesLoading, companies, selectedCompanyId, selectCompany])

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    selectCompany
  )

  useEffect(() => {
    const handlePopState = () => {
      syncCompensationPlanningFromUrl()
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)
  const [editingBudgetPlan, setEditingBudgetPlan] = useState<CompensationBudgetPlanRow | null>(null)
  const {
    rows: existingPlans,
    loading: plansLoading,
    creating: creatingPlan,
    insertPlan,
    updatePlan
  } = useBudgetPlansTable(accessToken)

  const handleCreatePlanDialogOpenChange = useCallback((open: boolean) => {
    setCreatePlanDialogOpen(open)
    if (!open) {
      setEditingBudgetPlan(null)
    }
  }, [])

  const handleCreatePlan = useCallback(
    async (input: Parameters<typeof insertPlan>[0]) => {
      const newId = await insertPlan(input)
      if (newId) {
        selectBudgetPlan(null)
      }
      return newId
    },
    [insertPlan, selectBudgetPlan]
  )

  const openCreateCompensationCycleDialog = useCallback(() => {
    setEditingBudgetPlan(null)
    setCreatePlanDialogOpen(true)
  }, [])

  const openEditCompensationCycleDialog = useCallback((plan: CompensationBudgetPlanRow) => {
    setEditingBudgetPlan(plan)
    setCreatePlanDialogOpen(true)
  }, [])

  const companySelectorToolbar = (
    <BudgetPlanSelector
      companies={companies}
      companiesLoading={companiesLoading}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={selectCompany}
      t={t}
    />
  )

  const companySelectorOverviewToolbar = (
    <BudgetPlanSelector
      companies={companies}
      companiesLoading={companiesLoading}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={id => selectCompany(id)}
      t={t}
      variant="toolbar"
    />
  )

  const companySelectorBudgetDistributionToolbar = (
    <BudgetPlanSelector
      companies={companies}
      companiesLoading={companiesLoading}
      selectedCompanyId={selectedCompanyId}
      onCompanyChange={id => selectCompany(id)}
      t={t}
      variant="toolbar"
      labelBold
    />
  )

  const renderTabContent = () => {
    if (!selectedCompanyId) return null

    const companyName = companies.find(c => c.id === selectedCompanyId)?.name

    switch (activeTab) {
      case 'budget-setup':
        return (
          <BudgetSetupView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            companyName={companyName}
            companyToolbar={companySelectorOverviewToolbar}
          />
        )
      case 'budget-distribution':
        return (
          <BudgetDistributionView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            companyToolbar={companySelectorBudgetDistributionToolbar}
          />
        )
      case 'submissions':
        return (
          <SubmissionsView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            compensationPlans={existingPlans}
            plansLoading={plansLoading}
            selectedCompensationPlanId={selectedBudgetPlanId}
            onCompensationPlanChange={selectBudgetPlan}
            companyToolbar={companySelectorOverviewToolbar}
          />
        )
      case 'overview':
      default:
        return (
          <OverviewView
            plans={existingPlans}
            plansLoading={plansLoading}
            onCreatePlan={openCreateCompensationCycleDialog}
            onEditCompensationPlan={openEditCompensationCycleDialog}
          />
        )
    }
  }

  const renderBody = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    return (
      <div
        className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
        data-testid="compensation-planning-data-body"
      >
        <div className="gba:space-y-4">
          {selectedCompanyId == null ? companySelectorToolbar : null}

          {!companiesLoading && companies.length === 0 && companiesLoadError ? (
            <p className="gba:text-sm gba:text-destructive" data-testid="compensation-planning-companies-error">
              {t('error-companies-load', { message: companiesLoadError })}
            </p>
          ) : null}

          {selectedCompanyId ? (
            <div className="gba:space-y-4">{renderTabContent()}</div>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      headerTitle={t('dashboard-title')}
      headerDescription={t('dashboard-subtitle')}
      onBack={null as unknown as (() => void) | undefined}
      headerSubViews={{
        value: activeTab,
        onValueChange: setActiveTab,
        items: viewOptions.map(opt => ({
          value: opt.value,
          label: opt.label,
          icon: opt.icon
        }))
      }}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-6">
        {renderBody()}

        <CreateBudgetPlanDialog
          open={createPlanDialogOpen}
          onOpenChange={handleCreatePlanDialogOpenChange}
          creating={creatingPlan}
          existingPlans={existingPlans}
          onCreate={handleCreatePlan}
          editingPlan={editingBudgetPlan}
          onUpdatePlan={updatePlan}
        />
      </div>
    </PageLayout>
  )
}
