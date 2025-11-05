/**
 * AssetStatistics Component
 * Displays KPI cards for asset overview
 * Uses WidgetGroup for consistent statistics display
 *
 * ✅ DESIGN SYSTEM COMPLIANCE: Uses design system color tokens
 */

import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { AssetStatistics as Stats } from '../types'
import { DesktopIcon, CheckCircleIcon, UsersIcon, XCircleIcon, WrenchIcon } from '@phosphor-icons/react'

/**
 * Asset statistic color tokens using design system
 * Maps each asset category to appropriate semantic color
 */
const ASSET_COLORS = {
  TOTAL: 'var(--nw-color-primary-500)', // Primary blue for total count
  ALLOCATED: 'var(--nw-color-success-500)', // Green for allocated/in use
  AVAILABLE: 'var(--nw-color-info-500)', // Info blue for available
  UNDER_REPAIR: 'var(--nw-color-warning-500)', // Orange for maintenance
  RETIRED: 'var(--nw-color-destructive-500)' // Red for retired/decommissioned
} as const

interface AssetStatisticsProps {
  statistics: Stats
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

export const AssetStatistics: React.FC<AssetStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const widgets: WidgetItem[] = [
    {
      key: 'total-assets',
      title: 'Total Assets',
      value: statistics.totalAssets,
      prefix: <DesktopIcon size={24} />,
      color: ASSET_COLORS.TOTAL,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All IT equipment in inventory'
    },
    {
      key: 'allocated-assets',
      title: 'Allocated Assets',
      value: statistics.allocatedAssets,
      prefix: <UsersIcon size={24} />,
      color: ASSET_COLORS.ALLOCATED,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently assigned to employees'
    },
    {
      key: 'available-assets',
      title: 'Available Assets',
      value: statistics.availableAssets,
      prefix: <CheckCircleIcon size={24} />,
      color: ASSET_COLORS.AVAILABLE,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Ready for allocation'
    },
    {
      key: 'retired-assets',
      title: 'Retired Assets',
      value: statistics.retiredAssets,
      prefix: <XCircleIcon size={24} />,
      color: ASSET_COLORS.RETIRED,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Decommissioned equipment'
    }
  ]

  // Add "Under Repair" stat if there are any
  if (statistics.underRepairAssets > 0) {
    widgets.splice(3, 0, {
      key: 'under-repair-assets',
      title: 'Under Repair',
      value: statistics.underRepairAssets,
      prefix: <WrenchIcon size={24} />,
      color: ASSET_COLORS.UNDER_REPAIR,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'In maintenance or repair'
    })
  }

  return (
    <div data-testid="asset-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No asset statistics available."
        data-testid="asset-statistics"
      />
    </div>
  )
}
