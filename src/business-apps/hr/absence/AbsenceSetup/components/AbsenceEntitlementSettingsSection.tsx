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
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import {
  getAbsenceTypeOptionLabel,
  type AbsenceEntitlementDetailSettings,
  type AbsenceEntitlementObjectSettings
} from '../utils/absenceEntitlementObjectValue'

interface AbsenceEntitlementSettingsSectionProps {
  settings: AbsenceEntitlementObjectSettings
  detailSettings: AbsenceEntitlementDetailSettings
  absenceTypes: AbsenceType[]
  mode?: 'all' | 'settings' | 'details'
  onSettingsChange: <K extends keyof AbsenceEntitlementObjectSettings>(
    field: K,
    value: AbsenceEntitlementObjectSettings[K]
  ) => void
  onDetailChange: <K extends keyof AbsenceEntitlementDetailSettings>(
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => void
}

export function AbsenceEntitlementSettingsSection({
  settings,
  detailSettings,
  absenceTypes,
  mode = 'all',
  onSettingsChange,
  onDetailChange
}: AbsenceEntitlementSettingsSectionProps) {
  const { t } = useTranslation(translations)

  const absenceTypeOptions = absenceTypes.map(absenceType => ({
    value: `AbsenceType:v1:${absenceType.code}`,
    label: getAbsenceTypeOptionLabel(absenceType)
  }))

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
                  <Label htmlFor="absence-entitlement-year-type-input">{t('field-year-type-label')}</Label>
                  <Input
                    id="absence-entitlement-year-type-input"
                    value={settings.year_type}
                    onChange={event => onSettingsChange('year_type', event.target.value)}
                    data-testid="absence-entitlement-year-type-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-full-time-unit-input">{t('field-full-time-unit-label')}</Label>
                  <Input
                    id="absence-entitlement-full-time-unit-input"
                    value={settings.full_time_unit}
                    onChange={event => onSettingsChange('full_time_unit', event.target.value)}
                    data-testid="absence-entitlement-full-time-unit-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-year-start-date-input">{t('field-year-start-date-label')}</Label>
                  <Input
                    id="absence-entitlement-year-start-date-input"
                    value={settings.year_start_date}
                    onChange={event => onSettingsChange('year_start_date', event.target.value)}
                    placeholder="01.01"
                    data-testid="absence-entitlement-year-start-date-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-type-input">{t('field-entitlement-type-label')}</Label>
                  <Input
                    id="absence-entitlement-type-input"
                    value={settings.entitlement_type}
                    onChange={event => onSettingsChange('entitlement_type', event.target.value)}
                    data-testid="absence-entitlement-type-input"
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
                  <Label htmlFor="absence-entitlement-full-time-frequency-input">
                    {t('field-full-time-frequency-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-full-time-frequency-input"
                    value={settings.full_time_frequency}
                    onChange={event => onSettingsChange('full_time_frequency', event.target.value)}
                    data-testid="absence-entitlement-full-time-frequency-input"
                  />
                </div>
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
                  <Label htmlFor="absence-entitlement-advance-generation-time-unit-input">
                    {t('field-advance-generation-time-unit-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-advance-generation-time-unit-input"
                    value={settings.advance_generation_time_unit}
                    onChange={event => onSettingsChange('advance_generation_time_unit', event.target.value)}
                    data-testid="absence-entitlement-advance-generation-time-unit-input"
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
              <CardTitle>{t('entitlement-details-section-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3 gba:p-4">
              <p className="gba:text-xs gba:text-muted-foreground">{t('entitlement-details-section-description')}</p>
              <label className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-3">
                <Checkbox
                  checked={detailSettings.carryover}
                  onCheckedChange={checked => onDetailChange('carryover', Boolean(checked))}
                  data-testid="absence-entitlement-carryover-checkbox"
                />
                <span>{t('field-carryover-label')}</span>
              </label>

              <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-prorata-method-input">{t('field-prorata-method-label')}</Label>
                  <Input
                    id="absence-entitlement-prorata-method-input"
                    value={detailSettings.prorata_method}
                    onChange={event => onDetailChange('prorata_method', event.target.value)}
                    data-testid="absence-entitlement-prorata-method-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-rounding-method-input">{t('field-rounding-method-label')}</Label>
                  <Input
                    id="absence-entitlement-rounding-method-input"
                    value={detailSettings.rounding_method}
                    onChange={event => onDetailChange('rounding_method', event.target.value)}
                    data-testid="absence-entitlement-rounding-method-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>{t('field-absence-type-ref-label')}</Label>
                  <Combobox
                    value={detailSettings.absence_type_ref}
                    onValueChange={value => onDetailChange('absence_type_ref', String(value || ''))}
                    options={absenceTypeOptions}
                    placeholder={t('field-absence-type-ref-label')}
                    searchPlaceholder={t('field-absence-type-ref-label')}
                    emptyText={t('empty-absence-types')}
                    data-testid="absence-entitlement-absence-type-ref-select"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-prolong-approval-input">
                    {t('field-prolong-approval-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-prolong-approval-input"
                    value={detailSettings.prolong_approval}
                    onChange={event => onDetailChange('prolong_approval', event.target.value)}
                    data-testid="absence-entitlement-prolong-approval-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-validation-amount-input">
                    {t('field-validation-amount-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-validation-amount-input"
                    type="number"
                    value={detailSettings.validation_amount}
                    onChange={event => onDetailChange('validation_amount', event.target.value)}
                    data-testid="absence-entitlement-validation-amount-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-validation-amount-unit-input">
                    {t('field-validation-amount-unit-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-validation-amount-unit-input"
                    value={detailSettings.validation_amount_unit}
                    onChange={event => onDetailChange('validation_amount_unit', event.target.value)}
                    data-testid="absence-entitlement-validation-amount-unit-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-carryover-approval-input">
                    {t('field-carryover-approval-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-carryover-approval-input"
                    value={detailSettings.carryover_approval}
                    onChange={event => onDetailChange('carryover_approval', event.target.value)}
                    data-testid="absence-entitlement-carryover-approval-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-amount-input">{t('field-entitlement-amount-label')}</Label>
                  <Input
                    id="absence-entitlement-amount-input"
                    type="number"
                    value={detailSettings.entitlement_amount}
                    onChange={event => onDetailChange('entitlement_amount', event.target.value)}
                    data-testid="absence-entitlement-amount-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-max-carryover-amount-input">
                    {t('field-max-carryover-amount-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-max-carryover-amount-input"
                    type="number"
                    value={detailSettings.max_carryover_amount}
                    onChange={event => onDetailChange('max_carryover_amount', event.target.value)}
                    data-testid="absence-entitlement-max-carryover-amount-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-max-carryover-percent-input">
                    {t('field-max-carryover-percent-label')}
                  </Label>
                  <Input
                    id="absence-entitlement-max-carryover-percent-input"
                    type="number"
                    value={detailSettings.max_carryover_percent}
                    onChange={event => onDetailChange('max_carryover_percent', event.target.value)}
                    data-testid="absence-entitlement-max-carryover-percent-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </>
  )
}
