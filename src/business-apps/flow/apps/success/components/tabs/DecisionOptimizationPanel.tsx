import React from 'react'
import type { DecisionOptimizationData } from '../../hooks/useDecisionData'

interface DecisionOptimizationPanelProps {
  data: DecisionOptimizationData | null
  variant?: 'insights' | 'governance'
  secondaryPanel?: React.ReactNode
  isLoading?: boolean
  'data-testid'?: string
}

export const DecisionOptimizationPanel: React.FC<DecisionOptimizationPanelProps> = ({
  variant = 'governance',
  secondaryPanel,
  'data-testid': testId = 'decision-optimization-panel'
}) => {
  if (variant !== 'insights') return null
  if (!secondaryPanel) return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={testId}>
      {secondaryPanel}
    </div>
  )
}
