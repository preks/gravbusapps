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

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

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
    setMonth(parseInt(value, 10), selectedYear)
  }

  const handleYearChange = (value: string) => {
    setMonth(selectedMonth, parseInt(value, 10))
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
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

      <div className="gba:min-w-[140px]">
        <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('select-month')} />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
  )
}
