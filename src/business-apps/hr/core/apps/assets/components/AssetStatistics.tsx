import React, { useCallback, useMemo, memo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { AssetStatistics as Stats } from '../types'
import { AssetStatus } from '../types'
import { DesktopIcon, CheckCircleIcon, UsersIcon, WrenchIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const ASSET_COLORS = {
  TOTAL: 'var(--nw-color-primary-500)',
  ALLOCATED: 'var(--nw-color-success-500)',
  AVAILABLE: 'var(--nw-color-info-500)',
  UNDER_REPAIR: 'var(--nw-color-warning-500)',
  RETIRED: 'var(--nw-color-destructive-500)'
} as const

interface AssetStatisticsProps {
  statistics: Stats
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  onStatusFilterChange?: (status: string) => void
  activeStatusFilter?: string
}

const AssetStatisticsComponent: React.FC<AssetStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry,
  onStatusFilterChange,
  activeStatusFilter
}) => {
  const handleCardClick = useCallback(
    (status: string) => {
      if (!onStatusFilterChange) return

      if (activeStatusFilter === status) {
        onStatusFilterChange('all')
      } else {
        onStatusFilterChange(status)
      }
    },
    [onStatusFilterChange, activeStatusFilter]
  )

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      if (!onStatusFilterChange) return

      switch (widgetKey) {
        case 'total-assets':
          handleCardClick('all')
          break
        case 'allocated-assets':
          handleCardClick(AssetStatus.ALLOCATED)
          break
        case 'available-assets':
          handleCardClick(AssetStatus.AVAILABLE)
          break
        case 'under-repair-assets':
          handleCardClick(AssetStatus.UNDER_REPAIR)
          break
        default:
          break
      }
    },
    [handleCardClick, onStatusFilterChange]
  )

  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-assets',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_total_assets', 'Total Assets'),
        value: statistics.totalAssets,
        prefix: <DesktopIcon size={24} />,
        color: ASSET_COLORS.TOTAL,
        span: { xs: 24, sm: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_total_assets_description',
          'All equipment in inventory'
        ),
        onClick: onStatusFilterChange ? () => handleCardClick('all') : undefined,
        active: activeStatusFilter === 'all' || activeStatusFilter === undefined
      },
      {
        key: 'allocated-assets',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_allocated_assets', 'Allocated Assets'),
        value: statistics.allocatedAssets,
        prefix: <UsersIcon size={24} />,
        color: ASSET_COLORS.ALLOCATED,
        span: { xs: 24, sm: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_allocated_assets_description',
          'Currently assigned to employees'
        ),
        onClick: onStatusFilterChange ? () => handleCardClick(AssetStatus.ALLOCATED) : undefined,
        active: activeStatusFilter === AssetStatus.ALLOCATED
      },
      {
        key: 'available-assets',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_available_assets', 'Available Assets'),
        value: statistics.availableAssets,
        prefix: <CheckCircleIcon size={24} />,
        color: ASSET_COLORS.AVAILABLE,
        span: { xs: 24, sm: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_available_assets_description',
          'Ready for allocation'
        ),
        onClick: onStatusFilterChange ? () => handleCardClick(AssetStatus.AVAILABLE) : undefined,
        active: activeStatusFilter === AssetStatus.AVAILABLE
      },
      {
        key: 'under-repair-assets',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_under_repair', 'Under Repair'),
        value: statistics.underRepairAssets,
        prefix: <WrenchIcon size={24} />,
        color: ASSET_COLORS.UNDER_REPAIR,
        span: { xs: 24, sm: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_under_repair_description',
          'In maintenance or repair'
        ),
        onClick: onStatusFilterChange ? () => handleCardClick(AssetStatus.UNDER_REPAIR) : undefined,
        active: activeStatusFilter === AssetStatus.UNDER_REPAIR
      }
    ],
    [statistics, activeStatusFilter, handleCardClick, onStatusFilterChange]
  )

  return (
    <div data-testid="asset-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onWidgetClick={onStatusFilterChange ? handleWidgetClick : undefined}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_empty',
          'No asset statistics available.'
        )}
        data-testid="asset-statistics"
      />
    </div>
  )
}

export const AssetStatistics = memo(AssetStatisticsComponent, (prevProps, nextProps) => {
  return (
    prevProps.statistics.totalAssets === nextProps.statistics.totalAssets &&
    prevProps.statistics.allocatedAssets === nextProps.statistics.allocatedAssets &&
    prevProps.statistics.availableAssets === nextProps.statistics.availableAssets &&
    prevProps.statistics.underRepairAssets === nextProps.statistics.underRepairAssets &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    prevProps.activeStatusFilter === nextProps.activeStatusFilter &&
    prevProps.onStatusFilterChange === nextProps.onStatusFilterChange &&
    prevProps.onRetry === nextProps.onRetry
  )
})
