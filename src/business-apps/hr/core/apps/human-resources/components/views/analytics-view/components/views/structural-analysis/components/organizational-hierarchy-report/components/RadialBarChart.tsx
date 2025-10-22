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
  ReloadOutlined,
  TeamOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  BankOutlined,
  EyeOutlined,
  SwitcherOutlined,
  DollarCircleOutlined,
  TableOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import {
  RadialBarChart as RechartsRadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from 'recharts'
import { SunburstVisualizationProps, HierarchyLevelReportData } from '../types/hierarchyTypes'
import { ViewMode } from '../hooks/useHierarchyData'

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

  // Colors are now handled through the colorMap from the data integration hook

  // Extract levels and create data for RadialBarChart
  const levels = data[0]?.children || []

  // Prepare data for stacked radial bar chart
  const chartData = levels.map((level, levelIndex) => {
    const levelData: any = {
      level: `Level ${levelIndex}`,
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
      title: 'Level',
      dataIndex: 'levelName',
      key: 'levelName',
      width: 120,
      render: (text: string, record: HierarchyLevelReportData) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" className="gba:text-xs">
            {record.organizationalUnits} units
          </Text>
        </div>
      )
    },
    {
      title: 'Total Employees',
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
            {record.percentage}% of total
          </Text>
        </div>
      )
    },
    {
      title: viewMode === 'company' ? 'Companies' : viewMode === 'costcenter' ? 'Cost Centers' : 'Countries',
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
          <Text strong>Total Employees: {data.total}</Text>
          <Divider className="gba:my-2" />
          {Object.keys(data)
            .filter(
              key =>
                (key.startsWith('country_') || key.startsWith('company_') || key.startsWith('costcenter_')) &&
                !key.endsWith('_name') &&
                !key.endsWith('_color')
            )
            .map(key => {
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
                      {name}: <strong>{value}</strong> employees
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
        message="Error Loading Hierarchy Data"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={onRefresh} icon={<ReloadOutlined />}>
            Retry
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
            <ApartmentOutlined className="gba:mr-2 gba:text-info" />
            Organizational Hierarchy Report
          </Title>
          <Tag color="var(--nw-color-info-secondary)" icon={<TeamOutlined />}>
            {statistics.totalEmployees} employees
          </Tag>
        </div>

        {/* View Mode Switcher */}
        <Space>
          <Text strong>
            <EyeOutlined className="gba:mr-2" />
            View by:
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
              <GlobalOutlined className="gba:mr-1" />
              Location
            </Radio.Button>
            <Radio.Button value="company" data-testid="OrganizationalHierarchyReport-RadialBarChart-CompanyModeButton">
              <BankOutlined className="gba:mr-1" />
              Company
            </Radio.Button>
            <Radio.Button
              value="costcenter"
              data-testid="OrganizationalHierarchyReport-RadialBarChart-CostCenterModeButton"
            >
              <DollarCircleOutlined className="gba:mr-1" />
              Cost Center
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* Description */}
      <div className="gba:mb-6 gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border">
        <Text className="gba:text-foreground">
          Interactive radial bar chart visualization showing organizational hierarchy distribution across different
          levels. Each ring represents an organizational level with segments showing distribution by{' '}
          {viewMode === 'company'
            ? 'company affiliations'
            : viewMode === 'costcenter'
              ? 'cost center assignments'
              : 'geographic locations'}
          . Use the view mode buttons above to switch between different organizational perspectives.
        </Text>
      </div>

      {/* Statistics Row */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Employees"
              value={statistics.totalEmployees}
              prefix={<TeamOutlined style={{ color: 'var(--nw-entity-employee)' }} />}
              valueStyle={{ color: 'var(--nw-entity-employee)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Organizational Units"
              value={statistics.totalOrganizationalUnits}
              prefix={<ApartmentOutlined style={{ color: 'var(--nw-entity-department)' }} />}
              valueStyle={{ color: 'var(--nw-entity-department)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hierarchy Levels"
              value={statistics.maxLevels}
              prefix={<SwitcherOutlined style={{ color: 'var(--nw-entity-strategy)' }} />}
              valueStyle={{ color: 'var(--nw-entity-strategy)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={viewMode === 'company' ? 'Companies' : viewMode === 'costcenter' ? 'Cost Centers' : 'Countries'}
              value={
                viewMode === 'company'
                  ? statistics.companiesCount
                  : viewMode === 'costcenter'
                    ? statistics.costCentersCount
                    : statistics.countriesRepresented
              }
              prefix={
                viewMode === 'company' ? (
                  <BankOutlined style={{ color: 'var(--nw-entity-order)' }} />
                ) : viewMode === 'costcenter' ? (
                  <DollarCircleOutlined style={{ color: 'var(--nw-entity-department)' }} />
                ) : (
                  <GlobalOutlined style={{ color: 'var(--nw-entity-location)' }} />
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
            <BarChartOutlined className="gba:mr-2" />
            Organizational Hierarchy -{' '}
            {viewMode === 'company' ? 'By Company' : viewMode === 'costcenter' ? 'By Cost Center' : 'By Location'}
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
                    />
                  ))}
                  <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" />
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
                  <SwitcherOutlined className="gba:mr-2" />
                  Level Breakdown
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
                    <Text strong>Level {index}</Text>
                    <Tag className="gba:text-info-secondary-foreground gba:bg-info-secondary/50">
                      {level.value} employees
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
            <TableOutlined className="gba:mr-2" />
            Detailed Level Report -{' '}
            {viewMode === 'company' ? 'By Company' : viewMode === 'costcenter' ? 'By Cost Center' : 'By Location'}
          </span>
        }
      >
        <div className="gba:mb-4">
          <Text type="secondary">Detailed breakdown of employee distribution across organizational levels</Text>
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
