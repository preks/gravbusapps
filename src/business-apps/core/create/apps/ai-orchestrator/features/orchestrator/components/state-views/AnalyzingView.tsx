import React from 'react'
import { Canvas } from '../layouts/Canvas'
import { ThinkingSteps, type ThinkingStep } from '../widgets/ThinkingSteps'

export interface AnalyzingViewProps {
  thinkingSteps: ThinkingStep[]
  analysisProgress: number
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({ thinkingSteps, analysisProgress }) => {
  return (
    <Canvas>
      <ThinkingSteps
        steps={thinkingSteps}
        progress={analysisProgress}
        phaseMessage="Breaking down your request into components..."
      />
    </Canvas>
  )
}
