import React from 'react'
import { Typography, Table, Tag, List, Avatar } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { UserIcon, SirenIcon } from '@phosphor-icons/react'
import { ReportingChainData, ReportingChainSummary } from '../types/structuralTypes'
import { useTranslation, SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { STRUCTURAL_ANALYSIS_CHART_SURFACE_CLASS } from '../../../shared/analyticsChartSurfaceStyles'

const { Text } = Typography

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
  const averageChainLength = Number.isFinite(summary.averageChainLength) ? summary.averageChainLength : 0
  const maxChainLength = Number.isFinite(summary.maxChainLength) ? summary.maxChainLength : 0
  const minChainLength = Number.isFinite(summary.minChainLength) ? summary.minChainLength : 0
  const bottlenecksCount = Array.isArray(summary.bottlenecks) ? summary.bottlenecks.length : 0
  const chainTotal = Array.isArray(chains) ? chains.length : 0
  const bottleneckPercent = chainTotal > 0 ? Math.round((bottlenecksCount / chainTotal) * 100) : 0

  const summaryCards: KpiCardData[] = [
    {
      id: 'reporting-chain-average',
      title: t('hr-analytics-average-chain-length'),
      value: averageChainLength.toFixed(1),
      footer: t('hr-analytics-reporting-chain-summary')
    },
    {
      id: 'reporting-chain-max',
      title: t('hr-analytics-max-chain-length'),
      value: maxChainLength,
      footer: t('hr-analytics-levels-title')
    },
    {
      id: 'reporting-chain-min',
      title: t('hr-analytics-min-chain-length'),
      value: minChainLength,
      footer: t('hr-analytics-levels-title')
    },
    {
      id: 'reporting-chain-bottlenecks',
      title: t('hr-analytics-bottlenecks-identified'),
      value: bottlenecksCount,
      footer: `${bottleneckPercent}% ${t('hr-analytics-of')} ${t('hr-analytics-reporting-chains').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-reporting-chains').toLowerCase()}`,
        target: Math.max(chainTotal, 1),
        value: bottleneckPercent
      }
    }
  ]

  // Table columns for reporting chains
  const chainColumns = [
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
      title: t('hr-analytics-reporting-chains'),
      dataIndex: 'chainPath',
      key: 'chainPath',
      width: 420,
      render: (path?: string) => {
        const displayPath = path?.trim() ?? ''
        if (displayPath.length === 0) {
          return <Text className="gba:text-muted-foreground">-</Text>
        }
        return (
          <Text className="gba:text-xs gba:text-muted-foreground" title={displayPath}>
            {displayPath}
          </Text>
        )
      }
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
    <div data-testid={`${prefixDataTestId}-ReportingChainAnalysis`} className="gba:grid gba:gap-6">
      {/* Summary Statistics */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-reporting-chain-summary')}
        </h3>
        <SectionKpiCards cards={summaryCards} />
      </div>

      {/* Chain Distribution Chart */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-chain-length-distribution')}
        </h3>
        <div className={`gba:border gba:rounded-lg gba:shadow-sm gba:p-4 ${STRUCTURAL_ANALYSIS_CHART_SURFACE_CLASS}`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={distributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              accessibilityLayer={false}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="chainLength" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--nw-chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottlenecks Analysis */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold gba:flex gba:items-center">
          <SirenIcon size={16} className="gba:mr-2 gba:text-warning" />
          {t('hr-analytics-bottlenecks')}
        </h3>
        <p className="gba:mb-4 gba:text-sm gba:text-muted-foreground">{t('hr-analytics-bottlenecks-description')}</p>
        <List
          dataSource={summary.bottlenecks}
          renderItem={bottleneck => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserIcon size={16} />} />}
                title={bottleneck.managerName}
                description={
                  <div>
                    <Text>
                      {bottleneck.chainsThroughManager} {t('hr-analytics-reporting-chains')}
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
      </div>

      {/* Detailed Reporting Chains Table */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-detailed-reporting-chains')}
        </h3>
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
      </div>
    </div>
  )
}
