import AnalyticsTabErrorCard from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/AnalyticsTabErrorCard'
import AnalyticsTabLoadingState from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/AnalyticsTabLoadingState'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatPercentage } from '@/common/utils/numberFormatter'
import { Icon, KpiCardData, PageLayout, useTranslation } from '@newwork/nw-design-system'
import {
  ChartPieIcon,
  CurrencyDollarIcon,
  PlusMinusIcon,
  ShieldWarningIcon,
  TrendDownIcon
} from '@phosphor-icons/react'
import { useCallback, useMemo } from 'react'

import translations from '../../../_i18n'
import { useCompensationAnalysisData } from '../../../hooks/useCompensationAnalysisData'
import { useCompensationAnalysisRuns } from '../../../hooks/useCompensationAnalysisRuns'
import { useActiveStructureDepartments } from '../../../hooks/useActiveStructureDepartments'
import { useCompensationMetrics } from '../../../hooks/useCompensationMetrics'
import { useRequestCompensationAnalysis } from '../../../hooks/useRequestCompensationAnalysis'
import {
  getHighRiskCasesCount,
  getMarketAlignmentColor,
  getPayGapRiskColor
} from '../../../utils/compensationAnalysisUtils'
import CompensationAnalysisRequestButton from './components/CompensationAnalysisRequestButton.tsx'
import CompensationAnalysisRunsCard from './components/CompensationAnalysisRunsCard'
import CompensationInsightsLayout from './components/CompensationInsightsLayout.tsx'

interface CompensationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export function Compensation({ accessToken, prefixDataTestId = 'Compensation' }: Readonly<CompensationProps>) {
  const { t } = useTranslation(translations)
  const {
    medianSalary,
    averageSalary,
    loading: salaryLoading,
    error: salaryError
  } = useCompensationMetrics(accessToken)
  const { departments: structureDepartments } = useActiveStructureDepartments(accessToken)

  const {
    compressionAnalysis,
    healthScore,
    gapExplanation,
    marketBenchmark,
    refetch: refetchAnalysisData
  } = useCompensationAnalysisData(accessToken)
  const {
    runs: analysisRuns,
    loading: analysisRunsLoading,
    error: analysisRunsError,
    refetch: refetchAnalysisRuns
  } = useCompensationAnalysisRuns(accessToken)
  const analysisRequestHandlers = useRequestCompensationAnalysis(accessToken, {
    onSuccess: async () => {
      await Promise.all([refetchAnalysisData(), refetchAnalysisRuns()])
    }
  })

  const formattedAverageSalary = useMemo(() => Math.round(averageSalary / 1000), [averageSalary])
  const formattedMedianSalary = useMemo(() => Math.round(medianSalary / 1000), [medianSalary])

  const getCompressionRiskValue = useCallback(() => {
    if (compressionAnalysis.loading) return t('hr-data-filter-loading')
    if (compressionAnalysis.error) return 'Error'
    if (!compressionAnalysis.data) return 'N/A'
    return `${getHighRiskCasesCount(compressionAnalysis.data.compressionRisks)} High Risk`
  }, [compressionAnalysis, t])

  const getCompressionRiskIcon = useCallback(() => {
    let className = 'gba:text-muted-foreground'

    if (compressionAnalysis.data && compressionAnalysis.data.compressionRisks.length > 0) {
      const risks = compressionAnalysis.data.compressionRisks
      if (risks.some(risk => risk.compressionScore > 40)) {
        className = 'gba:text-destructive'
      } else if (risks.some(risk => risk.compressionScore > 20)) {
        className = 'gba:text-orange-500'
      } else {
        className = 'gba:text-green-600'
      }
    }

    return <Icon icon={ShieldWarningIcon} size="sm" className={className} />
  }, [compressionAnalysis])

  const getPayGapValue = useCallback(() => {
    if (gapExplanation.loading) return t('hr-data-filter-loading')
    if (gapExplanation.error) return 'Error'
    if (!gapExplanation.data) return 'N/A'
    return formatPercentage(gapExplanation.data.payGapPercentage, 2)
  }, [gapExplanation, t])

  const getPayGapIcon = useCallback(() => {
    const className = gapExplanation.data
      ? getPayGapRiskColor(gapExplanation.data.payGapPercentage)
      : 'gba:text-muted-foreground'
    return <Icon icon={TrendDownIcon} size="sm" className={className} />
  }, [gapExplanation])

  const getUnexplainedPayGapValue = useCallback(() => {
    if (gapExplanation.loading) return t('hr-data-filter-loading')
    if (gapExplanation.error) return 'Error'
    if (!gapExplanation.data) return 'N/A'
    return formatPercentage(gapExplanation.data.unexplainedAbsolutePercent)
  }, [gapExplanation, t])

  const getUnexplainedPayGapIcon = useCallback(() => {
    const className = gapExplanation.data
      ? getPayGapRiskColor(gapExplanation.data.unexplainedAbsolutePercent)
      : 'gba:text-muted-foreground'
    return <Icon icon={TrendDownIcon} size="sm" className={className} />
  }, [gapExplanation])

  const getMarketAlignmentValue = useCallback(() => {
    if (marketBenchmark.loading) return t('hr-data-filter-loading')
    if (marketBenchmark.error) return 'Error'
    if (marketBenchmark.data?.companyCompRatioP50 == null) return 'N/A'
    return marketBenchmark.data.companyMarketAlignmentLabel
  }, [marketBenchmark, t])

  const getMarketAlignmentIcon = useCallback(() => {
    const className = marketBenchmark.data
      ? getMarketAlignmentColor(marketBenchmark.data.companyMarketAlignmentLabel)
      : 'gba:text-muted-foreground'
    return <Icon icon={PlusMinusIcon} size="sm" className={className} />
  }, [marketBenchmark])

  const getMarketAlignmentFooter = useCallback(() => {
    return marketBenchmark.data?.companyCompRatioP50
      ? t('hr-analytics-comp-ratio-footer', { value: marketBenchmark.data.companyCompRatioP50.toFixed(2) })
      : t('hr-analytics-market-comparison-unavailable')
  }, [marketBenchmark, t])

  const getEquityHealthScoreValue = useCallback(() => {
    if (healthScore.loading) return t('hr-data-filter-loading')
    if (healthScore.error) return 'Error'
    if (!healthScore.data) return 'N/A'
    return `${Math.round(healthScore.data.score)}`
  }, [healthScore, t])

  const getEquityHealthScoreFooter = useCallback(() => {
    if (healthScore.loading) return ''
    if (healthScore.error) return t('hr-analytics-equity-health-score-load-error')
    if (!healthScore.data) return t('hr-analytics-equity-health-score-no-analysis')
    return healthScore.data.label
  }, [healthScore, t])

  const getEquityHealthScoreIcon = useCallback(() => {
    return <Icon icon={ShieldWarningIcon} size="sm" decorative />
  }, [])

  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'total-pay-gap',
        title: t('hr-analytics-total-pay-gap'),
        value: getPayGapValue(),
        icon: getPayGapIcon(),
        iconColor: 'var(--nw-chart-6)',
        footer: t('hr-analytics-employees-analyzed', { count: gapExplanation.data?.totalEmployees || 0 })
      },
      {
        id: 'unexplained-pay-gap',
        title: t('hr-analytics-unexplained-pay-gap'),
        value: getUnexplainedPayGapValue(),
        icon: getUnexplainedPayGapIcon(),
        iconColor: 'var(--nw-chart-7)',
        footer: t('hr-analytics-employees-analyzed', { count: gapExplanation.data?.totalEmployees || 0 })
      },
      {
        id: 'compression-score',
        title: t('hr-analytics-compression-risk-score'),
        value: getCompressionRiskValue(),
        icon: getCompressionRiskIcon(),
        iconColor: 'var(--nw-chart-5)',
        footer: t('hr-analytics-compression-cases-found', {
          count: compressionAnalysis.data?.totalCompressionCases || 0
        })
      },
      {
        id: 'market-alignment',
        title: t('hr-analytics-market-alignment'),
        value: getMarketAlignmentValue(),
        icon: getMarketAlignmentIcon(),
        iconColor: 'var(--nw-chart-8)',
        footer: getMarketAlignmentFooter()
      }
    ],
    [
      salaryLoading,
      formattedMedianSalary,
      formattedAverageSalary,
      t,
      getCompressionRiskValue,
      getCompressionRiskIcon,
      getPayGapValue,
      getPayGapIcon,
      getUnexplainedPayGapValue,
      getUnexplainedPayGapIcon,
      getMarketAlignmentValue,
      getMarketAlignmentIcon,
      getMarketAlignmentFooter,
      getEquityHealthScoreValue,
      getEquityHealthScoreIcon,
      getEquityHealthScoreFooter,
      compressionAnalysis.data?.totalCompressionCases,
      gapExplanation.data?.totalEmployees
    ]
  )

  const pageContent = (() => {
    if (salaryLoading) {
      return (
        <AnalyticsTabLoadingState
          dataTestId={`${prefixDataTestId}-loading`}
          message={t('hr-data-filter-loading-data')}
          className="gba:min-h-75"
        />
      )
    }

    if (salaryError) {
      return (
        <AnalyticsTabErrorCard
          dataTestId={`${prefixDataTestId}-Error`}
          message={t('hr-analytics-compensation-error')}
          detail={salaryError.message}
          retryLabel={t('common-retry')}
          onRetry={() => globalThis.location.reload()}
          variant="row"
          className="gba:p-6"
        />
      )
    }

    return (
      <div className="gba:space-y-6" data-testid={prefixDataTestId}>
        <div>
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4">
            {t('hr-analytics-compensation-insights-title')}
          </h2>
          <CompensationInsightsLayout
            prefixDataTestId={prefixDataTestId}
            salaryLoading={salaryLoading}
            formattedMedianSalary={formattedMedianSalary}
            formattedAverageSalary={formattedAverageSalary}
            healthScoreValue={getEquityHealthScoreValue()}
            healthScoreFooter={getEquityHealthScoreFooter()}
            medianSalaryLabel={t('hr-analytics-median-salary')}
            averageSalaryLabel={t('hr-analytics-avg-salary')}
            companyMedianLabel={t('hr-analytics-company-median')}
            annualAverageLabel={t('hr-analytics-annual-average')}
            payGapTitle={t('hr-analytics-pay-gap-explanation-title')}
            payGapDescription={t('hr-analytics-pay-gap-explanation-description')}
            equityHealthScoreTitle={t('hr-analytics-equity-health-score')}
            gapExplanation={gapExplanation}
            compressionAnalysis={compressionAnalysis}
            departments={structureDepartments}
          />
        </div>

        <CompensationAnalysisRunsCard
          runs={analysisRuns}
          loading={analysisRunsLoading}
          error={analysisRunsError}
          onRetry={() => {
            void refetchAnalysisRuns()
          }}
          prefixDataTestId={prefixDataTestId}
        />
      </div>
    )
  })()

  return (
    <PageLayout
      headerTitle={t('hr-analytics-compensation-analysis')}
      headerDescription={t('hr-analytics-compensation-description')}
      headerIcon={ChartPieIcon}
      variant="decorative"
      headerContent={
        <CompensationAnalysisRequestButton
          accessToken={accessToken}
          requestHandlers={analysisRequestHandlers}
          size="sm"
          buttonTestId={`${prefixDataTestId}-analysis-request-button`}
        />
      }
      headerSubViews={{
        value: 'compensation',
        onValueChange: () => undefined,
        items: [
          {
            value: 'compensation',
            label: t('hr-analytics-compensation-analysis'),
            icon: <CurrencyDollarIcon size={16} />
          }
        ]
      }}
      sectionTitle={t('hr-analytics-compensation-kpi-section-title')}
      sectionDescription={t('hr-analytics-compensation-kpi-section-description')}
      kpiCardsData={kpiCards}
      className="gba:min-h-screen"
    >
      {pageContent}
    </PageLayout>
  )
}

export default Compensation
