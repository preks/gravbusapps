import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { BuildResultsView } from '../build-results'
import type { ComponentSpec } from '../../types'

export interface ErrorViewProps {
  error: string
  partialComponents?: ComponentSpec[]
  jobId?: string
  buildDuration?: number
  onReset: () => void
  onRetry?: () => void
  onModifyPlan: () => void
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  partialComponents = [],
  jobId,
  buildDuration = 0,
  onReset,
  onRetry,
  onModifyPlan
}) => {
  return (
    <Canvas
      title="Build Results"
      subtitle="Review what happened"
      actions={
        <Button variant="ghost" onClick={onReset}>
          ← Start Over
        </Button>
      }
    >
      <BuildResultsView
        success={false}
        components={partialComponents}
        jobId={jobId}
        buildDuration={buildDuration}
        errorMessage={error}
        onReset={onReset}
        onRetry={onRetry}
        onModifyPlan={onModifyPlan}
      />
    </Canvas>
  )
}
