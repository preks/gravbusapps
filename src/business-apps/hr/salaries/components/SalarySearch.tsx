import React from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, FunnelIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { SalaryType, PaymentFrequency } from '../types/salaryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SalarySearchProps {
  onSearch: (value: string) => void
  onFilterChange: (filters: SalarySearchFilters) => void
  onReset: () => void
  loading?: boolean
}

export interface SalarySearchFilters {
  salaryType?: SalaryType
  paymentFrequency?: PaymentFrequency
  isActive?: boolean
}

/**
 * SalarySearch component for searching and filtering salary data
 * Uses the required DebouncedInput component for search functionality
 */
const SalarySearch: React.FC<SalarySearchProps> = ({ onSearch, onFilterChange, onReset, loading = false }) => {
  const [filters, setFilters] = React.useState<SalarySearchFilters>({})
  const [searchValue, setSearchValue] = React.useState<string>('')

  const handleFilterChange = (newFilters: SalarySearchFilters) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onSearch(value)
  }

  const handleReset = () => {
    setFilters({})
    setSearchValue('')
    onReset()
  }

  const handleSalaryTypeChange = (value: string) => {
    handleFilterChange({ salaryType: value === 'all' ? undefined : (value as SalaryType) })
  }

  const handlePaymentFrequencyChange = (value: string) => {
    handleFilterChange({ paymentFrequency: value === 'all' ? undefined : (value as PaymentFrequency) })
  }

  const handleStatusChange = (value: string) => {
    const isActive = value === 'all' ? undefined : value === 'active'
    handleFilterChange({ isActive })
  }

  return (
    <div
      data-testid="salary-search-container"
      className="gba:flex gba:flex-col gba:gap-4 gba:mb-6 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between"
    >
      <div className="gba:w-full gba:sm:w-64 gba:relative">
        <div className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:pointer-events-none gba:text-muted-foreground">
          <MagnifyingGlassIcon size={16} />
        </div>
        <DebouncedInput
          value={searchValue}
          placeholder={getTranslationFromI18nKeyAndLabel('salary.search.placeholder', 'Search salaries...')}
          onChange={handleSearchChange}
          data-testid="salary-search-input"
          className={`gba:pl-10 gba:pr-4 gba:py-2 gba:w-full gba:border gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-focus gba:focus:border-transparent ${loading ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
        />
      </div>

      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Select
          value={filters.salaryType ?? 'all'}
          onValueChange={handleSalaryTypeChange}
          disabled={loading}
        >
          <SelectTrigger className="gba:w-36" data-testid="salary-type-filter">
            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.type', 'Salary Type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{getTranslationFromI18nKeyAndLabel('common.all', 'All')}</SelectItem>
            <SelectItem value={SalaryType.MONTHLY}>
              {getTranslationFromI18nKeyAndLabel('salary.type.monthly', 'Monthly')}
            </SelectItem>
            <SelectItem value={SalaryType.HOURLY}>
              {getTranslationFromI18nKeyAndLabel('salary.type.hourly', 'Hourly')}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentFrequency ?? 'all'}
          onValueChange={handlePaymentFrequencyChange}
          disabled={loading}
        >
          <SelectTrigger className="gba:w-36" data-testid="salary-frequency-filter">
            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.frequency', 'Frequency')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{getTranslationFromI18nKeyAndLabel('common.all', 'All')}</SelectItem>
            {Object.values(PaymentFrequency).map(frequency => (
              <SelectItem key={frequency} value={frequency}>
                {frequency.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'} onValueChange={handleStatusChange} disabled={loading}>
          <SelectTrigger className="gba:w-36" data-testid="salary-status-filter">
            <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{getTranslationFromI18nKeyAndLabel('common.all', 'All')}</SelectItem>
            <SelectItem value="active">{getTranslationFromI18nKeyAndLabel('salary.status.active', 'Active')}</SelectItem>
            <SelectItem value="inactive">
              {getTranslationFromI18nKeyAndLabel('salary.status.inactive', 'Inactive')}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          onClick={() => onFilterChange(filters)}
          data-testid="salary-apply-filters-button"
          disabled={loading}
        >
          <FunnelIcon size={16} className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('salary.filter.apply', 'Apply')}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          data-testid="salary-reset-filters-button"
          disabled={loading}
        >
          <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('salary.filter.reset', 'Reset')}
        </Button>
      </div>
    </div>
  )
}

export default SalarySearch
