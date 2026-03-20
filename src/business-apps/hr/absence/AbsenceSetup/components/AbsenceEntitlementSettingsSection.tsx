import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  DateInput,
  Input,
  Label,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight } from 'lucide-react'
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

interface AbsenceEntitlementSettingsSectionProps {
  settings: AbsenceEntitlementObjectSettings
  detailEntries: AbsenceEntitlementDetailEntry[]
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
  mode?: 'all' | 'settings' | 'details'
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

export function AbsenceEntitlementSettingsSection({
  settings,
  detailEntries,
  absenceTypes,
  absenceTypeVersions,
  mode = 'all',
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

  const withCurrentOption = (options: SelectOption[], currentValue: string, currentLabel?: string): SelectOption[] => {
    if (!currentValue || options.some(option => option.value === currentValue)) {
      return options
    }

    return [{ value: currentValue, label: currentLabel || currentValue }, ...options]
  }

  const getOptionLabel = (options: SelectOption[], value: string): string =>
    options.find(option => option.value === value)?.label || value

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

  const fullTimeUnitOptions = [
    { value: 'DAYS', label: t('unit-days') },
    { value: 'HOURS', label: t('unit-hours') },
    { value: 'WEEKS', label: t('unit-weeks') }
  ]

  const fullTimePeriodOptions = [
    { value: 'WEEK', label: t('period-per-week') },
    { value: 'MONTH', label: t('period-per-month') },
    { value: 'YEAR', label: t('period-per-year') }
  ]

  const advanceGenerationTimeUnitOptions = [
    { value: 'DAYS', label: t('advance-unit-days') },
    { value: 'WEEKS', label: t('advance-unit-weeks') },
    { value: 'MONTHS', label: t('advance-unit-months') }
  ]

  const prorataMethodOptions = [
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

  const roundingMethodOptions = [
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

  const carryoverApprovalOptions = [
    { value: 'GENERAL', label: 'in general' },
    { value: 'MANAGER', label: 'on request approved by manager' },
    { value: 'HR', label: 'on request approved by HR' }
  ]

  const validationAmountUnitOptions = [
    { value: 'DAY', label: 'day' },
    { value: 'WEEK', label: 'week' },
    { value: 'MONTH', label: 'month' },
    { value: 'YEAR', label: 'year' }
  ]

  const prolongApprovalOptions = [
    { value: 'NONE', label: 'no' },
    { value: 'MANAGER', label: 'on approval by manager' },
    { value: 'HR', label: 'on approval by HR' }
  ]

  const getCarryoverLimitSummary = (detailSettings: AbsenceEntitlementDetailSettings): string => {
    if (detailSettings.max_carryover_percent) {
      return `max ${detailSettings.max_carryover_percent}%`
    }

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

  useEffect(() => {
    const detailIds = new Set(detailEntries.map(detailEntry => detailEntry.id))
    setExpandedDetailIds(currentExpandedIds => currentExpandedIds.filter(detailId => detailIds.has(detailId)))
  }, [detailEntries])

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

  const toggleDetailExpanded = (detailId: string) => {
    setExpandedDetailIds(currentExpandedIds =>
      currentExpandedIds.includes(detailId)
        ? currentExpandedIds.filter(currentId => currentId !== detailId)
        : [...currentExpandedIds, detailId]
    )
  }

  const usedAbsenceTypeRefs = new Set(
    detailEntries
      .map(detailEntry => detailEntry.settings.absence_type_ref)
      .filter((absenceTypeRef): absenceTypeRef is string => Boolean(absenceTypeRef))
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
    if (!newDetailSettings.absence_type_ref) {
      return
    }

    onAddDetail(newDetailSettings)
    resetNewDetailSettings()
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
            <CardContent className="gba:space-y-3 gba:p-4">
              <p className="gba:text-xs gba:text-muted-foreground">{t('entitlement-settings-section-description')}</p>
              <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
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
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-full-time-amount-input">
                    {t('field-full-time-amount-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-full-time-amount-input"
                    type="number"
                    value={settings.full_time_amount}
                    onChange={event => onSettingsChange('full_time_amount', event.target.value)}
                    data-testid="absence-entitlement-full-time-amount-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>{t('field-full-time-unit-label')}</Label>
                  <Combobox
                    value={settings.full_time_unit}
                    onValueChange={value => onSettingsChange('full_time_unit', String(value || 'DAYS'))}
                    options={fullTimeUnitOptions}
                    placeholder={t('field-full-time-unit-label')}
                    searchPlaceholder={t('field-full-time-unit-label')}
                    emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                    data-testid="absence-entitlement-full-time-unit-select"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>{t('field-full-time-period-label')}</Label>
                  <Combobox
                    value={settings.full_time_frequency}
                    onValueChange={value => onSettingsChange('full_time_frequency', String(value || 'WEEK'))}
                    options={fullTimePeriodOptions}
                    placeholder={t('field-full-time-period-label')}
                    searchPlaceholder={t('field-full-time-period-label')}
                    emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                    data-testid="absence-entitlement-full-time-period-select"
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
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-advance-generation-amount-input">
                    {t('field-advance-generation-amount-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-advance-generation-amount-input"
                    type="number"
                    value={settings.advance_generation_amount}
                    onChange={event => onSettingsChange('advance_generation_amount', event.target.value)}
                    data-testid="absence-entitlement-advance-generation-amount-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>{t('field-advance-generation-time-unit-label')}</Label>
                  <Combobox
                    value={settings.advance_generation_time_unit}
                    onValueChange={value => onSettingsChange('advance_generation_time_unit', String(value || 'MONTHS'))}
                    options={advanceGenerationTimeUnitOptions}
                    placeholder={t('field-advance-generation-time-unit-label')}
                    searchPlaceholder={t('field-advance-generation-time-unit-label')}
                    emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                    data-testid="absence-entitlement-advance-generation-time-unit-select"
                  />
                </div>
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
              {newDetailSettings.absence_type_ref ? (
                <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-dashed gba:border-primary/30 gba:bg-background gba:p-4">
                  <div className="gba:flex gba:flex-col gba:gap-2">
                    <div className="gba:text-base gba:font-semibold">{t('entitlement-detail-new-title')}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {getOptionLabel(addDetailOptions, newDetailSettings.absence_type_ref)}
                    </div>
                  </div>

                  <label className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:bg-muted/20 gba:p-3">
                    <Checkbox
                      checked={newDetailSettings.carryover}
                      onCheckedChange={checked => updateNewDetailField('carryover', Boolean(checked))}
                      data-testid="absence-entitlement-new-detail-carryover-checkbox"
                    />
                    <span>{t('field-carryover-label')}</span>
                  </label>

                  <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
                    <div className="gba:space-y-2">
                      <Label>{t('field-prorata-method-label')}</Label>
                      <Combobox
                        value={newDetailSettings.prorata_method}
                        onValueChange={value => updateNewDetailField('prorata_method', String(value || 'ALWAYS'))}
                        options={withCurrentOption(prorataMethodOptions, newDetailSettings.prorata_method)}
                        placeholder={t('field-prorata-method-label')}
                        searchPlaceholder={t('field-prorata-method-label')}
                        emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                        data-testid="absence-entitlement-new-detail-prorata-method-input"
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label>{t('field-rounding-method-label')}</Label>
                      <Combobox
                        value={newDetailSettings.rounding_method}
                        onValueChange={value =>
                          updateNewDetailField(
                            'rounding_method',
                            String(value || 'ARITHMETICALLY ON ONE DECIMAL PLACE')
                          )
                        }
                        options={withCurrentOption(roundingMethodOptions, newDetailSettings.rounding_method)}
                        placeholder={t('field-rounding-method-label')}
                        searchPlaceholder={t('field-rounding-method-label')}
                        emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                        data-testid="absence-entitlement-new-detail-rounding-method-input"
                      />
                    </div>
                    <div className="gba:space-y-2">
                      <Label htmlFor="absence-entitlement-new-detail-amount-input">
                        {t('field-entitlement-amount-label')}
                      </Label>
                      <Input
                        id="absence-entitlement-new-detail-amount-input"
                        type="number"
                        value={newDetailSettings.entitlement_amount}
                        onChange={event => updateNewDetailField('entitlement_amount', event.target.value)}
                        data-testid="absence-entitlement-new-detail-amount-input"
                      />
                    </div>
                  </div>

                  {newDetailSettings.carryover && (
                    <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-blue-200 gba:bg-blue-50/70 gba:p-4">
                      <h5 className="gba:text-lg gba:font-semibold gba:text-blue-900">
                        {t('carryover-configuration-title')}
                      </h5>

                      <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-6">
                        <div className="gba:space-y-2">
                          <Label>{t('field-carryover-approval-label')}</Label>
                          <Combobox
                            value={newDetailSettings.carryover_approval}
                            onValueChange={value =>
                              updateNewDetailField('carryover_approval', String(value || 'GENERAL'))
                            }
                            options={withCurrentOption(carryoverApprovalOptions, newDetailSettings.carryover_approval)}
                            placeholder={t('field-carryover-approval-label')}
                            searchPlaceholder={t('field-carryover-approval-label')}
                            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                            data-testid="absence-entitlement-new-detail-carryover-approval-input"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor="absence-entitlement-new-detail-max-carryover-percent-input">
                            {t('field-max-carryover-percent-label')}
                          </Label>
                          <Input
                            id="absence-entitlement-new-detail-max-carryover-percent-input"
                            type="number"
                            placeholder="0-100"
                            value={newDetailSettings.max_carryover_percent}
                            onChange={event => updateNewDetailField('max_carryover_percent', event.target.value)}
                            data-testid="absence-entitlement-new-detail-max-carryover-percent-input"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor="absence-entitlement-new-detail-max-carryover-amount-input">
                            {t('field-max-carryover-amount-label')}
                          </Label>
                          <Input
                            id="absence-entitlement-new-detail-max-carryover-amount-input"
                            type="number"
                            value={newDetailSettings.max_carryover_amount}
                            onChange={event => updateNewDetailField('max_carryover_amount', event.target.value)}
                            data-testid="absence-entitlement-new-detail-max-carryover-amount-input"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor="absence-entitlement-new-detail-validation-amount-input">
                            {t('field-valid-for-label')}
                          </Label>
                          <Input
                            id="absence-entitlement-new-detail-validation-amount-input"
                            type="number"
                            value={newDetailSettings.validation_amount}
                            onChange={event => updateNewDetailField('validation_amount', event.target.value)}
                            data-testid="absence-entitlement-new-detail-validation-amount-input"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label>{t('field-validation-amount-unit-label')}</Label>
                          <Combobox
                            value={newDetailSettings.validation_amount_unit}
                            onValueChange={value =>
                              updateNewDetailField('validation_amount_unit', String(value || 'MONTH'))
                            }
                            options={withCurrentOption(
                              validationAmountUnitOptions,
                              newDetailSettings.validation_amount_unit
                            )}
                            placeholder={t('field-validation-amount-unit-label')}
                            searchPlaceholder={t('field-validation-amount-unit-label')}
                            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                            data-testid="absence-entitlement-new-detail-validation-amount-unit-input"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label>{t('field-prolong-approval-label')}</Label>
                          <Combobox
                            value={newDetailSettings.prolong_approval}
                            onValueChange={value => updateNewDetailField('prolong_approval', String(value || 'NONE'))}
                            options={withCurrentOption(prolongApprovalOptions, newDetailSettings.prolong_approval)}
                            placeholder={t('field-prolong-approval-label')}
                            searchPlaceholder={t('field-prolong-approval-label')}
                            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                            data-testid="absence-entitlement-new-detail-prolong-approval-input"
                          />
                        </div>
                      </div>

                      <div className="gba:rounded-xl gba:bg-blue-100 gba:px-4 gba:py-3 gba:text-sm gba:text-blue-900">
                        <span className="gba:font-semibold">{t('carryover-summary-label')}</span>{' '}
                        {getCarryoverSummary(newDetailSettings)}
                      </div>
                    </div>
                  )}

                  <div className="gba:flex gba:justify-end gba:gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={resetNewDetailSettings}>
                      {t('cancel-button')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDetail}
                      disabled={!newDetailSettings.absence_type_ref}
                      data-testid="absence-entitlement-add-detail-button"
                    >
                      {t('entitlement-detail-add-button')}
                    </Button>
                  </div>
                </div>
              ) : null}
              {detailEntries.length === 0 && !newDetailSettings.absence_type_ref ? (
                <div className="gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-background gba:p-6 gba:text-sm gba:text-muted-foreground">
                  {t('empty-entitlement-rows')}
                </div>
              ) : null}
              <div className="gba:space-y-4">
                {detailEntries.map((detailEntry, index) => {
                  const detailSettings = detailEntry.settings
                  const currentAbsenceTypeOptions = withCurrentOption(
                    absenceTypeOptions.filter(
                      option =>
                        option.value === detailSettings.absence_type_ref ||
                        !detailEntries.some(
                          otherDetailEntry =>
                            otherDetailEntry.id !== detailEntry.id &&
                            otherDetailEntry.settings.absence_type_ref === option.value
                        )
                    ),
                    detailSettings.absence_type_ref
                  )
                  const currentProrataOptions = withCurrentOption(prorataMethodOptions, detailSettings.prorata_method)
                  const currentRoundingOptions = withCurrentOption(
                    roundingMethodOptions,
                    detailSettings.rounding_method
                  )
                  const currentCarryoverApprovalOptions = withCurrentOption(
                    carryoverApprovalOptions,
                    detailSettings.carryover_approval
                  )
                  const currentValidationUnitOptions = withCurrentOption(
                    validationAmountUnitOptions,
                    detailSettings.validation_amount_unit
                  )
                  const currentProlongOptions = withCurrentOption(
                    prolongApprovalOptions,
                    detailSettings.prolong_approval
                  )
                  const isExpanded = expandedDetailIds.includes(detailEntry.id)
                  const detailTitle =
                    getOptionLabel(currentAbsenceTypeOptions, detailSettings.absence_type_ref) ||
                    t('field-absence-type-ref-label')

                  return (
                    <div
                      key={detailEntry.id}
                      className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:p-4"
                      data-testid={`absence-entitlement-detail-entry-${index}`}
                    >
                      <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:text-base gba:font-semibold">
                            {t('entitlement-detail-entry-title', { index: String(index + 1) })}
                          </div>
                          <div className="gba:truncate gba:text-sm gba:text-muted-foreground">{detailTitle}</div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          {detailEntries.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveDetail(detailEntry.id)}
                              data-testid={`absence-entitlement-remove-detail-${index}`}
                            >
                              {t('remove-button')}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDetailExpanded(detailEntry.id)}
                            data-testid={`absence-entitlement-toggle-detail-${index}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="gba:mr-1 gba:h-4 gba:w-4" />
                            ) : (
                              <ChevronRight className="gba:mr-1 gba:h-4 gba:w-4" />
                            )}
                            {isExpanded ? t('collapse-button') : t('expand-button')}
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="gba:space-y-3">
                          <label className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:bg-muted/20 gba:p-3">
                            <Checkbox
                              checked={detailSettings.carryover}
                              onCheckedChange={checked => onDetailChange(detailEntry.id, 'carryover', Boolean(checked))}
                              data-testid={`absence-entitlement-carryover-checkbox-${index}`}
                            />
                            <span>{t('field-carryover-label')}</span>
                          </label>

                          <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
                            <div className="gba:space-y-2">
                              <Label>{t('field-prorata-method-label')}</Label>
                              <Combobox
                                value={detailSettings.prorata_method}
                                onValueChange={value =>
                                  onDetailChange(detailEntry.id, 'prorata_method', String(value || 'ALWAYS'))
                                }
                                options={currentProrataOptions}
                                placeholder={t('field-prorata-method-label')}
                                searchPlaceholder={t('field-prorata-method-label')}
                                emptyText={t('empty-catalog-entries', {
                                  entity: t('absence-entitlement-entity-label')
                                })}
                                data-testid={`absence-entitlement-prorata-method-input-${index}`}
                              />
                            </div>
                            <div className="gba:space-y-2">
                              <Label>{t('field-rounding-method-label')}</Label>
                              <Combobox
                                value={detailSettings.rounding_method}
                                onValueChange={value =>
                                  onDetailChange(
                                    detailEntry.id,
                                    'rounding_method',
                                    String(value || 'ARITHMETICALLY ON ONE DECIMAL PLACE')
                                  )
                                }
                                options={currentRoundingOptions}
                                placeholder={t('field-rounding-method-label')}
                                searchPlaceholder={t('field-rounding-method-label')}
                                emptyText={t('empty-catalog-entries', {
                                  entity: t('absence-entitlement-entity-label')
                                })}
                                data-testid={`absence-entitlement-rounding-method-input-${index}`}
                              />
                            </div>
                            <div className="gba:space-y-2">
                              <Label>{t('field-absence-type-ref-label')}</Label>
                              <Combobox
                                value={detailSettings.absence_type_ref}
                                onValueChange={value =>
                                  onDetailChange(detailEntry.id, 'absence_type_ref', String(value || ''))
                                }
                                options={currentAbsenceTypeOptions}
                                placeholder={t('field-absence-type-ref-label')}
                                searchPlaceholder={t('field-absence-type-ref-label')}
                                emptyText={t('empty-absence-types')}
                                data-testid={`absence-entitlement-absence-type-ref-select-${index}`}
                              />
                            </div>
                            <div className="gba:space-y-2">
                              <Label htmlFor={`absence-entitlement-amount-input-${index}`}>
                                {t('field-entitlement-amount-label')}
                              </Label>
                              <Input
                                id={`absence-entitlement-amount-input-${index}`}
                                type="number"
                                value={detailSettings.entitlement_amount}
                                onChange={event =>
                                  onDetailChange(detailEntry.id, 'entitlement_amount', event.target.value)
                                }
                                data-testid={`absence-entitlement-amount-input-${index}`}
                              />
                            </div>
                          </div>

                          {detailSettings.carryover && (
                            <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-blue-200 gba:bg-blue-50/70 gba:p-4">
                              <h5 className="gba:text-lg gba:font-semibold gba:text-blue-900">
                                {t('carryover-configuration-title')}
                              </h5>

                              <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-6">
                                <div className="gba:space-y-2">
                                  <Label>{t('field-carryover-approval-label')}</Label>
                                  <Combobox
                                    value={detailSettings.carryover_approval}
                                    onValueChange={value =>
                                      onDetailChange(detailEntry.id, 'carryover_approval', String(value || 'GENERAL'))
                                    }
                                    options={currentCarryoverApprovalOptions}
                                    placeholder={t('field-carryover-approval-label')}
                                    searchPlaceholder={t('field-carryover-approval-label')}
                                    emptyText={t('empty-catalog-entries', {
                                      entity: t('absence-entitlement-entity-label')
                                    })}
                                    data-testid={`absence-entitlement-carryover-approval-input-${index}`}
                                  />
                                </div>
                                <div className="gba:space-y-2">
                                  <Label htmlFor={`absence-entitlement-max-carryover-percent-input-${index}`}>
                                    {t('field-max-carryover-percent-label')}
                                  </Label>
                                  <Input
                                    id={`absence-entitlement-max-carryover-percent-input-${index}`}
                                    type="number"
                                    placeholder="0-100"
                                    value={detailSettings.max_carryover_percent}
                                    onChange={event =>
                                      onDetailChange(detailEntry.id, 'max_carryover_percent', event.target.value)
                                    }
                                    data-testid={`absence-entitlement-max-carryover-percent-input-${index}`}
                                  />
                                </div>
                                <div className="gba:space-y-2">
                                  <Label htmlFor={`absence-entitlement-max-carryover-amount-input-${index}`}>
                                    {t('field-max-carryover-amount-label')}
                                  </Label>
                                  <Input
                                    id={`absence-entitlement-max-carryover-amount-input-${index}`}
                                    type="number"
                                    value={detailSettings.max_carryover_amount}
                                    onChange={event =>
                                      onDetailChange(detailEntry.id, 'max_carryover_amount', event.target.value)
                                    }
                                    data-testid={`absence-entitlement-max-carryover-amount-input-${index}`}
                                  />
                                </div>
                                <div className="gba:space-y-2">
                                  <Label htmlFor={`absence-entitlement-validation-amount-input-${index}`}>
                                    {t('field-valid-for-label')}
                                  </Label>
                                  <Input
                                    id={`absence-entitlement-validation-amount-input-${index}`}
                                    type="number"
                                    value={detailSettings.validation_amount}
                                    onChange={event =>
                                      onDetailChange(detailEntry.id, 'validation_amount', event.target.value)
                                    }
                                    data-testid={`absence-entitlement-validation-amount-input-${index}`}
                                  />
                                </div>
                                <div className="gba:space-y-2">
                                  <Label>{t('field-validation-amount-unit-label')}</Label>
                                  <Combobox
                                    value={detailSettings.validation_amount_unit}
                                    onValueChange={value =>
                                      onDetailChange(detailEntry.id, 'validation_amount_unit', String(value || 'MONTH'))
                                    }
                                    options={currentValidationUnitOptions}
                                    placeholder={t('field-validation-amount-unit-label')}
                                    searchPlaceholder={t('field-validation-amount-unit-label')}
                                    emptyText={t('empty-catalog-entries', {
                                      entity: t('absence-entitlement-entity-label')
                                    })}
                                    data-testid={`absence-entitlement-validation-amount-unit-input-${index}`}
                                  />
                                </div>
                                <div className="gba:space-y-2">
                                  <Label>{t('field-prolong-approval-label')}</Label>
                                  <Combobox
                                    value={detailSettings.prolong_approval}
                                    onValueChange={value =>
                                      onDetailChange(detailEntry.id, 'prolong_approval', String(value || 'NONE'))
                                    }
                                    options={currentProlongOptions}
                                    placeholder={t('field-prolong-approval-label')}
                                    searchPlaceholder={t('field-prolong-approval-label')}
                                    emptyText={t('empty-catalog-entries', {
                                      entity: t('absence-entitlement-entity-label')
                                    })}
                                    data-testid={`absence-entitlement-prolong-approval-input-${index}`}
                                  />
                                </div>
                              </div>

                              <div className="gba:rounded-xl gba:bg-blue-100 gba:px-4 gba:py-3 gba:text-sm gba:text-blue-900">
                                <span className="gba:font-semibold">{t('carryover-summary-label')}</span>{' '}
                                {getCarryoverSummary(detailSettings)}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </>
  )
}
