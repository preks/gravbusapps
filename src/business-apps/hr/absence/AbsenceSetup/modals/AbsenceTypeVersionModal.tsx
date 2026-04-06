'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import { AbsenceTypeVersionBasicSection } from '../components/AbsenceTypeVersionBasicSection'
import { AbsenceTypeSettingsSection } from '../components/AbsenceTypeSettingsSection'
import { createDefaultAbsenceTypeVersionValues, type AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import { getAbsenceTypeVersionFormValues } from '../utils/absenceTypeVersionObjectValue'
import { validateAbsenceTypeVersion } from '../utils/absenceTypeVersionValidation'

interface AbsenceTypeVersionModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceTypeVersionFormValues) => Promise<void>
  entry?: CatalogEntry | null
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
}

export const AbsenceTypeVersionModal: React.FC<AbsenceTypeVersionModalProps> = ({
  open,
  onClose,
  onSave,
  entry,
  absenceTypes,
  absenceTypeVersions
}) => {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState<AbsenceTypeVersionFormValues>(createDefaultAbsenceTypeVersionValues())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    const defaultValues = createDefaultAbsenceTypeVersionValues()
    setFormValues(getAbsenceTypeVersionFormValues(entry, defaultValues))
  }, [entry, open])

  useEffect(() => {
    if (!open || entry) {
      return
    }

    const selectedType = absenceTypes.find(item => item.code === formValues.code)
    if (!selectedType) {
      return
    }

    const defaultEnglishLabel = `${selectedType.value || selectedType.code} ${formValues.version}`.trim()
    if (!formValues.translations.enUS.trim()) {
      setFormValues(current => ({
        ...current,
        translations: {
          ...current.translations,
          enUS: defaultEnglishLabel
        }
      }))
    }
  }, [absenceTypes, entry, formValues.code, formValues.translations.enUS, formValues.version, open])

  const validationErrors = useMemo(
    () =>
      validateAbsenceTypeVersion({
        values: formValues,
        entries: absenceTypeVersions,
        currentEntryId: entry?.id
      }),
    [absenceTypeVersions, entry?.id, formValues]
  )

  const isSaveDisabled =
    isSaving || !formValues.code || !formValues.translations.enUS.trim() || Object.keys(validationErrors).length > 0

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
            <AbsenceTypeVersionBasicSection
              entryId={entry?.id}
              absenceTypes={absenceTypes}
              formValues={formValues}
              validationErrors={validationErrors}
              onChange={setFormValues}
            />

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
