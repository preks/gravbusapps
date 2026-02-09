import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { BuildResultsView } from '../build-results'
import type { ComponentSpec } from '../../types'

export interface CompleteViewProps {
  components: ComponentSpec[]
  jobId?: string
  buildDuration: number
  accessToken?: string
  userInfo?: any
  onReset: () => void
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  jobId,
  buildDuration,
  accessToken,
  userInfo,
  onReset
}) => {
  return (
    <Canvas
      title="Build Results"
      subtitle="Your solution is ready"
      actions={
        <Button variant="ghost" onClick={onReset}>
          ← Build Something New
        </Button>
      }
    >
      <BuildResultsView
        success
        components={components}
        jobId={jobId}
        buildDuration={buildDuration}
        accessToken={accessToken}
        userInfo={userInfo}
        onReset={onReset}
      />
    </Canvas>
  )
}
