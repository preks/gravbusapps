import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { SpanOfControlData, SpanOfControlSummary } from '../types/structuralTypes'
import { Badge, TableCell, TableRow, type KpiCardData, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  StructuralAnalysisChartSurface,
  StructuralAnalysisKpiSection,
  StructuralAnalysisSection,
  StructuralAnalysisTableSection
} from './StructuralAnalysisSection'
import { calculateKpiShareProgress } from '../utils/structuralAnalysisKpis'

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
  const optimalProgress = calculateKpiShareProgress(optimalCount, totalManagers)
  const underUtilizedProgress = calculateKpiShareProgress(underUtilizedCount, totalManagers)
  const overBurdenedProgress = calculateKpiShareProgress(overBurdenedCount, totalManagers)

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
      footer: `${optimalProgress.roundedPercentage}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: optimalProgress.progressTarget,
        value: optimalProgress.roundedPercentage
      }
    },
    {
      id: 'span-summary-underutilized',
      title: t('hr-analytics-underutilized'),
      value: underUtilizedCount,
      footer: `${underUtilizedProgress.roundedPercentage}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: underUtilizedProgress.progressTarget,
        value: underUtilizedProgress.roundedPercentage
      }
    },
    {
      id: 'span-summary-overloaded',
      title: t('hr-analytics-overloaded'),
      value: overBurdenedCount,
      footer: `${overBurdenedProgress.roundedPercentage}% ${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-total-managers').toLowerCase()}`,
        target: overBurdenedProgress.progressTarget,
        value: overBurdenedProgress.roundedPercentage
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
  const tableHeaders = [
    { id: 'organizational-hierarchy', label: t('hr-analytics-organizational-hierarchy') },
    { id: 'level', label: t('hr-analytics-level') },
    { id: 'direct-reports', label: t('hr-analytics-direct-reports') },
    { id: 'status', label: t('hr-analytics-status') },
    { id: 'recommendation', label: t('hr-analytics-recommendation') }
  ]

  const getEfficiencyBadge = (efficiency: 'Optimal' | 'Overloaded' | 'Underutilized') => {
    if (efficiency === 'Overloaded') return <Badge variant="destructive">{t('hr-analytics-overloaded')}</Badge>
    if (efficiency === 'Underutilized') return <Badge variant="warning">{t('hr-analytics-underutilized')}</Badge>
    return <Badge variant="success">{t('hr-analytics-optimal')}</Badge>
  }

  return (
    <div data-testid={`${prefixDataTestId}-SpanOfControlChart`} className="gba:grid gba:gap-6">
      <StructuralAnalysisKpiSection title={t('hr-analytics-span-of-control-summary')} cards={summaryCards}>
        <div className="gba:mt-4 gba:p-3 gba:bg-info-secondary/40 gba:rounded gba:text-center">
          <span className="gba:text-info-secondary-foreground">
            {t('hr-analytics-recommended-span-range')}: {summary.recommendedSpanMin} - {summary.recommendedSpanMax}{' '}
            {t('hr-analytics-direct-reports')}
          </span>
        </div>
      </StructuralAnalysisKpiSection>

      <StructuralAnalysisSection title={t('hr-analytics-span-of-control-distribution')}>
        <StructuralAnalysisChartSurface>
          <div className="gba:max-h-[640px] gba:overflow-y-auto gba:pr-2">
            <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 28)}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 20, right: 30, left: 180, bottom: 20 }}
                accessibilityLayer={false}
              >
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
        </StructuralAnalysisChartSurface>
      </StructuralAnalysisSection>

      <StructuralAnalysisTableSection
        title={t('hr-analytics-detailed-span-of-control-analysis')}
        headers={tableHeaders}
      >
        {data.map(record => (
          <TableRow key={record.managerId}>
            <TableCell>{record.organizationalUnit}</TableCell>
            <TableCell>{record.managerLevel || '-'}</TableCell>
            <TableCell className="gba:text-base gba:font-semibold">{record.directReports}</TableCell>
            <TableCell>{getEfficiencyBadge(record.efficiency)}</TableCell>
            <TableCell>
              {record.recommendation ? (
                <span title={record.recommendation} className="gba:cursor-help gba:whitespace-normal">
                  {record.recommendation}
                </span>
              ) : (
                '-'
              )}
            </TableCell>
          </TableRow>
        ))}
      </StructuralAnalysisTableSection>
    </div>
  )
}
