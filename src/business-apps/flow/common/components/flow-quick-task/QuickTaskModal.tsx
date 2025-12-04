import React from 'react'
import { Dialog, DialogContent } from '@newwork/nw-design-system'
import { Zap } from 'lucide-react'
import { QuickTaskModalProps } from './types'
import { QuickTaskForm } from './QuickTaskForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * QuickTaskModal - Pre-built modal wrapper for QuickTaskForm
 *
 * Provides a ready-to-use modal dialog for creating Quick Tasks.
 * Wraps QuickTaskForm in a Dialog component from the design system.
 *
 * @example
 * ```tsx
 * <QuickTaskModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   accessToken={accessToken}
 *   onSubmit={handleSubmit}
 *   config={{
 *     assigneeSelector: { mode: 'employee-search' },
 *     layout: 'compact'
 *   }}
 * />
 * ```
 */
export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  open,
  onOpenChange,
  config,
  accessToken,
  currentUserId,
  onSubmit,
  title,
  description
}) => {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmitWithClose = async (data: any) => {
    await onSubmit(data)
    // Always close the modal after successful submission
    onOpenChange(false)
  }

  // Merge title into config for button text
  const configWithTitle = {
    ...config,
    taskName: title || config?.taskName
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: '672px',
          maxHeight: '90vh',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Custom gradient header - using inline styles for platform consistency */}
        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          style={{
            background: 'linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229))',
            color: 'white',
            padding: '20px 24px',
            flexShrink: 0
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '20px',
              fontWeight: 600
            }}
          >
            <Zap style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            {title || getTranslationFromI18nKeyAndLabel('quickTask.modal.title', 'Create Quick Task')}
          </div>
          {description && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '14px',
                color: 'rgb(219, 234, 254)'
              }}
            >
              {description}
            </div>
          )}
        </div>
        {/* eslint-enable newwork-local/no-hardcoded-colors */}
        <div
          style={{
            padding: '24px 24px 0 24px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0
          }}
        >
          <QuickTaskForm
            accessToken={accessToken}
            currentUserId={currentUserId}
            onSubmit={handleSubmitWithClose}
            onCancel={handleCancel}
            config={configWithTitle}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
