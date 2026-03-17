import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { AbsenceTypeVersionFormValues } from '../utils/absenceSetup'

interface AbsenceTypeVersionAccessCardProps {
  formValues: AbsenceTypeVersionFormValues
  onFieldChange: <K extends keyof AbsenceTypeVersionFormValues>(
    field: K,
    value: AbsenceTypeVersionFormValues[K]
  ) => void
  onToggleField: (field: keyof AbsenceTypeVersionFormValues) => (value: boolean) => void
}

export function AbsenceTypeVersionAccessCard({
  formValues,
  onFieldChange,
  onToggleField
}: AbsenceTypeVersionAccessCardProps) {
  const { t } = useTranslation(translations)

  return (
    <TabsContent value="access" className="gba:mt-3">
      <Card data-testid="absence-type-version-access-section" className="gba:border gba:border-border gba:bg-muted/10">
        <CardHeader className="gba:border-b gba:border-border gba:bg-background">
          <CardTitle>{t('version-access-section-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-3">
          <label className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
            <Checkbox checked={formValues.accessPlan} onCheckedChange={onToggleField('accessPlan')} />
            <span>{t('toggle-access-plan')}</span>
          </label>
          <label className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
            <Checkbox checked={formValues.accessRequest} onCheckedChange={onToggleField('accessRequest')} />
            <span>{t('toggle-access-request')}</span>
          </label>
          <div className="gba:space-y-2">
            <Label htmlFor="absence-type-version-entered-by">{t('field-entered-by-label')}</Label>
            <Input
              id="absence-type-version-entered-by"
              value={formValues.enteredBy}
              onChange={event => onFieldChange('enteredBy', event.target.value)}
              data-testid="absence-type-version-entered-by-input"
            />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
