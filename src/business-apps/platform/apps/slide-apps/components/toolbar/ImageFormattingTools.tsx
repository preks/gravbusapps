/**
 * ImageFormattingTools Component
 *
 * Contextual formatting tools for image elements.
 * Shows object fit, border radius, and opacity controls.
 */

import React from 'react'
import {
  Button,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { Maximize2 } from 'lucide-react'
import translations from '../../_i18n'
import type { ImageElement } from '../slideElements'

export interface ImageFormattingToolsProps {
  element: ImageElement
  onUpdateElement: (id: string, updates: Partial<ImageElement>) => void
  testId?: string
}

const OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' }
] as const

export function ImageFormattingTools({ element, onUpdateElement, testId }: ImageFormattingToolsProps) {
  const { t } = useTranslation(translations)

  const handleUpdate = (updates: Partial<ImageElement>) => {
    onUpdateElement(element.id, updates)
  }

  return (
    <>
      {/* Object Fit */}
      <Select
        value={element.objectFit}
        onValueChange={(value: 'cover' | 'contain' | 'fill' | 'none') => handleUpdate({ objectFit: value })}
      >
        <SelectTrigger className="gba:w-[100px] gba:h-8">
          <Maximize2 className="gba:w-4 gba:h-4 gba:mr-1" />
          <SelectValue placeholder={t('props-object-fit') || 'Fit'} />
        </SelectTrigger>
        <SelectContent>
          {OBJECT_FIT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {t(`props-fit-${option.value}`) || option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Border Radius */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-border-radius') || 'Border Radius'}
            data-testid={testId ? `${testId}-border-radius` : undefined}
          >
            <span className="gba:text-xs gba:font-medium">{element.borderRadius}px</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <Label className="gba:text-xs gba:mb-2 gba:block">{t('props-border-radius') || 'Border Radius'}</Label>
          <Slider
            value={[element.borderRadius]}
            onValueChange={([value]) => handleUpdate({ borderRadius: value })}
            min={0}
            max={50}
            step={2}
          />
          <span className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:block">{element.borderRadius}px</span>
        </PopoverContent>
      </Popover>

      {/* Opacity */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-opacity') || 'Opacity'}
            data-testid={testId ? `${testId}-opacity` : undefined}
          >
            <span className="gba:text-xs gba:font-medium">{Math.round(element.opacity * 100)}%</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <Label className="gba:text-xs gba:mb-2 gba:block">{t('props-opacity') || 'Opacity'}</Label>
          <Slider
            value={[element.opacity * 100]}
            onValueChange={([value]) => handleUpdate({ opacity: value / 100 })}
            min={0}
            max={100}
            step={5}
          />
          <span className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:block">
            {Math.round(element.opacity * 100)}%
          </span>
        </PopoverContent>
      </Popover>
    </>
  )
}
