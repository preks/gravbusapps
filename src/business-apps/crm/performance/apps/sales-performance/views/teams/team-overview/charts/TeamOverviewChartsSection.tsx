import React from 'react'
import { TeamRevenueTrendChart } from './team-revenue-trend/TeamRevenueTrendChart'
import { OpenPipelineByStageChart } from './open-pipeline-by-stage/OpenPipelineByStageChart'
import { TeamPipelineForecastChart } from './pipeline-forecast/TeamPipelineForecastChart'
import { WinRateTrendChart } from './win-rate-trend/WinRateTrendChart'
import { OpportunityOutcomesChart } from './opportunity-outcomes/OpportunityOutcomesChart'

const DATA_TEST_ID_PREFIX = 'TeamOverviewCharts'

interface TeamOverviewChartsSectionProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}

interface ChartPairRowProps {
  testId: string
  left: React.ReactNode
  right: React.ReactNode
}

const ChartPairRow: React.FC<ChartPairRowProps> = ({ testId, left, right }) => (
  <div className="gba:flex gba:flex-col gba:gap-6 gba:md:flex-row" data-testid={testId}>
    <div className="gba:min-w-0 gba:flex-1">{left}</div>
    <div className="gba:min-w-0 gba:flex-1">{right}</div>
  </div>
)

export const TeamOverviewChartsSection: React.FC<TeamOverviewChartsSectionProps> = ({
  accessToken,
  teamMemberIds,
  currencyCode
}) => (
  <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
    <div data-testid={`${DATA_TEST_ID_PREFIX}-row-revenue-trend`}>
      <TeamRevenueTrendChart accessToken={accessToken} teamMemberIds={teamMemberIds} currencyCode={currencyCode} />
    </div>
    <ChartPairRow
      testId={`${DATA_TEST_ID_PREFIX}-row-pipeline`}
      left={
        <OpenPipelineByStageChart accessToken={accessToken} teamMemberIds={teamMemberIds} currencyCode={currencyCode} />
      }
      right={
        <TeamPipelineForecastChart
          accessToken={accessToken}
          teamMemberIds={teamMemberIds}
          currencyCode={currencyCode}
        />
      }
    />
    <ChartPairRow
      testId={`${DATA_TEST_ID_PREFIX}-row-conversion`}
      left={<WinRateTrendChart accessToken={accessToken} teamMemberIds={teamMemberIds} currencyCode={currencyCode} />}
      right={
        <OpportunityOutcomesChart accessToken={accessToken} teamMemberIds={teamMemberIds} currencyCode={currencyCode} />
      }
    />
  </div>
)

export default TeamOverviewChartsSection
