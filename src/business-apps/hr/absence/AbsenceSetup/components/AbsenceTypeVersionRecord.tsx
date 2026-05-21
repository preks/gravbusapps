'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button, ScrollArea, Spinner, useTranslation } from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import { AbsenceTypeVersionBasicSection } from './AbsenceTypeVersionBasicSection'
import { AbsenceTypeSettingsSection } from './AbsenceTypeSettingsSection'
import { createDefaultAbsenceTypeVersionValues, type AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import { getAbsenceTypeVersionFormValues } from '../utils/absenceTypeVersionObjectValue'
import { validateAbsenceTypeVersion } from '../utils/absenceTypeVersionValidation'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'

interface AbsenceTypeVersionRecordProps {
  entry?: CatalogEntry | null
  isLoadingEntry?: boolean
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
  employmentTypes: EligibilityOption[]
  contractTypes: EligibilityOption[]
  countries: EligibilityOption[]
  regionsByCountry: Record<string, EligibilityOption[]>
  regionsLoading: Record<string, boolean>
  onCountryExpanded: (countryId: string) => void
  onSave: (values: AbsenceTypeVersionFormValues) => Promise<void>
  onNavigateBack: () => void
}

export const AbsenceTypeVersionRecord: React.FC<AbsenceTypeVersionRecordProps> = ({
  entry,
  isLoadingEntry = false,
  absenceTypes,
  absenceTypeVersions,
  employmentTypes,
  contractTypes,
  countries,
  regionsByCountry,
  regionsLoading,
  onCountryExpanded,
  onSave,
  onNavigateBack
}) => {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState<AbsenceTypeVersionFormValues>(createDefaultAbsenceTypeVersionValues())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const defaultValues = createDefaultAbsenceTypeVersionValues()
    setFormValues(getAbsenceTypeVersionFormValues(entry, defaultValues))
  }, [entry])

  useEffect(() => {
    if (entry) return

    const selectedType = absenceTypes.find(item => item.code === formValues.code)
    if (!selectedType) return

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
  }, [absenceTypes, entry, formValues.code, formValues.translations.enUS, formValues.version])

  const validationErrors = useMemo(
    () =>
      validateAbsenceTypeVersion({
        values: formValues,
        entries: absenceTypeVersions,
        absenceTypes,
        currentEntryId: entry?.id
      }),
    [absenceTypeVersions, absenceTypes, entry?.id, formValues]
  )

  const isSaveDisabled =
    isSaving ||
    isLoadingEntry ||
    !formValues.code ||
    !formValues.translations.enUS.trim() ||
    Object.keys(validationErrors).length > 0

  const updateSettingsField = <K extends keyof AbsenceTypeVersionFormValues['settings']>(
    field: K,
    value: AbsenceTypeVersionFormValues['settings'][K]
  ) => {
    setFormValues(current => ({
      ...current,
      settings: { ...current.settings, [field]: value }
    }))
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) return

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

  const title = entry ? t('version-modal-edit-title') : t('version-modal-create-title')

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="absence-type-version-record">
      <div className="gba:flex gba:items-center gba:gap-3 gba:border-b gba:border-border gba:px-6 gba:py-4 gba:bg-background gba:shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNavigateBack}
          data-testid="absence-type-version-record-back-button"
          aria-label={t('back-button')}
        >
          <ArrowLeftIcon className="gba:h-5 gba:w-5" />
        </Button>
        <h1 className="gba:flex-1 gba:text-xl gba:font-semibold">{title}</h1>
        <Button
          type="button"
          variant="secondary"
          onClick={onNavigateBack}
          disabled={isSaving}
          data-testid="absence-type-version-record-cancel-button"
        >
          {t('cancel-button')}
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isSaveDisabled}
          data-testid="absence-type-version-record-save-button"
        >
          {isSaving ? t('saving-button') : t('save-button')}
        </Button>
      </div>

      <ScrollArea className="gba:flex-1">
        <div className="gba:p-6 gba:space-y-4">
          {isLoadingEntry ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Spinner />
            </div>
          ) : (
            <>
              <AbsenceTypeVersionBasicSection
                absenceTypes={absenceTypes}
                formValues={formValues}
                validationErrors={validationErrors}
                onChange={setFormValues}
              />
              <AbsenceTypeSettingsSection
                settings={formValues.settings}
                onFieldChange={updateSettingsField}
                employmentTypes={employmentTypes}
                contractTypes={contractTypes}
                countries={countries}
                regionsByCountry={regionsByCountry}
                regionsLoading={regionsLoading}
                onCountryExpanded={onCountryExpanded}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
