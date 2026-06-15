export interface PipelineStagePoint {
  stageId: string
  stageName: string
  displayOrder: number
  count: number
  value: number
}

export interface OpenPipelineByStageChartProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode: string
}
