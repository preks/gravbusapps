import React, { useMemo, useState } from 'react'
import { Button, ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@newwork/nw-design-system'
import { Canvas } from '../layouts/Canvas'
import { BuildResultsView } from '../build-results'
import { ScreenPreview } from '../preview/ScreenPreview'
import { CompleteFixChat } from './CompleteFixChat.tsx'
import type { ComponentSpec } from '../../types'

export interface CompleteViewProps {
  components: ComponentSpec[]
  jobId?: string
  buildDuration: number
  prompt?: string
  accessToken?: string
  userInfo?: any
  onReset: () => void
}

function firstScreenWithSession(components: ComponentSpec[]): ComponentSpec | null {
  return components.find(c => c.type === 'screen' && c.metadata?.sessionId && c.metadata?.repoId) ?? null
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  jobId,
  buildDuration,
  prompt,
  accessToken,
  userInfo,
  onReset
}) => {
  const previewComponent = useMemo(() => firstScreenWithSession(components), [components])
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const [isFixWorking, setIsFixWorking] = useState(false)
  const canFixInChat = !!(
    previewComponent &&
    accessToken &&
    previewComponent.metadata?.sessionId &&
    previewComponent.metadata?.repoId
  )
  const handlePreviewRefresh = () => {
    setPreviewRefreshToken(prev => prev + 1)
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
      <ResizablePanelGroup direction="horizontal" className="gba:flex-1 gba:min-h-0 gba:w-full">
        <ResizablePanel defaultSize={50} minSize={25} className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none">
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
              prompt={prompt}
              onReset={onReset}
            />
          </Canvas>
        </ResizablePanel>
        <ResizableHandle withHandle className="gba:bg-border" />
        <ResizablePanel defaultSize={50} minSize={25} className="gba:flex gba:flex-col gba:min-h-0 gba:rounded-none">
          {previewComponent && accessToken ? (
            <div className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden gba:relative">
              <ScreenPreview
                component={previewComponent}
                jobId={jobId}
                accessToken={accessToken}
                userInfo={userInfo}
                refreshToken={previewRefreshToken}
                isFixWorking={isFixWorking}
              />
              {canFixInChat ? (
                <CompleteFixChat
                  accessToken={accessToken}
                  sessionId={previewComponent.metadata!.sessionId as string}
                  repoId={previewComponent.metadata!.repoId as string}
                  onPreviewRefresh={handlePreviewRefresh}
                  onWorkingChange={setIsFixWorking}
                />
              ) : null}
            </div>
          ) : (
            <div className="gba:h-full gba:min-h-[400px] gba:flex gba:items-center gba:justify-center gba:text-muted-foreground gba:px-6">
              {!accessToken ? 'Sign in to see preview.' : 'No preview available for this build.'}
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
