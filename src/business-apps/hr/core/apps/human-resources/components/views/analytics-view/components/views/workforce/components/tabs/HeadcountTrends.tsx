import React, { useState } from 'react'
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
import { BusinessAppContextProps } from '../../../../../../../../../../common/BusinessAppContext'
import HeadcountStatistics from '../components/HeadcountStatistics'
import HeadcountTrendsChart from '../components/HeadcountTrendsChart'
import HiresAndDeparturesChart from '../components/HiresAndDeparturesChart'
import HeadcountByOrgUnitChart from '../components/HeadcountByOrgUnitChart'
import { useHeadcountTrendsData } from '../../../../../hooks/useHeadcountTrendsData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { Title, Text } = Typography

interface HeadcountTrendsProps extends BusinessAppContextProps {}

interface TableData {
  period: string
  value: number
  change?: number
}

const HeadcountTrends: React.FC<HeadcountTrendsProps> = context => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [exportingTable, setExportingTable] = useState<string | null>(null)

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

  // Mock export functions
  const handleExport = async (format: 'excel' | 'pdf', tableName: string, data: TableData[]) => {
    setExportingTable(`${tableName}-${format}`)

    // Mock export delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    console.log(`Exporting ${tableName} as ${format}:`, data)

    setExportingTable(null)
  }

  const handleChartClick = (chartId: string) => {
    setSelectedChart(selectedChart === chartId ? null : chartId)
  }

  // Chart configurations
  const chartConfigs = [
    {
      title: 'Total Headcount Over Time',
      data: headcountOverTime,
      tableData: transformHeadcountOverTimeData(),
      testId: 'headcount-trends-chart',
      tag: `${headcountOverTime.length} data points`,
      description: 'Historical headcount trends showing organizational growth and workforce changes over time'
    },
    {
      title: 'Monthly Hires & Departures',
      data: [...monthlyHires, ...monthlyExits],
      tableData: transformHiresAndDeparturesData(),
      testId: 'hires-departures-chart',
      tag: `${Math.max(monthlyHires.length, monthlyExits.length)} months`,
      description: 'Monthly hiring and departure activity showing workforce flow and turnover patterns'
    },
    {
      title: 'Headcount by Organizational Unit',
      data: departmentData,
      tableData: transformOrgUnitData(),
      testId: 'headcount-by-org-unit-chart',
      tag: `${departmentData.length} departments`,
      description:
        'Current headcount distribution across organizational units showing workforce allocation and department sizes'
    }
  ]

  // Find the selected chart configuration
  const selectedConfig = chartConfigs.find(config => config.testId === selectedChart)

  if (error) {
    return (
      <div data-testid="headcount-trends-error">
        <Card className="gba:border-red-200 gba:bg-red-50">
          <CardContent className="gba:p-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-red-900 gba:font-medium gba:mb-2">Failed to Load Headcount Trends Data</h3>
                <p className="gba:text-red-700">{error}</p>
              </div>
              <button
                onClick={refetch}
                className="gba:px-4 gba:py-2 gba:bg-red-600 gba:text-white gba:rounded gba:hover:bg-red-700"
              >
                Retry
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
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">Workforce Charts</h3>
        <p className="gba:text-sm gba:text-gray-600">Click on any chart to view detailed data table</p>
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
                isSelected ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Title level={4} className="gba:m-0 gba:text-gray-800">
                      {config.title}
                    </Title>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">{config.description}</Text>
                {isSelected && <p className="gba:text-xs gba:text-blue-600 gba:mt-1">✓ Selected - Table shown below</p>}
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
                isSelected ? 'gba:ring-2 gba:ring-blue-500 gba:shadow-lg' : 'gba:hover:shadow-lg'
              }`}
              onClick={() => handleChartClick(config.testId)}
            >
              <CardHeader className="gba:border-b">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Title level={4} className="gba:m-0 gba:text-gray-800">
                      {config.title}
                    </Title>
                  </div>
                  <Badge variant="outline" className="gba:text-xs">
                    {config.tag}
                  </Badge>
                </div>
                <Text className="gba:text-gray-600 gba:text-sm gba:mt-1">{config.description}</Text>
                {isSelected && <p className="gba:text-xs gba:text-blue-600 gba:mt-1">✓ Selected - Table shown below</p>}
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
      {selectedConfig && (
        <Card data-testid={`${selectedConfig.testId}-table`} className="gba:mt-6">
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-xl">Data Table: {selectedConfig.title}</CardTitle>
                <Badge variant="outline" className="gba:bg-green-50 gba:text-green-700">
                  {selectedConfig.tableData.length} entries
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
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFileText className="gba:w-3 gba:h-3" />
                  Export Excel
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportingTable === `${selectedConfig.testId}-pdf`}
                  onClick={e => {
                    e.stopPropagation()
                    handleExport('pdf', selectedConfig.testId, selectedConfig.tableData)
                  }}
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <PiFilePdf className="gba:w-3 gba:h-3" />
                  Export PDF
                </Button>
              </div>
            </div>
            <p className="gba:text-sm gba:text-gray-600 gba:mt-2">{selectedConfig.description}</p>
          </CardHeader>

          <CardContent>
            <div className="gba:max-h-96 gba:overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-2/5">Period</TableHead>
                    <TableHead className="gba:w-1/5">Value</TableHead>
                    <TableHead className="gba:w-2/5">Change</TableHead>
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
                                ? 'gba:bg-green-50 gba:text-green-700'
                                : item.change < 0
                                  ? 'gba:bg-red-50 gba:text-red-700'
                                  : 'gba:bg-gray-50 gba:text-gray-700'
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
            <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded-md gba:flex gba:justify-between gba:items-center">
              <span className="gba:font-medium gba:text-sm">Total Data Points: {selectedConfig.tableData.length}</span>
              <span className="gba:text-sm gba:text-gray-600">{selectedConfig.title}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!selectedConfig && (
        <div className="gba:text-center gba:py-8">
          <p className="gba:text-gray-500">Click on any chart above to view its detailed data table</p>
        </div>
      )}
    </div>
  )
}

export default HeadcountTrends
