import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
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
  onSubmit,
  title,
  description,
  employeeId
}) => {
  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmitWithClose = async (data: any) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  // Merge title into config for button text
  const configWithTitle = {
    ...config,
    taskName: title || config?.taskName
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-1xl gba:max-h-[90vh] gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title || getTranslationFromI18nKeyAndLabel('quickTask.modal.title', 'Create Quick Task')}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="gba:mt-4">
          <QuickTaskForm
            accessToken={accessToken}
            onSubmit={handleSubmitWithClose}
            onCancel={handleCancel}
            config={configWithTitle}
            employeeId={employeeId}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
