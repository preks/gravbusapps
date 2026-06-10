import React, { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from '@newwork/nw-design-system'
import type { Room, RoomFormValues } from '../types'

type TranslationFn = (key: string) => string

interface RoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room?: Room | null
  isSaving: boolean
  t: TranslationFn
  onSubmit: (values: RoomFormValues, room?: Room) => Promise<void>
}

const emptyForm: RoomFormValues = {
  code: '',
  name: ''
}

function buildRoomSchema(t: TranslationFn) {
  return z.object({
    code: z.string().trim().min(1, t('workplace-room-code-required')).max(80, t('workplace-room-code-max')),
    name: z.string().trim().min(1, t('workplace-room-name-required')).max(120, t('workplace-room-name-max'))
  })
}

function getSubmitLabel(isSaving: boolean, isEditMode: boolean, t: TranslationFn): string {
  if (isSaving) {
    return t('workplace-room-saving')
  }

  return isEditMode ? t('workplace-room-update-submit') : t('workplace-room-create-submit')
}

export const RoomDialog: React.FC<RoomDialogProps> = ({ open, onOpenChange, room, isSaving, t, onSubmit }) => {
  const [form, setForm] = useState<RoomFormValues>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof RoomFormValues, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const schema = useMemo(() => buildRoomSchema(t), [t])
  const isEditMode = Boolean(room)

  useEffect(() => {
    if (!open) {
      setForm(emptyForm)
      setErrors({})
      setSubmitError(null)
      return
    }

    setForm(room ? { code: room.code ?? '', name: room.name ?? '' } : emptyForm)
    setErrors({})
    setSubmitError(null)
  }, [open, room])

  const updateField = (field: keyof RoomFormValues, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async () => {
    const result = schema.safeParse(form)

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RoomFormValues, string>> = {}
      result.error.issues.forEach(issue => {
        const fieldName = issue.path[0]
        if (fieldName === 'code' || fieldName === 'name') {
          fieldErrors[fieldName] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    try {
      setSubmitError(null)
      await onSubmit(result.data, room ?? undefined)
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('workplace-room-save-error'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid="workplace-room-dialog">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('workplace-room-edit-title') : t('workplace-room-create-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-2">
          {submitError && (
            <Alert variant="destructive" data-testid="workplace-room-dialog-error">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="gba:space-y-2">
            <Label htmlFor="workplace-room-code">{t('workplace-room-code-label')}</Label>
            <Input
              id="workplace-room-code"
              value={form.code}
              onChange={event => updateField('code', event.target.value)}
              placeholder={t('workplace-room-code-placeholder')}
              data-testid="workplace-room-code-input"
            />
            {errors.code && <p className="gba:text-sm gba:text-destructive">{errors.code}</p>}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="workplace-room-name">{t('workplace-room-name-label')}</Label>
            <Input
              id="workplace-room-name"
              value={form.name}
              onChange={event => updateField('name', event.target.value)}
              placeholder={t('workplace-room-name-placeholder')}
              data-testid="workplace-room-name-input"
            />
            {errors.name && <p className="gba:text-sm gba:text-destructive">{errors.name}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="workplace-room-cancel-button">
            {t('workplace-room-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} data-testid="workplace-room-save-button">
            {getSubmitLabel(isSaving, isEditMode, t)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
