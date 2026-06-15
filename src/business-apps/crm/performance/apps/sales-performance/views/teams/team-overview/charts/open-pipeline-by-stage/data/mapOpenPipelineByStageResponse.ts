import type { PipelineStagePoint } from '../types'
import type { PipelineStageRecord } from '../../shared/data/pipelineStagesQueries'

interface AggregateResponse {
  aggregate?: {
    count?: number
    sum?: {
      estimatedAmount?: number
    }
  }
}

export const mapOpenPipelineByStageResponse = (
  response: Record<string, unknown>,
  stages: PipelineStageRecord[]
): PipelineStagePoint[] =>
  stages.map((stage, index) => {
    const aggregate = (response[`stage${index}`] as AggregateResponse | undefined)?.aggregate

    return {
      stageId: stage.id,
      stageName: stage.name,
      displayOrder: stage.displayOrder,
      count: aggregate?.count ?? 0,
      value: aggregate?.sum?.estimatedAmount ?? 0
    }
  })
