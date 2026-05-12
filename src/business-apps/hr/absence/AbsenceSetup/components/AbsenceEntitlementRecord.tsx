'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateInput,
  Input,
  Label,
  ScrollArea,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import {
  type CatalogTranslationValues,
  getCatalogTranslationValues
} from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'
import translations from '../_i18n'
import { AbsenceEntitlementSettingsSection } from './AbsenceEntitlementSettingsSection'
import {
  buildAbsenceEntitlementObjectValue,
  type AbsenceEntitlementDetailEntry,
  type AbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementObjectSettings,
  getAbsenceEntitlementEditorState,
  type AbsenceEntitlementObjectSettings,
  type AbsenceEntitlementObjectValue
} from '../utils/absenceEntitlementObjectValue'
import type { JSONObject } from '@/common/types/i18nTypes'

export interface AbsenceEntitlementRecordValues {
  code: string
  translations: CatalogTranslationValues
  objectValue: AbsenceEntitlementObjectValue
}

interface CompanyOption {
  id: string
  name: string
}

interface AbsenceEntitlementRecordProps {
  entitlement?: CatalogEntry | null
  isLoadingEntry?: boolean
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
  accessToken: string
  companies?: CompanyOption[]
  isLoadingCompanies?: boolean
  onSearchCompanies?: (query: string) => void
  onLoadMoreCompanies?: () => void
  countries?: EligibilityOption[]
  contractTypes?: EligibilityOption[]
  employmentTypes?: EligibilityOption[]
  onSave: (values: AbsenceEntitlementRecordValues) => Promise<void>
  onNavigateBack: () => void
}

const normalizeDateInputValue = (value: string): string => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [day, month, year] = value.split('.')
    return `${year}-${month}-${day}`
  }
  return value
}

export const AbsenceEntitlementRecord: React.FC<AbsenceEntitlementRecordProps> = ({
  entitlement,
  isLoadingEntry = false,
  absenceTypes,
  absenceTypeVersions,
  companies = [],
  isLoadingCompanies = false,
  onSearchCompanies,
  onLoadMoreCompanies,
  countries = [],
  contractTypes = [],
  employmentTypes = [],
  onSave,
  onNavigateBack
}) => {
  const { t } = useTranslation(translations)
  const nextDetailIdRef = useRef(0)
  const [code, setCode] = useState('')
  const [translationValues, setTranslationValues] = useState<CatalogTranslationValues>({
    enUS: '',
    deDE: '',
    roRO: ''
  })
  const [settings, setSettings] = useState<AbsenceEntitlementObjectSettings>(defaultAbsenceEntitlementObjectSettings)
  const [detailEntries, setDetailEntries] = useState<AbsenceEntitlementDetailEntry[]>([])
  const [extraObjectValue, setExtraObjectValue] = useState<JSONObject>({})
  const [isSaving, setIsSaving] = useState(false)

  const entitlementTypeOptions = [
    { value: 'YEARLY', label: t('type-yearly') },
    { value: 'SPECIAL', label: t('type-special') }
  ]

  useEffect(() => {
    const nextState = getAbsenceEntitlementEditorState(
      entitlement?.objectValue as AbsenceEntitlementObjectValue | undefined
    )
    setCode(entitlement?.code || '')
    setTranslationValues(getCatalogTranslationValues(entitlement))
    setSettings(nextState.settings)
    setDetailEntries(nextState.detailEntries)
    setExtraObjectValue(nextState.extraObjectValue)
  }, [entitlement])

  const isSaveDisabled = isSaving || isLoadingEntry || !code.trim() || !translationValues.enUS.trim()

  const updateSettingsField = <K extends keyof AbsenceEntitlementObjectSettings>(
    field: K,
    value: AbsenceEntitlementObjectSettings[K]
  ) => {
    setSettings(current => ({ ...current, [field]: value }))
  }

  const updateDetailField = <K extends keyof AbsenceEntitlementDetailEntry['settings']>(
    detailId: string,
    field: K,
    value: AbsenceEntitlementDetailEntry['settings'][K]
  ) => {
    setDetailEntries(current =>
      current.map(detailEntry =>
        detailEntry.id === detailId
          ? { ...detailEntry, settings: { ...detailEntry.settings, [field]: value } }
          : detailEntry
      )
    )
  }

  const createDetailId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `detail-${Date.now()}-${nextDetailIdRef.current++}`

  const addDetailEntry = (detailSettings: AbsenceEntitlementDetailSettings) => {
    setDetailEntries(current => [
      ...current,
      {
        id: createDetailId(),
        settings: { ...defaultAbsenceEntitlementDetailSettings, ...detailSettings },
        extraValue: {}
      }
    ])
  }

  const removeDetailEntry = (detailId: string) => {
    setDetailEntries(current => current.filter(detailEntry => detailEntry.id !== detailId))
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) return

    try {
      setIsSaving(true)
      await onSave({
        code: code.trim(),
        translations: {
          enUS: translationValues.enUS.trim(),
          deDE: translationValues.deDE.trim(),
          roRO: translationValues.roRO.trim()
        },
        objectValue: buildAbsenceEntitlementObjectValue(settings, detailEntries, extraObjectValue)
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-entitlement-error')
      console.error('Error saving absence entitlement:', message)
    } finally {
      setIsSaving(false)
    }
  }

  const title = entitlement ? t('entitlement-modal-edit-title') : t('entitlement-modal-create-title')

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="absence-entitlement-record">
      <div className="gba:flex gba:items-center gba:gap-3 gba:border-b gba:border-border gba:px-6 gba:py-4 gba:bg-background gba:shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNavigateBack}
          data-testid="absence-entitlement-record-back-button"
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
          data-testid="absence-entitlement-record-cancel-button"
        >
          {t('cancel-button')}
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={isSaveDisabled}
          data-testid="absence-entitlement-record-save-button"
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
              <Card
                data-testid="absence-entitlement-basic-section"
                className="gba:border gba:border-border gba:bg-muted/10"
              >
                <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                  <CardTitle>{t('entitlement-basic-section-title')}</CardTitle>
                </CardHeader>
                <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-2 gba:xl:grid-cols-5">
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-code">{t('field-code-label')}</Label>
                    <Input
                      id="absence-entitlement-code"
                      value={code}
                      onChange={event => setCode(event.target.value)}
                      disabled={Boolean(entitlement?.id)}
                      data-testid="absence-entitlement-code-input"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-name-en">
                      {t('field-name-en-label')}
                      <span className="gba:text-destructive"> *</span>
                    </Label>
                    <Input
                      id="absence-entitlement-name-en"
                      value={translationValues.enUS}
                      onChange={event => setTranslationValues(current => ({ ...current, enUS: event.target.value }))}
                      data-testid="absence-entitlement-name-en-input"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-name-de">{t('field-name-de-label')}</Label>
                    <Input
                      id="absence-entitlement-name-de"
                      value={translationValues.deDE}
                      onChange={event => setTranslationValues(current => ({ ...current, deDE: event.target.value }))}
                      data-testid="absence-entitlement-name-de-input"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-name-ro">{t('field-name-ro-label')}</Label>
                    <Input
                      id="absence-entitlement-name-ro"
                      value={translationValues.roRO}
                      onChange={event => setTranslationValues(current => ({ ...current, roRO: event.target.value }))}
                      data-testid="absence-entitlement-name-ro-input"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label>{t('field-type-label')}</Label>
                    <Combobox
                      value={settings.entitlement_type}
                      onValueChange={value => updateSettingsField('entitlement_type', String(value || 'YEARLY'))}
                      options={entitlementTypeOptions}
                      placeholder={t('field-type-label')}
                      searchPlaceholder={t('field-type-label')}
                      emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                      data-testid="absence-entitlement-type-select"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-valid-from">{t('field-valid-from-label')}</Label>
                    <DateInput
                      id="absence-entitlement-valid-from"
                      type="date"
                      outputFormat="iso"
                      value={normalizeDateInputValue(settings.valid_from)}
                      onChange={value => updateSettingsField('valid_from', value || '')}
                      data-testid="absence-entitlement-valid-from-input"
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-entitlement-valid-to">{t('field-valid-to-label')}</Label>
                    <DateInput
                      id="absence-entitlement-valid-to"
                      type="date"
                      outputFormat="iso"
                      value={normalizeDateInputValue(settings.valid_to)}
                      onChange={value => updateSettingsField('valid_to', value || '')}
                      data-testid="absence-entitlement-valid-to-input"
                    />
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="settings" className="gba:w-full">
                <TabsList className="gba:grid gba:w-full gba:grid-cols-2" data-testid="absence-entitlement-tabs-list">
                  <TabsTrigger value="settings" data-testid="absence-entitlement-settings-tab">
                    {t('entitlement-settings-section-title')}
                  </TabsTrigger>
                  <TabsTrigger value="details" data-testid="absence-entitlement-details-tab">
                    {t('entitlement-details-section-title')}
                  </TabsTrigger>
                </TabsList>

                <AbsenceEntitlementSettingsSection
                  key={`settings-${entitlement?.id ?? 'new'}`}
                  settings={settings}
                  detailEntries={detailEntries}
                  absenceTypes={absenceTypes}
                  absenceTypeVersions={absenceTypeVersions}
                  mode="settings"
                  companies={companies}
                  isLoadingCompanies={isLoadingCompanies}
                  onSearchCompanies={onSearchCompanies}
                  onLoadMoreCompanies={onLoadMoreCompanies}
                  employmentTypes={employmentTypes}
                  contractTypes={contractTypes}
                  countries={countries}
                  onSettingsChange={updateSettingsField}
                  onAddDetail={addDetailEntry}
                  onRemoveDetail={removeDetailEntry}
                  onDetailChange={updateDetailField}
                />

                <AbsenceEntitlementSettingsSection
                  key={`details-${entitlement?.id ?? 'new'}`}
                  settings={settings}
                  detailEntries={detailEntries}
                  absenceTypes={absenceTypes}
                  absenceTypeVersions={absenceTypeVersions}
                  mode="details"
                  companies={companies}
                  isLoadingCompanies={isLoadingCompanies}
                  onSearchCompanies={onSearchCompanies}
                  onLoadMoreCompanies={onLoadMoreCompanies}
                  employmentTypes={employmentTypes}
                  contractTypes={contractTypes}
                  countries={countries}
                  onSettingsChange={updateSettingsField}
                  onAddDetail={addDetailEntry}
                  onRemoveDetail={removeDetailEntry}
                  onDetailChange={updateDetailField}
                />
              </Tabs>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
