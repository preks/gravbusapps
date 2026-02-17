import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Checkbox,
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'
import { PERFORMANCE_VALIDATION } from './constants/validationConstants'

export interface ValueEditorValues {
  id?: string
  version?: number
  title: string
  description: string
  recordState: string
}

interface ValuesEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: ValueEditorValues) => void
  initialValues?: ValueEditorValues
}

const ValuesEditorModal: React.FC<ValuesEditorModalProps> = ({ open, onOpenChange, onSave, initialValues }) => {
  const { t } = useTranslation(translations)
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [recordState, setRecordState] = useState<string>(initialValues?.recordState ?? 'active')

  useEffect(() => {
    if (!open) return
    setTitle(initialValues?.title || '')
    setDescription(initialValues?.description || '')
    setRecordState(initialValues?.recordState ?? 'active')
  }, [open, initialValues])

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      id: initialValues?.id,
      version: initialValues?.version,
      title: title.trim(),
      description: description.trim(),
      recordState
    })
    onOpenChange(false)
  }

  const handleCancel = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="performance-values-editor-modal">
        <DialogHeader>
          <DialogTitle>{initialValues ? t('values-modal-title-edit') : t('values-modal-title-add')}</DialogTitle>
          <DialogDescription>{t('values-modal-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="value-title">{t('field-title')} *</Label>
              <Input
                id="value-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={PERFORMANCE_VALIDATION.VALUE_TITLE_MAX_LENGTH}
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="value-description">{t('field-description')}</Label>
              <Input
                id="value-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={PERFORMANCE_VALIDATION.VALUE_DESCRIPTION_MAX_LENGTH}
              />
            </div>
            <label className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                checked={recordState?.toLowerCase() === 'active'}
                onCheckedChange={(v: boolean) => setRecordState(v ? 'active' : 'inactive')}
              />
              <span>{t('field-active')}</span>
            </label>
          </div>

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="secondary" onClick={handleCancel} data-testid="values-modal-cancel">
              {t('button-cancel')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={!title.trim()}
              data-testid="values-modal-save"
            >
              {t('button-save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ValuesEditorModal
