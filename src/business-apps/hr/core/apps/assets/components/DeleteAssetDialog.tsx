import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import type { Asset } from '../types'
import translations from '../_i18n'

interface DeleteAssetDialogProps {
  open: boolean
  asset: Asset | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (notes: string) => Promise<void>
}

export function DeleteAssetDialog({
  open,
  asset,
  isSubmitting = false,
  onClose,
  onConfirm
}: Readonly<DeleteAssetDialogProps>) {
  const { t } = useTranslation(translations)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setNotes(asset?.notes || '')
  }, [asset?.notes, open])

  const initialNotes = (asset?.notes || '').trim()
  const trimmedNotes = notes.trim()
  const hasExistingNotes = initialNotes.length > 0

  const validationMessage = useMemo(() => {
    if (!asset) {
      return ''
    }

    if (!trimmedNotes) {
      return t('delete-asset-note-required')
    }

    if (hasExistingNotes && trimmedNotes === initialNotes) {
      return t('delete-asset-note-change-required')
    }

    return ''
  }, [asset, hasExistingNotes, initialNotes, t, trimmedNotes])

  const handleConfirm = async () => {
    if (!asset || validationMessage) {
      return
    }

    await onConfirm(trimmedNotes)
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        className="gba:max-w-xl"
        onInteractOutside={event => event.preventDefault()}
        data-testid="delete-asset-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('delete-asset-title')}</DialogTitle>
          <DialogDescription>{t('delete-asset-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          {asset ? (
            <div className="gba:rounded-lg gba:bg-muted/30 gba:p-3" data-testid="delete-asset-summary">
              <p className="gba:text-sm gba:font-medium">{asset.model}</p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('serial_number')}: {asset.serialNumber || t('not_available')}
              </p>
            </div>
          ) : null}

          <div className="gba:space-y-2">
            <Label htmlFor="delete-asset-notes" data-testid="delete-asset-notes-label">
              {t('delete-asset-notes-label')}
            </Label>
            <Textarea
              id="delete-asset-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="gba:min-h-[120px]"
              placeholder={t('delete-asset-notes-placeholder')}
              aria-required="true"
              data-testid="delete-asset-notes-input"
            />
            {validationMessage ? (
              <p className="gba:text-sm gba:text-destructive" data-testid="delete-asset-notes-error">
                {validationMessage}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="delete-asset-cancel-button"
          >
            {t('cancel-button')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || Boolean(validationMessage) || !asset}
            data-testid="delete-asset-confirm-button"
          >
            {isSubmitting ? t('deleting-asset-button') : t('delete-asset-confirm-button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
