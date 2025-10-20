import React from 'react'
import { Card, Typography, Table, Tag, List, Avatar } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { UserOutlined, AlertOutlined } from '@ant-design/icons'
import { ReportingChainData, ReportingChainSummary } from '../types/structuralTypes'

const { Title, Text } = Typography

interface ReportingChainAnalysisProps {
  chains: ReportingChainData[]
  summary: ReportingChainSummary
  prefixDataTestId?: string
}

export const ReportingChainAnalysis: React.FC<ReportingChainAnalysisProps> = ({
  chains,
  summary,
  prefixDataTestId = 'StructuralAnalysis'
}) => {
  // Table columns for reporting chains
  const chainColumns = [
    {
      title: 'Chain ID',
      dataIndex: 'chainId',
      key: 'chainId',
      width: 120
    },
    {
      title: 'Top Manager',
      dataIndex: 'topManager',
      key: 'topManager',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Levels',
      dataIndex: 'levels',
      key: 'levels',
      width: 100,
      align: 'center' as const,
      render: (levels: number) => {
        let color = 'green'
        if (levels > 6) color = 'red'
        else if (levels > 4) color = 'orange'

        return <Tag color={color}>{levels} levels</Tag>
      }
    },
    {
      title: 'Total Employees',
      dataIndex: 'totalEmployees',
      key: 'totalEmployees',
      width: 120,
      align: 'center' as const,
      render: (value: number) => (
        <Text strong className="gba:text-base">
          {value}
        </Text>
      )
    },
    {
      title: 'Avg. Span of Control',
      dataIndex: 'averageSpanOfControl',
      key: 'averageSpanOfControl',
      width: 140,
      align: 'center' as const,
      render: (value: number) => value.toFixed(1)
    },
    {
      title: 'Bottlenecks',
      dataIndex: 'bottlenecks',
      key: 'bottlenecks',
      render: (bottlenecks: string[]) => (
        <div className="gba:max-w-[200px]">
          {bottlenecks.length > 0 ? (
            <div>
              {bottlenecks.slice(0, 2).map((bottleneck, index) => (
                <div key={index} className="gba:text-xs gba:text-muted-foreground">
                  {bottleneck}
                </div>
              ))}
              {bottlenecks.length > 2 && (
                <div className="gba:text-xs gba:text-muted-foreground">+{bottlenecks.length - 2} more</div>
              )}
            </div>
          ) : (
            <Text className="gba:text-muted-foreground">None</Text>
          )}
        </div>
      )
    },
    {
      title: 'Efficiency',
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 100,
      align: 'center' as const,
      render: (efficiency: number) => {
        let color = 'green'
        if (efficiency < 60) color = 'red'
        else if (efficiency < 80) color = 'orange'

        return <Tag color={color}>{efficiency}%</Tag>
      }
    }
  ]

  // Prepare data for chain distribution chart
  const distributionData = summary.chainDistribution.map(item => ({
    chainLength: `${item.length} levels`,
    count: item.count,
    percentage: item.percentage
  }))

  return (
    <div data-testid={`${prefixDataTestId}-ReportingChainAnalysis`}>
      {/* Summary Statistics */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Reporting Chain Summary
        </Title>
        <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gba:gap-4">
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">
              {summary.averageChainLength.toFixed(1)}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Average Chain Length</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.maxChainLength}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Max Chain Length</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.minChainLength}</div>
            <div className="gba:text-xs gba:text-muted-foreground">Min Chain Length</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-warning-secondary/40 gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-warning-secondary-foreground">
              {summary.bottlenecks.length}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">Bottlenecks Identified</div>
          </div>
        </div>
      </Card>

      {/* Chain Distribution Chart */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Chain Length Distribution
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="chainLength" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="var(--nw-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottlenecks Analysis */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          <AlertOutlined className="gba:mr-2 gba:text-warning" />
          Bottleneck Managers
        </Title>
        <List
          dataSource={summary.bottlenecks}
          renderItem={bottleneck => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={bottleneck.managerName}
                description={
                  <div>
                    <Text>{bottleneck.chainsThroughManager} reporting chains pass through this manager</Text>
                    <br />
                    <Tag color="var(--nw-warning)">Impact Score: {bottleneck.impact}</Tag>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No significant bottlenecks identified' }}
        />
      </Card>

      {/* Detailed Reporting Chains Table */}
      <Card>
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          Detailed Reporting Chains
        </Title>
        <Table
          dataSource={chains}
          columns={chainColumns}
          rowKey="chainId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} chains`
          }}
          size="small"
          scroll={{ x: 1000 }}
          rowClassName={record => {
            if (record.levels > 6) return 'gba:bg-destructive-secondary/40'
            if (record.levels > 4) return 'gba:bg-warning-secondary/40'
            return ''
          }}
        />
      </Card>
    </div>
  )
}
