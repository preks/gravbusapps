import { Typography } from 'antd'
import { Card, CardContent } from '@newwork/nw-design-system'
import { formatSalary, getRiskLevel, sortCompressionRisksByScore } from '../../../../utils/compensationAnalysisUtils'
import { CompressionRiskItem } from '../../../../types/compensationAnalysis.types.ts'

const { Text } = Typography

const SKELETON_ROW_KEYS = Array.from({ length: 32 }, (_, i) => `compression-alerts-skeleton-${i}`)

interface CompressionRiskAlertsCardProps {
  compressionRisks: CompressionRiskItem[]
  loading?: boolean
  error?: string | null
  prefixDataTestId?: string
  maxItems?: number
}

/**
 * Compression Risk Alerts Card component displays the top compression cases
 * that require attention with risk level indicators
 */
function CompressionRiskAlertsCard({
  compressionRisks,
  loading = false,
  error = null,
  prefixDataTestId = 'compression',
  maxItems = 4
}: Readonly<CompressionRiskAlertsCardProps>) {
  if (loading) {
    return (
      <Card data-testid={`${prefixDataTestId}-compression-alerts`} className="gba:h-full gba:animate-pulse">
        <CardContent className="gba:p-4">
          <div className="gba:mb-4">
            <div className="gba:h-6 gba:bg-muted gba:rounded gba:w-3/4 gba:mb-2"></div>
            <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-1/2"></div>
          </div>
          <div className="gba:space-y-3">
            {SKELETON_ROW_KEYS.slice(0, maxItems).map(skeletonKey => (
              <div key={skeletonKey} className="gba:h-16 gba:bg-muted gba:rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${prefixDataTestId}-compression-alerts`} className="gba:h-full">
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
            <Text type="danger">Error loading compression risk data</Text>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!compressionRisks || compressionRisks.length === 0) {
    return (
      <Card data-testid={`${prefixDataTestId}-compression-alerts`} className="gba:h-full">
        <CardContent className="gba:p-4">
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Compression Risk Alerts</h3>
            <Text className="gba:text-muted-foreground">Top compression cases requiring attention</Text>
          </div>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
            <Text className="gba:text-muted-foreground">No compression risks found</Text>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${prefixDataTestId}-compression-alerts`} className="gba:h-full gba:shadow-sm">
      <CardContent className="gba:p-4">
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-1">Compression Risk Alerts</h3>
          <Text className="gba:text-muted-foreground">Top compression cases requiring attention</Text>
        </div>
        <div className="gba:space-y-3">
          {sortCompressionRisksByScore(compressionRisks)
            .slice(0, maxItems)
            .map((risk, index) => {
              const riskLevel = getRiskLevel(risk.compressionScore)

              return (
                <div
                  key={risk.id || `compression-risk-${index}`}
                  className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:bg-muted gba:rounded-lg"
                >
                  <div className="gba:shrink-0 gba:w-6 gba:h-6 gba:bg-primary gba:text-primary-foreground gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                    {index + 1}
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <span className="gba:font-medium gba:text-foreground">
                        {risk.jobLevelName} New Hire &gt; {Math.floor(risk.veteranTenure)} Years Veteran
                      </span>
                      <span className={`gba:text-sm gba:font-medium ${riskLevel.color}`}>{riskLevel.label}</span>
                    </div>
                    <Text className="gba:text-sm gba:text-muted-foreground">
                      {risk.newHireName} ({formatSalary(risk.newHireSalary)}) vs {risk.veteranName} (
                      {formatSalary(risk.veteranSalary)}) • {risk.department}
                    </Text>
                  </div>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}

export default CompressionRiskAlertsCard
