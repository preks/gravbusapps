import React from 'react'
import {
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import { TreeStructureIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useBudgetDistributionStore } from './hooks/useBudgetDistributionStore'
import { DistributionCriteriaSelector } from './components/DistributionCriteriaSelector'
import { OrgUnitBudgetTable } from './components/OrgUnitBudgetTable'
import translations from './_i18n'

export const BudgetDistribution: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(translations)

  const { selectedCompanyId, selectedMethod, setSelectedCompanyId, setDistributionMethod } =
    useBudgetDistributionStore()

  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

  return (
    <PageLayout
      headerIcon={TreeStructureIcon}
      headerTitle={t('title')}
      headerDescription={t('subtitle', { company: '' })}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-4">
        <Alert>
          <AlertTitle>Read-only Mode</AlertTitle>
          <AlertDescription>
            Budget distribution requires backend tables that are not yet configured. You can view organizational units
            but cannot assign budgets at this time.
          </AlertDescription>
        </Alert>

        <div className="gba:flex gba:items-center gba:gap-3">
          <Select value={selectedCompanyId ?? undefined} onValueChange={val => setSelectedCompanyId(val || null)}>
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

        {companiesLoading && (
          <div className="gba:flex gba:justify-center gba:py-12">
            <Spinner />
          </div>
        )}

        {!companiesLoading && selectedCompanyId && (
          <>
            <DistributionCriteriaSelector
              selectedMethod={selectedMethod}
              onMethodChange={setDistributionMethod}
              disabled
            />
            <OrgUnitBudgetTable accessToken={accessToken} companyId={selectedCompanyId} />
          </>
        )}

        {!companiesLoading && !selectedCompanyId && (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:text-muted-foreground">
            Select a company to view its organizational units.
          </div>
        )}
      </div>
    </PageLayout>
  )
}
