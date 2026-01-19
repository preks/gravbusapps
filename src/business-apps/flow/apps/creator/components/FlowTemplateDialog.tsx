import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplateForm } from './FlowTemplateForm'
import { useFlowTemplateStore } from '../hooks/useFlowTemplateStore'

// Custom UI components
const Dialog: React.FC<any> = ({ open, onOpenChange, children, 'data-testid': testId }) => {
  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:bg-black/50 gba:flex gba:items-center gba:justify-center gba:z-50"
      onClick={() => onOpenChange(false)}
      data-testid={testId}
    >
      <div
        className="gba:bg-white gba:rounded-lg"
        onClick={e => e.stopPropagation()}
        data-testid={`${testId}-container`}
      >
        {children}
      </div>
    </div>
  )
}

const DialogContent: React.FC<any> = ({ children, className = '', 'data-testid': testId }) => (
  <div className={`gba:p-6 ${className}`} data-testid={testId}>
    {children}
  </div>
)

const DialogHeader: React.FC<any> = ({ children, 'data-testid': testId }) => (
  <div className="gba:mb-4" data-testid={testId}>
    {children}
  </div>
)

const DialogTitle: React.FC<any> = ({ children, 'data-testid': testId }) => (
  <h2 className="gba:text-xl gba:font-semibold" data-testid={testId}>
    {children}
  </h2>
)

const DialogDescription: React.FC<any> = ({ children, 'data-testid': testId }) => (
  <p className="gba:text-sm gba:text-gray-500" data-testid={testId}>
    {children}
  </p>
)

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'outline'
  'data-testid'?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  'data-testid': testId
}) => {
  const baseClasses = 'gba:px-4 gba:py-2 gba:rounded gba:text-sm gba:font-medium'
  const variantClasses = {
    default: 'gba:bg-blue-600 gba:text-white gba:hover:bg-blue-700',
    outline: 'gba:border gba:border-gray-300 gba:text-gray-700 gba:hover:bg-gray-50'
  } as const

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'gba:opacity-50 gba:cursor-not-allowed' : ''}`}
      data-testid={testId}
    >
      {children}
    </button>
  )
}

interface FlowTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  onSave?: (template: any, isDraft?: boolean) => Promise<void>
  'data-testid'?: string
}

/**
 * Dialog component containing the flow template form
 */
export const FlowTemplateDialog: React.FC<FlowTemplateDialogProps> = ({
  open,
  onOpenChange,
  isEditing,
  onSave,
  'data-testid': testId = 'flow-template-dialog'
}) => {
  const { resetTemplate, saveTemplate, isSaving, flowTemplate } = useFlowTemplateStore()

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

  const handleSave = async (isDraft: boolean = false) => {
    try {
      if (onSave) {
        await onSave(flowTemplate, isDraft)
      } else {
        await saveTemplate()
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save template:', error)
      // Could add error handling/notification here
    }
  }

  const handleSaveDraft = async () => {
    await handleSave(true)
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

          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
            data-testid={`${testId}-save-draft-button`}
          >
            {isSaving
              ? getTranslationFromI18nKeyAndLabel('flow.creator.saving', 'Saving...')
              : getTranslationFromI18nKeyAndLabel('flow.creator.saveDraft', 'Save Draft')}
          </Button>

          <Button onClick={() => handleSave(false)} disabled={isSaving} data-testid={`${testId}-save-button`}>
            {isSaving
              ? getTranslationFromI18nKeyAndLabel('flow.creator.saving', 'Saving...')
              : getTranslationFromI18nKeyAndLabel('flow.creator.save', 'Save & Publish')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
