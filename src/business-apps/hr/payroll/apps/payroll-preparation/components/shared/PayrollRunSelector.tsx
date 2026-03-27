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

const MONTH_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  return [current - 1, current, current + 1]
}

export const PayrollRunSelector: React.FC<PayrollRunSelectorProps> = ({
  companies,
  companiesLoading,
  onCompanyChange,
  t
}) => {
  const { selectedCompanyId, selectedMonth, selectedYear, setCompany, setMonth } = usePayrollRunStore()

  const handleCompanyChange = (value: string) => {
    const company = companies.find(c => c.id === value)
    if (company) {
      setCompany(company.id, company.name)
      onCompanyChange?.(company)
    }
  }

  const handleMonthChange = (value: string) => {
    setMonth(Number.parseInt(value, 10), selectedYear)
  }

  const handleYearChange = (value: string) => {
    setMonth(selectedMonth, Number.parseInt(value, 10))
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

      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
          {t('label-month')}
        </span>
        <div className="gba:min-w-[140px]">
          <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('select-month')} />
            </SelectTrigger>
            <SelectContent>
              {MONTH_VALUES.map(m => (
                <SelectItem key={m} value={String(m)}>
                  {t(`month-${m}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">{t('label-year')}</span>
        <div className="gba:min-w-[100px]">
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearOptions().map(y => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
