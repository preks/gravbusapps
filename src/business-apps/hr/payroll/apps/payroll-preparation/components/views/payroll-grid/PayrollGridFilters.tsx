import React from 'react'
import {
  DebouncedInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FunnelIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { PayrollGridFilters as FilterState, PayrollEmployee } from '../../../types/payrollTypes'

interface PayrollGridFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  employees: PayrollEmployee[]
  t: (key: string) => string
}

export const PayrollGridFilters: React.FC<PayrollGridFiltersProps> = ({ filters, onFiltersChange, employees, t }) => {
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const updateFilter = (key: keyof FilterState, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap" data-testid="payroll-prep-grid-filters">
      <div className="gba:relative gba:flex-1 gba:min-w-[200px] gba:max-w-[320px]">
        <MagnifyingGlassIcon
          size={16}
          className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
        />
        <DebouncedInput
          value={filters.search}
          onChange={(val: string | number) => updateFilter('search', String(val))}
          placeholder={t('filter-search')}
          className="gba:pl-9"
          data-testid="payroll-prep-grid-search-input"
        />
      </div>

      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground">
        <FunnelIcon size={16} />
      </div>

      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
          {t('label-readiness')}
        </span>
        <div className="gba:min-w-[150px]">
          <Select value={filters.readinessStatus} onValueChange={(val: string) => updateFilter('readinessStatus', val)}>
            <SelectTrigger data-testid="payroll-prep-grid-readiness-select">
              <SelectValue placeholder={t('filter-readiness')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter-all')}</SelectItem>
              <SelectItem value="ready">{t('readiness-ready')}</SelectItem>
              <SelectItem value="warning">{t('readiness-warning')}</SelectItem>
              <SelectItem value="blocked">{t('readiness-blocked')}</SelectItem>
              <SelectItem value="excluded">{t('readiness-excluded')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {departments.length > 0 && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
            {t('label-department')}
          </span>
          <div className="gba:min-w-[150px]">
            <Select value={filters.department} onValueChange={(val: string) => updateFilter('department', val)}>
              <SelectTrigger data-testid="payroll-prep-grid-department-select">
                <SelectValue placeholder={t('filter-department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter-all')}</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:cursor-pointer">
        <input
          type="checkbox"
          checked={filters.changedOnly}
          onChange={e => updateFilter('changedOnly', e.target.checked)}
          className="gba:rounded gba:border-border"
          data-testid="payroll-prep-grid-changed-only-checkbox"
        />
        {t('filter-changed-only')}
      </label>
    </div>
  )
}
