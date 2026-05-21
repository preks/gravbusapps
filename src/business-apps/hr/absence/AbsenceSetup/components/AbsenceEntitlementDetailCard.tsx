import { Button, Checkbox, Combobox, Input, Label, useTranslation } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import translations from '../_i18n'
import type {
  AbsenceEntitlementDetailEntry,
  AbsenceEntitlementDetailSettings
} from '../utils/absenceEntitlementObjectValue'
import { getAbsenceTypeVersionDescription, getAbsenceTypeVersionTitle } from '../utils/absenceTypeVersionObjectValue'

interface SelectOption {
  value: string
  label: string
}

interface AbsenceEntitlementDetailCardProps {
  detailEntry: AbsenceEntitlementDetailEntry
  index: number
  isExpanded: boolean
  absenceTypeOptions: SelectOption[]
  allDetailEntries: AbsenceEntitlementDetailEntry[]
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
  prorataMethodOptions: SelectOption[]
  roundingMethodOptions: SelectOption[]
  carryoverApprovalOptions: SelectOption[]
  validationAmountUnitOptions: SelectOption[]
  prolongApprovalOptions: SelectOption[]
  withCurrentOption: (options: SelectOption[], currentValue: string, currentLabel?: string) => SelectOption[]
  getOptionLabel: (options: SelectOption[], value: string) => string
  getCarryoverSummary: (detailSettings: AbsenceEntitlementDetailSettings) => string
  onToggle: (detailId: string) => void
  onRemove: (detailId: string) => void
  onDetailChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    detailId: string,
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
}

export function AbsenceEntitlementDetailCard({
  detailEntry,
  index,
  isExpanded,
  absenceTypeOptions,
  allDetailEntries,
  absenceTypes,
  absenceTypeVersions,
  prorataMethodOptions,
  roundingMethodOptions,
  carryoverApprovalOptions,
  validationAmountUnitOptions,
  prolongApprovalOptions,
  withCurrentOption,
  getOptionLabel,
  getCarryoverSummary,
  onToggle,
  onRemove,
  onDetailChange
}: Readonly<AbsenceEntitlementDetailCardProps>) {
  const { t } = useTranslation(translations)
  const detailSettings = detailEntry.settings

  const currentVersionEntry = absenceTypeVersions.find(
    v => `AbsenceTypeVersion:v1:${v.code}` === detailSettings.absence_type_ref
  )
  const currentAbsenceTypeLabel = currentVersionEntry
    ? [
        getAbsenceTypeVersionTitle(currentVersionEntry, absenceTypes, t('untitled-absence-type-version')),
        getAbsenceTypeVersionDescription(currentVersionEntry)
      ]
        .filter(Boolean)
        .join(' | ')
    : undefined

  const currentAbsenceTypeOptions = withCurrentOption(
    absenceTypeOptions.filter(
      option =>
        option.value === detailSettings.absence_type_ref ||
        !allDetailEntries.some(other => other.id !== detailEntry.id && other.settings.absence_type_ref === option.value)
    ),
    detailSettings.absence_type_ref,
    currentAbsenceTypeLabel
  )

  const currentProrataOptions = withCurrentOption(prorataMethodOptions, detailSettings.prorata_method)
  const currentRoundingOptions = withCurrentOption(roundingMethodOptions, detailSettings.rounding_method)
  const currentCarryoverApprovalOptions = withCurrentOption(carryoverApprovalOptions, detailSettings.carryover_approval)
  const currentValidationUnitOptions = withCurrentOption(
    validationAmountUnitOptions,
    detailSettings.validation_amount_unit
  )
  const currentProlongOptions = withCurrentOption(prolongApprovalOptions, detailSettings.prolong_approval)

  const detailTitle =
    getOptionLabel(currentAbsenceTypeOptions, detailSettings.absence_type_ref) || t('field-absence-type-ref-label')

  return (
    <div
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
          {allDetailEntries.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(detailEntry.id)}
              data-testid={`absence-entitlement-remove-detail-${index}`}
            >
              {t('remove-button')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggle(detailEntry.id)}
            data-testid={`absence-entitlement-toggle-detail-${index}`}
          >
            {isExpanded ? (
              <CaretDownIcon className="gba:mr-1 gba:h-4 gba:w-4" />
            ) : (
              <CaretRightIcon className="gba:mr-1 gba:h-4 gba:w-4" />
            )}
            {isExpanded ? t('collapse-button') : t('expand-button')}
          </Button>
        </div>
      </div>

      {isExpanded && (
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
                onValueChange={value => onDetailChange(detailEntry.id, 'prorata_method', String(value || 'ALWAYS'))}
                options={currentProrataOptions}
                placeholder={t('field-prorata-method-label')}
                searchPlaceholder={t('field-prorata-method-label')}
                emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
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
                emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                data-testid={`absence-entitlement-rounding-method-input-${index}`}
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-absence-type-ref-label')}</Label>
              <Combobox
                value={detailSettings.absence_type_ref}
                onValueChange={value => onDetailChange(detailEntry.id, 'absence_type_ref', String(value || ''))}
                options={currentAbsenceTypeOptions}
                placeholder={t('field-absence-type-ref-label')}
                searchPlaceholder={t('field-absence-type-ref-label')}
                emptyText={t('empty-absence-types')}
                data-testid={`absence-entitlement-absence-type-ref-select-${index}`}
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor={`absence-entitlement-amount-input-${index}`}>{t('field-entitlement-amount-label')}</Label>
              <Input
                id={`absence-entitlement-amount-input-${index}`}
                type="number"
                value={detailSettings.entitlement_amount}
                onChange={event => onDetailChange(detailEntry.id, 'entitlement_amount', event.target.value)}
                data-testid={`absence-entitlement-amount-input-${index}`}
              />
            </div>
          </div>

          {detailSettings.carryover && (
            <AbsenceEntitlementCarryoverSection
              detailEntry={detailEntry}
              index={index}
              currentCarryoverApprovalOptions={currentCarryoverApprovalOptions}
              currentValidationUnitOptions={currentValidationUnitOptions}
              currentProlongOptions={currentProlongOptions}
              getCarryoverSummary={getCarryoverSummary}
              onDetailChange={onDetailChange}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface AbsenceEntitlementCarryoverSectionProps {
  detailEntry: AbsenceEntitlementDetailEntry
  index: number
  currentCarryoverApprovalOptions: SelectOption[]
  currentValidationUnitOptions: SelectOption[]
  currentProlongOptions: SelectOption[]
  getCarryoverSummary: (detailSettings: AbsenceEntitlementDetailSettings) => string
  onDetailChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    detailId: string,
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
  t: (key: string, values?: Record<string, string>) => string
}

function AbsenceEntitlementCarryoverSection({
  detailEntry,
  index,
  currentCarryoverApprovalOptions,
  currentValidationUnitOptions,
  currentProlongOptions,
  getCarryoverSummary,
  onDetailChange,
  t
}: Readonly<AbsenceEntitlementCarryoverSectionProps>) {
  const detailSettings = detailEntry.settings
  return (
    <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-info gba:bg-info-secondary gba:p-4">
      <h5 className="gba:text-lg gba:font-semibold gba:text-info-secondary-foreground">
        {t('carryover-configuration-title')}
      </h5>
      <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-6">
        <div className="gba:space-y-2">
          <Label>{t('field-carryover-approval-label')}</Label>
          <Combobox
            value={detailSettings.carryover_approval}
            onValueChange={value => onDetailChange(detailEntry.id, 'carryover_approval', String(value || 'GENERAL'))}
            options={currentCarryoverApprovalOptions}
            placeholder={t('field-carryover-approval-label')}
            searchPlaceholder={t('field-carryover-approval-label')}
            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
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
            disabled={Boolean(detailSettings.max_carryover_amount) && detailSettings.max_carryover_amount !== '0'}
            onChange={event => onDetailChange(detailEntry.id, 'max_carryover_percent', event.target.value)}
            onFocus={event => {
              if (event.target.value === '0') onDetailChange(detailEntry.id, 'max_carryover_percent', '')
            }}
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
            disabled={Boolean(detailSettings.max_carryover_percent) && detailSettings.max_carryover_percent !== '0'}
            onChange={event => onDetailChange(detailEntry.id, 'max_carryover_amount', event.target.value)}
            onFocus={event => {
              if (event.target.value === '0') onDetailChange(detailEntry.id, 'max_carryover_amount', '')
            }}
            data-testid={`absence-entitlement-max-carryover-amount-input-${index}`}
          />
        </div>
        <div className="gba:space-y-2">
          <Label htmlFor={`absence-entitlement-validation-amount-input-${index}`}>{t('field-valid-for-label')}</Label>
          <Input
            id={`absence-entitlement-validation-amount-input-${index}`}
            type="number"
            value={detailSettings.validation_amount}
            onChange={event => onDetailChange(detailEntry.id, 'validation_amount', event.target.value)}
            data-testid={`absence-entitlement-validation-amount-input-${index}`}
          />
        </div>
        <div className="gba:space-y-2">
          <Label>{t('field-validation-amount-unit-label')}</Label>
          <Combobox
            value={detailSettings.validation_amount_unit}
            onValueChange={value => onDetailChange(detailEntry.id, 'validation_amount_unit', String(value || 'MONTH'))}
            options={currentValidationUnitOptions}
            placeholder={t('field-validation-amount-unit-label')}
            searchPlaceholder={t('field-validation-amount-unit-label')}
            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
            data-testid={`absence-entitlement-validation-amount-unit-input-${index}`}
          />
        </div>
        <div className="gba:space-y-2">
          <Label>{t('field-prolong-approval-label')}</Label>
          <Combobox
            value={detailSettings.prolong_approval}
            onValueChange={value => onDetailChange(detailEntry.id, 'prolong_approval', String(value || 'NONE'))}
            options={currentProlongOptions}
            placeholder={t('field-prolong-approval-label')}
            searchPlaceholder={t('field-prolong-approval-label')}
            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
            data-testid={`absence-entitlement-prolong-approval-input-${index}`}
          />
        </div>
      </div>
      <div className="gba:rounded-xl gba:bg-info-secondary gba:px-4 gba:py-3 gba:text-sm gba:text-info-secondary-foreground">
        <span className="gba:font-semibold">{t('carryover-summary-label')}</span> {getCarryoverSummary(detailSettings)}
      </div>
    </div>
  )
}
