import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'

export interface BudgetPlanSelectorCompany {
  id: string
  name: string
}

interface BudgetPlanSelectorProps {
  companies: BudgetPlanSelectorCompany[]
  companiesLoading: boolean
  selectedCompanyId: string | null
  onCompanyChange: (companyId: string | null) => void
  t: (key: string) => string
}

export const BudgetPlanSelector: React.FC<BudgetPlanSelectorProps> = ({
  companies,
  companiesLoading,
  selectedCompanyId,
  onCompanyChange,
  t
}) => {
  const companySelectValue =
    selectedCompanyId != null && companies.some(c => c.id === selectedCompanyId) ? selectedCompanyId : undefined

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap" data-testid="budget-plan-selector">
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
          {t('selector-company-label')}
        </span>
        <div className="gba:min-w-[240px]">
          <Select
            value={companySelectValue}
            onValueChange={val => onCompanyChange(val || null)}
            disabled={companiesLoading || companies.length === 0}
          >
            <SelectTrigger data-testid="budget-plan-selector-company">
              <SelectValue placeholder={companiesLoading ? t('selector-loading') : t('selector-company-placeholder')} />
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
    </div>
  )
}
