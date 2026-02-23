/**
 * ScreenPreview - Live preview of generated screens using AI Builder PreviewSandbox
 */

import React, { useEffect, useRef } from 'react'
import { Alert, AlertDescription, AlertTitle, Spinner, cn } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { PreviewSandbox, type PreviewSandboxHandle } from '@/common/components/ai-builder/sandbox/PreviewSandbox'
import type { ComponentSpec } from '../../types'

export interface ScreenPreviewProps {
  component: ComponentSpec
  accessToken: string
  userInfo?: any
  refreshToken?: number
  isFixWorking?: boolean
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({
  component,
  accessToken,
  userInfo,
  refreshToken,
  isFixWorking = false
}) => {
  const previewRef = useRef<PreviewSandboxHandle>(null)

  useEffect(() => {
    if (!refreshToken) return
    previewRef.current?.reload()
  }, [refreshToken])

  // Loading state
  if (!accessToken) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <Spinner size="lg" />
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
    <div className="gba:h-full gba:min-h-[600px] gba:flex gba:flex-col">
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
    </div>
  )
}

export default ScreenPreview
