'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateInput,
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
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import { AbsenceTypeSettingsSection } from '../components/AbsenceTypeSettingsSection'
import {
  defaultAbsenceTypeVersionValues,
  getAbsenceGroupLabel,
  type AbsenceTypeVersionFormValues
} from '../utils/absenceSetup'
import { getAbsenceTypeVersionFormValues } from '../utils/absenceTypeVersionObjectValue'

interface AbsenceTypeVersionModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceTypeVersionFormValues) => Promise<void>
  entry?: CatalogEntry | null
  absenceTypes: AbsenceType[]
}

export const AbsenceTypeVersionModal: React.FC<AbsenceTypeVersionModalProps> = ({
  open,
  onClose,
  onSave,
  entry,
  absenceTypes
}) => {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState<AbsenceTypeVersionFormValues>(defaultAbsenceTypeVersionValues)
  const [isSaving, setIsSaving] = useState(false)

  const normalizeDateInputValue = (value: string): string => {
    if (!value) {
      return ''
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value
    }

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      const [day, month, year] = value.split('.')
      return `${year}-${month}-${day}`
    }

    return value
  }

  useEffect(() => {
    if (!open) return

    setFormValues(getAbsenceTypeVersionFormValues(entry, defaultAbsenceTypeVersionValues))
  }, [entry, open])

  const selectedType = useMemo(
    () => absenceTypes.find(item => item.code === formValues.code),
    [absenceTypes, formValues.code]
  )

  const absenceTypeOptions = useMemo(
    () =>
      absenceTypes.map(item => ({
        value: item.code,
        label: item.value || item.code
      })),
    [absenceTypes]
  )

  const isSaveDisabled = isSaving || !formValues.code

  const updateSettingsField = <K extends keyof AbsenceTypeVersionFormValues['settings']>(
    field: K,
    value: AbsenceTypeVersionFormValues['settings'][K]
  ) => {
    setFormValues(current => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value
      }
    }))
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave(formValues)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-type-version-error')
      console.error('Error saving absence type version:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-type-version-modal"
        className="gba:flex gba:max-w-4xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>{entry ? t('version-modal-edit-title') : t('version-modal-create-title')}</DialogTitle>
            <DialogDescription>{t('version-modal-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            <Card
              data-testid="absence-type-version-basic-section"
              className="gba:border gba:border-border gba:bg-muted/10"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('version-basic-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-3">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-code">
                    {t('field-code-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Combobox
                    value={formValues.code}
                    onValueChange={value => setFormValues(current => ({ ...current, code: String(value || '') }))}
                    options={absenceTypeOptions}
                    placeholder={t('add-absence-type-row-placeholder')}
                    searchPlaceholder={t('add-absence-type-row-placeholder')}
                    emptyText={t('empty-absence-types')}
                    disabled={Boolean(entry)}
                    data-testid="absence-type-version-code-select"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-name">{t('field-name-label')}</Label>
                  <Input
                    id="absence-type-version-name"
                    value={selectedType?.value || ''}
                    disabled
                    className="gba:bg-muted"
                    data-testid="absence-type-version-name-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-group">{t('field-group-label')}</Label>
                  <Input
                    id="absence-type-version-group"
                    value={selectedType ? getAbsenceGroupLabel(selectedType.parentEntryId, t('no-group')) : ''}
                    disabled
                    className="gba:bg-muted"
                    data-testid="absence-type-version-group-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-value">{t('field-version-label')}</Label>
                  <Input
                    id="absence-type-version-value"
                    value={formValues.version}
                    onChange={event => setFormValues(current => ({ ...current, version: event.target.value }))}
                    data-testid="absence-type-version-value-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-valid-from">{t('field-valid-from-label')}</Label>
                  <DateInput
                    id="absence-type-version-valid-from"
                    type="date"
                    outputFormat="iso"
                    value={normalizeDateInputValue(formValues.validFrom)}
                    onChange={value => setFormValues(current => ({ ...current, validFrom: value || '' }))}
                    data-testid="absence-type-version-valid-from-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-valid-to">{t('field-valid-to-label')}</Label>
                  <DateInput
                    id="absence-type-version-valid-to"
                    type="date"
                    outputFormat="iso"
                    value={normalizeDateInputValue(formValues.validTo)}
                    onChange={value => setFormValues(current => ({ ...current, validTo: value || '' }))}
                    data-testid="absence-type-version-valid-to-input"
                  />
                </div>
              </CardContent>
            </Card>

            <AbsenceTypeSettingsSection settings={formValues.settings} onFieldChange={updateSettingsField} />
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-type-version-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-type-version-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
