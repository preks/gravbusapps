import React from 'react'
import {
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea
} from '@newwork/nw-design-system'
import { EditorElement, CardElement } from '../../types'

interface CardFormProps {
  formData: Partial<EditorElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const CardForm: React.FC<CardFormProps> = ({ formData, onChange, prefixDataTestId = 'card-form' }) => {
  const cardData = formData as Partial<CardElement>
  const config = cardData.config || {}

  return (
    <>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div className="gba:space-y-2">
          <Label>Variant</Label>
          <Select
            data-testid={`${prefixDataTestId}-variant`}
            value={config.variant || 'default'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, variant: value as 'default' | 'outlined' | 'elevated' }
              } as Partial<CardElement>)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="outlined">Outlined</SelectItem>
              <SelectItem value="elevated">Elevated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="gba:space-y-2">
          <Label>Padding</Label>
          <Select
            data-testid={`${prefixDataTestId}-padding`}
            value={config.padding || 'md'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, padding: value as 'sm' | 'md' | 'lg' }
              } as Partial<CardElement>)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="gba:space-y-2">
        <Label>Content</Label>
        <Textarea
          data-testid={`${prefixDataTestId}-content`}
          value={cardData.content ?? ''}
          onChange={e => onChange({ ...formData, content: e.target.value })}
          placeholder="Enter card content..."
          rows={4}
        />
      </div>
    </>
  )
}
