import React from 'react'
import { Select, Space, Button } from 'antd'
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons'
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

  return (
    <div
      data-testid="salary-search-container"
      className="gba:flex gba:flex-col gba:gap-4 gba:mb-6 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between"
    >
      <div className="gba:w-full gba:sm:w-64 gba:relative">
        <div className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:pointer-events-none gba:text-muted-foreground">
          <SearchOutlined />
        </div>
        <DebouncedInput
          value={searchValue}
          placeholder={getTranslationFromI18nKeyAndLabel('salary.search.placeholder', 'Search salaries...')}
          onChange={handleSearchChange}
          data-testid="salary-search-input"
          className={`gba:pl-10 gba:pr-4 gba:py-2 gba:w-full gba:border gba:rounded-md gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-focus gba:focus:border-transparent ${loading ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
        />
      </div>

      <Space wrap>
        <Select
          placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.type', 'Salary Type')}
          onChange={value => handleFilterChange({ salaryType: value })}
          value={filters.salaryType}
          allowClear
          style={{ width: 140 }}
          data-testid="salary-type-filter"
          disabled={loading}
        >
          <Select.Option value={SalaryType.MONTHLY}>
            {getTranslationFromI18nKeyAndLabel('salary.type.monthly', 'Monthly')}
          </Select.Option>
          <Select.Option value={SalaryType.HOURLY}>
            {getTranslationFromI18nKeyAndLabel('salary.type.hourly', 'Hourly')}
          </Select.Option>
        </Select>

        <Select
          placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.frequency', 'Frequency')}
          onChange={value => handleFilterChange({ paymentFrequency: value })}
          value={filters.paymentFrequency}
          allowClear
          style={{ width: 140 }}
          data-testid="salary-frequency-filter"
          disabled={loading}
        >
          {Object.values(PaymentFrequency).map(frequency => (
            <Select.Option key={frequency} value={frequency}>
              {frequency.replace('_', ' ')}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder={getTranslationFromI18nKeyAndLabel('salary.filter.status', 'Status')}
          onChange={value => handleFilterChange({ isActive: value })}
          value={filters.isActive}
          allowClear
          style={{ width: 140 }}
          data-testid="salary-status-filter"
          disabled={loading}
        >
          <Select.Option value={true}>
            {getTranslationFromI18nKeyAndLabel('salary.status.active', 'Active')}
          </Select.Option>
          <Select.Option value={false}>
            {getTranslationFromI18nKeyAndLabel('salary.status.inactive', 'Inactive')}
          </Select.Option>
        </Select>

        <Button
          icon={<FilterOutlined />}
          onClick={() => onFilterChange(filters)}
          data-testid="salary-apply-filters-button"
          disabled={loading}
        >
          {getTranslationFromI18nKeyAndLabel('salary.filter.apply', 'Apply')}
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={handleReset}
          data-testid="salary-reset-filters-button"
          disabled={loading}
        >
          {getTranslationFromI18nKeyAndLabel('salary.filter.reset', 'Reset')}
        </Button>
      </Space>
    </div>
  )
}

export default SalarySearch
