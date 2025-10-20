import React from 'react'
import { Card, Typography, Table, Tag, Progress, Tooltip as AntTooltip } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { SpanOfControlData, SpanOfControlSummary } from '../types/structuralTypes'

const { Title, Text } = Typography

interface SpanOfControlChartProps {
  data: SpanOfControlData[]
  summary: SpanOfControlSummary
  prefixDataTestId?: string
}

export const SpanOfControlChart: React.FC<SpanOfControlChartProps> = ({
  data,
  summary,
  prefixDataTestId = 'StructuralAnalysis'
}) => {
  // Prepare data for the bar chart
  const chartData = data.map(item => ({
    name: item.managerName.length > 15 ? `${item.managerName.substring(0, 12)}...` : item.managerName,
    fullName: item.managerName,
    directReports: item.directReports,
    efficiency: item.efficiency,
    managerLevel: item.managerLevel,
    organizationalUnit: item.organizationalUnit
  }))

  // Table columns configuration
  const columns = [
    {
      title: 'Manager',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 200,
      render: (text: string, record: SpanOfControlData) => (
        <div>
          <Text strong>{text}</Text>
          {record.managerLevel && <div className="gba:text-xs gba:text-muted-foreground">{record.managerLevel}</div>}
        </div>
      )
    },
    {
      title: 'Organizational Unit',
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
      width: 180
    },
    {
      title: 'Level',
      dataIndex: 'managerLevel',
      key: 'managerLevel',
      width: 80,
      align: 'center' as const,
      render: (value: string | null) => value || '-'
    },
    {
      title: 'Direct Reports',
      dataIndex: 'directReports',
      key: 'directReports',
      width: 120,
      align: 'center' as const,
      render: (value: number) => (
        <Text strong className="gba:text-base">
          {value}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 100,
      align: 'center' as const,
      render: (efficiency: 'Optimal' | 'Overloaded' | 'Underutilized') => {
        const config = {
          Underutilized: { color: 'orange', text: 'Under' },
          Optimal: { color: 'green', text: 'Optimal' },
          Overloaded: { color: 'red', text: 'Over' }
        }
        return <Tag color={config[efficiency].color}>{config[efficiency].text}</Tag>
      }
    },
    {
      title: 'Recommendation',
      dataIndex: 'recommendation',
      key: 'recommendation',
      render: (text: string) =>
        text ? (
          <AntTooltip title={text}>
            <Text style={{ cursor: 'help' }}>{text.length > 50 ? `${text.substring(0, 47)}...` : text}</Text>
          </AntTooltip>
        ) : (
          '-'
        )
    }
  ]

  const getBarColor = (efficiency: string) => {
    switch (efficiency) {
      case 'Underutilized':
        return 'var(--nw-warning)'
      case 'Overloaded':
        return 'var(--nw-destructive)'
      default:
        return 'var(--nw-success)'
    }
  }

  return (
    <div data-testid={`${prefixDataTestId}-SpanOfControlChart`}>
      {/* Summary Statistics */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Span of Control Summary
        </Title>
        <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gba:gap-4">
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.totalManagers}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Total Managers</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.averageSpan.toFixed(1)}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Average Span</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-success-secondary/40 gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-success-secondary-foreground">
              {summary.optimalCount}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Optimal</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.optimalCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor="var(--nw-success)"
              showInfo={false}
            />
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-warning-secondary/40 gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-warning-secondary-foreground">
              {summary.underUtilizedCount}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Under-utilized</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.underUtilizedCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor="var(--nw-warning)"
              showInfo={false}
            />
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-destructive-secondary/40 gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-destructive-secondary-foreground">
              {summary.overBurdenedCount}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Over-burdened</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.overBurdenedCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor="var(--nw-destructive)"
              showInfo={false}
            />
          </div>
        </div>

        <div className="gba:mt-4 gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:text-center">
          <Text className="gba:text-info-secondary-foreground">
            Recommended span range: {summary.recommendedSpanMin} - {summary.recommendedSpanMax} direct reports
          </Text>
        </div>
      </Card>

      {/* Bar Chart */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Span of Control Distribution
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
            <YAxis label={{ value: 'Direct Reports', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="directReports" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.efficiency)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Table */}
      <Card>
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Detailed Span of Control Analysis
        </Title>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="managerId"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="small"
          scroll={{ x: 800 }}
          rowClassName={record => {
            switch (record.efficiency) {
              case 'Underutilized':
                return 'gba:bg-warning-secondary/20'
              case 'Overloaded':
                return 'gba:bg-destructive-secondary/20'
              default:
                return 'gba:bg-success-secondary/20'
            }
          }}
        />
      </Card>
    </div>
  )
}
