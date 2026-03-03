/**
 * ScreenPreview - Live preview of generated screens using AI Builder PreviewSandbox
 */

import React, { useMemo, useEffect, useRef } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, cn } from '@newwork/nw-design-system'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { PreviewSandbox, type PreviewSandboxHandle } from '@/common/components/ai-builder/sandbox/PreviewSandbox'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import type { ComponentSpec } from '../../types'
import { ScreenBuildingLoader } from '../widgets/ScreenBuildingLoader'

export interface ScreenPreviewProps {
  component: ComponentSpec
  accessToken: string
  userInfo?: any
  refreshToken?: number
  isFixWorking?: boolean
  isRestoringSession?: boolean
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({
  component,
  accessToken,
  userInfo,
  refreshToken,
  isFixWorking = false,
  isRestoringSession = false
}) => {
  const previewRef = useRef<PreviewSandboxHandle>(null)
  const builderClient = useBuilderClient(accessToken)

  const previewUrlForNewTab = useMemo(() => {
    const sessionId = component.metadata?.sessionId
    if (!sessionId) return null
    const app = (component.screenSpec?.name || component.name.replace(/\s+/g, '')).trim()
    const query: Record<string, string | boolean> = { v: Date.now().toString() }
    if (app) query.app = app
    return builderClient.getPreviewFileUrl(sessionId, 'index.html', query)
  }, [component.metadata?.sessionId, component.screenSpec?.name, component.name, builderClient])

  useEffect(() => {
    if (!refreshToken) return
    previewRef.current?.reload()
  }, [refreshToken])

  // Loading state
  if (!accessToken) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <ScreenBuildingLoader />
      </div>
    )
  }

  // Check if we have session data for preview
  const hasSessionData = !!(component.metadata?.sessionId && component.metadata?.repoId)

  if (!hasSessionData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px] gba:p-6">
        <Alert className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <AlertTitle>Preview Not Available</AlertTitle>
          <AlertDescription className="gba:mt-2">
            <p>No session data available for preview. The screen may not have been generated yet.</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:min-h-[600px] gba:flex gba:flex-col gba:relative">
      {previewUrlForNewTab && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(previewUrlForNewTab, '_blank', 'noopener,noreferrer')}
          className="gba:absolute gba:top-2 gba:left-2 gba:z-10 gba:gap-1.5 gba:bg-background/95"
          data-testid="orchestrator-screen-preview-open-new-tab"
        >
          <ExternalLink className="gba:w-3.5 gba:h-3.5" />
          Open screen in new tab
        </Button>
      )}
      {isRestoringSession ? (
        <div className="gba:flex-1 gba:min-h-0 gba:bg-card gba:overflow-hidden gba:flex gba:items-center gba:justify-center">
          <ScreenBuildingLoader />
        </div>
      ) : (
        <div
          className={cn(
            'gba:flex-1 gba:min-h-0 gba:bg-card gba:overflow-hidden gba:transition-opacity gba:duration-300',
            isFixWorking && 'gba:opacity-70'
          )}
        >
          <PreviewSandbox
            ref={previewRef}
            repoId={component.metadata!.repoId!}
            sessionId={component.metadata!.sessionId!}
            previewAppName={component.screenSpec?.name || component.name.replace(/\s+/g, '')}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        </div>
      )}
    </div>
  )
}

export default ScreenPreview
