import React, { useState, useMemo } from 'react'
import {
  Card,
  Alert,
  Button,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Progress,
  Radio,
  Typography,
  Divider,
  Spin,
  Table
} from 'antd'
import {
  ArrowsClockwiseIcon,
  UsersIcon,
  BuildingsIcon,
  GlobeIcon,
  BankIcon,
  EyeIcon,
  TreeStructureIcon,
  CurrencyCircleDollarIcon,
  TableIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import {
  RadialBarChart as RechartsRadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'
import { SunburstVisualizationProps, HierarchyLevelReportData } from '../types/hierarchyTypes'
import { ViewMode } from '../hooks/useHierarchyData'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title, Text } = Typography

export interface RadialBarChartProps extends SunburstVisualizationProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

const RadialBarChart: React.FC<RadialBarChartProps> = ({
  data,
  statistics,
  tableData,
  isLoading,
  error,
  onRefresh,
  viewMode,
  onViewModeChange
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const { t } = useTranslation(hrTranslations)
  // no manual tooltip management needed here

  // Colors are now handled through the colorMap from the data integration hook

  // Extract levels and create data for RadialBarChart
  const levels = data[0]?.children || []

  // Prepare data for stacked radial bar chart
  const chartData = levels.map((level, levelIndex) => {
    const levelData: any = {
      level: `${t('hr-analytics-level')} ${levelIndex}`,
      levelIndex,
      total: level.value
    }

    // Add segments (countries, companies, or cost centers) as separate properties for stacking
    level.children.forEach((segment, segmentIndex) => {
      const segmentKey =
        viewMode === 'company'
          ? `company_${segmentIndex}`
          : viewMode === 'costcenter'
            ? `costcenter_${segmentIndex}`
            : `country_${segmentIndex}`
      levelData[segmentKey] = segment.value
      levelData[`${segmentKey}_name`] = segment.name
      levelData[`${segmentKey}_color`] = segment.color
    })

    return levelData
  })

  // Get all unique segment keys for RadialBar components
  const allSegmentKeys = new Set<string>()
  chartData.forEach(levelData => {
    Object.keys(levelData).forEach(key => {
      if (key.startsWith('country_') || key.startsWith('company_') || key.startsWith('costcenter_')) {
        if (!key.endsWith('_name') && !key.endsWith('_color')) {
          allSegmentKeys.add(key)
        }
      }
    })
  })

  // Helper function to get color for a segment key from the chartData
  const getSegmentColor = (segmentKey: string): string => {
    // Find the first occurrence of this segment key in chartData and get its color
    for (const levelData of chartData) {
      const colorKey = `${segmentKey}_color`
      if (levelData[colorKey]) {
        return levelData[colorKey]
      }
    }
    // Fallback to a default color if not found
    return '#6B7280'
  }

  // Get current table data based on view mode
  const currentTableData = useMemo(() => {
    if (!tableData) return []
    return tableData[viewMode] || []
  }, [tableData, viewMode])

  // Table columns configuration
  const tableColumns = [
    {
      title: t('hr-analytics-level'),
      dataIndex: 'levelName',
      key: 'levelName',
      width: 120,
      render: (text: string, record: HierarchyLevelReportData) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" className="gba:text-xs">
            {record.organizationalUnits} {t('hr-analytics-units')}
          </Text>
        </div>
      )
    },
    {
      title: t('hr-analytics-total-employees'),
      dataIndex: 'totalEmployees',
      key: 'totalEmployees',
      width: 150,
      render: (value: number, record: HierarchyLevelReportData) => (
        <div>
          <Text strong className="gba:text-base">
            {value}
          </Text>
          <br />
          <Progress percent={record.percentage} size="small" showInfo={false} strokeColor="var(--nw-chart-1)" />
          <Text type="secondary" className="gba:text-xs">
            {record.percentage}% {t('hr-analytics-of')} {t('hr-analytics-total')}
          </Text>
        </div>
      )
    },
    {
      title:
        viewMode === 'company'
          ? t('hr-analytics-companies')
          : viewMode === 'costcenter'
            ? t('hr-analytics-cost-centers')
            : t('hr-analytics-countries'),
      dataIndex: 'segments',
      key: 'segments',
      render: (segments: any[]) => (
        <div className="gba:max-w-[400px]">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className={`gba:flex gba:justify-between gba:items-center ${
                index < segments.length - 1 ? 'gba:mb-2' : 'gba:mb-0'
              }`}
            >
              <div className="gba:flex gba:items-center gba:flex-1">
                <div className="gba:w-3 gba:h-3 gba:rounded-sm gba:mr-2" style={{ backgroundColor: segment.color }} />
                <Text className="gba:mr-2">{segment.name}</Text>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Tag className="gba:text-info-secondary-foreground gba:bg-info-secondary/50">
                  {segment.employeeCount}
                </Tag>
                <Text type="secondary" className="gba:text-xs gba:min-w-[35px]">
                  {segment.percentage}%
                </Text>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ]

  // Custom tooltip for RadialBar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <Card size="small" className="gba:min-w-[200px]">
          <Title level={5} className="gba:m-0 gba:mb-2">
            {label}
          </Title>
          <Text strong>
            {t('hr-analytics-total-employees')}: {data.total}
          </Text>
          <Divider className="gba:my-2" />
          {Object.keys(data)
            .filter(
              (key: string) =>
                (key.startsWith('country_') || key.startsWith('company_') || key.startsWith('costcenter_')) &&
                !key.endsWith('_name') &&
                !key.endsWith('_color')
            )
            .map((key: string) => {
              const nameKey = `${key}_name`
              const colorKey = `${key}_color`
              const value = data[key]
              const name = data[nameKey]
              const color = data[colorKey]
              if (value > 0) {
                return (
                  <div key={key} className="gba:mb-1 gba:flex gba:items-center">
                    <div className="gba:w-3 gba:h-3 gba:rounded-sm gba:mr-2" style={{ backgroundColor: color }} />
                    <Text>
                      {name}: <strong>{value}</strong> {t('hr-analytics-employees')}
                    </Text>
                  </div>
                )
              }
              return null
            })}
        </Card>
      )
    }
    return null
  }

  // Note: Recharts builtin tooltip is replaced with a custom absolutely-positioned overlay to avoid jump

  if (isLoading) {
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
    <div
      data-testid="OrganizationalHierarchyReport-RadialBarChart"
      className="gba:bg-gradient-to-b gba:from-background gba:to-muted gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header with View Mode Switcher */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Title level={3} className="gba:m-0 gba:text-foreground">
            <BuildingsIcon size={16} className="gba:mr-2 gba:text-info" />
            {t('hr-analytics-organizational-hierarchy-report')}
          </Title>
          <Tag color="var(--nw-color-info-secondary)" icon={<UsersIcon size={16} />}>
            {statistics.totalEmployees} {t('hr-analytics-employees')}
          </Tag>
        </div>

        {/* View Mode Switcher */}
        <Space>
          <Text strong>
            <EyeIcon size={16} className="gba:mr-2" />
            {t('hr-analytics-view-by')}
          </Text>
          <Radio.Group
            value={viewMode}
            onChange={e => onViewModeChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button
              value="location"
              data-testid="OrganizationalHierarchyReport-RadialBarChart-LocationModeButton"
            >
              <GlobeIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-location')}
            </Radio.Button>
            <Radio.Button value="company" data-testid="OrganizationalHierarchyReport-RadialBarChart-CompanyModeButton">
              <BankIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-company')}
            </Radio.Button>
            <Radio.Button
              value="costcenter"
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CostCenterModeButton"
            >
              <CurrencyCircleDollarIcon size={16} className="gba:mr-1" />
              {t('hr-analytics-cost-center')}
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* Description */}
      <div className="gba:mb-6 gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border">
        <Text className="gba:text-foreground">
          {t('hr-analytics-organizational-hierarchy-report')} {t('hr-analytics-organizational-hierarchy')}
        </Text>
      </div>

      {/* Statistics Row */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('hr-analytics-total-employees')}
              value={statistics.totalEmployees}
              prefix={<UsersIcon size={16} style={{ color: 'var(--nw-entity-employee)' }} />}
              valueStyle={{ color: 'var(--nw-entity-employee)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('hr-analytics-departments-label')}
              value={statistics.totalOrganizationalUnits}
              prefix={<BuildingsIcon size={16} style={{ color: 'var(--nw-entity-department)' }} />}
              valueStyle={{ color: 'var(--nw-entity-department)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('hr-analytics-levels-title')}
              value={statistics.maxLevels}
              prefix={<TreeStructureIcon size={16} style={{ color: 'var(--nw-entity-strategy)' }} />}
              valueStyle={{ color: 'var(--nw-entity-strategy)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={
                viewMode === 'company'
                  ? t('hr-analytics-companies')
                  : viewMode === 'costcenter'
                    ? t('hr-analytics-cost-centers')
                    : t('hr-analytics-countries')
              }
              value={
                viewMode === 'company'
                  ? statistics.companiesCount
                  : viewMode === 'costcenter'
                    ? statistics.costCentersCount
                    : statistics.countriesRepresented
              }
              prefix={
                viewMode === 'company' ? (
                  <BankIcon size={16} style={{ color: 'var(--nw-entity-order)' }} />
                ) : viewMode === 'costcenter' ? (
                  <CurrencyCircleDollarIcon size={16} style={{ color: 'var(--nw-entity-department)' }} />
                ) : (
                  <GlobeIcon size={16} style={{ color: 'var(--nw-entity-location)' }} />
                )
              }
              valueStyle={{
                color:
                  viewMode === 'company'
                    ? 'var(--nw-entity-order)'
                    : viewMode === 'costcenter'
                      ? 'var(--nw-entity-department)'
                      : 'var(--nw-entity-location)'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Radial Chart Visualization */}
      <Card
        title={
          <span>
            <ChartBarIcon size={16} className="gba:mr-2" />
            {t('hr-analytics-organizational-hierarchy')} -{' '}
            {viewMode === 'company'
              ? t('hr-analytics-by-company')
              : viewMode === 'costcenter'
                ? t('hr-analytics-by-cost-center')
                : t('hr-analytics-by-location')}
          </span>
        }
        className="gba:mb-6"
      >
        <Row gutter={[24, 24]}>
          {/* Visualization */}
          <Col xs={24} lg={16}>
            <div className="gba:h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadialBarChart
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={450}
                  stackOffset="expand"
                >
                  {Array.from(allSegmentKeys).map(segmentKey => (
                    <RadialBar
                      key={segmentKey}
                      dataKey={segmentKey}
                      stackId="segments"
                      fill={getSegmentColor(segmentKey)}
                      isAnimationActive={false}
                    />
                  ))}
                  {/* Legend removed to eliminate dots under the circles */}
                  <RechartsTooltip content={<CustomTooltip />} />
                </RechartsRadialBarChart>
              </ResponsiveContainer>
            </div>
          </Col>

          {/* Level Breakdown */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <span>
                  <TreeStructureIcon size={16} className="gba:mr-2" />
                  {t('hr-analytics-level-breakdown')}
                </span>
              }
              size="small"
            >
              {levels.map((level, index) => (
                <div
                  key={level.id}
                  className={`gba:mb-3 gba:p-2 gba:rounded gba:cursor-pointer gba:border ${
                    selectedLevel === index
                      ? 'gba:bg-info-secondary gba:border-info'
                      : 'gba:bg-transparent gba:border-transparent'
                  }`}
                  onClick={() => setSelectedLevel(selectedLevel === index ? null : index)}
                >
                  <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
                    <Text strong>
                      {t('hr-analytics-level')} {index}
                    </Text>
                    <Tag className="gba:text-info-secondary-foreground gba:bg-info-secondary/50">
                      {level.value} {t('hr-analytics-employees')}
                    </Tag>
                  </div>
                  <Progress
                    percent={Math.round((level.value / statistics.totalEmployees) * 100)}
                    size="small"
                    strokeColor="var(--nw-chart-1)"
                  />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Table View */}
      <Card
        title={
          <span>
            <TableIcon size={16} className="gba:mr-2" />
            {t('hr-analytics-detailed-level-report')} -{' '}
            {viewMode === 'company'
              ? t('hr-analytics-by-company')
              : viewMode === 'costcenter'
                ? t('hr-analytics-by-cost-center')
                : t('hr-analytics-by-location')}
          </span>
        }
      >
        <div className="gba:mb-4">
          <Text type="secondary">{t('hr-analytics-detailed-breakdown-of-distribution')}</Text>
        </div>
        <Table
          dataSource={currentTableData}
          columns={tableColumns}
          rowKey="level"
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}

export default RadialBarChart
