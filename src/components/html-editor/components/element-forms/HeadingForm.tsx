import React from 'react'
import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
import { EditorElement } from '../../types'

interface HeadingFormProps {
  formData: Partial<EditorElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const HeadingForm: React.FC<HeadingFormProps> = ({ formData, onChange, prefixDataTestId = 'heading-form' }) => {
  const config = (formData as any).config || {}
  const content = 'content' in formData ? formData.content : ''

  return (
    <>
      <div className="gba:space-y-2">
        <Label>Heading Level</Label>
        <Select
          data-testid={`${prefixDataTestId}-level`}
          value={String(config.level || 1)}
          onValueChange={value =>
            onChange({
              ...formData,
              config: { ...config, level: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 }
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1 - Largest</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
            <SelectItem value="4">H4</SelectItem>
            <SelectItem value="5">H5</SelectItem>
            <SelectItem value="6">H6 - Smallest</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="gba:space-y-2">
        <Label>Text</Label>
        <Input
          data-testid={`${prefixDataTestId}-text`}
          value={content ?? ''}
          onChange={e => onChange({ ...formData, content: e.target.value })}
          placeholder="Enter heading text..."
        />
      </div>
    </>
  )
}
