import {
  Button,
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
import type { AbsenceTypeEntitlementRow } from '../../utils/absenceSetup'

interface SelectOption {
  value: string
  label: string
}

interface AbsenceEntitlementRowsProps {
  absenceTypeEntitlements: AbsenceTypeEntitlementRow[]
  availableAbsenceTypeOptions: SelectOption[]
  selectedAbsenceTypeToAdd: string
  onAddAbsenceType: (absenceTypeId: string) => void
  onEntitlementChange: (id: number, value: string) => void
  onRemove: (id: number) => void
}

export const AbsenceEntitlementRows: React.FC<AbsenceEntitlementRowsProps> = ({
  absenceTypeEntitlements,
  availableAbsenceTypeOptions,
  selectedAbsenceTypeToAdd,
  onAddAbsenceType,
  onEntitlementChange,
  onRemove
}) => {
  const { t } = useTranslation(translations)

  return (
    <Card data-testid="absence-entitlement-rows-section">
      <CardHeader>
        <CardTitle>{t('entitlement-rows-section-title')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:max-w-sm">
          <Combobox
            value={selectedAbsenceTypeToAdd}
            onValueChange={value => {
              const nextValue = String(value || '')
              if (nextValue) onAddAbsenceType(nextValue)
            }}
            options={availableAbsenceTypeOptions}
            placeholder={t('add-absence-type-row-placeholder')}
            searchPlaceholder={t('add-absence-type-row-placeholder')}
            emptyText={t('no-additional-absence-types')}
            data-testid="absence-entitlement-add-absence-type-select"
          />
        </div>

        {absenceTypeEntitlements.length === 0 ? (
          <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:px-4 gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
            {t('empty-entitlement-rows')}
          </div>
        ) : (
          <div className="gba:space-y-3">
            {absenceTypeEntitlements.map(item => (
              <div
                key={item.id}
                className="gba:grid gba:items-end gba:gap-4 gba:rounded-lg gba:border gba:border-border gba:p-4 gba:md:grid-cols-[1fr_1fr_180px_auto]"
                data-testid={`absence-entitlement-row-${item.id}`}
              >
                <div className="gba:space-y-1">
                  <p className="gba:text-sm gba:text-muted-foreground">{t('field-code-label')}</p>
                  <p className="gba:font-medium">{item.code}</p>
                </div>
                <div className="gba:space-y-1">
                  <p className="gba:text-sm gba:text-muted-foreground">{t('field-name-label')}</p>
                  <p className="gba:font-medium">{item.name}</p>
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor={`absence-entitlement-amount-${item.id}`}>{t('field-entitlement-label')}</Label>
                  <Input
                    id={`absence-entitlement-amount-${item.id}`}
                    type="number"
                    value={item.entitlement}
                    onChange={event => onEntitlementChange(item.id, event.target.value)}
                    data-testid={`absence-entitlement-amount-${item.id}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onRemove(item.id)}
                  data-testid={`absence-entitlement-remove-${item.id}`}
                >
                  {t('remove-button')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AbsenceEntitlementRows
