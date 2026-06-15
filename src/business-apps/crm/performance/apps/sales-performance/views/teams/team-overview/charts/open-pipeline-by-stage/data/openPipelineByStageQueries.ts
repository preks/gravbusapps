import { buildOpenOpportunityBaseWhere } from '../../shared/data/opportunityFilters'
import type { PipelineStageRecord } from '../../shared/data/pipelineStagesQueries'

export const buildOpenPipelineByStageQuery = (
  teamMemberIds: string[],
  stages: PipelineStageRecord[],
  currencyCode?: string,
  pipelineId?: string
): string => {
  const baseWhere = buildOpenOpportunityBaseWhere(teamMemberIds, currencyCode, pipelineId)

  const stageQueries = stages
    .map(
      (stage, index) => `
    stage${index}: OpportunityAggregate(
      where: {
        ${baseWhere}
        salesPipelineStageRef: { _eq: "${stage.id}" }
      }
    ) {
      aggregate {
        count
        sum { estimatedAmount }
      }
    }
  `
    )
    .join('\n')

  return `
    query GetOpenPipelineByStage {
      ${stageQueries}
    }
  `
}
