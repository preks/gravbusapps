'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import {
  type CatalogTranslationValues,
  getCatalogTranslationValues
} from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import translations from '../_i18n'

export interface AbsenceTypeModalValues {
  code: string
  translations: CatalogTranslationValues
  parentEntryId: string
}

interface AbsenceTypeModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceTypeModalValues) => Promise<void>
  absenceType?: AbsenceType | null
  groups: CatalogEntry[]
}

const emptyFormState = {
  code: '',
  parentEntryId: ''
}

export function AbsenceTypeModal({ open, onClose, onSave, absenceType, groups }: Readonly<AbsenceTypeModalProps>) {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState(emptyFormState)
  const [translationValues, setTranslationValues] = useState<CatalogTranslationValues>({
    enUS: '',
    deDE: '',
    roRO: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  const groupOptions = groups.map(group => ({
    value: `AbsenceGroup:v1:${group.code}`,
    label: group.value || group.code
  }))

  if (formValues.parentEntryId && !groupOptions.some(option => option.value === formValues.parentEntryId)) {
    groupOptions.unshift({
      value: formValues.parentEntryId,
      label: formValues.parentEntryId.split(':').pop() || formValues.parentEntryId
    })
  }

  useEffect(() => {
    if (!open) return

    if (!absenceType) {
      setFormValues(emptyFormState)
      setTranslationValues({ enUS: '', deDE: '', roRO: '' })
      return
    }

    setFormValues({
      code: absenceType.code || '',
      parentEntryId: absenceType.parentEntryId || ''
    })
    setTranslationValues(getCatalogTranslationValues(absenceType))
  }, [absenceType, open])

  const isSaveDisabled =
    isSaving ||
    !formValues.code.trim() ||
    !translationValues.enUS.trim() ||
    (!absenceType?.id && !formValues.parentEntryId.trim())

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        code: formValues.code.trim(),
        translations: {
          enUS: translationValues.enUS.trim(),
          deDE: translationValues.deDE.trim(),
          roRO: translationValues.roRO.trim()
        },
        parentEntryId: formValues.parentEntryId.trim()
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-type-error')
      console.error('Error saving absence type:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-type-modal"
        className="gba:flex gba:max-w-3xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>{absenceType?.id ? t('type-modal-edit-title') : t('type-modal-create-title')}</DialogTitle>
            <DialogDescription>
              {t('generic-catalog-modal-description', { entity: t('absence-type-entity-label') })}
            </DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            <Card data-testid="absence-type-form" className="gba:border gba:border-border gba:bg-muted/10">
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('basic-information-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:gap-4 gba:p-4 gba:md:grid-cols-3">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-code">
                    {t('field-code-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Input
                    id="absence-type-code"
                    value={formValues.code}
                    onChange={event => setFormValues(current => ({ ...current, code: event.target.value }))}
                    placeholder={t('code-placeholder')}
                    disabled={Boolean(absenceType?.id)}
                    data-testid="absence-type-code-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-name-en">
                    {t('field-name-en-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Input
                    id="absence-type-name-en"
                    value={translationValues.enUS}
                    onChange={event => setTranslationValues(current => ({ ...current, enUS: event.target.value }))}
                    data-testid="absence-type-name-en-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-name-de">{t('field-name-de-label')}</Label>
                  <Input
                    id="absence-type-name-de"
                    value={translationValues.deDE}
                    onChange={event => setTranslationValues(current => ({ ...current, deDE: event.target.value }))}
                    data-testid="absence-type-name-de-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-name-ro">{t('field-name-ro-label')}</Label>
                  <Input
                    id="absence-type-name-ro"
                    value={translationValues.roRO}
                    onChange={event => setTranslationValues(current => ({ ...current, roRO: event.target.value }))}
                    data-testid="absence-type-name-ro-input"
                  />
                </div>

                {!absenceType?.id ? (
                  <div className="gba:space-y-2">
                    <Label>{t('field-group-label')}</Label>
                    <Combobox
                      value={formValues.parentEntryId}
                      onValueChange={value =>
                        setFormValues(current => ({ ...current, parentEntryId: String(value || '') }))
                      }
                      options={groupOptions}
                      placeholder={t('group-placeholder')}
                      searchPlaceholder={t('group-placeholder')}
                      emptyText={t('empty-catalog-entries', { entity: t('absence-group-entity-label') })}
                      data-testid="absence-type-group-select"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-type-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-type-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
