import React from 'react'
import { Card, Typography, Table, Tag, List, Avatar } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { UserOutlined, AlertOutlined } from '@ant-design/icons'
import { ReportingChainData, ReportingChainSummary } from '../types/structuralTypes'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

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
  const { t } = useTranslation(hrTranslations)
  // Table columns for reporting chains
  const chainColumns = [
    {
      title: t('hr-analytics-chain-id'),
      dataIndex: 'chainId',
      key: 'chainId',
      width: 120
    },
    {
      title: t('hr-analytics-top-org-unit'),
      dataIndex: 'topManager',
      key: 'topManager',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: t('hr-analytics-levels-title'),
      dataIndex: 'levels',
      key: 'levels',
      width: 100,
      align: 'center' as const,
      render: (levels: number) => {
        let color = 'green'
        if (levels > 6) color = 'red'
        else if (levels > 4) color = 'orange'

        return (
          <Tag color={color}>
            {levels} {t('hr-analytics-levels')}
          </Tag>
        )
      }
    },
    {
      title: t('hr-analytics-total-employees'),
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
      title: t('hr-analytics-avg-span-of-control'),
      dataIndex: 'averageSpanOfControl',
      key: 'averageSpanOfControl',
      width: 140,
      align: 'center' as const,
      render: (value: number) => value.toFixed(1)
    },
    {
      title: t('hr-analytics-bottlenecks'),
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
                <div className="gba:text-xs gba:text-muted-foreground">
                  +{bottlenecks.length - 2} {t('hr-analytics-more')}
                </div>
              )}
            </div>
          ) : (
            <Text className="gba:text-muted-foreground">{t('hr-analytics-none')}</Text>
          )}
        </div>
      )
    },
    {
      title: t('hr-analytics-efficiency'),
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
    chainLength: `${item.length} ${t('hr-analytics-levels')}`,
    count: item.count,
    percentage: item.percentage
  }))

  return (
    <div data-testid={`${prefixDataTestId}-ReportingChainAnalysis`}>
      {/* Summary Statistics */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          {t('hr-analytics-reporting-chain-summary')}
        </Title>
        <div className="gba:grid gba:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gba:gap-4">
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">
              {summary.averageChainLength.toFixed(1)}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('hr-analytics-average-chain-length')}</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.maxChainLength}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('hr-analytics-max-chain-length')}</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-muted gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{summary.minChainLength}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('hr-analytics-min-chain-length')}</div>
          </div>
          <div className="gba:text-center gba:p-4 gba:bg-warning-secondary/40 gba:rounded">
            <div className="gba:text-2xl gba:font-bold gba:text-warning-secondary-foreground">
              {summary.bottlenecks.length}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('hr-analytics-bottlenecks-identified')}</div>
          </div>
        </div>
      </Card>

      {/* Chain Distribution Chart */}
      <Card className="gba:mb-4">
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          {t('hr-analytics-chain-length-distribution')}
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
          {t('hr-analytics-bottleneck-managers')}
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
                    <Text>
                      {bottleneck.chainsThroughManager} {t('hr-analytics-reporting-chains')}{' '}
                      {t('hr-analytics-pass-through-this-manager')}
                    </Text>
                    <br />
                    <Tag color="var(--nw-warning)">
                      {t('hr-analytics-impact-score')}: {bottleneck.impact}
                    </Tag>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: t('hr-analytics-no-significant-bottlenecks') }}
        />
      </Card>

      {/* Detailed Reporting Chains Table */}
      <Card>
        <Title level={5} className="gba:m-0 gba:mb-4 gba:text-foreground">
          {t('hr-analytics-detailed-reporting-chains')}
        </Title>
        <Table
          dataSource={chains}
          columns={chainColumns}
          rowKey="chainId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('hr-analytics-of')} ${total} ${t('hr-analytics-reporting-chains')}`
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
