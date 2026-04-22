import React from 'react'
import { Typography, Table, Tag, Tooltip as AntTooltip } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { SpanOfControlData, SpanOfControlSummary } from '../types/structuralTypes'
import { useTranslation, SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Text } = Typography

const spanBarFillForEfficiency = (efficiency: string): string => {
  switch (efficiency) {
    case 'Underutilized':
      return 'var(--nw-warning)'
    case 'Overloaded':
      return 'var(--nw-destructive)'
    default:
      return 'var(--nw-success)'
  }
}

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
  const { t } = useTranslation(hrTranslations)
  const totalManagers = Number.isFinite(summary.totalManagers) ? Math.max(0, summary.totalManagers) : 0
  const optimalCount = Number.isFinite(summary.optimalCount) ? Math.max(0, summary.optimalCount) : 0
  const underUtilizedCount = Number.isFinite(summary.underUtilizedCount) ? Math.max(0, summary.underUtilizedCount) : 0
  const overBurdenedCount = Number.isFinite(summary.overBurdenedCount) ? Math.max(0, summary.overBurdenedCount) : 0
  const averageSpan = Number.isFinite(summary.averageSpan) ? summary.averageSpan : 0
  const optimalPercent = totalManagers > 0 ? (optimalCount / totalManagers) * 100 : 0
  const underUtilizedPercent = totalManagers > 0 ? (underUtilizedCount / totalManagers) * 100 : 0
  const overBurdenedPercent = totalManagers > 0 ? (overBurdenedCount / totalManagers) * 100 : 0

  const summaryCards: KpiCardData[] = [
    {
      id: 'span-summary-total-managers',
      title: t('hr-analytics-total-managers'),
      value: totalManagers,
      footer: t('hr-analytics-span-of-control-summary')
    },
    {
      id: 'span-summary-average-span',
      title: t('hr-analytics-average-span'),
      value: averageSpan.toFixed(1),
      footer: `${t('hr-analytics-recommended-span-range')}: ${summary.recommendedSpanMin}-${summary.recommendedSpanMax}`
    },
    {
      id: 'span-summary-optimal',
      title: t('hr-analytics-optimal'),
      value: optimalCount,
      footer: `${optimalPercent.toFixed(0)}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: Math.max(totalManagers, 1),
        value: Math.round(optimalPercent)
      }
    },
    {
      id: 'span-summary-underutilized',
      title: t('hr-analytics-underutilized'),
      value: underUtilizedCount,
      footer: `${underUtilizedPercent.toFixed(0)}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: Math.max(totalManagers, 1),
        value: Math.round(underUtilizedPercent)
      }
    },
    {
      id: 'span-summary-overloaded',
      title: t('hr-analytics-overloaded'),
      value: overBurdenedCount,
      footer: `${overBurdenedPercent.toFixed(0)}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: Math.max(totalManagers, 1),
        value: Math.round(overBurdenedPercent)
      }
    }
  ]

  // Prepare data for the bar chart
  const chartData = data
    .map(item => ({
      managerId: item.managerId,
      name: item.managerName.length > 24 ? `${item.managerName.substring(0, 21)}...` : item.managerName,
      fullName: item.managerName,
      directReports: item.directReports,
      efficiency: item.efficiency,
      managerLevel: item.managerLevel,
      organizationalUnit: item.organizationalUnit,
      fill: spanBarFillForEfficiency(item.efficiency)
    }))
    .sort((a, b) => b.directReports - a.directReports)

  // Table columns configuration
  const columns = [
    {
      title: t('hr-analytics-organizational-hierarchy'),
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
      width: 180
    },
    {
      title: t('hr-analytics-level'),
      dataIndex: 'managerLevel',
      key: 'managerLevel',
      width: 80,
      align: 'center' as const,
      render: (value: string | null) => value || '-'
    },
    {
      title: t('hr-analytics-direct-reports'),
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
      title: t('hr-analytics-status'),
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 100,
      align: 'center' as const,
      render: (efficiency: 'Optimal' | 'Overloaded' | 'Underutilized') => {
        const config = {
          Underutilized: { color: 'orange', text: t('hr-analytics-underutilized') },
          Optimal: { color: 'green', text: t('hr-analytics-optimal') },
          Overloaded: { color: 'red', text: t('hr-analytics-overloaded') }
        }
        return <Tag color={config[efficiency].color}>{config[efficiency].text}</Tag>
      }
    },
    {
      title: t('hr-analytics-recommendation'),
      dataIndex: 'recommendation',
      key: 'recommendation',
      render: (text: string) =>
        text ? (
          <AntTooltip title={text}>
            <Text className="gba:cursor-help gba:whitespace-normal">{text}</Text>
          </AntTooltip>
        ) : (
          '-'
        )
    }
  ]

  return (
    <div data-testid={`${prefixDataTestId}-SpanOfControlChart`} className="gba:grid gba:gap-6">
      {/* Summary Statistics */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-span-of-control-summary')}
        </h3>
        <SectionKpiCards cards={summaryCards} />

        <div className="gba:mt-4 gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:text-center">
          <Text className="gba:text-info-secondary-foreground">
            {t('hr-analytics-recommended-span-range')}: {summary.recommendedSpanMin} - {summary.recommendedSpanMax}{' '}
            {t('hr-analytics-direct-reports')}
          </Text>
        </div>
      </div>

      {/* Bar Chart */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-span-of-control-distribution')}
        </h3>
        <div className="gba:max-h-[640px] gba:overflow-y-auto gba:pr-2">
          <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 28)}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                label={{ value: t('hr-analytics-direct-reports'), position: 'insideBottom', offset: -5 }}
              />
              <YAxis type="category" dataKey="name" width={160} interval={0} />
              <ReferenceLine
                x={3}
                stroke="var(--nw-warning)"
                strokeDasharray="4 4"
                label={{ value: '3', fill: 'var(--nw-warning)', position: 'top' }}
              />
              <ReferenceLine
                x={7}
                stroke="var(--nw-destructive)"
                strokeDasharray="4 4"
                label={{ value: '7', fill: 'var(--nw-destructive)', position: 'top' }}
              />
              <Tooltip
                labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName ?? '')}
                formatter={value => [value, t('hr-analytics-direct-reports')]}
              />
              <Bar dataKey="directReports" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div>
        <h3 className="gba:m-0 gba:mb-6 gba:text-foreground gba:text-xl gba:font-semibold">
          {t('hr-analytics-detailed-span-of-control-analysis')}
        </h3>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="managerId"
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
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
      </div>
    </div>
  )
}
