'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import translations from '../_i18n'

export interface GenericCatalogEntryModalValues {
  code: string
  value: string
}

interface GenericCatalogEntryModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: GenericCatalogEntryModalValues) => Promise<void>
  entry?: CatalogEntry | null
  entityLabel: string
}

export const GenericCatalogEntryModal: React.FC<GenericCatalogEntryModalProps> = ({
  open,
  onClose,
  onSave,
  entry,
  entityLabel
}) => {
  const { t } = useTranslation(translations)
  const [code, setCode] = useState('')
  const [value, setValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setCode(entry?.code || '')
    setValue(entry?.value || '')
  }, [entry, open])

  const isSaveDisabled = isSaving || !code.trim() || !value.trim()

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        code: code.trim(),
        value: value.trim()
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="generic-catalog-entry-modal"
        className="gba:max-w-xl gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-6 gba:py-5">
            <DialogTitle>
              {entry
                ? t('generic-catalog-modal-edit-title', { entity: entityLabel })
                : t('generic-catalog-modal-create-title', { entity: entityLabel })}
            </DialogTitle>
            <DialogDescription>{t('generic-catalog-modal-description', { entity: entityLabel })}</DialogDescription>
          </DialogHeader>

          <div className="gba:grid gba:gap-4 gba:px-6 gba:py-6">
            <div className="gba:space-y-2">
              <Label htmlFor="generic-catalog-entry-code">
                {t('field-code-label')}
                <span className="gba:text-destructive"> *</span>
              </Label>
              <Input
                id="generic-catalog-entry-code"
                value={code}
                onChange={event => setCode(event.target.value)}
                disabled={Boolean(entry?.id)}
                data-testid="generic-catalog-entry-code-input"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="generic-catalog-entry-name">
                {t('field-name-label')}
                <span className="gba:text-destructive"> *</span>
              </Label>
              <Input
                id="generic-catalog-entry-name"
                value={value}
                onChange={event => setValue(event.target.value)}
                data-testid="generic-catalog-entry-name-input"
              />
            </div>
          </div>

          <div className="gba:flex gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-6 gba:py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="generic-catalog-entry-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="generic-catalog-entry-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
