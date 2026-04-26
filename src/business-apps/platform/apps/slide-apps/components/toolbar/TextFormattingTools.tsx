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
import { COLOR_PRESETS, getFontFamilyOptions, getFontSizeOptions } from '../slideElements'
import type { ResolvedTextFormattingState, TextFormattingToggleState } from '../../utils/richTextEditing'

export interface TextFormattingToolsProps {
  element: TextElement
  formatting?: ResolvedTextFormattingState
  onUpdateElement: (id: string, updates: Partial<TextElement>) => void
  onShowLinkDialog: () => void
  testId?: string
}

function toggleVariantForState(state: TextFormattingToggleState): 'secondary' | 'ghost' {
  return state === 'off' ? 'ghost' : 'secondary'
}

function toggleClassNameForState(state: TextFormattingToggleState): string | undefined {
  return state === 'mixed' ? 'gba:opacity-60' : undefined
}

export function TextFormattingTools({
  element,
  formatting,
  onUpdateElement,
  onShowLinkDialog,
  testId
}: TextFormattingToolsProps) {
  const { t } = useTranslation(translations)
  const mixedLabel = t('editor-mixed') || 'Mixed'

  const handleUpdate = (updates: Partial<TextElement>) => {
    onUpdateElement(element.id, updates)
  }

  const fontFamilyValue = formatting?.isFontFamilyMixed ? undefined : (formatting?.fontFamily ?? element.fontFamily)
  const resolvedFontSize = formatting?.isFontSizeMixed ? undefined : (formatting?.fontSize ?? element.fontSize)
  const fontSizeValue = resolvedFontSize === undefined ? undefined : String(resolvedFontSize)
  const fontFamilyOptions = getFontFamilyOptions(fontFamilyValue)
  const fontSizeOptions = getFontSizeOptions(resolvedFontSize)
  const resolvedTextAlign = formatting?.isTextAlignMixed ? undefined : (formatting?.textAlign ?? element.textAlign)
  const resolvedColor = formatting?.isColorMixed ? undefined : (formatting?.color ?? element.color)

  const boldState = formatting?.fontWeightState ?? (element.fontWeight === 'bold' ? 'on' : 'off')
  const italicState = formatting?.fontStyleState ?? (element.fontStyle === 'italic' ? 'on' : 'off')
  const underlineState = formatting?.underlineState ?? (element.textDecoration === 'underline' ? 'on' : 'off')
  const strikethroughState =
    formatting?.strikethroughState ?? (element.textDecoration === 'line-through' ? 'on' : 'off')

  return (
    <>
      {/* Font Family */}
      <Select value={fontFamilyValue} onValueChange={value => handleUpdate({ fontFamily: value })}>
        <SelectTrigger className="gba:w-[140px] gba:h-8">
          <SelectValue placeholder={formatting?.isFontFamilyMixed ? '' : t('editor-font-family')} />
        </SelectTrigger>
        <SelectContent>
          {fontFamilyOptions.map(font => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select value={fontSizeValue} onValueChange={value => handleUpdate({ fontSize: Number(value) })}>
        <SelectTrigger className="gba:w-[70px] gba:h-8">
          <SelectValue placeholder={formatting?.isFontSizeMixed ? '' : t('editor-font-size')} />
        </SelectTrigger>
        <SelectContent>
          {fontSizeOptions.map(size => (
            <SelectItem key={String(size)} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Bold */}
      <Button
        variant={toggleVariantForState(boldState)}
        size="sm"
        className={toggleClassNameForState(boldState)}
        onClick={() => handleUpdate({ fontWeight: boldState === 'on' ? 'normal' : 'bold' })}
        title={boldState === 'mixed' ? `${t('editor-bold')} (${mixedLabel})` : t('editor-bold')}
        data-testid={testId ? `${testId}-bold` : undefined}
      >
        <Bold className="gba:w-4 gba:h-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={toggleVariantForState(italicState)}
        size="sm"
        className={toggleClassNameForState(italicState)}
        onClick={() => handleUpdate({ fontStyle: italicState === 'on' ? 'normal' : 'italic' })}
        title={italicState === 'mixed' ? `${t('editor-italic')} (${mixedLabel})` : t('editor-italic')}
        data-testid={testId ? `${testId}-italic` : undefined}
      >
        <Italic className="gba:w-4 gba:h-4" />
      </Button>

      {/* Underline */}
      <Button
        variant={toggleVariantForState(underlineState)}
        size="sm"
        className={toggleClassNameForState(underlineState)}
        onClick={() => handleUpdate({ textDecoration: underlineState === 'on' ? 'none' : 'underline' })}
        title={underlineState === 'mixed' ? `${t('editor-underline')} (${mixedLabel})` : t('editor-underline')}
        data-testid={testId ? `${testId}-underline` : undefined}
      >
        <Underline className="gba:w-4 gba:h-4" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant={toggleVariantForState(strikethroughState)}
        size="sm"
        className={toggleClassNameForState(strikethroughState)}
        onClick={() => handleUpdate({ textDecoration: strikethroughState === 'on' ? 'none' : 'line-through' })}
        title={
          strikethroughState === 'mixed' ? `${t('editor-strikethrough')} (${mixedLabel})` : t('editor-strikethrough')
        }
        data-testid={testId ? `${testId}-strikethrough` : undefined}
      >
        <Strikethrough className="gba:w-4 gba:h-4" />
      </Button>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Alignment */}
      <Button
        variant={resolvedTextAlign === 'left' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'left' })}
        title={t('editor-align-left')}
        data-testid={testId ? `${testId}-align-left` : undefined}
      >
        <AlignLeft className="gba:w-4 gba:h-4" />
      </Button>
      <Button
        variant={resolvedTextAlign === 'center' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'center' })}
        title={t('editor-align-center')}
        data-testid={testId ? `${testId}-align-center` : undefined}
      >
        <AlignCenter className="gba:w-4 gba:h-4" />
      </Button>
      <Button
        variant={resolvedTextAlign === 'right' ? 'secondary' : 'ghost'}
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
              className={`gba:w-3 gba:h-3 gba:ml-1 gba:rounded-sm gba:border ${
                formatting?.isColorMixed
                  ? 'gba:border-dashed gba:flex gba:items-center gba:justify-center gba:text-[9px] gba:text-muted-foreground'
                  : ''
              }`}
              style={resolvedColor ? { backgroundColor: resolvedColor } : undefined}
            >
              {formatting?.isColorMixed ? 'M' : null}
            </div>
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
