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
  jobId?: string
  accessToken: string
  userInfo?: any
  onClose?: () => void
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
    previewRef.current?.reload({ forceRebuild: true })
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
    <div className="gba:h-full gba:min-h-[600px] gba:flex gba:flex-col gba:p-3">
      <div
        className={cn(
          'gba:flex-1 gba:min-h-0 gba:rounded-xl gba:border gba:bg-card/30 gba:overflow-hidden gba:transition-all gba:duration-300',
          isFixWorking
            ? 'gba:border-blue-400/80 dark:gba:border-blue-400/60 gba:shadow-[0_0_0_1px_rgba(96,165,250,0.5),0_0_20px_rgba(59,130,246,0.35),0_10px_28px_rgba(37,99,235,0.18)] gba:animate-pulse'
            : 'gba:border-blue-300/70 dark:gba:border-blue-500/40 gba:shadow-[0_0_0_1px_rgba(147,197,253,0.25),0_10px_28px_rgba(37,99,235,0.12)]'
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
