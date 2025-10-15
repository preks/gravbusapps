import React from 'react'
import {
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Button
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { EditorElement, ListItem } from '../../types'

interface ListConfig {
  listType: 'ul' | 'ol'
  items: ListItem[]
}

interface ListFormProps {
  formData: Partial<EditorElement> & { config?: ListConfig }
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const ListForm: React.FC<ListFormProps> = ({ formData, onChange, prefixDataTestId = 'list-form' }) => {
  const config: ListConfig = formData.config ?? { listType: 'ul', items: [] }
  const items: ListItem[] = config.items ?? []

  return (
    <>
      <div className="gba:space-y-2">
        <Label>List Type</Label>
        <Select
          data-testid={`${prefixDataTestId}-type`}
          value={config.listType}
          onValueChange={value =>
            onChange({
              ...formData,
              config: { ...config, listType: value as 'ul' | 'ol' } as ListConfig
            } as Partial<EditorElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ul">Bullet List</SelectItem>
            <SelectItem value="ol">Numbered List</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label>Items</Label>
          <Button
            data-testid={`${prefixDataTestId}-add-item`}
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...formData,
                config: { ...config, items: [...items, { id: crypto.randomUUID(), text: 'New item' }] } as ListConfig
              } as Partial<EditorElement>)
            }
          >
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            Add Item
          </Button>
        </div>
        <div className="gba:space-y-2 gba:max-h-40 gba:overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id} className="gba:flex gba:gap-2">
              <Input
                data-testid={`${prefixDataTestId}-item-${index}`}
                value={item.text}
                onChange={e => {
                  const newItems = items.map(i => (i.id === item.id ? { ...i, text: e.target.value } : i))
                  onChange({
                    ...formData,
                    config: { ...config, items: newItems } as ListConfig
                  } as Partial<EditorElement>)
                }}
                placeholder={`Item ${index + 1}`}
              />
              <Button
                data-testid={`${prefixDataTestId}-remove-item-${index}`}
                aria-label={`Remove item ${index + 1}`}
                size="icon"
                variant="ghost"
                onClick={() => {
                  const newItems = items.filter(i => i.id !== item.id)
                  onChange({
                    ...formData,
                    config: { ...config, items: newItems } as ListConfig
                  } as Partial<EditorElement>)
                }}
              >
                <TrashIcon className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
