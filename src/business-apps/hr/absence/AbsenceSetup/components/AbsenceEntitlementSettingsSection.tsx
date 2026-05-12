import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateInput,
  Label,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import {
  type AbsenceEntitlementDetailEntry,
  type AbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementDetailSettings,
  type AbsenceEntitlementObjectSettings
} from '../utils/absenceEntitlementObjectValue'
import {
  getAbsenceTypeVersionDescription,
  getAbsenceTypeVersionTitle,
  isAbsenceTypeVersionActive
} from '../utils/absenceTypeVersionObjectValue'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'
import type { CompanyOption } from '../utils/absenceEligibilityConflict'
import { AbsenceEligibilityFormSection } from './AbsenceEligibilityFormSection'
import { AbsenceEntitlementDetailCard } from './AbsenceEntitlementDetailCard'
import { AbsenceEntitlementNewDetailForm } from './AbsenceEntitlementNewDetailForm'

interface AbsenceEntitlementSettingsSectionProps {
  settings: AbsenceEntitlementObjectSettings
  detailEntries: AbsenceEntitlementDetailEntry[]
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
  mode?: 'all' | 'settings' | 'details'
  companies?: CompanyOption[]
  isLoadingCompanies?: boolean
  onSearchCompanies?: (query: string) => void
  onLoadMoreCompanies?: () => void
  employmentTypes?: EligibilityOption[]
  contractTypes?: EligibilityOption[]
  countries?: EligibilityOption[]
  onSettingsChange: <K extends keyof AbsenceEntitlementObjectSettings>(
    field: K,
    value: AbsenceEntitlementObjectSettings[K]
  ) => void
  onAddDetail: (detailSettings: AbsenceEntitlementDetailSettings) => void
  onRemoveDetail: (detailId: string) => void
  onDetailChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    detailId: string,
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
}

interface SelectOption {
  value: string
  label: string
}

const withCurrentOption = (options: SelectOption[], currentValue: string, currentLabel?: string): SelectOption[] => {
  if (!currentValue || options.some(option => option.value === currentValue)) return options
  return [{ value: currentValue, label: currentLabel || currentValue }, ...options]
}

const getOptionLabel = (options: SelectOption[], value: string): string =>
  options.find(option => option.value === value)?.label || value

const prorataMethodOptions: SelectOption[] = [
  { value: 'ALWAYS', label: 'always' },
  { value: 'NEVER,_EXCEPT_LESS_THAN_A_FULL_YEAR', label: 'never, except less than a full year' },
  { value: 'ONLY_IN_PROBATION_PERIOD', label: 'only in probation period' },
  {
    value: 'ONLY_IN_PROBATION_PERIOD_AND_LESS_THAN_A_FULL_YEAR',
    label: 'only in probation period and less than a full year'
  },
  { value: 'DURING_THE_FIRST_SIX_MONTHS', label: 'during the first six months' },
  {
    value: 'DURING_THE_FIRST_SIX_MONTHS_AND_LESS_THAN_A_FULL_YEAR',
    label: 'during the first six months and less than a full year'
  }
]

const roundingMethodOptions: SelectOption[] = [
  { value: 'NONE', label: 'no rounding' },
  { value: 'ROUND_DOWN_TO_FULL_NUMBER', label: 'round down to full number' },
  {
    value: 'ROUND_LESS_THAN_0_5_DOWN_AND_ABOVE_UP_TO_FULL_NUMBER',
    label: 'round less than 0.5 down and above up to full number'
  },
  { value: 'ROUND_UP_TO_FULL_NUMBER', label: 'round up to full number' },
  { value: 'ARITHMETICALLY ON ONE DECIMAL PLACE', label: 'round arithmetically on one decimal place' },
  { value: 'ARITHMETICALLY ON TWO DECIMAL PLACES', label: 'round arithmetically on two decimal places' }
]

const carryoverApprovalOptions: SelectOption[] = [
  { value: 'GENERAL', label: 'in general' },
  { value: 'MANAGER', label: 'on request approved by manager' },
  { value: 'HR', label: 'on request approved by HR' }
]

const validationAmountUnitOptions: SelectOption[] = [
  { value: 'DAY', label: 'day' },
  { value: 'WEEK', label: 'week' },
  { value: 'MONTH', label: 'month' },
  { value: 'YEAR', label: 'year' }
]

const prolongApprovalOptions: SelectOption[] = [
  { value: 'NONE', label: 'no' },
  { value: 'MANAGER', label: 'on approval by manager' },
  { value: 'HR', label: 'on approval by HR' }
]

const getCarryoverLimitSummary = (detailSettings: AbsenceEntitlementDetailSettings): string => {
  if (detailSettings.max_carryover_percent) return `max ${detailSettings.max_carryover_percent}%`
  if (detailSettings.max_carryover_amount) {
    return `max ${detailSettings.max_carryover_amount} ${getOptionLabel(
      withCurrentOption(validationAmountUnitOptions, detailSettings.validation_amount_unit),
      detailSettings.validation_amount_unit
    ).toLowerCase()}`
  }
  return 'no limit'
}

const getCarryoverSummary = (detailSettings: AbsenceEntitlementDetailSettings) =>
  [
    `Carry over ${getOptionLabel(
      withCurrentOption(carryoverApprovalOptions, detailSettings.carryover_approval),
      detailSettings.carryover_approval
    ).toLowerCase()}`,
    getCarryoverLimitSummary(detailSettings),
    `prolong: ${getOptionLabel(
      withCurrentOption(prolongApprovalOptions, detailSettings.prolong_approval),
      detailSettings.prolong_approval
    ).toLowerCase()}`
  ].join(', ')

const normalizeDateInputValue = (value: string): string => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [day, month, year] = value.split('.')
    return `${year}-${month}-${day}`
  }
  return value
}

export function AbsenceEntitlementSettingsSection({
  settings,
  detailEntries,
  absenceTypes,
  absenceTypeVersions,
  mode = 'all',
  companies = [],
  isLoadingCompanies = false,
  onSearchCompanies,
  onLoadMoreCompanies,
  employmentTypes = [],
  contractTypes = [],
  countries = [],
  onSettingsChange,
  onAddDetail,
  onRemoveDetail,
  onDetailChange
}: Readonly<AbsenceEntitlementSettingsSectionProps>) {
  const { t } = useTranslation(translations)
  const [newDetailSettings, setNewDetailSettings] = useState<AbsenceEntitlementDetailSettings>(
    defaultAbsenceEntitlementDetailSettings
  )
  const [expandedDetailIds, setExpandedDetailIds] = useState<string[]>([])

  useEffect(() => {
    const detailIds = new Set(detailEntries.map(entry => entry.id))
    setExpandedDetailIds(current => current.filter(id => detailIds.has(id)))
  }, [detailEntries])

  const absenceTypeOptions = useMemo(
    () =>
      absenceTypeVersions.filter(isAbsenceTypeVersionActive).map(entry => ({
        value: `AbsenceTypeVersion:v1:${entry.code}`,
        label: [
          getAbsenceTypeVersionTitle(entry, absenceTypes, t('untitled-absence-type-version')),
          getAbsenceTypeVersionDescription(entry)
        ]
          .filter(Boolean)
          .join(' | ')
      })),
    [absenceTypeVersions, absenceTypes, t]
  )

  const yearTypeOptions = [
    { value: 'CALENDAR_YEAR', label: t('year-type-calendar') },
    { value: 'FISCAL_YEAR', label: t('year-type-fiscal') },
    { value: 'EMPLOYMENT_YEAR', label: t('year-type-employment') }
  ]

  const usedAbsenceTypeRefs = new Set(
    detailEntries.map(entry => entry.settings.absence_type_ref).filter((ref): ref is string => Boolean(ref))
  )

  const addDetailOptions = withCurrentOption(
    absenceTypeOptions.filter(option => !usedAbsenceTypeRefs.has(option.value)),
    newDetailSettings.absence_type_ref
  )

  const updateNewDetailField = <K extends keyof AbsenceEntitlementDetailSettings>(
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => {
    setNewDetailSettings(current => ({ ...current, [field]: value }))
  }

  const resetNewDetailSettings = () => {
    setNewDetailSettings(defaultAbsenceEntitlementDetailSettings)
  }

  const handleAddDetail = () => {
    if (!newDetailSettings.absence_type_ref) return
    onAddDetail(newDetailSettings)
    resetNewDetailSettings()
  }

  const toggleDetailExpanded = (detailId: string) => {
    setExpandedDetailIds(current =>
      current.includes(detailId) ? current.filter(id => id !== detailId) : [...current, detailId]
    )
  }

  return (
    <>
      {(mode === 'all' || mode === 'settings') && (
        <TabsContent value="settings" className={mode === 'all' ? '' : 'gba:mt-3'}>
          <Card
            data-testid="absence-entitlement-settings-section"
            className="gba:border gba:border-border gba:bg-muted/10"
          >
            <CardHeader className="gba:border-b gba:border-border gba:bg-background">
              <CardTitle>{t('entitlement-settings-section-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4 gba:p-4">
              <p className="gba:text-xs gba:text-muted-foreground">{t('entitlement-settings-section-description')}</p>
              <AbsenceEligibilityFormSection
                settings={settings}
                companies={companies}
                isLoadingCompanies={isLoadingCompanies}
                onSearchCompanies={onSearchCompanies}
                onLoadMoreCompanies={onLoadMoreCompanies}
                countries={countries}
                contractTypes={contractTypes}
                employmentTypes={employmentTypes}
                testIdPrefix="absence-entitlement"
                onSettingsChange={(field, value) =>
                  onSettingsChange(field as keyof AbsenceEntitlementObjectSettings, value as never)
                }
              />
              <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
                <div className="gba:space-y-2">
                  <Label>{t('field-year-type-label')}</Label>
                  <Combobox
                    value={settings.year_type}
                    onValueChange={value => onSettingsChange('year_type', String(value || 'CALENDAR_YEAR'))}
                    options={yearTypeOptions}
                    placeholder={t('field-year-type-label')}
                    searchPlaceholder={t('field-year-type-label')}
                    emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                    data-testid="absence-entitlement-year-type-select"
                  />
                </div>
                {settings.year_type === 'FISCAL_YEAR' && (
                  <div className="gba:space-y-2">
                    <Label>{t('field-fiscal-year-start-label')}</Label>
                    <DateInput
                      type="date"
                      outputFormat="iso"
                      value={normalizeDateInputValue(settings.year_start_date)}
                      onChange={value =>
                        onSettingsChange('year_start_date', typeof value === 'string' ? value : (value?.[0] ?? ''))
                      }
                      data-testid="absence-entitlement-fiscal-year-start-input"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {(mode === 'all' || mode === 'details') && (
        <TabsContent value="details" className={mode === 'all' ? '' : 'gba:mt-3'}>
          <Card
            data-testid="absence-entitlement-details-section"
            className="gba:border gba:border-border gba:bg-muted/10"
          >
            <CardHeader className="gba:border-b gba:border-border gba:bg-background">
              <div className="gba:flex gba:flex-col gba:gap-4">
                <CardTitle>{t('entitlement-details-section-title')}</CardTitle>
                <div className="gba:min-w-0 gba:flex-1 gba:space-y-2">
                  <Label>{t('field-absence-type-ref-label')}</Label>
                  <Combobox
                    value={newDetailSettings.absence_type_ref}
                    onValueChange={value => updateNewDetailField('absence_type_ref', String(value || ''))}
                    options={addDetailOptions}
                    placeholder={t('field-absence-type-ref-label')}
                    searchPlaceholder={t('field-absence-type-ref-label')}
                    emptyText={t('empty-absence-types')}
                    data-testid="absence-entitlement-new-detail-absence-type-ref-select"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="gba:space-y-3 gba:p-4">
              <p className="gba:text-xs gba:text-muted-foreground">{t('entitlement-details-section-description')}</p>
              <AbsenceEntitlementNewDetailForm
                newDetailSettings={newDetailSettings}
                addDetailOptions={addDetailOptions}
                prorataMethodOptions={prorataMethodOptions}
                roundingMethodOptions={roundingMethodOptions}
                carryoverApprovalOptions={carryoverApprovalOptions}
                validationAmountUnitOptions={validationAmountUnitOptions}
                prolongApprovalOptions={prolongApprovalOptions}
                withCurrentOption={withCurrentOption}
                getOptionLabel={getOptionLabel}
                getCarryoverSummary={getCarryoverSummary}
                onFieldChange={updateNewDetailField}
                onAdd={handleAddDetail}
                onCancel={resetNewDetailSettings}
              />
              {detailEntries.length === 0 && !newDetailSettings.absence_type_ref && (
                <div className="gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-background gba:p-6 gba:text-sm gba:text-muted-foreground">
                  {t('empty-entitlement-rows')}
                </div>
              )}
              <div className="gba:space-y-4">
                {detailEntries.map((detailEntry, index) => (
                  <AbsenceEntitlementDetailCard
                    key={detailEntry.id}
                    detailEntry={detailEntry}
                    index={index}
                    isExpanded={expandedDetailIds.includes(detailEntry.id)}
                    absenceTypeOptions={absenceTypeOptions}
                    allDetailEntries={detailEntries}
                    absenceTypes={absenceTypes}
                    absenceTypeVersions={absenceTypeVersions}
                    prorataMethodOptions={prorataMethodOptions}
                    roundingMethodOptions={roundingMethodOptions}
                    carryoverApprovalOptions={carryoverApprovalOptions}
                    validationAmountUnitOptions={validationAmountUnitOptions}
                    prolongApprovalOptions={prolongApprovalOptions}
                    withCurrentOption={withCurrentOption}
                    getOptionLabel={getOptionLabel}
                    getCarryoverSummary={getCarryoverSummary}
                    onToggle={toggleDetailExpanded}
                    onRemove={onRemoveDetail}
                    onDetailChange={onDetailChange}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </>
  )
}
