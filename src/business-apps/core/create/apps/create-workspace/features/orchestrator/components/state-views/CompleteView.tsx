import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { SuccessState } from '../state-screens/SuccessState'
import type { ComponentSpec } from '../../types'

export interface CompleteViewProps {
  components: ComponentSpec[]
  buildDuration: number
  completedCount: number
  reusedCount: number
  onReset: () => void
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  buildDuration,
  completedCount,
  reusedCount,
  onReset
}) => {
  return (
    <Canvas
      title="Complete"
      subtitle="Your solution is ready"
      actions={
        <Button variant="ghost" onClick={onReset}>
          ← Build Something New
        </Button>
      }
    >
      <SuccessState
        components={components}
        buildDuration={buildDuration}
        completedCount={completedCount}
        reusedCount={reusedCount}
        onBuildMore={onReset}
      />
    </Canvas>
  )
}
