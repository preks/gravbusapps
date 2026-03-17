import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  Input,
  Label,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { AbsenceTypeVersionFormValues } from '../utils/absenceSetup'

interface AbsenceTypeVersionSettingsCardProps {
  formValues: AbsenceTypeVersionFormValues
  onFieldChange: <K extends keyof AbsenceTypeVersionFormValues>(
    field: K,
    value: AbsenceTypeVersionFormValues[K]
  ) => void
  onToggleField: (field: keyof AbsenceTypeVersionFormValues) => (value: boolean) => void
}

export function AbsenceTypeVersionSettingsCard({
  formValues,
  onFieldChange,
  onToggleField
}: AbsenceTypeVersionSettingsCardProps) {
  const { t } = useTranslation(translations)

  const measurementOptions = [
    { value: 'working-days', label: t('measurement-working-days') },
    { value: 'calendar-days', label: t('measurement-calendar-days') },
    { value: 'hours', label: t('measurement-hours') }
  ]

  const behaviourOptions = [
    { value: 'absence-and-time', label: t('behaviour-absence-and-time') },
    { value: 'absence-only', label: t('behaviour-absence-only') },
    { value: 'time-only', label: t('behaviour-time-only') }
  ]

  const colorOptions = [
    { value: 'warning', label: t('color-token-warning') },
    { value: 'info', label: t('color-token-info') },
    { value: 'success', label: t('color-token-success') },
    { value: 'offline', label: t('color-token-offline') }
  ]

  return (
    <TabsContent value="settings" className="gba:mt-3">
      <Card
        data-testid="absence-type-version-settings-section"
        className="gba:border gba:border-border gba:bg-muted/10"
      >
        <CardHeader className="gba:border-b gba:border-border gba:bg-background">
          <CardTitle>{t('version-settings-section-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:grid gba:gap-4 gba:p-4 gba:md:grid-cols-2">
          <div className="gba:space-y-3">
            <div className="gba:space-y-2">
              <Label>{t('field-color-token-label')}</Label>
              <Combobox
                value={formValues.colorToken}
                onValueChange={value => onFieldChange('colorToken', String(value || ''))}
                options={colorOptions}
                placeholder={t('field-color-token-label')}
                data-testid="absence-type-version-color-select"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>{t('field-measurement-label')}</Label>
              <Combobox
                value={formValues.measurement}
                onValueChange={value => onFieldChange('measurement', String(value || ''))}
                options={measurementOptions}
                placeholder={t('field-measurement-label')}
                data-testid="absence-type-version-measurement-select"
              />
            </div>

            <div className="gba:space-y-2">
              <Label>{t('field-behaviour-label')}</Label>
              <Combobox
                value={formValues.behaviour}
                onValueChange={value => onFieldChange('behaviour', String(value || ''))}
                options={behaviourOptions}
                placeholder={t('field-behaviour-label')}
                data-testid="absence-type-version-behaviour-select"
              />
            </div>
          </div>

          <div className="gba:space-y-3">
            <div className="gba:space-y-2">
              <Label htmlFor="absence-type-version-priority">{t('field-priority-label')}</Label>
              <Input
                id="absence-type-version-priority"
                type="number"
                min={0}
                value={formValues.priority}
                onChange={event => onFieldChange('priority', event.target.value)}
                data-testid="absence-type-version-priority-input"
              />
            </div>

            <div className="gba:grid gba:gap-2 gba:sm:grid-cols-2 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
              {[
                ['substitute', 'toggle-substitute'],
                ['relative', 'toggle-relative'],
                ['document', 'toggle-document'],
                ['anonymous', 'toggle-anonymous'],
                ['halfDays', 'toggle-half-days']
              ].map(([field, labelKey]) => (
                <label key={field} className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    checked={Boolean(formValues[field as keyof AbsenceTypeVersionFormValues])}
                    onCheckedChange={onToggleField(field as keyof AbsenceTypeVersionFormValues)}
                  />
                  <span>{t(labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
