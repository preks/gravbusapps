import React from 'react'
import { Card, Typography, Table, Tag, Progress, Tooltip as AntTooltip } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { SpanOfControlData, SpanOfControlSummary } from '../types/structuralTypes'
import { chartColors } from '../utils/structuralUtils'

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
          {record.managerLevel && <div style={{ fontSize: '12px', color: '#666' }}>{record.managerLevel}</div>}
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
        <Text strong style={{ fontSize: '16px' }}>
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
        return chartColors.status.warning
      case 'Overloaded':
        return chartColors.status.critical
      default:
        return chartColors.status.optimal
    }
  }

  return (
    <div data-testid={`${prefixDataTestId}-SpanOfControlChart`}>
      {/* Summary Statistics */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
          Span of Control Summary
        </Title>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}
        >
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{summary.totalManagers}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Managers</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {summary.averageSpan.toFixed(1)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Average Span</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: chartColors.status.optimal }}>
              {summary.optimalCount}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Optimal</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.optimalCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor={chartColors.status.optimal}
              showInfo={false}
            />
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: chartColors.status.warning }}>
              {summary.underUtilizedCount}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Under-utilized</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.underUtilizedCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor={chartColors.status.warning}
              showInfo={false}
            />
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8d7da', borderRadius: '6px' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: chartColors.status.critical }}>
              {summary.overBurdenedCount}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Over-burdened</div>
            <Progress
              percent={summary.totalManagers > 0 ? (summary.overBurdenedCount / summary.totalManagers) * 100 : 0}
              size="small"
              strokeColor={chartColors.status.critical}
              showInfo={false}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            textAlign: 'center'
          }}
        >
          <Text style={{ color: '#1565c0' }}>
            Recommended span range: {summary.recommendedSpanMin} - {summary.recommendedSpanMax} direct reports
          </Text>
        </div>
      </Card>

      {/* Bar Chart */}
      <Card style={{ marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
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
        <Title level={5} style={{ margin: 0, marginBottom: '16px', color: '#1f2937' }}>
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
                return 'gba:bg-orange-50'
              case 'Overloaded':
                return 'gba:bg-red-50'
              default:
                return 'gba:bg-green-50'
            }
          }}
        />
      </Card>
    </div>
  )
}
