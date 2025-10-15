import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
import { EditorElement } from '../../types'

interface ButtonFormProps {
  formData: Partial<EditorElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const ButtonForm: React.FC<ButtonFormProps> = ({ formData, onChange, prefixDataTestId = 'button-form' }) => {
  const config = (formData as any).config || {}

  return (
    <>
      <div className="gba:space-y-2">
        <Label>Button Text</Label>
        <Input
          data-testid={`${prefixDataTestId}-text`}
          value={(formData as any).content || ''}
          onChange={e => onChange({ ...formData, content: e.target.value } as any)}
          placeholder="Click Here"
        />
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div className="gba:space-y-2">
          <Label>Variant</Label>
          <Select
            data-testid={`${prefixDataTestId}-variant`}
            value={(config as any).buttonVariant || 'default'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, buttonVariant: value as any }
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="gba:space-y-2">
          <Label>Size</Label>
          <Select
            data-testid={`${prefixDataTestId}-size`}
            value={config.buttonSize || 'md'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, buttonSize: value as any }
              })
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
        <Label>Link URL</Label>
        <Input
          data-testid={`${prefixDataTestId}-url`}
          value={config.href || ''}
          onChange={e =>
            onChange({
              ...formData,
              config: { ...config, href: e.target.value }
            })
          }
          placeholder="#"
        />
      </div>
    </>
  )
}
