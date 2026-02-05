/**
 * AnalyzingView - AI thinking visualization state
 */

import React from 'react'
import { ThinkingSteps, type ThinkingStep } from '../../components/widgets/ThinkingSteps'

export interface AnalyzingViewProps {
  steps: ThinkingStep[]
  progress: number
  'data-testid'?: string
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({ steps, progress, 'data-testid': testId }) => {
  return (
    <ThinkingSteps
      steps={steps}
      progress={progress}
      phaseMessage="Breaking down your request into components..."
      data-testid={testId}
    />
  )
}
