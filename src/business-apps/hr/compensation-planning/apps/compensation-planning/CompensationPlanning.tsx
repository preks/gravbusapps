import React, { useCallback, useEffect, useState } from 'react'
import { PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ChartBarIcon, GearIcon, ListChecksIcon, TreeStructureIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'
import { useCompensationPlanningStore } from './hooks/useCompensationPlanningStore'
import { BudgetPlanSelector } from './components/shared/BudgetPlanSelector'
import { CreateBudgetPlanDialog } from './components/views/CreateBudgetPlanDialog'
import { useBudgetPlansTable } from './hooks/useBudgetPlansTable'
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

  const { selectedCompanyId, selectedBudgetPlanId, activeTab, selectCompany, selectBudgetPlan, setActiveTab } =
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
      const params = new URLSearchParams(window.location.search)
      const view = params.get('view')
      if (view) setActiveTab(view)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setActiveTab])

  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)
  const {
    rows: existingPlans,
    loading: plansLoading,
    creating: creatingPlan,
    insertPlan
  } = useBudgetPlansTable(accessToken)

  const handleCreatePlan = useCallback(
    async (input: Parameters<typeof insertPlan>[0]) => {
      const newId = await insertPlan(input)
      if (newId) {
        selectBudgetPlan(newId)
      }
      return newId
    },
    [insertPlan, selectBudgetPlan]
  )

  const handleSelectPlan = useCallback(
    (planId: string) => {
      selectBudgetPlan(planId)
    },
    [selectBudgetPlan]
  )

  const handleDeselectPlan = useCallback(() => {
    selectBudgetPlan(null)
  }, [selectBudgetPlan])

  const renderTabContent = () => {
    if (!selectedCompanyId) return null

    const companyName = companies.find(c => c.id === selectedCompanyId)?.name

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            budgetPlanId={selectedBudgetPlanId}
            plans={existingPlans}
            plansLoading={plansLoading}
            onSelectPlan={handleSelectPlan}
            onDeselectPlan={handleDeselectPlan}
            onCreatePlan={() => setCreatePlanDialogOpen(true)}
          />
        )
      case 'budget-setup':
        return <BudgetSetupView accessToken={accessToken} companyId={selectedCompanyId} companyName={companyName} />
      case 'budget-distribution':
        return <BudgetDistributionView accessToken={accessToken} companyId={selectedCompanyId} />
      case 'submissions':
        return <SubmissionsView accessToken={accessToken} companyId={selectedCompanyId} />
      default:
        return (
          <OverviewView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            budgetPlanId={selectedBudgetPlanId}
            plans={existingPlans}
            plansLoading={plansLoading}
            onSelectPlan={handleSelectPlan}
            onDeselectPlan={handleDeselectPlan}
            onCreatePlan={() => setCreatePlanDialogOpen(true)}
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
          <BudgetPlanSelector
            companies={companies}
            companiesLoading={companiesLoading}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={selectCompany}
            t={t}
          />

          {!companiesLoading && companies.length === 0 && companiesLoadError ? (
            <p className="gba:text-sm gba:text-destructive" data-testid="compensation-planning-companies-error">
              {t('error-companies-load', { message: companiesLoadError })}
            </p>
          ) : null}

          {!selectedCompanyId ? (
            <p className="gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
          ) : (
            <div className="gba:space-y-4">{renderTabContent()}</div>
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
          onOpenChange={setCreatePlanDialogOpen}
          creating={creatingPlan}
          existingPlans={existingPlans}
          onCreate={handleCreatePlan}
        />
      </div>
    </PageLayout>
  )
}
