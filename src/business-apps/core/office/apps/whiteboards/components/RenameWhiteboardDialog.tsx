import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

interface RenameWhiteboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTitle: string
  onRename: (newTitle: string) => Promise<void>
  'data-testid'?: string
}

export const RenameWhiteboardDialog: React.FC<RenameWhiteboardDialogProps> = ({
  open,
  onOpenChange,
  currentTitle,
  onRename,
  'data-testid': testId = 'rename-whiteboard-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [title, setTitle] = useState(currentTitle)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) setTitle(currentTitle)
  }, [open, currentTitle])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = title.trim()
      if (!trimmed || trimmed === currentTitle) {
        onOpenChange(false)
        return
      }
      setIsSaving(true)
      try {
        await onRename(trimmed)
        onOpenChange(false)
      } finally {
        setIsSaving(false)
      }
    },
    [title, currentTitle, onRename, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('whiteboard-rename-title')}</DialogTitle>
            <DialogDescription>{t('whiteboard-rename-description')}</DialogDescription>
          </DialogHeader>
          <div className="gba:py-4">
            <Input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('whiteboard-rename-placeholder')}
              data-testid={`${testId}-input`}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t('whiteboard-rename-cancel')}
            </Button>
            <Button type="submit" disabled={!title.trim() || isSaving} data-testid={`${testId}-confirm`}>
              {isSaving ? t('whiteboard-rename-saving') : t('whiteboard-rename-save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
