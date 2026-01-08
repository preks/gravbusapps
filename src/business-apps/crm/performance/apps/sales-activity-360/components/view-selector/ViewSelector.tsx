import React, { useMemo, useCallback, useState } from 'react'
import {
  ListBulletsIcon,
  UserIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon,
  UserCircleIcon
} from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ViewSelectorProps, ActivityViewFilter } from '../../types'
import { ViewOption, EmployeePerformance } from './types/ViewSelectorTypes'
import { useViewSelectorData } from './hooks/useViewSelectorData'
import { AIInsightsSection } from './components/AIInsightsSection'
import { ViewOptionsGrid } from './components/ViewOptionsGrid'
import { EntitySelectorOverlay } from './components/EntitySelectorOverlay'

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
  const { stats, topPerformers, underperformers, onLeave, loading, insightsLoading } = useViewSelectorData(accessToken)

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
        icon: <ListBulletsIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-primary',
        iconColor: 'gba:text-primary-foreground',
        count: stats?.total
      },
      {
        id: 'by-employee',
        title: 'By Employee',
        subtitle: `${stats?.activeEmployees || 0} active`,
        icon: <UserIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-secondary',
        iconColor: 'gba:text-secondary-foreground',
        count: stats?.activeEmployees
      },
      {
        id: 'by-account',
        title: 'By Account',
        subtitle: 'Account activities',
        icon: <BuildingIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-accent',
        iconColor: 'gba:text-accent-foreground',
        count: stats?.byAccount
      },
      {
        id: 'by-lead',
        title: 'By Lead',
        subtitle: 'Lead engagement',
        icon: <TargetIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-secondary',
        iconColor: 'gba:text-secondary-foreground',
        count: stats?.byLead
      },
      {
        id: 'by-opportunity',
        title: 'By Opportunity',
        subtitle: 'Deal activities',
        icon: <HandshakeIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-accent',
        iconColor: 'gba:text-accent-foreground',
        count: stats?.byOpportunity
      },
      {
        id: 'by-contact',
        title: 'By Contact',
        subtitle: 'Contact touchpoints',
        icon: <UserCircleIcon className="gba:w-5 gba:h-5" />,
        iconBg: 'gba:bg-muted',
        iconColor: 'gba:text-muted-foreground',
        count: stats?.byContact
      }
    ],
    [stats]
  )

  return (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Quick Access Bar */}
      <ViewOptionsGrid options={viewOptions} loading={loading} onSelect={handleViewOptionSelect} />

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
