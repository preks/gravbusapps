import React, { useMemo, useCallback, useState } from 'react'
import { PiListBullets, PiUser, PiBuilding, PiUserCircle, PiTarget, PiHandshake, PiChartLineUp } from 'react-icons/pi'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ViewSelectorProps, ActivityViewFilter } from '../../types'
import { ViewOption, EmployeePerformance } from './types/ViewSelectorTypes'
import { useViewSelectorData } from './hooks/useViewSelectorData'
import { AIInsightsSection, ViewOptionsGrid, EntitySelectorOverlay } from './components'
import dayjs from 'dayjs'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-ViewSelector'

// Extended props to include entity selection callback
interface ExtendedViewSelectorProps extends ViewSelectorProps {
  onEntitySelect?: (filter: ActivityViewFilter, entityId: string, entityName: string) => void
}

export const ViewSelector: React.FC<ExtendedViewSelectorProps> = ({
  onSelect,
  onEmployeeSelect,
  onEntitySelect,
  accessToken
}) => {
  // State for entity selector overlay
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<ActivityViewFilter>('all')
  // Use custom hook for all data fetching
  const { stats, topPerformers, underperformers, onLeave, loading, insightsLoading, lastUpdated } =
    useViewSelectorData(accessToken)

  // Handle employee click - navigate to their activities
  const handleEmployeeClick = useCallback(
    (emp: EmployeePerformance) => {
      const name =
        emp.employee.displayName || `${emp.employee.firstName || ''} ${emp.employee.lastName || ''}`.trim() || 'Unknown'

      if (onEmployeeSelect) {
        onEmployeeSelect(emp.employee.id, name)
      } else if (onEntitySelect) {
        onEntitySelect('by-employee', emp.employee.id, name)
      } else {
        onSelect('by-employee')
      }
    },
    [onSelect, onEmployeeSelect, onEntitySelect]
  )

  // Handle view option click - open overlay for entity-specific views
  const handleViewOptionSelect = useCallback(
    (filter: ActivityViewFilter) => {
      if (filter === 'all') {
        // "All Activities" goes directly
        onSelect('all')
      } else {
        // Entity-specific views open the overlay
        setSelectedEntityType(filter)
        setOverlayOpen(true)
      }
    },
    [onSelect]
  )

  // Handle entity selection from overlay
  const handleEntitySelect = useCallback(
    (entityId: string, entityName: string) => {
      if (onEntitySelect) {
        onEntitySelect(selectedEntityType, entityId, entityName)
      } else if (selectedEntityType === 'by-employee' && onEmployeeSelect) {
        onEmployeeSelect(entityId, entityName)
      } else {
        // Fallback: just call onSelect with the filter
        onSelect(selectedEntityType)
      }
    },
    [selectedEntityType, onEntitySelect, onEmployeeSelect, onSelect]
  )

  // KPI widgets with rolling trends
  const kpiWidgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'last-14-days',
        title: 'Last 14 Days',
        value: stats?.last30Days || 0,
        prefix: 'calendar',
        description:
          stats?.rollingTrend !== undefined
            ? `${stats.rollingTrend >= 0 ? '+' : ''}${stats.rollingTrend}% vs prev 14 days`
            : 'Rolling period'
      },
      {
        key: 'this-quarter',
        title: 'This Quarter',
        value: stats?.thisQuarter || 0,
        prefix: 'calendar',
        description:
          stats?.quarterTrend !== undefined
            ? `${stats.quarterTrend >= 0 ? '+' : ''}${stats.quarterTrend}% vs last quarter`
            : 'Current quarter'
      },
      {
        key: 'active-employees',
        title: 'Active Team',
        value: stats?.activeEmployees || 0,
        prefix: 'users',
        description: 'Employees with activities'
      },
      {
        key: 'total-activities',
        title: 'All Time',
        value: stats?.total || 0,
        prefix: 'calendar',
        description: 'Total activities'
      }
    ],
    [stats]
  )

  // View options
  const viewOptions: ViewOption[] = useMemo(
    () => [
      {
        id: 'all',
        title: 'All Activities',
        subtitle: 'Complete overview',
        icon: <PiListBullets className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-primary',
        iconColor: 'gba:text-primary-foreground',
        count: stats?.total
      },
      {
        id: 'by-employee',
        title: 'By Employee',
        subtitle: `${stats?.activeEmployees || 0} active`,
        icon: <PiUser className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-secondary',
        iconColor: 'gba:text-secondary-foreground',
        count: stats?.activeEmployees
      },
      {
        id: 'by-account',
        title: 'By Account',
        subtitle: 'Account activities',
        icon: <PiBuilding className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-accent',
        iconColor: 'gba:text-accent-foreground',
        count: stats?.byAccount
      },
      {
        id: 'by-lead',
        title: 'By Lead',
        subtitle: 'Lead engagement',
        icon: <PiTarget className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-secondary',
        iconColor: 'gba:text-secondary-foreground',
        count: stats?.byLead
      },
      {
        id: 'by-opportunity',
        title: 'By Opportunity',
        subtitle: 'Deal activities',
        icon: <PiHandshake className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-accent',
        iconColor: 'gba:text-accent-foreground',
        count: stats?.byOpportunity
      },
      {
        id: 'by-contact',
        title: 'By Contact',
        subtitle: 'Contact touchpoints',
        icon: <PiUserCircle className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-muted',
        iconColor: 'gba:text-muted-foreground',
        count: stats?.byContact
      }
    ],
    [stats]
  )

  const formatLastUpdated = () => {
    return dayjs(lastUpdated).format('HH:mm:ss')
  }

  return (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Compact Header with Quick Access */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:bg-primary/10 gba:text-primary">
              <PiChartLineUp className="gba:w-4 gba:h-4" />
              <span className="gba:text-sm gba:font-semibold">Sales Activity 360°</span>
            </div>

            {/* Live indicator */}
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
              <span className="gba:relative gba:flex gba:h-2 gba:w-2">
                <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-success gba:opacity-75"></span>
                <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-success"></span>
              </span>
              <span>Live • {formatLastUpdated()}</span>
            </div>
          </div>
        </div>

        {/* View Options - Quick Access Bar */}
        <ViewOptionsGrid options={viewOptions} loading={loading} onSelect={handleViewOptionSelect} />
      </div>

      {/* Global KPI Cards */}
      <WidgetGroup
        widgets={kpiWidgets}
        isLoading={loading}
        skeletonCount={4}
        data-testid={`${DATA_TEST_ID_PREFIX}-kpis`}
      />

      {/* AI Insights Section */}
      <AIInsightsSection
        stats={stats}
        topPerformers={topPerformers}
        underperformers={underperformers}
        onLeave={onLeave}
        loading={insightsLoading}
        onEmployeeClick={handleEmployeeClick}
      />

      {/* Entity Selector Overlay */}
      <EntitySelectorOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        entityType={selectedEntityType}
        accessToken={accessToken}
        onSelect={handleEntitySelect}
      />
    </div>
  )
}

export default ViewSelector
