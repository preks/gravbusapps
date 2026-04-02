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
import { type AbsenceTypeObjectSettings } from '../utils/absenceTypeObjectValue'

interface AbsenceTypeSettingsSectionProps {
  settings: AbsenceTypeObjectSettings
  onFieldChange: <K extends keyof AbsenceTypeObjectSettings>(field: K, value: AbsenceTypeObjectSettings[K]) => void
}

type BooleanFieldKey =
  | 'display'
  | 'enableApproval'
  | 'enableHalfDays'
  | 'checkEntitlement'
  | 'enableSubstitute'
  | 'enableAttachement'
  | 'requiresSubstitute'
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
  requiresSubstitute: 'toggle-requires-substitute',
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
  'requiresSubstitute',
  'requiresAttachment',
  'countsAsWorkingTime'
]

export function AbsenceTypeSettingsSection({ settings, onFieldChange }: Readonly<AbsenceTypeSettingsSectionProps>) {
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
              list="absence-type-icon-suggestions"
              value={settings.icon}
              onChange={event => onFieldChange('icon', event.target.value)}
              placeholder={t('icon-placeholder')}
              data-testid="absence-type-icon-input"
              title={t('icon-field-tooltip')}
            />
            <datalist id="absence-type-icon-suggestions">
              <option value="vacation" />
              <option value="sick" />
              <option value="home-office" />
              <option value="business-trip" />
              <option value="training" />
              <option value="family-care" />
              <option value="jury-duty" />
            </datalist>
            <p className="gba:text-xs gba:text-muted-foreground">{t('icon-field-helper')}</p>
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
  )
}
