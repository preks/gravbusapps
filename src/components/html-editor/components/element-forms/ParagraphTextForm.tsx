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

interface ParagraphConfig {
  alignment?: 'left' | 'center' | 'right'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}

interface ParagraphTextFormData {
  id?: string
  type?: string
  content?: string
  config?: ParagraphConfig
  colSpan?: number
  rowIndex?: number
}

interface ParagraphTextFormProps {
  formData: ParagraphTextFormData
  onChange: (data: ParagraphTextFormData) => void
  prefixDataTestId?: string
}

export const ParagraphTextForm: React.FC<ParagraphTextFormProps> = ({
  formData,
  onChange,
  prefixDataTestId = 'paragraph-form'
}) => {
  const config: ParagraphConfig = formData.config ?? {}

  return (
    <>
      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
        <div className="gba:space-y-2">
          <Label>Alignment</Label>
          <Select
            data-testid={`${prefixDataTestId}-alignment`}
            value={config.alignment || 'left'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, alignment: value as 'left' | 'center' | 'right' }
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="gba:space-y-2">
          <Label>Weight</Label>
          <Select
            data-testid={`${prefixDataTestId}-weight`}
            value={config.weight || 'normal'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, weight: value as ParagraphConfig['weight'] }
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="semibold">Semibold</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="gba:space-y-2">
          <Label>Size</Label>
          <Select
            data-testid={`${prefixDataTestId}-size`}
            value={config.size || 'base'}
            onValueChange={value =>
              onChange({
                ...formData,
                config: { ...config, size: value as ParagraphConfig['size'] }
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xs">Extra Small</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="gba:space-y-2">
        <Label>Content</Label>
        <Textarea
          data-testid={`${prefixDataTestId}-content`}
          value={formData.content}
          onChange={e => onChange({ ...formData, content: e.target.value })}
          placeholder="Enter text content..."
          rows={4}
        />
      </div>
    </>
  )
}
