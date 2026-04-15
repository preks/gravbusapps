import React, { useState, useMemo } from 'react'
import { Card, Alert, Button, Space, Spin } from 'antd'
import {
  ArrowsClockwiseIcon,
  UsersIcon,
  BuildingsIcon,
  GlobeIcon,
  BankIcon,
  EyeIcon,
  TreeStructureIcon,
  CurrencyCircleDollarIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'
import { SunburstVisualizationProps } from '../types/hierarchyTypes'
import { AlternativeViewDatasetRow, ViewMode } from '../hooks/useHierarchyData'
import { useTranslation, SectionKpiCards, KpiCardData, Icon } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  exportTableToExcel,
  exportTableToPdf
} from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/utils/exportUtils'
import AnalyticsDataTable from '../../../../../shared/AnalyticsDataTable'

export interface RadialBarChartProps extends SunburstVisualizationProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  alternativeViewData?: Record<ViewMode, AlternativeViewDatasetRow[]>
}

const RadialBarChart: React.FC<RadialBarChartProps> = ({
  statistics,
  tableData,
  alternativeViewData,
  isLoading,
  error,
  onRefresh,
  viewMode,
  onViewModeChange
}) => {
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'pdf' | null>(null)
  const { t } = useTranslation(hrTranslations)

  const locationBarPalette = ['#2563EB', '#14B8A6', '#F59E0B', '#A855F7', '#22C55E', '#EF4444', '#0EA5E9', '#64748B']

  // Get current table data based on view mode
  const currentTableData = useMemo(() => {
    if (!tableData) return []
    return tableData[viewMode] || []
  }, [tableData, viewMode])

  const detailedLevelRowsFromSql = useMemo(() => {
    const datasetRows = alternativeViewData?.[viewMode] ?? []
    if (datasetRows.length === 0) return []

    const rowsByLevel = new Map<
      number,
      {
        levelName: string
        totalEmployees: number
        departmentsCount: number
        segments: Array<{ name: string; employeeCount: number; percentageOfLevel: number }>
      }
    >()

    datasetRows.forEach(rawRow => {
      const levelNumber = Number(rawRow.level ?? 0)
      const safeLevel = Number.isFinite(levelNumber) ? levelNumber : 0
      const category = String(rawRow.category ?? 'Unknown').trim() || 'Unknown'
      const employeeCountRaw = Number(rawRow.value ?? 0)
      const employeeCount = Number.isFinite(employeeCountRaw) ? employeeCountRaw : 0
      const levelTotalRaw = Number(rawRow.level_total_employees ?? 0)
      const levelTotal = Number.isFinite(levelTotalRaw) ? levelTotalRaw : 0
      const departmentsRaw = Number(rawRow.departments_count ?? 0)
      const departmentsCount = Number.isFinite(departmentsRaw) ? departmentsRaw : 0
      const segmentPercentageRaw = Number(rawRow.percentage_of_level ?? 0)
      const percentageOfLevel = Number.isFinite(segmentPercentageRaw) ? segmentPercentageRaw : 0
      const levelName = String(rawRow.level_name ?? `Level ${safeLevel}`).trim() || `Level ${safeLevel}`

      if (!rowsByLevel.has(safeLevel)) {
        rowsByLevel.set(safeLevel, {
          levelName,
          totalEmployees: levelTotal,
          departmentsCount,
          segments: []
        })
      }

      const existing = rowsByLevel.get(safeLevel)!
      if (existing.totalEmployees === 0 && levelTotal > 0) {
        existing.totalEmployees = levelTotal
      }
      if (existing.departmentsCount === 0 && departmentsCount > 0) {
        existing.departmentsCount = departmentsCount
      }
      existing.segments.push({
        name: category,
        employeeCount,
        percentageOfLevel
      })
    })

    return Array.from(rowsByLevel.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => {
        const fallbackTotal = row.segments.reduce((sum, segment) => sum + segment.employeeCount, 0)
        const totalEmployees = row.totalEmployees > 0 ? row.totalEmployees : fallbackTotal
        const percentageOfTotal =
          statistics.totalEmployees > 0 ? Math.round((totalEmployees * 100) / statistics.totalEmployees) : 0

        return {
          levelName: row.levelName,
          totalEmployees,
          percentageOfTotal,
          organizationalUnits: row.departmentsCount,
          segments:
            row.segments.length > 0
              ? row.segments
                  .map(segment => {
                    const safeLevelPercentage =
                      segment.percentageOfLevel > 0
                        ? segment.percentageOfLevel
                        : totalEmployees > 0
                          ? Math.round((segment.employeeCount * 100) / totalEmployees)
                          : 0
                    return `${segment.name} (${segment.employeeCount}, ${safeLevelPercentage}%)`
                  })
                  .join('\n')
              : '-'
        }
      })
  }, [alternativeViewData, statistics.totalEmployees, viewMode])

  const segmentHeaderLabel =
    viewMode === 'company'
      ? t('hr-analytics-companies')
      : viewMode === 'costcenter'
        ? t('hr-analytics-cost-centers')
        : t('hr-analytics-countries')

  const hierarchyKpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'org-hierarchy-total-employees',
        title: t('hr-analytics-total-employees'),
        value: statistics.totalEmployees.toLocaleString(),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-entity-employee)',
        footer: t('hr-analytics-active-employees')
      },
      {
        id: 'org-hierarchy-total-units',
        title: t('hr-analytics-organizational-units'),
        value: statistics.totalOrganizationalUnits.toLocaleString(),
        icon: <Icon icon={BuildingsIcon} size="sm" decorative />,
        iconColor: 'var(--nw-entity-department)',
        footer: t('hr-analytics-organizational-hierarchy')
      },
      {
        id: 'org-hierarchy-levels',
        title: t('hr-analytics-levels-title'),
        value: statistics.maxLevels.toLocaleString(),
        icon: <Icon icon={TreeStructureIcon} size="sm" decorative />,
        iconColor: 'var(--nw-entity-strategy)',
        footer: t('hr-analytics-level-breakdown')
      },
      {
        id: 'org-hierarchy-dynamic-dimension',
        title:
          viewMode === 'company'
            ? t('hr-analytics-companies')
            : viewMode === 'costcenter'
              ? t('hr-analytics-cost-centers')
              : t('hr-analytics-countries'),
        value:
          viewMode === 'company'
            ? statistics.companiesCount.toLocaleString()
            : viewMode === 'costcenter'
              ? statistics.costCentersCount.toLocaleString()
              : statistics.countriesRepresented.toLocaleString(),
        icon: (
          <Icon
            icon={viewMode === 'company' ? BankIcon : viewMode === 'costcenter' ? CurrencyCircleDollarIcon : GlobeIcon}
            size="sm"
            decorative
          />
        ),
        iconColor:
          viewMode === 'company'
            ? 'var(--nw-entity-order)'
            : viewMode === 'costcenter'
              ? 'var(--nw-entity-department)'
              : 'var(--nw-entity-location)',
        footer:
          viewMode === 'company'
            ? t('hr-analytics-by-company')
            : viewMode === 'costcenter'
              ? t('hr-analytics-by-cost-center')
              : t('hr-analytics-by-location')
      }
    ],
    [statistics, t, viewMode]
  )

  const detailedLevelExportColumns = useMemo(
    () => [
      { key: 'levelName', header: t('hr-analytics-level') },
      { key: 'totalEmployees', header: t('hr-analytics-total-employees') },
      { key: 'segments', header: segmentHeaderLabel }
    ],
    [segmentHeaderLabel, t]
  )

  const detailedLevelExportRows = useMemo(() => {
    if (detailedLevelRowsFromSql.length > 0) {
      return detailedLevelRowsFromSql.map(row => ({
        levelName: row.levelName,
        totalEmployees: row.totalEmployees,
        segments: row.segments
      }))
    }

    return currentTableData.map(level => ({
      levelName: level.levelName,
      totalEmployees: level.totalEmployees,
      segments:
        level.segments.length > 0
          ? level.segments
              .map(segment => `${segment.name} (${segment.employeeCount}, ${segment.percentage}%)`)
              .join('\n')
          : '-'
    }))
  }, [currentTableData, detailedLevelRowsFromSql])

  const detailedLevelTableRows = useMemo(() => {
    if (detailedLevelRowsFromSql.length > 0) {
      return detailedLevelRowsFromSql.map(row => ({
        level: row.levelName,
        totalEmployees: row.totalEmployees,
        percentageOfTotal: row.percentageOfTotal,
        segments: row.segments
      }))
    }

    return currentTableData.map(level => ({
      level: level.levelName,
      totalEmployees: level.totalEmployees,
      percentageOfTotal: level.percentage,
      segments:
        level.segments.length > 0
          ? level.segments
              .map(segment => `${segment.name} (${segment.employeeCount}, ${segment.percentage}%)`)
              .join('\n')
          : '-'
    }))
  }, [currentTableData, detailedLevelRowsFromSql])

  const detailedLevelTableColumns = useMemo(
    () => [
      { key: 'level', header: t('hr-analytics-level') },
      { key: 'totalEmployees', header: t('hr-analytics-total-employees') },
      { key: 'segments', header: segmentHeaderLabel }
    ],
    [segmentHeaderLabel, t]
  )

  const handleDetailedLevelReportExport = async (format: 'excel' | 'pdf') => {
    if (detailedLevelExportRows.length === 0) return

    setExportingFormat(format)
    try {
      const modeLabel =
        viewMode === 'company'
          ? t('hr-analytics-by-company')
          : viewMode === 'costcenter'
            ? t('hr-analytics-by-cost-center')
            : t('hr-analytics-by-location')
      const title = `${t('hr-analytics-detailed-level-report')} - ${modeLabel}`

      if (format === 'excel') {
        await exportTableToExcel(title, detailedLevelExportColumns, detailedLevelExportRows)
      } else {
        await exportTableToPdf(title, detailedLevelExportColumns, detailedLevelExportRows)
      }
    } finally {
      setExportingFormat(null)
    }
  }

  const alternativeChart = useMemo(() => {
    const datasetRows = alternativeViewData?.[viewMode] ?? []
    if (datasetRows.length > 0) {
      const levelRows = new Map<
        number,
        {
          levelLabel: string
          totalEmployees: number
          segments: Array<{ id: string; name: string; employeeCount: number }>
        }
      >()
      const segmentTotals = new Map<string, number>()

      datasetRows.forEach(rawRow => {
        const levelNumber = Number(rawRow.level ?? 0)
        const safeLevel = Number.isFinite(levelNumber) ? levelNumber : 0
        const category = String(rawRow.category ?? 'Unknown').trim() || 'Unknown'
        const employeeCountRaw = Number(rawRow.value ?? 0)
        const employeeCount = Number.isFinite(employeeCountRaw) ? employeeCountRaw : 0
        const levelTotalRaw = Number(rawRow.level_total_employees ?? 0)
        const levelTotal = Number.isFinite(levelTotalRaw) ? levelTotalRaw : 0
        const levelName = String(rawRow.level_name ?? `Level ${safeLevel}`).trim() || `Level ${safeLevel}`

        if (!levelRows.has(safeLevel)) {
          levelRows.set(safeLevel, {
            levelLabel: levelName,
            totalEmployees: levelTotal,
            segments: []
          })
        }

        const existingLevel = levelRows.get(safeLevel)!
        if (existingLevel.totalEmployees === 0 && levelTotal > 0) {
          existingLevel.totalEmployees = levelTotal
        }
        existingLevel.segments.push({
          id: category,
          name: category,
          employeeCount
        })

        segmentTotals.set(category, (segmentTotals.get(category) ?? 0) + employeeCount)
      })

      const segmentIds = Array.from(segmentTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id)

      const segments = segmentIds.map((id, index) => ({
        key: `segment_${id}`,
        name: id,
        color: locationBarPalette[index % locationBarPalette.length]
      }))

      const data = Array.from(levelRows.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, level]) => {
          const row: Record<string, number | string> = {
            level: level.levelLabel,
            totalEmployees:
              level.totalEmployees > 0
                ? level.totalEmployees
                : level.segments.reduce((sum, segment) => sum + segment.employeeCount, 0)
          }

          level.segments.forEach(segment => {
            row[`segment_${segment.id}`] = segment.employeeCount
          })

          return row
        })

      return { data, segments }
    }

    if (!currentTableData || currentTableData.length === 0) {
      return { data: [], segments: [] as Array<{ key: string; name: string; color: string }> }
    }

    const segmentTotals = new Map<string, number>()
    const segmentNames = new Map<string, string>()

    currentTableData.forEach(level => {
      level.segments.forEach(segment => {
        segmentTotals.set(segment.id, (segmentTotals.get(segment.id) ?? 0) + segment.employeeCount)
        if (!segmentNames.has(segment.id)) segmentNames.set(segment.id, segment.name)
      })
    })

    const segmentIds = Array.from(segmentTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)

    const segments = segmentIds.map((id, index) => ({
      key: `segment_${id}`,
      name: segmentNames.get(id) ?? id,
      color: locationBarPalette[index % locationBarPalette.length]
    }))

    const data = currentTableData.map(level => {
      const row: Record<string, number | string> = {
        level: level.levelName,
        totalEmployees: level.totalEmployees
      }
      level.segments.forEach(segment => {
        row[`segment_${segment.id}`] = segment.employeeCount
      })

      return row
    })

    return { data, segments }
  }, [alternativeViewData, currentTableData, locationBarPalette, viewMode])

  const hasRenderedData = alternativeChart.data.length > 0 || detailedLevelTableRows.length > 0

  if (isLoading && !hasRenderedData) {
    return (
      <div
        data-testid="OrganizationalHierarchyReport-RadialBarChart-Loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
      >
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        data-testid="OrganizationalHierarchyReport-RadialBarChart-Error"
        message={t('hr-analytics-error-loading-hierarchy-data')}
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={onRefresh} icon={<ArrowsClockwiseIcon size={16} />}>
            {t('common-retry')}
          </Button>
        }
      />
    )
  }

  return (
    <div data-testid="OrganizationalHierarchyReport-RadialBarChart" className="gba:grid gba:gap-6">
      {/* Header with View Mode Switcher */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex gba:items-start gba:gap-4">
          <h3 className="gba:m-0 gba:text-foreground gba:text-xl gba:font-semibold gba:leading-6 gba:pt-0.5">
            {t('hr-analytics-organizational-hierarchy-report')}
          </h3>
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:bg-info-secondary gba:text-info-secondary-foreground">
            <UsersIcon size={16} />
            <span>
              {statistics.totalEmployees} {t('hr-analytics-employees')}
            </span>
          </span>
        </div>

        {/* View Mode Switcher */}
        <Space>
          <div className="gba:flex gba:items-center gba:font-semibold">
            <EyeIcon size={16} className="gba:mr-2" />
            {t('hr-analytics-view-by')}
          </div>
          <Space.Compact>
            <Button
              size="small"
              type={viewMode === 'location' ? 'primary' : 'default'}
              onClick={() => onViewModeChange('location')}
              data-testid="OrganizationalHierarchyReport-RadialBarChart-LocationModeButton"
            >
              <GlobeIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-location')}
            </Button>
            <Button
              size="small"
              type={viewMode === 'company' ? 'primary' : 'default'}
              onClick={() => onViewModeChange('company')}
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CompanyModeButton"
            >
              <BankIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-company')}
            </Button>
            <Button
              size="small"
              type={viewMode === 'costcenter' ? 'primary' : 'default'}
              onClick={() => onViewModeChange('costcenter')}
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CostCenterModeButton"
            >
              <CurrencyCircleDollarIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-cost-center')}
            </Button>
          </Space.Compact>
        </Space>
      </div>

      {/* Statistics Row */}
      <SectionKpiCards cards={hierarchyKpiCards} />

      {/* Main Chart Visualization */}
      <Card
        title={
          <div className="gba:flex gba:items-center">
            <ChartBarIcon size={16} className="gba:mr-2" />
            {t('hr-analytics-organizational-hierarchy')} -{' '}
            {viewMode === 'company'
              ? t('hr-analytics-by-company')
              : viewMode === 'costcenter'
                ? t('hr-analytics-by-cost-center')
                : t('hr-analytics-by-location')}
          </div>
        }
      >
        {alternativeChart.data.length > 0 && (
          <div className="gba:pt-2">
            <div className="gba:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={alternativeChart.data}
                  layout="vertical"
                  margin={{ top: 16, right: 24, left: 24, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="level" width={90} />
                  <RechartsTooltip />
                  <Legend />
                  {alternativeChart.segments.map(segment => (
                    <RechartsBar
                      key={segment.key}
                      dataKey={segment.key}
                      stackId="employees"
                      fill={segment.color}
                      name={segment.name}
                    />
                  ))}
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {alternativeChart.data.length === 0 && (
          <Alert message={t('hr-analytics-no-data-available')} type="info" showIcon />
        )}
      </Card>

      <AnalyticsDataTable
        dataTestId="OrganizationalHierarchyReport-DetailedLevelReport-Table"
        title={t('hr-analytics-data-table', {
          title: `${t('hr-analytics-detailed-level-report')} - ${
            viewMode === 'company'
              ? t('hr-analytics-by-company')
              : viewMode === 'costcenter'
                ? t('hr-analytics-by-cost-center')
                : t('hr-analytics-by-location')
          }`
        })}
        description={t('hr-analytics-detailed-breakdown-of-distribution')}
        entriesText={t('hr-analytics-total-entries', { count: detailedLevelTableRows.length })}
        columns={detailedLevelTableColumns}
        rows={detailedLevelTableRows}
        exportingFormat={exportingFormat}
        onExport={handleDetailedLevelReportExport}
        exportExcelTestId="OrganizationalHierarchyReport-DetailedLevelReport-ExportExcel"
        exportPdfTestId="OrganizationalHierarchyReport-DetailedLevelReport-ExportPdf"
        exportExcelLabel={t('common-export-excel')}
        exportPdfLabel={t('common-export-pdf')}
        getRowKey={(_, index) => `org-hierarchy-detailed-level-${index}`}
        renderCell={(row, column) => {
          if (column.key === 'totalEmployees') {
            const totalEmployeesValue = Number((row as { totalEmployees?: number }).totalEmployees ?? 0)
            const percentageValue = Number((row as { percentageOfTotal?: number }).percentageOfTotal ?? 0)
            return `${totalEmployeesValue} (${percentageValue}% ${t('hr-analytics-of')} ${t('hr-analytics-total')})`
          }

          if (column.key === 'segments') {
            return (
              <div className="gba:max-w-[560px] gba:whitespace-pre-line gba:break-words">
                {String((row as { segments?: string }).segments ?? '-')}
              </div>
            )
          }

          return null
        }}
      />
    </div>
  )
}

export default RadialBarChart
