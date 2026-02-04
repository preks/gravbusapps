import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { ErrorState } from '../state-screens/ErrorState'
import type { ComponentSpec } from '../../types'

export interface ErrorViewProps {
  error: string
  partialComponents?: ComponentSpec[]
  onReset: () => void
  onModifyPlan: () => void
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error, partialComponents, onReset, onModifyPlan }) => {
  return (
    <Canvas
      title="Error"
      subtitle="Something went wrong"
      actions={
        <Button variant="ghost" onClick={onReset}>
          ← Start Over
        </Button>
      }
    >
      <ErrorState error={error} partialComponents={partialComponents} onRetry={onReset} onModifyPlan={onModifyPlan} />
    </Canvas>
  )
}
