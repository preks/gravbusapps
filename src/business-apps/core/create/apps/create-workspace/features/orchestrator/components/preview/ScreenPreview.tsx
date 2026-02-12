/**
 * ScreenPreview - Live preview of generated screens using AI Builder PreviewSandbox
 */

import React from 'react'
import { Alert, AlertDescription, AlertTitle, Spinner } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { PreviewSandbox } from '@/common/components/ai-builder/sandbox/PreviewSandbox'
import type { ComponentSpec } from '../../types'

export interface ScreenPreviewProps {
  component: ComponentSpec
  jobId?: string
  accessToken: string
  userInfo?: any
  onClose?: () => void
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({ component, accessToken, userInfo }) => {
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
      <PreviewSandbox
        repoId={component.metadata.repoId}
        sessionId={component.metadata.sessionId}
        accessToken={accessToken}
        userInfo={userInfo}
      />
    </div>
  )
}

export default ScreenPreview
