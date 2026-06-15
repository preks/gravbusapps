import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { UserIcon, SirenIcon } from '@phosphor-icons/react'
import { ReportingChainData, ReportingChainSummary } from '../types/structuralTypes'
import { Badge, Card, TableCell, TableRow, type KpiCardData, useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import {
  StructuralAnalysisChartSurface,
  StructuralAnalysisKpiSection,
  StructuralAnalysisSection,
  StructuralAnalysisTableSection
} from './StructuralAnalysisSection'
import { calculateKpiShareProgress } from '../utils/structuralAnalysisKpis'

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
  const bottleneckProgress = calculateKpiShareProgress(bottlenecksCount, chainTotal)

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
      footer: `${bottleneckProgress.roundedPercentage}% ${t('hr-analytics-of')} ${t('hr-analytics-reporting-chains').toLowerCase()}`,
      progress: {
        label: `${t('hr-analytics-of')} ${t('hr-analytics-reporting-chains').toLowerCase()}`,
        target: bottleneckProgress.progressTarget,
        value: bottleneckProgress.roundedPercentage
      }
    }
  ]

  const renderLevelBadge = (levels: number) => {
    if (levels > 6)
      return (
        <Badge variant="destructive">
          {levels} {t('hr-analytics-levels')}
        </Badge>
      )
    if (levels > 4)
      return (
        <Badge variant="warning">
          {levels} {t('hr-analytics-levels')}
        </Badge>
      )
    return (
      <Badge variant="success">
        {levels} {t('hr-analytics-levels')}
      </Badge>
    )
  }

  const renderEfficiencyBadge = (efficiency: number) => {
    if (efficiency < 60) return <Badge variant="destructive">{efficiency}%</Badge>
    if (efficiency < 80) return <Badge variant="warning">{efficiency}%</Badge>
    return <Badge variant="success">{efficiency}%</Badge>
  }

  // Prepare data for chain distribution chart
  const distributionData = summary.chainDistribution.map(item => ({
    chainLength: `${item.length} ${t('hr-analytics-levels')}`,
    count: item.count,
    percentage: item.percentage
  }))
  const tableHeaders = [
    { id: 'top-org-unit', label: t('hr-analytics-top-org-unit') },
    { id: 'levels', label: t('hr-analytics-levels-title') },
    { id: 'reporting-chains', label: t('hr-analytics-reporting-chains') },
    { id: 'bottlenecks', label: t('hr-analytics-bottlenecks') },
    { id: 'efficiency', label: t('hr-analytics-efficiency') }
  ]

  return (
    <div data-testid={`${prefixDataTestId}-ReportingChainAnalysis`} className="gba:grid gba:gap-6">
      <StructuralAnalysisKpiSection title={t('hr-analytics-reporting-chain-summary')} cards={summaryCards} />

      <StructuralAnalysisSection title={t('hr-analytics-chain-length-distribution')}>
        <StructuralAnalysisChartSurface>
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
        </StructuralAnalysisChartSurface>
      </StructuralAnalysisSection>

      <StructuralAnalysisSection
        title={t('hr-analytics-bottlenecks')}
        description={t('hr-analytics-bottlenecks-description')}
        icon={<SirenIcon size={16} className="gba:mr-2 gba:text-warning" />}
      >
        {summary.bottlenecks.length > 0 ? (
          <div className="gba:grid gba:gap-3">
            {summary.bottlenecks.map(bottleneck => (
              <Card key={bottleneck.managerName} className="gba:p-4">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                    <UserIcon size={16} />
                  </div>
                  <div>
                    <div className="gba:font-semibold">{bottleneck.managerName}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {bottleneck.chainsThroughManager} {t('hr-analytics-reporting-chains')}
                    </div>
                    <Badge variant="warning" className="gba:mt-2">
                      {t('hr-analytics-impact-score')}: {bottleneck.impact}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-no-significant-bottlenecks')}</p>
        )}
      </StructuralAnalysisSection>

      <StructuralAnalysisTableSection title={t('hr-analytics-detailed-reporting-chains')} headers={tableHeaders}>
        {chains.map(chain => {
          const displayPath = chain.chainPath?.trim() ?? ''

          return (
            <TableRow key={chain.chainId}>
              <TableCell className="gba:font-semibold">{chain.topManager}</TableCell>
              <TableCell>{renderLevelBadge(chain.levels)}</TableCell>
              <TableCell>
                {displayPath.length > 0 ? (
                  <span className="gba:text-xs gba:text-muted-foreground" title={displayPath}>
                    {displayPath}
                  </span>
                ) : (
                  <span className="gba:text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {chain.bottlenecks.length > 0 ? (
                  <div className="gba:max-w-52">
                    {chain.bottlenecks.slice(0, 2).map(bottleneck => (
                      <div key={`${chain.chainId}-${bottleneck}`} className="gba:text-xs gba:text-muted-foreground">
                        {bottleneck}
                      </div>
                    ))}
                    {chain.bottlenecks.length > 2 && (
                      <div className="gba:text-xs gba:text-muted-foreground">
                        +{chain.bottlenecks.length - 2} {t('hr-analytics-more')}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="gba:text-muted-foreground">{t('hr-analytics-none')}</span>
                )}
              </TableCell>
              <TableCell>{renderEfficiencyBadge(chain.efficiency)}</TableCell>
            </TableRow>
          )
        })}
      </StructuralAnalysisTableSection>
    </div>
  )
}
