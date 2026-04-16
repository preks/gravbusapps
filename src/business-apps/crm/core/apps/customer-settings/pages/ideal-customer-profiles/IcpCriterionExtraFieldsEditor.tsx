import React from 'react'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { Button, Input, Label, useTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'
import { createEmptyExtraPair, type IcpCriterionExtraPair } from './icpFormState'

export interface IcpCriterionExtraFieldsEditorProps {
  pairs: IcpCriterionExtraPair[]
  onChange: (next: IcpCriterionExtraPair[]) => void
  dataTestIdPrefix: string
}

export const IcpCriterionExtraFieldsEditor: React.FC<IcpCriterionExtraFieldsEditorProps> = ({
  pairs,
  onChange,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(customerSettingsI18n)

  const updatePair = (rowId: string, patch: Partial<IcpCriterionExtraPair>) => {
    onChange(pairs.map(p => (p.rowId === rowId ? { ...p, ...patch } : p)))
  }

  const removePair = (rowId: string) => {
    onChange(pairs.filter(p => p.rowId !== rowId))
  }

  const addPair = () => {
    onChange([...pairs, createEmptyExtraPair()])
  }

  return (
    <div className="gba:space-y-3 gba:md:col-span-12" data-testid={dataTestIdPrefix}>
      <div className="gba:flex gba:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addPair} data-testid={`${dataTestIdPrefix}-add`}>
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('icp-extra-add-specification')}
        </Button>
      </div>

      {pairs.length > 0 ? (
        <div className="gba:space-y-2">
          {pairs.map(p => (
            <div
              key={p.rowId}
              className="gba:grid gba:gap-2 gba:md:grid-cols-12 gba:items-end"
              data-testid={`${dataTestIdPrefix}-row-${p.rowId}`}
            >
              <div className="gba:md:col-span-4 gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">{t('icp-extra-field-key')}</Label>
                <Input
                  value={p.fieldKey}
                  onChange={e => updatePair(p.rowId, { fieldKey: e.target.value })}
                  placeholder={t('icp-extra-field-key-placeholder')}
                  data-testid={`${dataTestIdPrefix}-key-${p.rowId}`}
                />
              </div>
              <div className="gba:md:col-span-6 gba:space-y-1">
                <Label className="gba:text-xs gba:text-muted-foreground">{t('icp-extra-field-value')}</Label>
                <Input
                  value={p.fieldValue}
                  onChange={e => updatePair(p.rowId, { fieldValue: e.target.value })}
                  placeholder={t('icp-extra-field-value-placeholder')}
                  data-testid={`${dataTestIdPrefix}-value-${p.rowId}`}
                />
              </div>
              <div className="gba:md:col-span-2 gba:flex gba:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePair(p.rowId)}
                  data-testid={`${dataTestIdPrefix}-remove-${p.rowId}`}
                  aria-label={t('icp-extra-field-remove-aria')}
                >
                  <TrashIcon className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
