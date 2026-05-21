import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateInput,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import type { AbsenceTypeVersionValidationErrors } from '../utils/absenceTypeVersionValidation'
import translations from '../_i18n'

interface AbsenceTypeVersionBasicSectionProps {
  absenceTypes: AbsenceType[]
  formValues: AbsenceTypeVersionFormValues
  validationErrors: AbsenceTypeVersionValidationErrors
  onChange: (values: AbsenceTypeVersionFormValues) => void
}

const getAbsenceTypeDisplayName = (absenceType: AbsenceType): string => {
  const translatedName = absenceType.translations
    ?.find(translation => translation.localeCode === 'en-US')
    ?.value?.trim()

  return translatedName || absenceType.value || absenceType.code
}

const buildAbsenceTypeOptionValue = (absenceType: AbsenceType): string =>
  `${absenceType.code}:::${getAbsenceTypeDisplayName(absenceType)}`

const getAbsenceTypeCodeFromOptionValue = (value: string): string => value.split(':::')[0] || ''

const normalizeDateInputValue = (value: string): string => {
  if (!value) {
    return ''
  }

  if (value.includes('T')) {
    const isoDatePart = value.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) {
      return isoDatePart
    }
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

const getDateInputChangeValue = (value: string | [string | null, string | null] | null): string =>
  typeof value === 'string' ? normalizeDateInputValue(value) : ''

const getFieldErrorClassName = (hasError: boolean) =>
  hasError ? 'gba:border-destructive focus:gba:border-destructive' : ''

export function AbsenceTypeVersionBasicSection({
  absenceTypes,
  formValues,
  validationErrors,
  onChange
}: Readonly<AbsenceTypeVersionBasicSectionProps>) {
  const { t } = useTranslation(translations)
  const selectedType = absenceTypes.find(item => item.code === formValues.code)
  const selectedTypeOptionValue = selectedType ? buildAbsenceTypeOptionValue(selectedType) : ''

  const absenceTypeOptions = absenceTypes.map(item => ({
    value: buildAbsenceTypeOptionValue(item),
    label: `${item.code} - ${getAbsenceTypeDisplayName(item)}`
  }))

  const updateTranslations = (locale: 'enUS' | 'deDE' | 'roRO', value: string) => {
    onChange({
      ...formValues,
      translations: {
        ...formValues.translations,
        [locale]: value
      }
    })
  }

  return (
    <Card data-testid="absence-type-version-basic-section" className="gba:border gba:border-border gba:bg-muted/10">
      <CardHeader className="gba:border-b gba:border-border gba:bg-background">
        <CardTitle>{t('version-basic-section-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4 gba:p-4">
        <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-type">
              {t('field-absence-type-label')}
              <span className="gba:text-destructive"> *</span>
            </Label>
            <Combobox
              value={selectedTypeOptionValue}
              onValueChange={value =>
                onChange({ ...formValues, code: getAbsenceTypeCodeFromOptionValue(String(value || '')) })
              }
              options={absenceTypeOptions}
              placeholder={t('field-absence-type-placeholder')}
              searchPlaceholder={t('field-absence-type-search-placeholder')}
              emptyText={t('empty-absence-types')}
              disabled={false}
              data-testid="absence-type-version-type-select"
            />
            {selectedType?.parentEntryId ? (
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('field-group-label')}: {selectedType.parentEntryId.split(':').pop() || t('no-group')}
              </p>
            ) : null}
            {validationErrors.absenceType ? (
              <p className="gba:text-sm gba:text-destructive">{t(validationErrors.absenceType)}</p>
            ) : null}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-value">
              {t('field-version-label')}
              <span className="gba:text-destructive"> *</span>
            </Label>
            <Input
              id="absence-type-version-value"
              value={formValues.version}
              onChange={event => onChange({ ...formValues, version: event.target.value })}
              data-testid="absence-type-version-value-input"
              className={getFieldErrorClassName(Boolean(validationErrors.version))}
            />
            {validationErrors.version ? (
              <p className="gba:text-sm gba:text-destructive">{t(validationErrors.version)}</p>
            ) : null}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-valid-from">{t('field-valid-from-label')}</Label>
            <DateInput
              id="absence-type-version-valid-from"
              type="date"
              value={normalizeDateInputValue(formValues.validFrom)}
              onChange={value => onChange({ ...formValues, validFrom: getDateInputChangeValue(value) })}
              data-testid="absence-type-version-valid-from-input"
              className={getFieldErrorClassName(Boolean(validationErrors.validFrom))}
            />
            {validationErrors.validFrom ? (
              <p className="gba:text-sm gba:text-destructive">{t(validationErrors.validFrom)}</p>
            ) : null}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-valid-to">{t('field-valid-to-label')}</Label>
            <DateInput
              id="absence-type-version-valid-to"
              type="date"
              value={normalizeDateInputValue(formValues.validTo)}
              onChange={value => onChange({ ...formValues, validTo: getDateInputChangeValue(value) })}
              data-testid="absence-type-version-valid-to-input"
              className={getFieldErrorClassName(Boolean(validationErrors.validTo))}
            />
            {validationErrors.validTo ? (
              <p className="gba:text-sm gba:text-destructive">{t(validationErrors.validTo)}</p>
            ) : null}
          </div>
        </div>

        <div className="gba:grid gba:gap-4 gba:md:grid-cols-3">
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-name-en">
              {t('field-version-name-en-label')}
              <span className="gba:text-destructive"> *</span>
            </Label>
            <Input
              id="absence-type-version-name-en"
              value={formValues.translations.enUS}
              onChange={event => updateTranslations('enUS', event.target.value)}
              data-testid="absence-type-version-name-en-input"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-name-de">{t('field-version-name-de-label')}</Label>
            <Input
              id="absence-type-version-name-de"
              value={formValues.translations.deDE}
              onChange={event => updateTranslations('deDE', event.target.value)}
              data-testid="absence-type-version-name-de-input"
            />
          </div>
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-name-ro">{t('field-version-name-ro-label')}</Label>
            <Input
              id="absence-type-version-name-ro"
              value={formValues.translations.roRO}
              onChange={event => updateTranslations('roRO', event.target.value)}
              data-testid="absence-type-version-name-ro-input"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
