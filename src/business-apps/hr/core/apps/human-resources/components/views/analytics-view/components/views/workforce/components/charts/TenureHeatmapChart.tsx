import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, IconAvatar, useTranslation } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { TenureDistributionItem, TenureRange, OrganizationalUnit } from '../../../../../hooks/useTenureByOrgUnit'
import { mapValueToColor } from '@/common/utils/chartColorMapper'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface TenureHeatmapChartProps {
  data: TenureDistributionItem[]
  orgUnits: OrganizationalUnit[]
  tenureRanges: TenureRange[]
  loading?: boolean
  error?: Error | null
  moduleColor?: string
}

/**
 * Tenure distribution heatmap chart component
 *
 * Displays a heatmap showing employee tenure distribution across business units
 */
const TenureHeatmapChart: React.FC<TenureHeatmapChartProps> = ({
  data,
  orgUnits,
  tenureRanges,
  loading = false,
  error = null,
  moduleColor = 'default'
}) => {
  // Sort tenure ranges by their minMonths property
  const sortedTenureRanges = useMemo(() => {
    return [...tenureRanges].sort((a, b) => a.minMonths - b.minMonths)
  }, [tenureRanges])

  // Sort org units alphabetically
  const sortedOrgUnits = useMemo(() => {
    return [...orgUnits].sort((a, b) => a.name.localeCompare(b.name))
  }, [orgUnits])

  // Calculate statistics and prepare heatmap data
  const { maxCount, totalEmployees, avgPerCell, heatmapData } = useMemo(() => {
    const max = Math.max(...data.map(item => item.count))
    const total = data.reduce((sum, item) => sum + item.count, 0)
    const cellCount = sortedOrgUnits.length * sortedTenureRanges.length
    const avg = total / Math.max(1, cellCount)

    // Create a lookup map for efficient data access
    const dataMap = new Map<string, number>()
    data.forEach(item => {
      const key = `${item.orgUnitId}-${item.tenureRangeId}`
      dataMap.set(key, item.count)
    })

    return {
      maxCount: max,
      totalEmployees: total,
      avgPerCell: avg,
      heatmapData: dataMap
    }
  }, [data, sortedOrgUnits.length, sortedTenureRanges.length])

  // Helper functions for heatmap rendering
  const getIntensity = (count: number) => {
    if (count === 0) return 0
    return Math.min(1, count / Math.max(1, maxCount))
  }

  // Get chart colors that automatically update with theme changes
  const chartColors = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  const mutedColor = 'var(--nw-color-muted)'

  const getHeatmapColor = React.useCallback(
    (intensity: number) => {
      // Special case for empty cells
      if (intensity === 0) return mutedColor

      // Map intensity (0-1) to color index using the utility
      // Create an array from 0 to 1 with 8 steps to use with mapValueToColor
      const intensitySteps = Array.from({ length: 8 }, (_, i) => i / 7)
      return mapValueToColor(intensity, intensitySteps, [...chartColors])
    },
    [chartColors, mutedColor]
  )

  const getEmployeeCountForCell = (orgUnitId: string, tenureRangeId: string) => {
    const key = `${orgUnitId}-${tenureRangeId}`
    return heatmapData.get(key) || 0
  }

  const { t } = useTranslation(hrTranslations)

  if (loading) {
    return (
      <Card data-testid="tenure-heatmap-loading">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={ClockIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>
              {t('hr-analytics-tenure-distribution-by-organizational-unit')}
            </CardTitle>
            <CardDescription>{t('hr-analytics-loading')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-muted-foreground">
              {t('hr-analytics-loading-tenure-data')}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="tenure-heatmap-error">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <IconAvatar icon={ClockIcon} variant="destructive" size="md" iconWeight="regular" decorative={true} />
          <div>
            <CardTitle>
              {t('hr-analytics-tenure-distribution-by-organizational-unit')}
            </CardTitle>
            <CardDescription>
              {t('hr-analytics-error')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:text-destructive">
            <p>
              {t('hr-analytics-error-loading-tenure-data')}
            </p>
            <p className="gba:text-sm gba:mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="tenure-heatmap-chart">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ClockIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>
            {t('hr-analytics-tenure-distribution-by-organizational-unit')}
          </CardTitle>
          <CardDescription>
            {t('hr-analytics-tenure-chart-description')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-6">
          {/* Statistics Summary */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-sm gba:bg-muted gba:p-4 gba:rounded-lg">
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-foreground">{totalEmployees}</div>
              <div className="gba:text-muted-foreground">
                {t('hr-analytics-total-employees')}
              </div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-foreground">{avgPerCell.toFixed(1)}</div>
              <div className="gba:text-muted-foreground">
                {t('hr-analytics-avg-per-cell')}
              </div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-foreground">{maxCount}</div>
              <div className="gba:text-muted-foreground">
                {t('hr-analytics-max-in-cell')}
              </div>
            </div>
          </div>

          {/* Heatmap Grid - Transposed: Org Units on X-axis, Tenure Ranges on Y-axis */}
          <div className="gba:overflow-x-auto gba:pt-4">
            <div className="gba:inline-block gba:min-w-full">
              {/* Header with organizational units */}
              <div
                className="gba:grid gba:gap-1 gba:mb-2"
                style={{
                  gridTemplateColumns: `120px repeat(${sortedOrgUnits.length}, 100px)`
                }}
              >
                <div className="gba:w-30"></div>
                {sortedOrgUnits.map(orgUnit => (
                  <div
                    key={orgUnit.id}
                    className="gba:text-xs gba:text-muted-foreground gba:text-center gba:font-medium gba:p-1 gba:truncate"
                    title={orgUnit.name}
                  >
                    {orgUnit.name}
                  </div>
                ))}
              </div>

              {/* Data rows - now iterating through tenure ranges */}
              {sortedTenureRanges.map(tenureRange => (
                <div
                  key={tenureRange.id}
                  className="gba:grid gba:gap-1 gba:mb-1"
                  style={{
                    gridTemplateColumns: `120px repeat(${sortedOrgUnits.length}, 100px)`
                  }}
                >
                  <div className="gba:text-xs gba:text-muted-foreground gba:text-right gba:pr-2 gba:py-2 gba:font-medium gba:truncate">
                    {tenureRange.label}
                  </div>
                  {sortedOrgUnits.map(orgUnit => {
                    const count = getEmployeeCountForCell(orgUnit.id, tenureRange.id)
                    const intensity = getIntensity(count)
                    return (
                      <div
                        key={`${tenureRange.id}-${orgUnit.id}`}
                        className="gba:w-24 gba:h-16 gba:rounded-md gba:border gba:border-border gba:relative gba:group gba:cursor-pointer gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium gba:transition-all gba:duration-200 hover:gba:scale-105"
                        style={{ backgroundColor: getHeatmapColor(intensity) }}
                        title={`${tenureRange.label} - ${orgUnit.name}: ${count} employees`}
                        data-testid={`heatmap-cell-${tenureRange.id}-${orgUnit.id}`}
                      >
                        <span
                          className={`gba:text-sm gba:font-bold ${intensity > 0.5 ? 'gba:text-card' : 'gba:text-foreground'}`}
                        >
                          {count > 0 ? count : ''}
                        </span>
                        <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:mb-2 gba:px-3 gba:py-2 gba:bg-popover gba:text-popover-foreground gba:text-xs gba:rounded gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:pointer-events-none gba:whitespace-nowrap gba:z-50">
                          <div className="gba:font-semibold">{tenureRange.label}</div>
                          <div>{orgUnit.name}</div>
                          <div>
                            {count} {t('hr-analytics-employees')}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="gba:flex gba:items-center gba:justify-center gba:space-x-4 gba:text-xs gba:text-muted-foreground">
            <span>{t('hr-analytics-fewer')}</span>
            <div className="gba:flex gba:space-x-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
                <div
                  key={intensity}
                  className="gba:w-4 gba:h-4 gba:rounded-sm gba:border gba:border-border"
                  style={{ backgroundColor: getHeatmapColor(intensity) }}
                />
              ))}
            </div>
            <span>{t('hr-analytics-more')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TenureHeatmapChart
