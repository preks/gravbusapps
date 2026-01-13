// Report Filters Component for Investment Reports
import React from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { DatePicker } from 'antd'
import { FunnelIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface ReportFiltersProps {
  timeFilter: string
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  onTimeFilterChange: (value: string) => void
  onDateRangeChange: (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => void
  onClearFilters: () => void
  headerActions?: React.ReactNode
  'data-testid'?: string
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  timeFilter,
  dateRange,
  onTimeFilterChange,
  onDateRangeChange,
  onClearFilters,
  headerActions,
  'data-testid': dataTestId = 'report-filters'
}) => {
  return (
    <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm gba:mb-6" data-testid={dataTestId}>
      <div className="gba:p-4 gba:border-b">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <FunnelIcon className="gba:w-4 gba:h-4" />
            <h3 className="gba:text-sm gba:font-medium">Filters</h3>
          </div>
          {headerActions && (
            <div className="gba:flex gba:items-center gba:gap-2" data-testid="report-filters-header-actions">
              {headerActions}
            </div>
          )}
        </div>
      </div>
      <div className="gba:p-4">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <label className="gba:text-sm gba:font-medium">Time Period:</label>
            <Select value={timeFilter} onValueChange={onTimeFilterChange}>
              <SelectTrigger className="gba:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last3months">Last 3 Months</SelectItem>
                <SelectItem value="last6months">Last 6 Months</SelectItem>
                <SelectItem value="lastyear">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <label className="gba:text-sm gba:font-medium">Date Range:</label>
            <RangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              format="DD/MM/YYYY"
              placeholder={['Start Date', 'End Date']}
            />
          </div>

          <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto">
            <Button onClick={onClearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportFilters
