import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@newwork/nw-design-system'
import { TranslatableField } from '@/components/translatable-field'

interface MenuItemDescriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  description?: string
  descriptionTranslation?: Record<string, string>
  onSave: (description: string, translations: Record<string, string>) => void
  dataTestId?: string
}

export const MenuItemDescriptionDialog: React.FC<MenuItemDescriptionDialogProps> = ({
  open,
  onOpenChange,
  description = '',
  descriptionTranslation = {},
  onSave,
  dataTestId = 'menu-item-description-dialog'
}) => {
  const [localDescription, setLocalDescription] = useState(description)
  const [localTranslations, setLocalTranslations] = useState<Record<string, string>>(descriptionTranslation)

  useEffect(() => {
    if (open) {
      setLocalDescription(description)
      setLocalTranslations(descriptionTranslation)
    }
  }, [open, description, descriptionTranslation])

  const handleSave = useCallback(() => {
    onSave(localDescription, localTranslations)
    onOpenChange(false)
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${dataTestId}-save-button`}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
