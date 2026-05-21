import { Button, Checkbox, Combobox, Input, Label, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { AbsenceEntitlementDetailSettings } from '../utils/absenceEntitlementObjectValue'

interface SelectOption {
  value: string
  label: string
}

interface AbsenceEntitlementNewDetailFormProps {
  newDetailSettings: AbsenceEntitlementDetailSettings
  addDetailOptions: SelectOption[]
  prorataMethodOptions: SelectOption[]
  roundingMethodOptions: SelectOption[]
  carryoverApprovalOptions: SelectOption[]
  validationAmountUnitOptions: SelectOption[]
  prolongApprovalOptions: SelectOption[]
  withCurrentOption: (options: SelectOption[], currentValue: string, currentLabel?: string) => SelectOption[]
  getOptionLabel: (options: SelectOption[], value: string) => string
  getCarryoverSummary: (detailSettings: AbsenceEntitlementDetailSettings) => string
  onFieldChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
  onAdd: () => void
  onCancel: () => void
}

export function AbsenceEntitlementNewDetailForm({
  newDetailSettings,
  addDetailOptions,
  prorataMethodOptions,
  roundingMethodOptions,
  carryoverApprovalOptions,
  validationAmountUnitOptions,
  prolongApprovalOptions,
  withCurrentOption,
  getOptionLabel,
  getCarryoverSummary,
  onFieldChange,
  onAdd,
  onCancel
}: Readonly<AbsenceEntitlementNewDetailFormProps>) {
  const { t } = useTranslation(translations)

  if (!newDetailSettings.absence_type_ref) return null

  return (
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
          onCheckedChange={checked => onFieldChange('carryover', Boolean(checked))}
          data-testid="absence-entitlement-new-detail-carryover-checkbox"
        />
        <span>{t('field-carryover-label')}</span>
      </label>

      <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
        <div className="gba:space-y-2">
          <Label>{t('field-prorata-method-label')}</Label>
          <Combobox
            value={newDetailSettings.prorata_method}
            onValueChange={value => onFieldChange('prorata_method', String(value || 'ALWAYS'))}
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
              onFieldChange('rounding_method', String(value || 'ARITHMETICALLY ON ONE DECIMAL PLACE'))
            }
            options={withCurrentOption(roundingMethodOptions, newDetailSettings.rounding_method)}
            placeholder={t('field-rounding-method-label')}
            searchPlaceholder={t('field-rounding-method-label')}
            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
            data-testid="absence-entitlement-new-detail-rounding-method-input"
          />
        </div>
        <div className="gba:space-y-2">
          <Label htmlFor="absence-entitlement-new-detail-amount-input">{t('field-entitlement-amount-label')}</Label>
          <Input
            id="absence-entitlement-new-detail-amount-input"
            type="number"
            value={newDetailSettings.entitlement_amount}
            onChange={event => onFieldChange('entitlement_amount', event.target.value)}
            data-testid="absence-entitlement-new-detail-amount-input"
          />
        </div>
      </div>

      {newDetailSettings.carryover && (
        <NewDetailCarryoverSection
          newDetailSettings={newDetailSettings}
          carryoverApprovalOptions={carryoverApprovalOptions}
          validationAmountUnitOptions={validationAmountUnitOptions}
          prolongApprovalOptions={prolongApprovalOptions}
          withCurrentOption={withCurrentOption}
          getCarryoverSummary={getCarryoverSummary}
          onFieldChange={onFieldChange}
          t={t}
        />
      )}

      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('cancel-button')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={!newDetailSettings.absence_type_ref}
          data-testid="absence-entitlement-add-detail-button"
        >
          {t('entitlement-detail-add-button')}
        </Button>
      </div>
    </div>
  )
}

interface NewDetailCarryoverSectionProps {
  newDetailSettings: AbsenceEntitlementDetailSettings
  carryoverApprovalOptions: SelectOption[]
  validationAmountUnitOptions: SelectOption[]
  prolongApprovalOptions: SelectOption[]
  withCurrentOption: (options: SelectOption[], currentValue: string, currentLabel?: string) => SelectOption[]
  getCarryoverSummary: (detailSettings: AbsenceEntitlementDetailSettings) => string
  onFieldChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
  t: (key: string, values?: Record<string, string>) => string
}

function NewDetailCarryoverSection({
  newDetailSettings,
  carryoverApprovalOptions,
  validationAmountUnitOptions,
  prolongApprovalOptions,
  withCurrentOption,
  getCarryoverSummary,
  onFieldChange,
  t
}: Readonly<NewDetailCarryoverSectionProps>) {
  return (
    <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-info gba:bg-info-secondary gba:p-4">
      <h5 className="gba:text-lg gba:font-semibold gba:text-info-secondary-foreground">
        {t('carryover-configuration-title')}
      </h5>
      <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-6">
        <div className="gba:space-y-2">
          <Label>{t('field-carryover-approval-label')}</Label>
          <Combobox
            value={newDetailSettings.carryover_approval}
            onValueChange={value => onFieldChange('carryover_approval', String(value || 'GENERAL'))}
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
            disabled={Boolean(newDetailSettings.max_carryover_amount) && newDetailSettings.max_carryover_amount !== '0'}
            onChange={event => onFieldChange('max_carryover_percent', event.target.value)}
            onFocus={event => {
              if (event.target.value === '0') onFieldChange('max_carryover_percent', '')
            }}
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
            disabled={
              Boolean(newDetailSettings.max_carryover_percent) && newDetailSettings.max_carryover_percent !== '0'
            }
            onChange={event => onFieldChange('max_carryover_amount', event.target.value)}
            onFocus={event => {
              if (event.target.value === '0') onFieldChange('max_carryover_amount', '')
            }}
            data-testid="absence-entitlement-new-detail-max-carryover-amount-input"
          />
        </div>
        <div className="gba:space-y-2">
          <Label htmlFor="absence-entitlement-new-detail-validation-amount-input">{t('field-valid-for-label')}</Label>
          <Input
            id="absence-entitlement-new-detail-validation-amount-input"
            type="number"
            value={newDetailSettings.validation_amount}
            onChange={event => onFieldChange('validation_amount', event.target.value)}
            data-testid="absence-entitlement-new-detail-validation-amount-input"
          />
        </div>
        <div className="gba:space-y-2">
          <Label>{t('field-validation-amount-unit-label')}</Label>
          <Combobox
            value={newDetailSettings.validation_amount_unit}
            onValueChange={value => onFieldChange('validation_amount_unit', String(value || 'MONTH'))}
            options={withCurrentOption(validationAmountUnitOptions, newDetailSettings.validation_amount_unit)}
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
            onValueChange={value => onFieldChange('prolong_approval', String(value || 'NONE'))}
            options={withCurrentOption(prolongApprovalOptions, newDetailSettings.prolong_approval)}
            placeholder={t('field-prolong-approval-label')}
            searchPlaceholder={t('field-prolong-approval-label')}
            emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
            data-testid="absence-entitlement-new-detail-prolong-approval-input"
          />
        </div>
      </div>
      <div className="gba:rounded-xl gba:bg-info-secondary gba:px-4 gba:py-3 gba:text-sm gba:text-info-secondary-foreground">
        <span className="gba:font-semibold">{t('carryover-summary-label')}</span>{' '}
        {getCarryoverSummary(newDetailSettings)}
      </div>
    </div>
  )
}
