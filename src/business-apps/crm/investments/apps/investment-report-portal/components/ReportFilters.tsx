import React from 'react'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@newwork/nw-design-system'
import { MagnifyingGlass, Funnel, X } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { ReportScope } from '@/common/data/investment'
import dayjs from 'dayjs'

interface ReportFiltersProps {
  filters: {
    search: string
    investmentType: 'ALL' | string
    reportScope: 'ALL' | ReportScope
    dateRange: [string, string] | null
    status: 'ALL' | string
  }
  onFiltersChange: (filters: any) => void
  prefixDataTestId: string
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, onFiltersChange, prefixDataTestId }) => {
  const investmentTypeOptions = [
    { value: 'ALL', label: getTranslationFromI18nKeyAndLabel('filter.investmentType.all', 'All Types') },
    { value: 'EQUITY', label: getTranslationFromI18nKeyAndLabel('investment.type.equity', 'Equity') },
    { value: 'REAL_ESTATE', label: getTranslationFromI18nKeyAndLabel('investment.type.realEstate', 'Real Estate') },
    { value: 'LIQUID_FUND', label: getTranslationFromI18nKeyAndLabel('investment.type.liquidFund', 'Liquid Fund') }
  ]

  const reportScopeOptions = [
    { value: 'ALL', label: getTranslationFromI18nKeyAndLabel('filter.reportScope.all', 'All Scopes') },
    ...Object.values(ReportScope).map(scope => ({
      value: scope,
      label: getTranslationFromI18nKeyAndLabel(`report.scope.${scope.toLowerCase()}`, scope.replace(/_/g, ' '))
    }))
  ]

  const statusOptions = [
    { value: 'ALL', label: getTranslationFromI18nKeyAndLabel('filter.status.all', 'All Statuses') },
    { value: 'ACTIVE', label: getTranslationFromI18nKeyAndLabel('report.status.active', 'Active') },
    { value: 'ARCHIVED', label: getTranslationFromI18nKeyAndLabel('report.status.archived', 'Archived') }
  ]

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      investmentType: 'ALL',
      reportScope: 'ALL',
      dateRange: null,
      status: 'ALL'
    })
  }

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'ReportFilters')}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}
      >
        <div>
          <DebouncedInput
            data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
            placeholder={getTranslationFromI18nKeyAndLabel('filter.search.placeholder', 'Search reports...')}
            value={filters.search}
            onChange={value => handleFilterChange('search', value)}
          />
        </div>

        <div>
          <Select
            value={filters.investmentType || 'ALL'}
            onValueChange={value => handleFilterChange('investmentType', value)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel('filter.investmentType.placeholder', 'Investment Type')}
              />
            </SelectTrigger>
            <SelectContent>
              {investmentTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={filters.reportScope || 'ALL'}
            onValueChange={value => handleFilterChange('reportScope', value)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel('filter.reportScope.placeholder', 'Report Scope')}
              />
            </SelectTrigger>
            <SelectContent>
              {reportScopeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Input
            data-testid={formatDataTestId(prefixDataTestId, 'DateRangeInput')}
            placeholder={getTranslationFromI18nKeyAndLabel('filter.dateRange.placeholder', 'Date Range')}
            value={filters.dateRange ? `${filters.dateRange[0]} - ${filters.dateRange[1]}` : ''}
            readOnly
            style={{ cursor: 'pointer' }}
            onClick={() => {
              // TODO: Implement date range picker
              console.log('Date range picker clicked')
            }}
          />
        </div>

        <div>
          <Select value={filters.status || 'ALL'} onValueChange={value => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('filter.status.placeholder', 'Status')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Button
            data-testid={formatDataTestId(prefixDataTestId, 'ClearFiltersButton')}
            variant="outline"
            onClick={handleClearFilters}
          >
            <X size={16} style={{ marginRight: '8px' }} />
            {getTranslationFromI18nKeyAndLabel('button.clearFilters', 'Clear')}
          </Button>
        </div>
      </div>
    </div>
  )
}
