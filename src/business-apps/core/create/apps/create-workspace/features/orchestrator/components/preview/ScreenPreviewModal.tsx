/**
 * ScreenPreviewModal - Modal wrapper for screen preview
 *
 * Shows the generated screen in a full-screen modal overlay
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@newwork/nw-design-system'
import { ScreenPreview } from './ScreenPreview'
import type { ComponentSpec } from '../../types'

export interface ScreenPreviewModalProps {
  component: ComponentSpec | null
  jobId?: string
  accessToken: string
  userInfo?: any
  open: boolean
  onClose: () => void
}

export const ScreenPreviewModal: React.FC<ScreenPreviewModalProps> = ({
  component,
  jobId,
  accessToken,
  userInfo,
  open,
  onClose
}) => {
  if (!component) return null

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="gba:max-w-[95vw] gba:max-h-[95vh] gba:h-[95vh] gba:p-0 gba:gap-0">
        <DialogHeader className="gba:p-6 gba:pb-4 gba:border-b gba:border-border">
          <DialogTitle className="gba:text-xl">{component.name}</DialogTitle>
          {component.description && (
            <DialogDescription className="gba:mt-1">
              {component.user_friendly_description || component.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="gba:flex-1 gba:overflow-auto">
          <ScreenPreview
            component={component}
            jobId={jobId}
            accessToken={accessToken}
            userInfo={userInfo}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ScreenPreviewModal
