import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  DateInput,
  Icon,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { type AbsenceTypeObjectSettings } from '../utils/absenceTypeObjectValue'
import {
  ABSENCE_TYPE_SETUP_ICON_KEYS,
  absenceTypeSetupIconMap,
  type AbsenceTypeSetupIconKey
} from '../utils/absenceTypeSetupIcons'
import { AbsenceTypeEligibilitySection } from './AbsenceTypeEligibilitySection'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'

interface AbsenceTypeSettingsSectionProps {
  settings: AbsenceTypeObjectSettings
  onFieldChange: <K extends keyof AbsenceTypeObjectSettings>(field: K, value: AbsenceTypeObjectSettings[K]) => void
  employmentTypes: EligibilityOption[]
  contractTypes: EligibilityOption[]
  countries: EligibilityOption[]
  regionsByCountry: Record<string, EligibilityOption[]>
  regionsLoading: Record<string, boolean>
  onCountryExpanded: (countryId: string) => void
}

type BooleanFieldKey =
  | 'display'
  | 'enableApproval'
  | 'enableHalfDays'
  | 'checkEntitlement'
  | 'enableSubstitute'
  | 'enableAttachement'
  | 'requiresAttachment'
  | 'countsAsWorkingTime'

const measurementLabelKeys = {
  WorkingDays: 'measurement-working-days',
  CalendarDays: 'measurement-calendar-days',
  Hours: 'measurement-hours'
} as const

const booleanFieldLabelKeys: Record<BooleanFieldKey, string> = {
  display: 'toggle-display-balance',
  enableApproval: 'toggle-requires-approval',
  enableHalfDays: 'toggle-allow-half-days',
  checkEntitlement: 'toggle-requires-entitlement',
  enableSubstitute: 'toggle-show-substitute-selection',
  enableAttachement: 'toggle-show-document-upload',
  requiresAttachment: 'toggle-requires-attachment',
  countsAsWorkingTime: 'toggle-counts-as-working-time'
}

const booleanFieldKeys: BooleanFieldKey[] = [
  'display',
  'enableApproval',
  'enableHalfDays',
  'checkEntitlement',
  'enableSubstitute',
  'enableAttachement',
  'requiresAttachment',
  'countsAsWorkingTime'
]

export function AbsenceTypeSettingsSection({
  settings,
  onFieldChange,
  employmentTypes,
  contractTypes,
  countries,
  regionsByCountry,
  regionsLoading,
  onCountryExpanded
}: Readonly<AbsenceTypeSettingsSectionProps>) {
  const { t } = useTranslation(translations)

  const measurementOptions = Object.entries(measurementLabelKeys).map(([value, labelKey]) => ({
    value,
    label: t(labelKey)
  }))

  const defaultIconOptions = useMemo(
    () =>
      ABSENCE_TYPE_SETUP_ICON_KEYS.map(key => {
        const IconGlyph = absenceTypeSetupIconMap[key]
        return {
          value: key,
          label: (
            <span className="gba:flex gba:items-center gba:gap-2">
              <Icon icon={IconGlyph} size="sm" decorative />
              <span>{key}</span>
            </span>
          )
        }
      }),
    []
  )

  const iconComboboxOptions = useMemo(() => {
    const trimmedIcon = settings.icon.trim()
    if (!trimmedIcon) {
      return defaultIconOptions
    }

    const isKnownKey = ABSENCE_TYPE_SETUP_ICON_KEYS.includes(trimmedIcon as AbsenceTypeSetupIconKey)
    if (isKnownKey) {
      return defaultIconOptions
    }

    return [
      ...defaultIconOptions,
      {
        value: trimmedIcon,
        label: <span className="gba:pl-1 gba:text-sm">{trimmedIcon}</span>
      }
    ]
  }, [defaultIconOptions, settings.icon])

  return (
    <>
      <Card data-testid="absence-type-settings-section" className="gba:border gba:border-border gba:bg-muted/10">
        <CardHeader className="gba:border-b gba:border-border gba:bg-background">
          <CardTitle>{t('type-settings-section-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3 gba:p-4">
          <p className="gba:text-xs gba:text-muted-foreground">{t('type-settings-section-description')}</p>

          <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-icon-select">{t('field-icon-label')}</Label>
              <Combobox
                id="absence-type-icon-select"
                value={settings.icon}
                onValueChange={value => onFieldChange('icon', String(value || ''))}
                options={iconComboboxOptions}
                placeholder={t('icon-placeholder')}
                searchPlaceholder={t('icon-placeholder')}
                emptyText={t('icon-placeholder')}
                data-testid="absence-type-icon-input"
                title={t('icon-field-tooltip')}
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-color-input">{t('field-color-label')}</Label>
              <div className="gba:flex gba:items-center gba:gap-3">
                <Input
                  id="absence-type-color-picker"
                  type="color"
                  value={settings.color || '#000000'}
                  onChange={event => onFieldChange('color', event.target.value.toUpperCase())}
                  data-testid="absence-type-color-picker"
                  className="gba:h-10 gba:w-16 gba:p-1"
                />
                <Input
                  id="absence-type-color-input"
                  value={settings.color}
                  onChange={event => onFieldChange('color', event.target.value)}
                  placeholder={t('color-placeholder')}
                  data-testid="absence-type-color-input"
                />
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-priority-input">{t('field-priority-label')}</Label>
              <Input
                id="absence-type-priority-input"
                type="number"
                min={0}
                value={settings.priority}
                onChange={event => onFieldChange('priority', event.target.value)}
                data-testid="absence-type-priority-input"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-measurement-select">{t('field-measurement-label')}</Label>
              <Combobox
                value={settings.measurement}
                onValueChange={value => onFieldChange('measurement', String(value || 'WorkingDays'))}
                options={measurementOptions}
                placeholder={t('field-measurement-label')}
                data-testid="absence-type-measurement-select"
              />
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-valid-to-input">{t('field-valid-to-label')}</Label>
              <DateInput
                id="absence-type-valid-to-input"
                value={settings.valid_to}
                onChange={value => onFieldChange('valid_to', value ?? '')}
                data-testid="absence-type-valid-to-input"
              />
            </div>
          </div>

          <div className="gba:grid gba:gap-2 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
            {booleanFieldKeys.map(field => (
              <label key={field} className="gba:flex gba:items-center gba:gap-2">
                <Checkbox
                  checked={settings[field]}
                  onCheckedChange={checked => onFieldChange(field, Boolean(checked))}
                  data-testid={`absence-type-${field}-checkbox`}
                />
                <span>{t(booleanFieldLabelKeys[field])}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <AbsenceTypeEligibilitySection
        settings={settings}
        employmentTypes={employmentTypes}
        contractTypes={contractTypes}
        countries={countries}
        regionsByCountry={regionsByCountry}
        regionsLoading={regionsLoading}
        onFieldChange={onFieldChange}
        onCountryExpanded={onCountryExpanded}
      />
    </>
  )
}
