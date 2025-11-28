import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@newwork/nw-design-system'
import { TranslatableField } from '@/components/translatable-field'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface DescriptionDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  description?: string
  descriptionTranslation?: Record<string, string>
  onSave: (description: string, translations: Record<string, string>) => Promise<void>
  'data-testid'?: string
}

export const DescriptionDialog: React.FC<DescriptionDialogProps> = ({
  open,
  onOpenChange,
  description = '',
  descriptionTranslation = {},
  onSave,
  'data-testid': dataTestId = 'description-dialog'
}) => {
  const [localDescription, setLocalDescription] = useState(description)
  const [localTranslations, setLocalTranslations] = useState<Record<string, string>>(descriptionTranslation)
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setLocalDescription(description)
      setLocalTranslations(descriptionTranslation)
    }
  }, [open, description, descriptionTranslation])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(localDescription, localTranslations)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving description:', error)
    } finally {
      setIsSaving(false)
    }
  }, [localDescription, localTranslations, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px]" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>Edit Description</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <TranslatableField
            label="Description"
            value={localDescription}
            onChange={setLocalDescription}
            translations={localTranslations}
            onTranslationsChange={setLocalTranslations}
            data-testid={`${dataTestId}-description-field`}
            placeholder="Enter description..."
            variant="textarea"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid={`${dataTestId}-save-button`}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
