import { useState, useCallback } from 'react'

export interface StageSelection {
  stage: string
  stageRef: string
  pipelineId?: string
}

export interface StageDrillDownState {
  selectedStage: StageSelection | null
  handleStageClick: (stage: string, stageRef: string, pipelineId?: string) => void
  handleStageClose: () => void
}

export const useStageDrillDownState = (): StageDrillDownState => {
  const [selectedStage, setSelectedStage] = useState<StageSelection | null>(null)

  const handleStageClick = useCallback((stage: string, stageRef: string, pipelineId?: string) => {
    setSelectedStage({ stage, stageRef, pipelineId })
  }, [])

  const handleStageClose = useCallback(() => {
    setSelectedStage(null)
  }, [])

  return { selectedStage, handleStageClick, handleStageClose }
}
