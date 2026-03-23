import React from 'react'
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
import { ChartBarIcon, GearIcon, ListChecksIcon, StackIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'
import { useCompensationPlanningStore } from './hooks/useCompensationPlanningStore'
import { OverviewView } from './components/views/OverviewView'
import { BudgetSetupView } from './components/views/BudgetSetupView'
import { SubmissionsView } from './components/views/SubmissionsView'
import translations from './_i18n'

export const CompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context
  const employeeId = userInfo?.employeeDetails?.employeeId
  const { t } = useTranslation(translations)

  const viewOptions = [
    { value: 'overview', label: t('tab-overview'), icon: <ChartBarIcon /> },
    { value: 'budget', label: t('tab-budget-setup'), icon: <GearIcon /> },
    { value: 'submissions', label: t('tab-submissions'), icon: <ListChecksIcon /> }
  ]

  const { selectedCompanyId, activeTab, selectCompany, setActiveTab } = useCompensationPlanningStore()
  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    selectCompany
  )

  const renderContent = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    if (!selectedCompanyId) {
      return null
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewView accessToken={accessToken} companyId={selectedCompanyId} />
      case 'budget':
        return <BudgetSetupView accessToken={accessToken} companyId={selectedCompanyId} />
      case 'submissions':
        return <SubmissionsView accessToken={accessToken} companyId={selectedCompanyId} />
      default:
        return <OverviewView accessToken={accessToken} companyId={selectedCompanyId} />
    }
  }

  return (
    <PageLayout
      headerIcon={StackIcon}
      headerTitle={t('dashboard-title')}
      headerDescription={t('dashboard-subtitle')}
      headerSubViews={{
        value: activeTab,
        onValueChange: setActiveTab,
        items: viewOptions.map(opt => ({
          value: opt.value,
          label: opt.label,
          icon: opt.icon
        }))
      }}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-6">
        {!companiesLoading && (
          <div
            className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-center gba:justify-between gba:gap-4"
            data-testid="compensation-planning-company-toolbar"
          >
            <div className="gba:min-w-0 gba:flex-1">
              {!selectedCompanyId && (
                <p className="gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
              )}
            </div>
            <div className="gba:shrink-0">
              <Select value={selectedCompanyId ?? undefined} onValueChange={val => selectCompany(val || null)}>
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
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </PageLayout>
  )
}
