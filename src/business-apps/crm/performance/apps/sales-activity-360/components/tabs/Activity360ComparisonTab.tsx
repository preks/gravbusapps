import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import { useEmployeeComparisonData, EmployeeComparison } from './hooks/useEmployeeComparisonData'
import { Button, Spinner, Avatar, AvatarImage, AvatarFallback, Badge, Card, Combobox } from '@newwork/nw-design-system'
import {
  UsersThreeIcon,
  XIcon,
  TrendUpIcon,
  TrendDownIcon,
  MinusIcon,
  BuildingsIcon,
  BriefcaseIcon
} from '@phosphor-icons/react'
import { getEmployeeAvatarSrc } from '../utils/avatarUtils'

interface Activity360ComparisonTabProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  filter: ActivityViewFilter
  entityId?: string
}

const DATA_TEST_ID_PREFIX = 'SalesActivity360-Comparison'
const MAX_COMPARISON_EMPLOYEES = 4

// Helper to get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Metric row component for compact display
const MetricRow: React.FC<{ label: string; value: number | string; highlight?: boolean }> = ({
  label,
  value,
  highlight = false
}) => (
  <div className="gba:flex gba:justify-between gba:items-center">
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
    <span className={`gba:text-sm gba:tabular-nums ${highlight ? 'gba:font-semibold' : ''}`}>{value}</span>
  </div>
)

// Trend display component
const TrendDisplay: React.FC<{ trend: number }> = ({ trend }) => {
  const isPositive = trend > 0
  const isNegative = trend < 0

  let trendIcon: React.ReactNode
  if (isPositive) {
    trendIcon = <TrendUpIcon className="gba:w-3 gba:h-3" />
  } else if (isNegative) {
    trendIcon = <TrendDownIcon className="gba:w-3 gba:h-3" />
  } else {
    trendIcon = <MinusIcon className="gba:w-3 gba:h-3" />
  }

  return (
    <div
      className={`gba:flex gba:items-center gba:justify-center gba:gap-1 gba:text-xs gba:font-medium gba:px-2 gba:py-1 gba:rounded ${
        isPositive
          ? 'gba:bg-success/10 gba:text-success'
          : isNegative
            ? 'gba:bg-destructive/10 gba:text-destructive'
            : 'gba:bg-muted gba:text-muted-foreground'
      }`}
    >
      {trendIcon}
      <span className="gba:tabular-nums">
        {trend > 0 ? '+' : ''}
        {trend.toFixed(0)}%
      </span>
    </div>
  )
}

export const Activity360ComparisonTab: React.FC<Activity360ComparisonTabProps> = ({
  accessToken,
  filter,
  entityId
}) => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  // Determine entity type for filtering
  const entityType = useMemo(() => {
    if (filter === 'by-account' && entityId) return 'accountId'
    if (filter === 'by-contact' && entityId) return 'contactId'
    if (filter === 'by-lead' && entityId) return 'leadId'
    if (filter === 'by-opportunity' && entityId) return 'opportunityId'
    return undefined
  }, [filter, entityId])

  // Paginated employee list + on-demand metrics
  const {
    employeeOptions,
    optionsById,
    optionsLoading,
    hasMore,
    error,
    loadMore,
    search,
    metricsById,
    metricsLoadingById,
    loadEmployeeMetrics
  } = useEmployeeComparisonData({
    accessToken,
    entityId,
    entityType
  })

  // Selected employees combine cached display info + metrics (when loaded)
  const selectedEmployees = useMemo(() => {
    return selectedEmployeeIds
      .map(id => optionsById[id])
      .filter(Boolean)
      .map(option => {
        const metrics = metricsById[option.id]
        if (metrics) {
          return { ...option, ...metrics }
        }
        return { ...option }
      }) as EmployeeComparison[]
  }, [selectedEmployeeIds, optionsById, metricsById])

  // Combobox options exclude already-selected employees
  const comboboxOptions = useMemo(() => {
    return employeeOptions
      .filter(emp => !selectedEmployeeIds.includes(emp.id))
      .map(emp => {
        const positionParts = [emp.organizationalUnit, emp.jobPosition].filter(Boolean)
        return {
          value: emp.id,
          label: (
            <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
              <Avatar size="sm" className="gba:shrink-0">
                {getEmployeeAvatarSrc(emp.pictureThumbnail) && (
                  <AvatarImage src={getEmployeeAvatarSrc(emp.pictureThumbnail)} alt={emp.displayName} />
                )}
                <AvatarFallback className="gba:text-xs">{getInitials(emp.displayName)}</AvatarFallback>
              </Avatar>
              <div className="gba:flex-1 gba:min-w-0 gba:text-left">
                <div className="gba:text-sm gba:font-medium gba:truncate">{emp.displayName}</div>
                {positionParts.length > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground gba:truncate">
                    {emp.organizationalUnit && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:truncate">
                        <BuildingsIcon className="gba:w-3 gba:h-3 gba:shrink-0" />
                        {emp.organizationalUnit}
                      </span>
                    )}
                    {emp.organizationalUnit && emp.jobPosition && <span>·</span>}
                    {emp.jobPosition && (
                      <span className="gba:flex gba:items-center gba:gap-1 gba:truncate">
                        <BriefcaseIcon className="gba:w-3 gba:h-3 gba:shrink-0" />
                        {emp.jobPosition}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      })
  }, [employeeOptions, selectedEmployeeIds])

  // Handlers
  const handleAddEmployee = useCallback(
    (employeeId: string | null) => {
      if (
        employeeId &&
        !selectedEmployeeIds.includes(employeeId) &&
        selectedEmployeeIds.length < MAX_COMPARISON_EMPLOYEES
      ) {
        setSelectedEmployeeIds(prev => [...prev, employeeId])
        loadEmployeeMetrics(employeeId)
      }
    },
    [selectedEmployeeIds, loadEmployeeMetrics]
  )

  const handleRemoveEmployee = useCallback((employeeId: string) => {
    setSelectedEmployeeIds(prev => prev.filter(id => id !== employeeId))
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedEmployeeIds([])
  }, [])

  // Error state
  if (error) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:text-center gba:max-w-md">
          <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => search('')}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Employee Selector - Top */}
      <Card className="gba:p-4">
        <div className="gba:flex gba:flex-col gba:gap-4">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2">
              <UsersThreeIcon className="gba:w-5 gba:h-5 gba:text-primary" />
              <h3 className="gba:text-sm gba:font-semibold">Compare Employees</h3>
              <span className="gba:text-xs gba:text-muted-foreground">
                ({selectedEmployeeIds.length}/{MAX_COMPARISON_EMPLOYEES})
              </span>
            </div>
            {selectedEmployees.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearSelection} className="gba:text-xs gba:h-7">
                Clear All
              </Button>
            )}
          </div>

          {/* Selected Employees Chips + Add Selector */}
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            {/* Selected employee chips */}
            {selectedEmployees.map(emp => (
              <Badge
                key={emp.id}
                variant="secondary"
                className="gba:inline-flex gba:h-8 gba:max-w-72 gba:items-center gba:overflow-hidden gba:pl-1 gba:pr-1 gba:py-1 gba:gap-2 gba:text-sm"
              >
                <Avatar className="gba:!h-6 gba:!w-6 gba:!min-w-6 gba:!max-w-6 gba:shrink-0 gba:overflow-hidden gba:rounded-full">
                  {getEmployeeAvatarSrc(emp.pictureThumbnail) && (
                    <AvatarImage
                      src={getEmployeeAvatarSrc(emp.pictureThumbnail)}
                      alt={emp.displayName}
                      className="gba:h-full gba:w-full gba:rounded-full gba:object-cover"
                    />
                  )}
                  <AvatarFallback className="gba:text-[10px]">{getInitials(emp.displayName)}</AvatarFallback>
                </Avatar>
                <span className="gba:flex-1 gba:min-w-0 gba:max-w-40 gba:truncate" title={emp.displayName}>
                  {emp.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveEmployee(emp.id)}
                  className="gba:ml-1 gba:shrink-0 gba:p-0.5 gba:rounded-full hover:gba:bg-background/50 gba:transition-colors"
                >
                  <XIcon className="gba:w-3 gba:h-3" />
                </button>
              </Badge>
            ))}

            {/* Add employee combobox */}
            {selectedEmployeeIds.length < MAX_COMPARISON_EMPLOYEES && (
              <div className="gba:w-64">
                <Combobox
                  className="gba:[&&]:h-auto"
                  value=""
                  onValueChange={handleAddEmployee}
                  options={comboboxOptions}
                  placeholder={selectedEmployees.length === 0 ? 'Select employees to compare...' : 'Add another...'}
                  searchPlaceholder="Search employees..."
                  emptyText={optionsLoading ? 'Loading...' : 'No employees found'}
                  onSearch={search}
                  searchDebounce={300}
                  loading={optionsLoading}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  align="start"
                  data-testid={`${DATA_TEST_ID_PREFIX}-employee-select`}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comparison Cards - Only show when employees are selected */}
      {selectedEmployees.length > 0 && (
        <div className="gba:flex gba:gap-4 gba:overflow-x-auto gba:pb-2">
          {selectedEmployees.map(employee => (
            <Card
              key={employee.id}
              className="gba:flex-shrink-0 gba:w-56"
              data-testid={`${DATA_TEST_ID_PREFIX}-card-${employee.id}`}
            >
              {/* Employee Header */}
              <div className="gba:p-3 gba:border-b gba:border-border">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Avatar size="sm" className="gba:shrink-0">
                    {getEmployeeAvatarSrc(employee.pictureThumbnail) && (
                      <AvatarImage src={getEmployeeAvatarSrc(employee.pictureThumbnail)} alt={employee.displayName} />
                    )}
                    <AvatarFallback className="gba:text-xs">{getInitials(employee.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="gba:min-w-0 gba:flex-1">
                    <div className="gba:text-sm gba:font-semibold gba:truncate" title={employee.displayName}>
                      {employee.displayName}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate" title={employee.jobPosition}>
                      {employee.jobPosition || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {metricsLoadingById[employee.id] || !metricsById[employee.id] ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-10">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="gba:p-3 gba:space-y-2">
                  <MetricRow label="Total" value={employee.totalActivities} highlight />
                  <MetricRow label="This Week" value={employee.thisWeekActivities} />
                  <MetricRow label="This Month" value={employee.thisMonthActivities} />
                  <MetricRow label="Last 30 Days" value={employee.last30DaysActivities} />

                  {/* Trend */}
                  <div className="gba:pt-2 gba:border-t gba:border-border">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span className="gba:text-xs gba:text-muted-foreground">30-Day Trend</span>
                      <TrendDisplay trend={employee.trend} />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty comparison state */}
      {selectedEmployees.length === 0 && (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-center">
          <UsersThreeIcon className="gba:w-16 gba:h-16 gba:text-muted-foreground/30 gba:mb-4" />
          <h3 className="gba:text-lg gba:font-medium gba:text-muted-foreground gba:mb-2">No Employees Selected</h3>
          <p className="gba:text-sm gba:text-muted-foreground/70 gba:max-w-sm">
            Use the dropdown above to select up to {MAX_COMPARISON_EMPLOYEES} employees and compare their activity
            metrics side-by-side.
          </p>
        </div>
      )}
    </div>
  )
}

export default Activity360ComparisonTab
