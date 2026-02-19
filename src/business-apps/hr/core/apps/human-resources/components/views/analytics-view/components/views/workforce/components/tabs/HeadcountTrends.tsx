import React, { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { Typography } from 'antd'
import { PiFileText, PiFilePdf } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import HeadcountStatistics from '../components/HeadcountStatistics'
import HeadcountTrendsChart from '../components/HeadcountTrendsChart'
import HiresAndDeparturesChart from '../components/HiresAndDeparturesChart'
import HeadcountByOrgUnitChart from '../components/HeadcountByOrgUnitChart'
import { useHeadcountTrendsData } from '../../../../../hooks/useHeadcountTrendsData'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { exportTableToExcel, exportTableToPdf } from '../../../../../utils/exportUtils'

const { Title, Text } = Typography

interface TableData {
  period: string
  value: number
  change?: number
}

const HeadcountTrends: React.FC<BusinessAppContextProps> = context => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(hrTranslations)

  const {
    statistics,
    headcountOverTime,
    monthlyHires,
    monthlyExits,
    netChange,
    departmentData,
    isLoading,
    error,
    refetch
  } = useHeadcountTrendsData(context)

  // Transform data functions for tables
  const transformHeadcountOverTimeData = (): TableData[] => {
    return headcountOverTime.map((item, index) => ({
      period: new Date(item.dateCategory).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: item.value,
      change: index > 0 ? item.value - headcountOverTime[index - 1].value : 0
    }))
  }

  const transformHiresAndDeparturesData = (): TableData[] => {
    const hiresMap = new Map(monthlyHires.map(h => [h.dateCategory, h.value]))
    const exitsMap = new Map(monthlyExits.map(e => [e.dateCategory, e.value]))

    const allDates = Array.from(
      new Set([...monthlyHires.map(h => h.dateCategory), ...monthlyExits.map(e => e.dateCategory)])
    ).sort()

    return allDates.map(date => ({
      period: new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      value: (hiresMap.get(date) || 0) - (exitsMap.get(date) || 0),
      change: hiresMap.get(date) || 0
    }))
  }

  const transformOrgUnitData = (): TableData[] => {
    return departmentData.map(item => ({
      period: item.category,
      value: item.value,
      change: 0
    }))
  }

  const handleExport = async (
    format: 'excel' | 'pdf',
    tableName: string,
    title: string,
    columns: { key: string; header: string }[],
    data: TableData[]
  ) => {
    setExportingTable(`${tableName}-${format}`)
    try {
      const rows = data.map(row => ({ ...row })) as Record<string, unknown>[]
      if (format === 'excel') {
        await exportTableToExcel(title, columns, rows)
      } else {
        await exportTableToPdf(title, columns, rows)
      }
    } finally {
      setExportingTable(null)
    }
  }

  const handleChartClick = (chartId: string) => {
    setSelectedChart(selectedChart === chartId ? null : chartId)

    // Smooth scroll to table after a brief delay to allow state update
    if (selectedChart !== chartId && tableRef.current) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }, 100)
    }
  }

  // Chart configurations
  const chartConfigs = [
    {
      title: t('hr-analytics-total-headcount-over-time'),
      data: headcountOverTime,
      tableData: transformHeadcountOverTimeData(),
      testId: 'headcount-trends-chart',
      tag: t('hr-analytics-total-data-points', { count: headcountOverTime.length }),
      description: t('hr-analytics-headcount-trends-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change') }
      ]
    },
    {
      title: t('hr-analytics-monthly-hires-departures'),
      data: [...monthlyHires, ...monthlyExits],
      tableData: transformHiresAndDeparturesData(),
      testId: 'hires-departures-chart',
      tag: t('hr-analytics-months', { count: Math.max(monthlyHires.length, monthlyExits.length) }),
      description: t('hr-analytics-hires-departures-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-period') },
        { key: 'value', header: t('hr-analytics-value') },
        { key: 'change', header: t('hr-analytics-change') }
      ]
    },
    {
      title: t('hr-analytics-headcount-by-org-unit'),
      data: departmentData,
      tableData: transformOrgUnitData(),
      testId: 'headcount-by-org-unit-chart',
      tag: t('hr-analytics-departments', { count: departmentData.length }),
      description: t('hr-analytics-headcount-by-org-unit-description'),
      exportColumns: [
        { key: 'period', header: t('hr-analytics-department') },
        { key: 'value', header: t('hr-analytics-value') }
      ]
    }
  ]

  // Find the selected chart configuration
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (error) {
    return (
      <div data-testid="headcount-trends-error">
        <Card className="gba:border-destructive-secondary gba:bg-destructive-secondary/50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-destructive-secondary-foreground gba:font-medium gba:mb-2">
                  {t('hr-analytics-failed-to-load-headcount')}
                </h3>
                <p className="gba:text-destructive-secondary-foreground">{error}</p>
              </div>
              <button
                onClick={refetch}
                className="gba:px-4 gba:py-2 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive-secondary"
              >
                {t('common-retry')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="headcount-trends-tab">
      {/* Statistics Overview */}
      <HeadcountStatistics statistics={statistics} isLoading={isLoading} dataTestId="headcount-trends" />

      {/* Interactive Charts Section */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('hr-analytics-workforce-charts')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
      </div>

      {/* Top Row: Two Charts Side by Side */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mt-6">
        {chartConfigs.slice(0, 2).map(config => {
          const isSelected = selectedChart === config.testId

          return (
            <Card
              key={config.testId}
              data-testid={`${config.testId}-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Title level={4} className="gba:m-0 gba:text-foreground">
                      {config.title}
                    </Title>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</Text>
                {isSelected && (
                  <p className="gba:text-xs gba:text-info gba:mt-1">
                    ✓ {t('common-selected')} - {t('hr-analytics-table-shown-below')}
                  </p>
                )}
              </CardHeader>

              <CardContent>
                <div className="gba:h-64">
                  {config.testId === 'headcount-trends-chart' && (
                    <HeadcountTrendsChart
                      data={headcountOverTime}
                      isLoading={isLoading}
                      dataTestId="headcount-trends-chart"
                    />
                  )}
                  {config.testId === 'hires-departures-chart' && (
                    <HiresAndDeparturesChart
                      hiresData={monthlyHires}
                      exitsData={monthlyExits}
                      netChangeData={netChange}
                      isLoading={isLoading}
                      dataTestId="hires-departures-chart"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bottom Row: Full Width Chart */}
      <div className="gba:mt-6">
        {(() => {
          const config = chartConfigs[2] // Organizational Unit chart
          const isSelected = selectedChart === config.testId

          return (
            <Card
              data-testid={`${config.testId}-card`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                isSelected ? 'gba:ring-2 gba:ring-info gba:shadow-lg' : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Title level={4} className="gba:m-0 gba:text-foreground">
                      {config.title}
                    </Title>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <Text className="gba:text-muted-foreground gba:text-sm gba:mt-1">{config.description}</Text>
                {isSelected && <p className="gba:text-xs gba:text-info gba:mt-1">✓ Selected - Table shown below</p>}
              </CardHeader>

              <CardContent>
                <div className="gba:h-64">
                  <HeadcountByOrgUnitChart
                    data={departmentData}
                    isLoading={isLoading}
                    dataTestId="headcount-by-org-unit-chart"
                  />
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Interactive Data Table */}
      <div ref={tableRef}>
        {selectedConfig && (
          <Card data-testid={`${selectedConfig.testId}-table`} className="gba:mt-6">
            <CardHeader>
              <div className="gba:flex gba:justify-between gba:items-center">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CardTitle className="gba:text-xl">
                    {t('hr-analytics-data-table', { title: selectedConfig.title })}
                  </CardTitle>
                  <Badge variant="outline" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
                    {t('hr-analytics-total-entries', { count: selectedConfig.tableData.length })}
                  </Badge>
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-excel`}
                    onClick={e => {
                      e.stopPropagation()
                      handleExport(
                        'excel',
                        selectedConfig.testId,
                        selectedConfig.title,
                        selectedConfig.exportColumns,
                        selectedConfig.tableData
                      )
                    }}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFileText className="gba:w-3 gba:h-3" />
                    {t('common-export-excel')}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                    onClick={e => {
                      e.stopPropagation()
                      handleExport(
                        'pdf',
                        selectedConfig.testId,
                        selectedConfig.title,
                        selectedConfig.exportColumns,
                        selectedConfig.tableData
                      )
                    }}
                    className="gba:flex gba:items-center gba:gap-1"
                  >
                    <PiFilePdf className="gba:w-3 gba:h-3" />
                    {t('common-export-pdf')}
                  </Button>
                </div>
              </div>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">{selectedConfig.description}</p>
            </CardHeader>

            <CardContent>
              <div className="gba:max-h-96 gba:overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-2/5">{t('hr-analytics-period')}</TableHead>
                      <TableHead className="gba:w-1/5">{t('hr-analytics-value')}</TableHead>
                      <TableHead className="gba:w-2/5">{t('hr-analytics-change')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConfig.tableData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="gba:font-medium">{item.period}</TableCell>
                        <TableCell>{item.value.toLocaleString()}</TableCell>
                        <TableCell>
                          {item.change !== undefined && (
                            <Badge
                              variant="outline"
                              className={`${
                                item.change > 0
                                  ? 'gba:bg-success-secondary/50 gba:text-success-secondary-foreground'
                                  : item.change < 0
                                    ? 'gba:bg-destructive-secondary/50 gba:text-destructive-secondary-foreground'
                                    : 'gba:bg-muted gba:text-muted-foreground'
                              }`}
                            >
                              {item.change > 0 ? '+' : ''}
                              {item.change.toLocaleString()}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="gba:mt-4 gba:p-3 gba:bg-muted gba:rounded-md gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-sm">
                  {t('hr-analytics-total-data-points', { count: selectedConfig.tableData.length })}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground">{selectedConfig.title}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        {!selectedConfig && (
          <div className="gba:text-center gba:py-8">
            <p className="gba:text-muted-foreground">{t('hr-analytics-click-to-view-table')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HeadcountTrends
