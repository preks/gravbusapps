import React from 'react'
import { FlowRenderer } from '@/business-apps/flow/common/components/flow-renderer'
import { FlowTemplate } from '../types'
import { FlowStepType, AssignmentMode } from '@/common/data/flow/types/flowTemplate'

interface FlowVisualizationProps {
  template: FlowTemplate
  currentStep: number
  simulationData: { [stepIndex: number]: any }
  assignmentCounts: { [stepIndex: number]: number }
  'data-testid'?: string
}

export const FlowVisualization: React.FC<FlowVisualizationProps> = ({
  template,
  currentStep,
  'data-testid': testId = 'flow-visualization'
}) => {
  // Convert template steps to FlowRenderer format
  const steps = template.steps.map(step => ({
    title: step.title,
    type: step.type || FlowStepType.TASK,
    message: step.message || 'Describe the task to be performed.',
    assignment: step.assignment || { assignmentMode: AssignmentMode.CLAIM, targets: null }
  }))

  return <FlowRenderer steps={steps} selectedStepIndex={currentStep} mode="view" data-testid={testId} />
}
