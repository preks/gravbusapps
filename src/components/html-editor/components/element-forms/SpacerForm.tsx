import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { EditorElement, SpacerElement } from '../../types'

interface SpacerFormProps {
  formData: Partial<SpacerElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const SpacerForm: React.FC<SpacerFormProps> = ({ formData, onChange, prefixDataTestId = 'spacer-form' }) => {
  const config = formData.config ?? {}

  return (
    <div className="gba:space-y-2" data-testid={prefixDataTestId}>
      <Label>Spacer Height</Label>
      <Select
        data-testid={`${prefixDataTestId}-height`}
        value={config.height ?? 'md'}
        onValueChange={(value: string) =>
          onChange({
            ...formData,
            config: { ...config, height: value as 'sm' | 'md' | 'lg' | 'xl' }
          })
        }
      >
        <SelectTrigger data-testid={`${prefixDataTestId}-select-trigger`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sm" data-testid={`${prefixDataTestId}-size-sm`}>
            Small
          </SelectItem>
          <SelectItem value="md" data-testid={`${prefixDataTestId}-size-md`}>
            Medium
          </SelectItem>
          <SelectItem value="lg" data-testid={`${prefixDataTestId}-size-lg`}>
            Large
          </SelectItem>
          <SelectItem value="xl" data-testid={`${prefixDataTestId}-size-xl`}>
            Extra Large
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
