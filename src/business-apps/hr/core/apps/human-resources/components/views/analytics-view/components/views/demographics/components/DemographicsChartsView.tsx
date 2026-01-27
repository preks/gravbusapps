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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DemographicsData } from '../../../../hooks/useDemographicsDataIntegration'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

interface DemographicsChartsViewProps {
  demographicsData: DemographicsData
  isLoading: boolean
  dataTestId: string
}

interface TableData {
  category: string
  value: number
  percentage: string
}

const DemographicsChartsView: React.FC<DemographicsChartsViewProps> = ({ demographicsData, isLoading, dataTestId }) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(hrTranslations)

  // Chart colors from design system
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

  // Custom label renderer for pie charts
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if percent is greater than 5%
    return percent > 0.05 ? (
      <text
        x={x}
        y={y}
        fill="var(--nw-color-primary-foreground)"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

  // Safe access to data with null checks
  const genderData = demographicsData?.genderDistribution || []
  const ageData = demographicsData?.ageDistribution || []
  const nationalityData = demographicsData?.nationalityDistribution || []

  // Transform data to include percentages
  const transformData = (data: Array<{ category: string; value: number }>): TableData[] => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      category: item.category,
      value: item.value,
      percentage: total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'
    }))
  }

  // Mock export functions
  const handleExport = async (format: 'excel' | 'pdf', tableName: string, data: TableData[]) => {
    setExportingTable(`${tableName}-${format}`)

    // Mock export delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log(`Exporting ${tableName} as ${format}:`, data)

    setExportingTable(null)
  }

  const chartConfigs = [
    {
      title: t('hr-analytics-gender-distribution'),
      data: genderData,
      tableData: transformData(genderData),
      colors: chartColors,
      testId: 'gender-chart',
      tag: t('hr-analytics-categories', { count: genderData.length }),
      description: t('hr-analytics-gender-description')
    },
    {
      title: t('hr-analytics-age-distribution'),
      data: ageData,
      tableData: transformData(ageData),
      colors: chartColors,
      testId: 'age-chart',
      tag: t('hr-analytics-age-groups', { count: ageData.length }),
      description: t('hr-analytics-age-description')
    },
    {
      title: t('hr-analytics-nationality-distribution'),
      data: nationalityData.slice(0, 8), // Show top 8 nationalities in chart
      tableData: transformData(nationalityData), // Show all in table
      colors: chartColors,
      testId: 'nationality-chart',
      tag: t('hr-analytics-top-8-of-nationalities', { total: nationalityData.length }),
      description: t('hr-analytics-nationality-description')
    }
  ]

  const handleChartClick = (chartId: string) => {
    // If clicking the same chart, deselect it. Otherwise, select the new one.
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

  // Find the selected chart configuration
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (isLoading) {
    return (
      <div data-testid={`${dataTestId}-charts-view`}>
        {/* Loading Charts Row */}
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
          {[1, 2, 3].map(index => (
            <Card key={index} className="gba:animate-pulse">
              <CardHeader>
                <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="gba:h-80 gba:bg-muted gba:rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div data-testid={`${dataTestId}-charts-view`}>
      {/* Charts Row */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
        {chartConfigs.map(config => {
          const isSelected = selectedChart === config.testId

          return (
            <Card
              key={config.testId}
              data-testid={`${dataTestId}-${config.testId}`}
              className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:shadow-sm ${
                isSelected ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' : 'gba:hover:shadow-lg'
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
                  {config.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={config.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={60}
                          fill="var(--nw-chart-1)"
                          dataKey="value"
                          nameKey="category"
                        >
                          {config.data.map((_, entryIndex) => (
                            <Cell key={`cell-${entryIndex}`} fill={config.colors[entryIndex % config.colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value} ${t('hr-analytics-employees')}`, name]}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: '10px',
                            marginTop: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
                      <p className="gba:text-muted-foreground gba:text-sm">{t('hr-analytics-no-data')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selected Chart Data Table */}
      <div ref={tableRef}>
        {selectedConfig && (
          <Card data-testid={`${dataTestId}-${selectedConfig.testId}-table`}>
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
                      handleExport('excel', selectedConfig.testId, selectedConfig.tableData)
                    }}
                    data-testid={`${dataTestId}-${selectedConfig.testId}-export-excel`}
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
                      handleExport('pdf', selectedConfig.testId, selectedConfig.tableData)
                    }}
                    data-testid={`${dataTestId}-${selectedConfig.testId}-export-pdf`}
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
                      <TableHead className="gba:w-2/5">{t('common-category')}</TableHead>
                      <TableHead className="gba:w-1/5">{t('hr-analytics-employee-count')}</TableHead>
                      <TableHead className="gba:w-2/5">{t('hr-analytics-percentage')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConfig.tableData.map(item => (
                      <TableRow key={item.category}>
                        <TableCell className="gba:font-medium">{item.category}</TableCell>
                        <TableCell>{item.value.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gba:bg-info-secondary gba:text-info-secondary-foreground">
                            {item.percentage}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="gba:mt-4 gba:p-3 gba:bg-muted gba:rounded-md gba:flex gba:justify-between gba:items-center">
                <span className="gba:font-medium gba:text-sm">
                  {t('hr-analytics-total-label')}:{' '}
                  {selectedConfig.tableData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}{' '}
                  {t('hr-analytics-employees')}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {t('hr-analytics-categories', { count: selectedConfig.tableData.length })}
                </span>
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

export default DemographicsChartsView
