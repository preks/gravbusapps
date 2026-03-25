/**
 * TextFormattingTools Component
 *
 * Contextual formatting tools for text elements.
 * Shows font family, size, style, alignment, and link controls.
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
  useTranslation
} from '@newwork/nw-design-system'
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Link, Palette } from 'lucide-react'
import translations from '../../_i18n'
import type { TextElement } from '../slideElements'
import { FONT_FAMILIES, FONT_SIZES, COLOR_PRESETS } from '../slideElements'

export interface TextFormattingToolsProps {
  element: TextElement
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void
  onShowLinkDialog: () => void
  testId?: string
}

export function TextFormattingTools({ element, onUpdateElement, onShowLinkDialog, testId }: TextFormattingToolsProps) {
  const { t } = useTranslation(translations)

  const handleUpdate = (updates: Partial<TextElement>) => {
    onUpdateElement(element.id, updates)
  }

  return (
    <>
      {/* Font Family */}
      <Select value={element.fontFamily} onValueChange={value => handleUpdate({ fontFamily: value })}>
        <SelectTrigger className="gba:w-[140px] gba:h-8">
          <SelectValue placeholder={t('editor-font-family')} />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map(font => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select value={String(element.fontSize)} onValueChange={value => handleUpdate({ fontSize: Number(value) })}>
        <SelectTrigger className="gba:w-[70px] gba:h-8">
          <SelectValue placeholder={t('editor-font-size')} />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map(size => (
            <SelectItem key={String(size)} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Bold */}
      <Button
        variant={element.fontWeight === 'bold' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
        title={t('editor-bold')}
        data-testid={testId ? `${testId}-bold` : undefined}
      >
        <Bold className="gba:w-4 gba:h-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={element.fontStyle === 'italic' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
        title={t('editor-italic')}
        data-testid={testId ? `${testId}-italic` : undefined}
      >
        <Italic className="gba:w-4 gba:h-4" />
      </Button>

      {/* Underline */}
      <Button
        variant={element.textDecoration === 'underline' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline' })}
        title={t('editor-underline')}
        data-testid={testId ? `${testId}-underline` : undefined}
      >
        <Underline className="gba:w-4 gba:h-4" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant={element.textDecoration === 'line-through' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() =>
          handleUpdate({ textDecoration: element.textDecoration === 'line-through' ? 'none' : 'line-through' })
        }
        title={t('editor-strikethrough')}
        data-testid={testId ? `${testId}-strikethrough` : undefined}
      >
        <Strikethrough className="gba:w-4 gba:h-4" />
      </Button>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Alignment */}
      <Button
        variant={element.textAlign === 'left' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'left' })}
        title={t('editor-align-left')}
        data-testid={testId ? `${testId}-align-left` : undefined}
      >
        <AlignLeft className="gba:w-4 gba:h-4" />
      </Button>
      <Button
        variant={element.textAlign === 'center' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'center' })}
        title={t('editor-align-center')}
        data-testid={testId ? `${testId}-align-center` : undefined}
      >
        <AlignCenter className="gba:w-4 gba:h-4" />
      </Button>
      <Button
        variant={element.textAlign === 'right' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'right' })}
        title={t('editor-align-right')}
        data-testid={testId ? `${testId}-align-right` : undefined}
      >
        <AlignRight className="gba:w-4 gba:h-4" />
      </Button>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title={t('editor-text-color')}
            data-testid={testId ? `${testId}-text-color` : undefined}
          >
            <Palette className="gba:w-4 gba:h-4" />
            <div
              className="gba:w-3 gba:h-3 gba:ml-1 gba:rounded-sm gba:border"
              style={{ backgroundColor: element.color }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-48">
          <div className="gba:grid gba:grid-cols-6 gba:gap-1">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                className="gba:w-6 gba:h-6 gba:rounded gba:border gba:border-border gba:hover:ring-2 gba:hover:ring-primary"
                style={{ backgroundColor: color }}
                onClick={() => handleUpdate({ color })}
                data-testid={testId ? `${testId}-color-${color.replace('#', '')}` : undefined}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShowLinkDialog}
        title={t('editor-link')}
        data-testid={testId ? `${testId}-link` : undefined}
      >
        <Link className="gba:w-4 gba:h-4" />
      </Button>
    </>
  )
}
