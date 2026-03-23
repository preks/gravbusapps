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
import { useCompensationPlanningStore } from './hooks/useCompensationPlanningStore'
import { OverviewView } from './components/views/OverviewView'
import { BudgetSetupView } from './components/views/BudgetSetupView'
import { SubmissionsView } from './components/views/SubmissionsView'
import translations from './_i18n'

const VIEW_OPTIONS = [
  { value: 'overview', label: 'Overview', icon: <ChartBarIcon /> },
  { value: 'budget', label: 'Budget Setup', icon: <GearIcon /> },
  { value: 'submissions', label: 'Submissions', icon: <ListChecksIcon /> }
]

export const CompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(translations)

  const { selectedCompanyId, activeTab, selectCompany, setActiveTab } = useCompensationPlanningStore()
  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

  const renderContent = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    if (!selectedCompanyId) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:text-muted-foreground gba:gap-2">
          <StackIcon size={32} />
          <p>Select a company to view compensation planning data.</p>
        </div>
      )
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
        items: VIEW_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label,
          icon: opt.icon
        }))
      }}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Select value={selectedCompanyId ?? undefined} onValueChange={val => selectCompany(val || null)}>
            <SelectTrigger className="gba:w-[300px]">
              <SelectValue placeholder="Select company..." />
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

        {renderContent()}
      </div>
    </PageLayout>
  )
}
