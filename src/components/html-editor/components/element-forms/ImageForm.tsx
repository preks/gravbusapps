import React from 'react'
import { Label, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { EditorElement, ImageElement } from '../../types'

interface ImageConfig {
  src: string
  alt?: string
  width?: string
}

interface ImageFormProps {
  formData: Partial<ImageElement>
  onChange: (data: Partial<EditorElement>) => void
  prefixDataTestId?: string
}

export const ImageForm: React.FC<ImageFormProps> = ({ formData, onChange, prefixDataTestId = 'image-form' }) => {
  const config: Partial<ImageConfig> = formData.config ?? {}

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    if (url && !validateUrl(url)) {
      console.warn('Invalid image URL format')
    }
  }

  return (
    <>
      <div className="gba:space-y-2">
        <Label htmlFor={`${prefixDataTestId}-url-input`}>Image URL</Label>
        <Input
          id={`${prefixDataTestId}-url-input`}
          data-testid={`${prefixDataTestId}-url`}
          value={config.src || ''}
          onChange={e =>
            onChange({
              ...formData,
              config: { ...config, src: e.target.value } as ImageConfig
            } as Partial<ImageElement>)
          }
          onBlur={handleUrlBlur}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div className="gba:space-y-2">
        <Label htmlFor={`${prefixDataTestId}-alt`}>Alt Text</Label>
        <Input
          id={`${prefixDataTestId}-alt`}
          data-testid={`${prefixDataTestId}-alt`}
          value={config.alt || ''}
          onChange={e =>
            onChange({
              ...formData,
              config: { ...config, alt: e.target.value } as ImageConfig
            } as Partial<ImageElement>)
          }
          placeholder="Image description"
        />
      </div>
      <div className="gba:space-y-2">
        <Label htmlFor={`${prefixDataTestId}-width-select`}>Width</Label>
        <Select
          data-testid={`${prefixDataTestId}-width`}
          value={config.width || '100%'}
          onValueChange={value =>
            onChange({
              ...formData,
              config: { ...config, width: value } as ImageConfig
            } as Partial<ImageElement>)
          }
        >
          <SelectTrigger id={`${prefixDataTestId}-width-select`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100%">Full Width</SelectItem>
            <SelectItem value="75%">75%</SelectItem>
            <SelectItem value="50%">50%</SelectItem>
            <SelectItem value="25%">25%</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
