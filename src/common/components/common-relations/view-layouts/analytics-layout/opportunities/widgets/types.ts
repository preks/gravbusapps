/**
 * Shared types and utilities for opportunities by stage charts
 */

export interface StageItem {
  stage: string
  stageRef?: string
  count: number
  value: number
}

export interface Pipeline {
  id: string
  name: string
}

export interface OpportunitiesStageChartProps {
  data: StageItem[]
  moduleColor?: string
  pipelines?: Pipeline[]
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string | undefined) => void
  onStageClick?: (stage: string, stageRef: string) => void
}

/**
 * Convert stage name to chart key (lowercase, hyphenated, alphanumeric)
 */
export const toChartKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
