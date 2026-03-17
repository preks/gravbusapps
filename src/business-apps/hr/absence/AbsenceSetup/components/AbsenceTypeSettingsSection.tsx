import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import {
  ABSENCE_TYPE_ACCESS_BY_OPTIONS,
  type AbsenceTypeAccessByOption,
  type AbsenceTypeObjectSettings
} from '../utils/absenceTypeObjectValue'

interface AbsenceTypeSettingsSectionProps {
  settings: AbsenceTypeObjectSettings
  onFieldChange: <K extends keyof AbsenceTypeObjectSettings>(field: K, value: AbsenceTypeObjectSettings[K]) => void
}

const measurementLabelKeys = {
  WorkingDays: 'measurement-working-days',
  CalendarDays: 'measurement-calendar-days',
  Hours: 'measurement-hours'
} as const

const accessByLabelKeys = {
  Employee: 'access-by-employee',
  Manager: 'access-by-manager',
  Assistant: 'access-by-assistant',
  HR: 'access-by-hr'
} as const

const booleanFieldLabelKeys = {
  display: 'toggle-display',
  enableReason: 'toggle-enable-reason',
  enableApproval: 'toggle-enable-approval',
  enableHalfDays: 'toggle-half-days',
  enableRelative: 'toggle-relative',
  checkEntitlement: 'toggle-check-entitlement',
  enableSubstitute: 'toggle-substitute',
  enableAttachement: 'toggle-attachment'
} as const

const toggleAccessBy =
  (
    accessBy: AbsenceTypeObjectSettings['accessBy'],
    onFieldChange: AbsenceTypeSettingsSectionProps['onFieldChange'],
    option: AbsenceTypeAccessByOption
  ) =>
  (checked: boolean) => {
    const nextValue = checked ? [...accessBy, option] : accessBy.filter(item => item !== option)
    onFieldChange('accessBy', nextValue)
  }

export function AbsenceTypeSettingsSection({ settings, onFieldChange }: AbsenceTypeSettingsSectionProps) {
  const { t } = useTranslation(translations)

  const measurementOptions = Object.entries(measurementLabelKeys).map(([value, labelKey]) => ({
    value,
    label: t(labelKey)
  }))

  return (
    <Card data-testid="absence-type-settings-section" className="gba:border gba:border-border gba:bg-muted/10">
      <CardHeader className="gba:border-b gba:border-border gba:bg-background">
        <CardTitle>{t('type-settings-section-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3 gba:p-4">
        <p className="gba:text-xs gba:text-muted-foreground">{t('type-settings-section-description')}</p>

        <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-icon-input">{t('field-icon-label')}</Label>
            <Input
              id="absence-type-icon-input"
              value={settings.icon}
              onChange={event => onFieldChange('icon', event.target.value)}
              placeholder={t('icon-placeholder')}
              data-testid="absence-type-icon-input"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-color-input">{t('field-color-label')}</Label>
            <Input
              id="absence-type-color-input"
              value={settings.color}
              onChange={event => onFieldChange('color', event.target.value)}
              placeholder={t('color-placeholder')}
              data-testid="absence-type-color-input"
            />
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
        </div>

        <div className="gba:space-y-3 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
          <Label>{t('field-access-by-label')}</Label>
          <div className="gba:grid gba:gap-2 gba:sm:grid-cols-2 gba:lg:grid-cols-4">
            {ABSENCE_TYPE_ACCESS_BY_OPTIONS.map(option => (
              <label key={option} className="gba:flex gba:items-center gba:gap-2">
                <Checkbox
                  checked={settings.accessBy.includes(option)}
                  onCheckedChange={toggleAccessBy(settings.accessBy, onFieldChange, option)}
                  data-testid={`absence-type-access-by-${option.toLowerCase()}-checkbox`}
                />
                <span>{t(accessByLabelKeys[option])}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="gba:grid gba:gap-2 gba:sm:grid-cols-2 gba:lg:grid-cols-4 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
          {Object.entries(booleanFieldLabelKeys).map(([field, labelKey]) => (
            <label key={field} className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                checked={settings[field as keyof typeof booleanFieldLabelKeys] as boolean}
                onCheckedChange={checked =>
                  onFieldChange(field as keyof AbsenceTypeObjectSettings, Boolean(checked) as never)
                }
                data-testid={`absence-type-${field}-checkbox`}
              />
              <span>{t(labelKey)}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
