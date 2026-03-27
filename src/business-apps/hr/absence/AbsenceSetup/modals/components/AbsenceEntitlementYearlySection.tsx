import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { AbsenceEntitlementFormValues } from '../../utils/absenceSetup'

interface SelectOption {
  value: string
  label: string
}

interface AbsenceEntitlementYearlySectionProps {
  formValues: AbsenceEntitlementFormValues
  fullTimeUnitOptions: SelectOption[]
  periodOptions: SelectOption[]
  yearTypeOptions: SelectOption[]
  advanceUnitOptions: SelectOption[]
  onFieldChange: <K extends keyof AbsenceEntitlementFormValues>(
    field: K,
    value: AbsenceEntitlementFormValues[K]
  ) => void
}

export const AbsenceEntitlementYearlySection: React.FC<AbsenceEntitlementYearlySectionProps> = ({
  formValues,
  fullTimeUnitOptions,
  periodOptions,
  yearTypeOptions,
  advanceUnitOptions,
  onFieldChange
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid="absence-entitlement-yearly-section">
      <CardHeader>
        <CardTitle>{t('entitlement-yearly-section-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:grid gba:gap-4 gba:md:grid-cols-3">
        <div className="gba:space-y-2">
          <Label htmlFor="absence-entitlement-full-time-amount">{t('field-full-time-amount-label')}</Label>
          <Input
            id="absence-entitlement-full-time-amount"
            type="number"
            value={formValues.fullTimeAmount}
            onChange={event => onFieldChange('fullTimeAmount', event.target.value)}
            data-testid="absence-entitlement-full-time-amount-input"
          />
          <Label>{t('field-full-time-unit-label')}</Label>
          <Combobox
            value={formValues.fullTimeUnit}
            onValueChange={value => onFieldChange('fullTimeUnit', String(value || ''))}
            options={fullTimeUnitOptions}
            placeholder={t('field-full-time-unit-label')}
            data-testid="absence-entitlement-full-time-unit-select"
          />
          <Label>{t('field-full-time-period-label')}</Label>
          <Combobox
            value={formValues.fullTimePeriod}
            onValueChange={value => onFieldChange('fullTimePeriod', String(value || ''))}
            options={periodOptions}
            placeholder={t('field-full-time-period-label')}
            data-testid="absence-entitlement-full-time-period-select"
          />
        </div>

        <div className="gba:space-y-2">
          <Label>{t('field-year-type-label')}</Label>
          <Combobox
            value={formValues.yearType}
            onValueChange={value => onFieldChange('yearType', String(value || ''))}
            options={yearTypeOptions}
            placeholder={t('field-year-type-label')}
            data-testid="absence-entitlement-year-type-select"
          />
          <Label htmlFor="absence-entitlement-fiscal-year-start">{t('field-fiscal-year-start-label')}</Label>
          <Input
            id="absence-entitlement-fiscal-year-start"
            placeholder="01.04"
            value={formValues.fiscalYearStart}
            onChange={event => onFieldChange('fiscalYearStart', event.target.value)}
            disabled={formValues.yearType !== 'fiscal-year'}
            data-testid="absence-entitlement-fiscal-year-start-input"
          />
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor="absence-entitlement-advance-amount">{t('field-advance-amount-label')}</Label>
          <Input
            id="absence-entitlement-advance-amount"
            type="number"
            value={formValues.advanceAmount}
            onChange={event => onFieldChange('advanceAmount', event.target.value)}
            data-testid="absence-entitlement-advance-amount-input"
          />
          <Label>{t('field-advance-unit-label')}</Label>
          <Combobox
            value={formValues.advanceUnit}
            onValueChange={value => onFieldChange('advanceUnit', String(value || ''))}
            options={advanceUnitOptions}
            placeholder={t('field-advance-unit-label')}
            data-testid="absence-entitlement-advance-unit-select"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AbsenceEntitlementYearlySection
