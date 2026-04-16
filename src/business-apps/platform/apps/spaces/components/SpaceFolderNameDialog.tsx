/**
 * SpaceFolderNameDialog
 *
 * Small dialog for creating/renaming a folder.
 * Clean, modern design with focused input.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import { Folder, Loader2 } from 'lucide-react'
import translations from '../_i18n'

export interface SpaceFolderNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initialName?: string
  confirmLabel?: string
  onConfirm: (name: string) => Promise<void> | void
  'data-testid'?: string
}

export const SpaceFolderNameDialog: React.FC<SpaceFolderNameDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  initialName = '',
  confirmLabel,
  onConfirm,
  'data-testid': testId = 'space-folder-name-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setIsSaving(false)
    }
  }, [open, initialName])

  const handleConfirm = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsSaving(true)
    try {
      await onConfirm(trimmed)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }, [name, onConfirm, onOpenChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader className="gba:pb-2">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-warning/10 gba:flex gba:items-center gba:justify-center">
              <Folder className="gba:w-4 gba:h-4 gba:text-warning" />
            </div>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="gba:text-sm gba:text-muted-foreground">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="gba:py-2">
          <Input
            id={`${testId}-name`}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('folder-name-placeholder')}
            autoFocus
            className="gba:h-10"
            data-testid={`${testId}-input`}
          />
        </div>

        <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid={`${testId}-cancel`}
          >
            {t('common-cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || isSaving} data-testid={`${testId}-confirm`}>
            {isSaving ? (
              <>
                <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
                {t('folder-saving')}
              </>
            ) : (
              confirmLabel || t('common-save')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpaceFolderNameDialog
