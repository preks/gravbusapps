import React from 'react'
import {
  Card,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { Building2, Users, TrendingUp } from '@phosphor-icons/react'
import { OfficeUsageFilters, SiteLocationCapacity } from '../../types'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface OfficeUsageFilterBarProps {
  filters: OfficeUsageFilters
  onFiltersChange: (filters: Partial<OfficeUsageFilters>) => void
  locations: SiteLocationCapacity[]
  departments?: Array<{ id: string; name: string }>
  isLoading?: boolean
  prefixDataTestId?: string
}

export const OfficeUsageFilterBar: React.FC<OfficeUsageFilterBarProps> = ({
  filters,
  onFiltersChange,
  locations,
  departments = [],
  isLoading = false,
  prefixDataTestId = 'office-usage-filter-bar'
}) => {
  const handleDatePresetChange = (preset: string) => {
    let dateFrom: string
    let dateTo: string = dayjs().format('YYYY-MM-DD')

    switch (preset) {
      case 'today':
        dateFrom = dayjs().format('YYYY-MM-DD')
        break
      case 'this-week':
        dateFrom = dayjs().startOf('isoWeek').format('YYYY-MM-DD')
        dateTo = dayjs().endOf('isoWeek').format('YYYY-MM-DD')
        break
      case 'last-week':
        dateFrom = dayjs().subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD')
        dateTo = dayjs().subtract(1, 'week').endOf('isoWeek').format('YYYY-MM-DD')
        break
      case 'last-30-days':
        dateFrom = dayjs().subtract(30, 'days').format('YYYY-MM-DD')
        break
      default:
        return
    }

    onFiltersChange({
      dateFrom,
      dateTo,
      datePreset: preset as OfficeUsageFilters['datePreset']
    })
  }

  return (
    <Card className="gba:p-4 gba:mb-6" data-testid={prefixDataTestId}>
      <div className="gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
        {/* Date Range Preset Selector */}
        <div className="gba:min-w-[200px]">
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_date_range', 'Date Range')}
          </label>
          <Select value={filters.datePreset || 'custom'} onValueChange={handleDatePresetChange} disabled={isLoading}>
            <SelectTrigger data-testid={`${prefixDataTestId}-date-preset`}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_custom', 'Custom')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_today', 'Today')}
              </SelectItem>
              <SelectItem value="this-week">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_this_week', 'This Week')}
              </SelectItem>
              <SelectItem value="last-week">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_last_week', 'Last Week')}
              </SelectItem>
              <SelectItem value="last-30-days">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_last_30_days', 'Last 30 Days')}
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {dayjs(filters.dateFrom).format('MMM D, YYYY')} - {dayjs(filters.dateTo).format('MMM D, YYYY')}
          </div>
        </div>

        {/* Granularity Toggle */}
        <div>
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_granularity', 'View By')}
          </label>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={filters.granularity === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ granularity: 'day' })}
              disabled={isLoading}
              data-testid={`${prefixDataTestId}-granularity-day`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_granularity_day', 'Day')}
            </Button>
            <Button
              variant={filters.granularity === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ granularity: 'week' })}
              disabled={isLoading}
              data-testid={`${prefixDataTestId}-granularity-week`}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_granularity_week', 'Week')}
            </Button>
          </div>
        </div>

        {/* Location Filter */}
        <div className="gba:min-w-[200px]">
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            <Building2 className="gba:inline gba:mr-1" size={16} />
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_locations', 'Locations')}
          </label>
          <Select
            value={filters.selectedLocations.length === 0 ? 'all' : filters.selectedLocations[0]}
            onValueChange={value => {
              onFiltersChange({
                selectedLocations: value === 'all' ? [] : [value]
              })
            }}
            disabled={isLoading}
          >
            <SelectTrigger data-testid={`${prefixDataTestId}-location-filter`}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:office_usage.filter_all_locations',
                  'All Locations'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_all_locations', 'All Locations')}
              </SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.siteLocationId} value={loc.siteLocationId}>
                  {loc.name} {loc.locality && `(${loc.locality})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter (Optional) */}
        {departments.length > 0 && (
          <div className="gba:min-w-[200px]">
            <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
              <Users className="gba:inline gba:mr-1" size={16} />
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_departments', 'Departments')}
            </label>
            <Select
              value={filters.selectedDepartments?.[0] || 'all'}
              onValueChange={value => {
                onFiltersChange({
                  selectedDepartments: value === 'all' ? [] : [value]
                })
              }}
              disabled={isLoading}
            >
              <SelectTrigger data-testid={`${prefixDataTestId}-department-filter`}>
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:office_usage.filter_all_departments',
                    'All Departments'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.filter_all_departments', 'All Departments')}
                </SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* View Mode Indicator */}
        <div className="gba:ml-auto">
          <Badge variant="secondary">
            <TrendingUp className="gba:mr-1" size={14} />
            Office presence vs capacity
          </Badge>
        </div>
      </div>
    </Card>
  )
}
