import React, { useEffect } from 'react'
import {
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CalendarBlankIcon,
  ChartBarIcon,
  GearIcon,
  ListChecksIcon,
  StackIcon,
  TreeStructureIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'
import { useCompensationPlanningStore } from './hooks/useCompensationPlanningStore'
import { OverviewView } from './components/views/OverviewView'
import { BudgetSetupView } from './components/views/BudgetSetupView'
import { SubmissionsView } from './components/views/SubmissionsView'
import { BudgetDistributionView } from './components/views/BudgetDistributionView'
import { BudgetPlanView } from './components/views/BudgetPlanView'
import translations from './_i18n'

export const CompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context
  const employeeId = userInfo?.employeeDetails?.employeeId
  const { t } = useTranslation(translations)

  const viewOptions = [
    { value: 'overview', label: t('tab-overview'), icon: <ChartBarIcon /> },
    { value: 'budget-plan', label: t('tab-budget-plan'), icon: <CalendarBlankIcon /> },
    { value: 'budget', label: t('tab-budget-setup'), icon: <GearIcon /> },
    { value: 'budget-distribution', label: t('tab-budget-distribution'), icon: <TreeStructureIcon /> },
    { value: 'submissions', label: t('tab-submissions'), icon: <ListChecksIcon /> }
  ]

  const { selectedCompanyId, activeTab, selectCompany, setActiveTab } = useCompensationPlanningStore()
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

  const isBudgetPlanTab = activeTab === 'budget-plan'
  /** Company + primary actions live in the DataDisplay toolbar (like Currency + Add). */
  const showCompanyInPageToolbar = activeTab !== 'budget-plan' && activeTab !== 'budget'

  const companySelectValue =
    selectedCompanyId != null && companies.some(c => c.id === selectedCompanyId) ? selectedCompanyId : undefined

  const companySelect = (
    <Select
      value={companySelectValue}
      onValueChange={val => selectCompany(val || null)}
      disabled={!companiesLoading && companies.length === 0}
    >
      <SelectTrigger className="gba:w-[300px]" data-testid="compensation-planning-company-select">
        <SelectValue placeholder={t('select-company-placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {companies.map(company => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const companyToolbarGroup = (
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <span className="gba:shrink-0 gba:text-sm gba:text-muted-foreground">{t('toolbar-company-label')}</span>
      {companySelect}
    </div>
  )

  const toolbarRow = (
    <div
      className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-4"
      data-testid="compensation-planning-toolbar"
    >
      <div className="gba:min-w-0 gba:flex-1">
        {!isBudgetPlanTab && !selectedCompanyId ? (
          <p className="gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
        ) : null}
      </div>
      <div className="gba:flex gba:flex-col gba:items-end gba:gap-2 gba:shrink-0">
        {showCompanyInPageToolbar ? companySelect : null}
        {!companiesLoading && companies.length === 0 && companiesLoadError ? (
          <p
            className="gba:max-w-sm gba:text-right gba:text-sm gba:text-destructive"
            data-testid="compensation-planning-companies-error"
          >
            {t('error-companies-load', { message: companiesLoadError })}
          </p>
        ) : null}
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (isBudgetPlanTab) {
      return <BudgetPlanView accessToken={accessToken} companyToolbarGroup={companyToolbarGroup} />
    }
    if (!selectedCompanyId) {
      return null
    }
    switch (activeTab) {
      case 'overview':
        return <OverviewView accessToken={accessToken} companyId={selectedCompanyId} />
      case 'budget':
        return (
          <BudgetSetupView
            accessToken={accessToken}
            companyId={selectedCompanyId}
            companyName={companies.find(c => c.id === selectedCompanyId)?.name}
            companyToolbarGroup={companyToolbarGroup}
          />
        )
      case 'budget-distribution':
        return <BudgetDistributionView accessToken={accessToken} companyId={selectedCompanyId} />
      case 'submissions':
        return <SubmissionsView accessToken={accessToken} companyId={selectedCompanyId} />
      default:
        return <OverviewView accessToken={accessToken} companyId={selectedCompanyId} />
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
          {toolbarRow}
          {isBudgetPlanTab || selectedCompanyId ? <div className="gba:space-y-4">{renderTabContent()}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      headerIcon={StackIcon}
      headerTitle={t('dashboard-title')}
      headerDescription={t('dashboard-subtitle')}
      // PageHeader defaults onBack to history.back(); null hides the back control.
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
      <div className="gba:space-y-6">{renderBody()}</div>
    </PageLayout>
  )
}
