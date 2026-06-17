import React from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import billingTranslations from '../../_i18n'
import type { TaxCategory } from '../types'

export interface EditableLine {
  id: string
  description: string
  quantity: string
  unitPrice: string
  discountPercent: string
  taxCategoryId: string
}

interface LineItemsEditorProps {
  lines: EditableLine[]
  taxCategories: TaxCategory[]
  onChange: (lines: EditableLine[]) => void
}

function createLineId(): string {
  if (globalThis.crypto?.randomUUID) {
    return `line-${globalThis.crypto.randomUUID()}`
  }

  return `line-${Date.now().toString(36)}`
}

export const LineItemsEditor: React.FC<LineItemsEditorProps> = ({ lines, taxCategories, onChange }) => {
  const { t } = useTranslation(billingTranslations)

  const updateLine = (id: string, patch: Partial<EditableLine>) => {
    onChange(lines.map(line => (line.id === id ? { ...line, ...patch } : line)))
  }

  const addLine = () => {
    onChange([
      ...lines,
      {
        id: createLineId(),
        description: '',
        quantity: '1',
        unitPrice: '0',
        discountPercent: '0',
        taxCategoryId: taxCategories[0]?.id ?? ''
      }
    ])
  }

  const removeLine = (id: string) => {
    onChange(lines.filter(line => line.id !== id))
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid="line-items-editor">
      {lines.map(line => (
        <div
          key={line.id}
          className="gba:flex gba:items-end gba:gap-2 gba:flex-wrap gba:border-b gba:pb-3"
          data-testid={`line-editor-${line.id}`}
        >
          <div className="gba:flex-1 gba:min-w-48 gba:space-y-1">
            <label className="gba:text-xs gba:text-muted-foreground">{t('billing-line-description')}</label>
            <Input
              value={line.description}
              onChange={event => updateLine(line.id, { description: event.target.value })}
              data-testid={`line-description-${line.id}`}
            />
          </div>
          <div className="gba:w-20 gba:space-y-1">
            <label className="gba:text-xs gba:text-muted-foreground">{t('billing-line-qty')}</label>
            <Input
              type="number"
              value={line.quantity}
              onChange={event => updateLine(line.id, { quantity: event.target.value })}
              data-testid={`line-qty-${line.id}`}
            />
          </div>
          <div className="gba:w-28 gba:space-y-1">
            <label className="gba:text-xs gba:text-muted-foreground">{t('billing-line-unit-price')}</label>
            <Input
              type="number"
              step="0.01"
              value={line.unitPrice}
              onChange={event => updateLine(line.id, { unitPrice: event.target.value })}
              data-testid={`line-price-${line.id}`}
            />
          </div>
          <div className="gba:w-24 gba:space-y-1">
            <label className="gba:text-xs gba:text-muted-foreground">{t('billing-line-discount')}</label>
            <Input
              type="number"
              value={line.discountPercent}
              onChange={event => updateLine(line.id, { discountPercent: event.target.value })}
              data-testid={`line-discount-${line.id}`}
            />
          </div>
          <div className="gba:w-44 gba:space-y-1">
            <label className="gba:text-xs gba:text-muted-foreground">{t('billing-form-tax-category')}</label>
            <Select value={line.taxCategoryId} onValueChange={value => updateLine(line.id, { taxCategoryId: value })}>
              <SelectTrigger data-testid={`line-tax-${line.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeLine(line.id)}
            data-testid={`line-remove-${line.id}`}
          >
            <TrashIcon size={16} />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={addLine} data-testid="line-add-button">
          <PlusIcon size={16} className="gba:mr-1" />
          {t('billing-form-add-line')}
        </Button>
      </div>
    </div>
  )
}

export default LineItemsEditor
