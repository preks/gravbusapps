import { Checkbox, Label, useTranslation } from '@newwork/nw-design-system'
import type { ExportFieldDefinition } from '../types/exportFieldTypes'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from '../_i18n'

export interface ExportFieldPickerProps<TEntity = unknown> {
  fields: ExportFieldDefinition<TEntity>[]
  selectedFieldKeys: string[]
  onFieldToggle: (fieldKey: string, checked: boolean) => void
  onSelectAll: () => void
  onClearAll: () => void
  prefixDataTestId?: string
}

export const ExportFieldPicker = <TEntity,>({
  fields,
  selectedFieldKeys,
  onFieldToggle,
  onSelectAll,
  onClearAll,
  prefixDataTestId = 'ExportFieldPicker'
}: ExportFieldPickerProps<TEntity>) => {
  const { t } = useTranslation(translations)
  const selectedSet = new Set(selectedFieldKeys)

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground">{t('field-picker-title')}</h3>
        <div className="gba:flex gba:gap-2">
          <button
            type="button"
            className="gba:text-sm gba:text-primary gba:hover:underline"
            onClick={onSelectAll}
            data-testid={formatDataTestId(prefixDataTestId, 'select-all')}
          >
            {t('select-all')}
          </button>
          <span className="gba:text-muted-foreground">|</span>
          <button
            type="button"
            className="gba:text-sm gba:text-primary gba:hover:underline"
            onClick={onClearAll}
            data-testid={formatDataTestId(prefixDataTestId, 'clear-all')}
          >
            {t('clear-all')}
          </button>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:lg:grid-cols-3">
        {fields.map(field => (
          <div key={field.key} className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              id={`export-field-${field.key}`}
              checked={selectedSet.has(field.key)}
              onCheckedChange={checked => onFieldToggle(field.key, checked === true)}
              data-testid={formatDataTestId(prefixDataTestId, `field-${field.key}`)}
            />
            <Label htmlFor={`export-field-${field.key}`} className="gba:cursor-pointer gba:text-sm">
              {field.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
