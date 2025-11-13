import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { AssetStatistics as Stats } from '../types'
import { DesktopIcon, CheckCircleIcon, UsersIcon, XCircleIcon, WrenchIcon } from '@phosphor-icons/react'
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
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_total_assets', 'Total Assets'),
      value: statistics.totalAssets,
      prefix: <DesktopIcon size={24} />,
      color: ASSET_COLORS.TOTAL,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:hr_assets.statistics_total_assets_description',
        'All IT equipment in inventory'
      )
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
      )
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
      )
    },
    {
      key: 'retired-assets',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_retired_assets', 'Retired Assets'),
      value: statistics.retiredAssets,
      prefix: <XCircleIcon size={24} />,
      color: ASSET_COLORS.RETIRED,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:hr_assets.statistics_retired_assets_description',
        'Decommissioned equipment'
      )
    }
  ]

  if (statistics.underRepairAssets > 0) {
    widgets.splice(3, 0, {
      key: 'under-repair-assets',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.statistics_under_repair', 'Under Repair'),
      value: statistics.underRepairAssets,
      prefix: <WrenchIcon size={24} />,
      color: ASSET_COLORS.UNDER_REPAIR,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:hr_assets.statistics_under_repair_description',
        'In maintenance or repair'
      )
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
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.statistics_empty',
          'No asset statistics available.'
        )}
        data-testid="asset-statistics"
      />
    </div>
  )
}
