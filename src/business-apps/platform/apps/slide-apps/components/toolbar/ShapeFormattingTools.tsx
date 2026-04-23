/**
 * ShapeFormattingTools Component
 *
 * Contextual formatting tools for shape elements.
 * Shows fill color, border color, border width, and opacity controls.
 */

import React from 'react'
import {
  Button,
  Separator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { Paintbrush, PenLine } from 'lucide-react'
import translations from '../../_i18n'
import type { ShapeElement } from '../slideElements'
import { COLOR_PRESETS } from '../slideElements'

export interface ShapeFormattingToolsProps {
  element: ShapeElement
  onUpdateElement: (id: string, updates: Partial<ShapeElement>) => void
  testId?: string
}

export function ShapeFormattingTools({ element, onUpdateElement, testId }: ShapeFormattingToolsProps) {
  const { t } = useTranslation(translations)

  const handleUpdate = (updates: Partial<ShapeElement>) => {
    onUpdateElement(element.id, updates)
  }

  return (
    <>
      {/* Fill Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-fill') || 'Fill Color'}
            data-testid={testId ? `${testId}-fill-color` : undefined}
          >
            <Paintbrush className="gba:w-4 gba:h-4" />
            <div
              className="gba:w-3 gba:h-3 gba:ml-1 gba:rounded-sm gba:border"
              style={{ backgroundColor: element.fill }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <Label className="gba:text-xs gba:mb-2 gba:block">{t('props-fill') || 'Fill Color'}</Label>
          <div className="gba:grid gba:grid-cols-6 gba:gap-1">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                className="gba:w-6 gba:h-6 gba:rounded gba:border gba:border-border gba:hover:ring-2 gba:hover:ring-primary"
                style={{ backgroundColor: color }}
                onClick={() => handleUpdate({ fill: color, gradient: undefined })}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Border Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-border-color') || 'Border Color'}
            data-testid={testId ? `${testId}-border-color` : undefined}
          >
            <PenLine className="gba:w-4 gba:h-4" />
            <div
              className="gba:w-3 gba:h-3 gba:ml-1 gba:rounded-sm gba:border"
              style={{ backgroundColor: element.strokeColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <Label className="gba:text-xs gba:mb-2 gba:block">{t('props-border-color') || 'Border Color'}</Label>
          <div className="gba:grid gba:grid-cols-6 gba:gap-1">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                className="gba:w-6 gba:h-6 gba:rounded gba:border gba:border-border gba:hover:ring-2 gba:hover:ring-primary"
                style={{ backgroundColor: color }}
                onClick={() => handleUpdate({ strokeColor: color })}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Border Width */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('props-border-width') || 'Border Width'}
            data-testid={testId ? `${testId}-border-width` : undefined}
          >
            <span className="gba:text-xs gba:font-medium">{element.strokeWidth}px</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <Label className="gba:text-xs gba:mb-2 gba:block">{t('props-border-width') || 'Border Width'}</Label>
          <Slider
            value={[element.strokeWidth]}
            onValueChange={([value]) => handleUpdate({ strokeWidth: value })}
            min={0}
            max={10}
            step={1}
          />
          <span className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:block">{element.strokeWidth}px</span>
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
