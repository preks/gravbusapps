import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplateForm } from '../FlowTemplateForm'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system'

interface FlowTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  'data-testid'?: string
}

/**
 * Dialog component containing the flow template form
 */
export const FlowTemplateDialog: React.FC<FlowTemplateDialogProps> = ({
  open,
  onOpenChange,
  isEditing,
  'data-testid': testId = 'flow-template-dialog'
}) => {
  const { resetTemplate, saveTemplate, isSaving } = useFlowTemplateStore()

  const handleReset = () => {
    if (
      window.confirm(
        getTranslationFromI18nKeyAndLabel(
          'flow.creator.resetConfirm',
          'Are you sure you want to reset the form? All changes will be lost.'
        )
      )
    ) {
      resetTemplate()
    }
  }

  const handleSave = async () => {
    try {
      await saveTemplate()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save template:', error)
      // Could add error handling/notification here
    }
  }

  const handleClose = () => {
    if (
      window.confirm(
        getTranslationFromI18nKeyAndLabel(
          'flow.creator.closeConfirm',
          'Are you sure you want to close the form? All unsaved changes will be lost.'
        )
      )
    ) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <DialogContent
        className="gba:max-w-6xl gba:w-[90vw] gba:h-[90vh] gba:overflow-y-auto"
        data-testid={`${testId}-content`}
      >
        <DialogHeader data-testid={`${testId}-header`}>
          <DialogTitle data-testid={`${testId}-title`}>
            {isEditing
              ? getTranslationFromI18nKeyAndLabel('flow.creator.editTemplate', 'Edit Flow Template')
              : getTranslationFromI18nKeyAndLabel('flow.creator.createTemplate', 'Create New Flow Template')}
          </DialogTitle>
          <DialogDescription data-testid={`${testId}-description`}>
            {getTranslationFromI18nKeyAndLabel(
              'flow.creator.formDescription',
              'Configure your workflow template with steps, assignments, and settings.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:py-4" data-testid={`${testId}-form-container`}>
          <FlowTemplateForm data-testid={`${testId}-form`} />
        </div>

        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4" data-testid={`${testId}-actions`}>
          <Button variant="outline" onClick={handleReset} data-testid={`${testId}-reset-button`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.reset', 'Reset')}
          </Button>

          <Button variant="outline" onClick={handleClose} data-testid={`${testId}-cancel-button`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.cancel', 'Cancel')}
          </Button>

          <Button variant="default" onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save-button`}>
            {isSaving
              ? getTranslationFromI18nKeyAndLabel('flow.creator.saving', 'Saving...')
              : getTranslationFromI18nKeyAndLabel('flow.creator.save', 'Save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
