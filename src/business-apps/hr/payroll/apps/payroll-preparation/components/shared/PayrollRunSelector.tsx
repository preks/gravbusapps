import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { usePayrollRunStore } from '../../hooks/usePayrollRunStore'
import type { PayrollCompany } from '../../hooks/usePayrollEmployees'

interface PayrollRunSelectorProps {
  companies: PayrollCompany[]
  companiesLoading: boolean
  onCompanyChange?: (company: PayrollCompany) => void
  t: (key: string) => string
}

export const PayrollRunSelector: React.FC<PayrollRunSelectorProps> = ({
  companies,
  companiesLoading,
  onCompanyChange,
  t
}) => {
  const { selectedCompanyId, setCompany } = usePayrollRunStore()

  const handleCompanyChange = (value: string) => {
    const company = companies.find(c => c.id === value)
    if (company) {
      setCompany(company.id, company.name)
      onCompanyChange?.(company)
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
          {t('label-company')}
        </span>
        <div className="gba:min-w-[240px]">
          <Select value={selectedCompanyId || ''} onValueChange={handleCompanyChange}>
            <SelectTrigger>
              <SelectValue placeholder={companiesLoading ? t('loading') : t('select-company')} />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.countryCode ? `${company.name} (${company.countryCode})` : company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
