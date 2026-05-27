import EquityHealthGauge from '@/business-apps/hr/compensation/apps/transparency/components/views/compensation/components/charts/EquityHealthGauge.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'

import PayGapExplanationPieChart from './charts/PayGapExplanationPieChart'
import CompressionRiskAlertsCard from './CompressionRiskAlertsCard'
import type { StructureDepartment } from '../../../../queries/useActiveStructureDepartmentsQueries'
import {
  CompensationDataState,
  CompressionAnalysisData,
  GapExplanationData
} from '../../../../types/compensationAnalysis.types'

interface CompensationInsightsBentoProps {
  prefixDataTestId: string
  salaryLoading: boolean
  formattedMedianSalary: number
  formattedAverageSalary: number
  healthScoreValue: string
  healthScoreFooter: string
  medianSalaryLabel: string
  averageSalaryLabel: string
  companyMedianLabel: string
  annualAverageLabel: string
  payGapTitle: string
  payGapDescription: string
  equityHealthScoreTitle: string
  gapExplanation: CompensationDataState<GapExplanationData>
  compressionAnalysis: CompensationDataState<CompressionAnalysisData>
  departments: StructureDepartment[]
}

export function CompensationInsightsLayout({
  prefixDataTestId,
  salaryLoading,
  formattedMedianSalary,
  formattedAverageSalary,
  healthScoreValue,
  medianSalaryLabel,
  averageSalaryLabel,
  companyMedianLabel,
  annualAverageLabel,
  payGapTitle,
  payGapDescription,
  equityHealthScoreTitle,
  gapExplanation,
  compressionAnalysis,
  departments
}: Readonly<CompensationInsightsBentoProps>) {
  const payGapData = gapExplanation.data
    ? {
        tenureExplainedPercent: gapExplanation.data.tenureExplainedPercent,
        performanceExplainedPercent: gapExplanation.data.performanceExplainedPercent,
        unexplainedPercent: gapExplanation.data.unexplainedPercent,
        totalEmployees: gapExplanation.data.totalEmployees
      }
    : null

  return (
    <div className="nw:space-y-6">
      <div className="nw:grid nw:gap-4 nw:grid-cols-4 nw:grid-rows-[minmax(176px,auto)_200px_200px]">
        <div className="nw:col-span-3 nw:row-span-1">
          <CompressionRiskAlertsCard
            compressionRisks={compressionAnalysis.data?.compressionRisks ?? []}
            departments={departments}
            loading={compressionAnalysis.loading}
            error={compressionAnalysis.error}
            prefixDataTestId={prefixDataTestId}
            maxItems={4}
          />
        </div>
        <Card
          className="gba:flex gba:flex-col gba:h-full nw:col-span-1"
          data-testid={`${prefixDataTestId}-health-score-card`}
        >
          <CardHeader className="gba:shrink-0 gba:pb-2">
            <CardTitle>{equityHealthScoreTitle}</CardTitle>
          </CardHeader>
          <CardContent className="gba:flex gba:flex-1 gba:items-center gba:justify-center gba:min-h-0 gba:pt-0">
            <EquityHealthGauge score={Number.parseInt(healthScoreValue)} loading={false} error={null} />
          </CardContent>
        </Card>
        <Card className="gba:flex gba:flex-col nw:col-span-3 nw:row-span-2">
          <CardHeader className="gba:pb-2">
            <CardTitle>{payGapTitle}</CardTitle>
            <CardDescription>{payGapDescription}</CardDescription>
          </CardHeader>
          <CardContent className="gba:flex gba:flex-1 gba:min-h-0 gba:pt-0">
            <PayGapExplanationPieChart
              data={payGapData}
              loading={gapExplanation.loading}
              error={gapExplanation.error}
              embedded
              className="gba:w-full"
            />
          </CardContent>
        </Card>
        <Card className="lg:gba:col-span-1 lg:gba:row-span-1" data-testid={`${prefixDataTestId}-median-salary-card`}>
          <CardHeader className="gba:pb-2">
            <CardTitle>{medianSalaryLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:tabular-nums gba:text-foreground">
              {salaryLoading ? '—' : `${formattedMedianSalary}K`}
            </div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{companyMedianLabel}</p>
          </CardContent>
        </Card>
        <Card className="lg:gba:col-span-1 lg:gba:row-span-1" data-testid={`${prefixDataTestId}-avg-salary-card`}>
          <CardHeader className="gba:pb-2">
            <CardTitle>{averageSalaryLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:tabular-nums gba:text-foreground">
              {salaryLoading ? '—' : `${formattedAverageSalary}K`}
            </div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{annualAverageLabel}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CompensationInsightsLayout
