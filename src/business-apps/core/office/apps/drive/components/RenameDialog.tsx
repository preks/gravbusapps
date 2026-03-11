import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input
} from '@newwork/nw-design-system'

export interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onConfirm: (newName: string) => Promise<void> | void
  t: (key: string) => string
  'data-testid'?: string
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  onOpenChange,
  currentName,
  onConfirm,
  t,
  'data-testid': testId = 'drive-rename-dialog'
}) => {
  const [name, setName] = useState(currentName)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return
    setIsSubmitting(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('action-rename')}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          data-testid={`${testId}-input`}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            {t('action-cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || name.trim() === currentName || isSubmitting}
            data-testid={`${testId}-confirm`}
          >
            {t('action-rename')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
