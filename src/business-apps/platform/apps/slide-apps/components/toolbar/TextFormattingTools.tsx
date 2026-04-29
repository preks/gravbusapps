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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CaretDownIcon,
  CheckIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  PaletteIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextIndentIcon,
  TextItalicIcon,
  TextOutdentIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon
} from '@phosphor-icons/react'
import translations from '../../_i18n'
import type { TextElement } from '../slideElements'
import {
  COLOR_PRESETS,
  fontSizePixelsToPoints,
  fontSizePointsToPixels,
  getFontFamilyOptions,
  getFontSizeOptions
} from '../slideElements'
import { SlideFontSizeControl } from '../SlideFontSizeControl'
import type {
  ResolvedTextFormattingState,
  RichTextFormattingUpdate,
  TextFormattingToggleState
} from '../../utils/richTextEditing'
import {
  BULLET_PRESET_OPTIONS,
  DEFAULT_BULLET_GLYPH,
  NUMBERING_STYLE_PRESETS,
  numberingStylePreview
} from '../../utils/richTextLists'

export interface TextFormattingToolsProps {
  element: TextElement
  formatting?: ResolvedTextFormattingState
  onUpdateElement: (id: string, updates: RichTextFormattingUpdate) => void
  onShowLinkDialog: () => void
  testId?: string
}

function toggleVariantForState(state: TextFormattingToggleState): 'secondary' | 'ghost' {
  return state === 'off' ? 'ghost' : 'secondary'
}

function toggleClassNameForState(state: TextFormattingToggleState): string | undefined {
  return state === 'mixed' ? 'gba:opacity-60' : undefined
}

function getFirstParagraph(element: TextElement) {
  return element.paragraphs?.[0]
}

function renderListSelectionIndicator(isActive: boolean) {
  return isActive ? (
    <CheckIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0" />
  ) : (
    <span className="gba:mt-0.5 gba:w-4 gba:shrink-0" />
  )
}

function BulletStylePreview({ char, label }: { char: string; label: string }) {
  return (
    <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-3">
      <div className="gba:flex gba:w-14 gba:shrink-0 gba:items-center gba:gap-2">
        <span className="gba:text-sm gba:leading-none">{char}</span>
        <span className="gba:h-px gba:flex-1 gba:bg-border" />
      </div>
      <span className="gba:min-w-0 gba:text-sm">{label}</span>
    </div>
  )
}

function NumberingStylePreview({ preview }: { preview: string }) {
  return (
    <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-3">
      <span className="gba:w-24 gba:shrink-0 gba:text-sm">{preview}</span>
      <span className="gba:h-px gba:flex-1 gba:bg-border" />
    </div>
  )
}

function IconTooltipButton({
  tooltip,
  children,
  ...buttonProps
}: React.ComponentProps<typeof Button> & {
  tooltip: string
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="gba:inline-flex">
            <Button {...buttonProps}>{children}</Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
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

  const handleUpdate = (updates: RichTextFormattingUpdate) => {
    onUpdateElement(element.id, updates)
  }

  const firstParagraph = getFirstParagraph(element)
  const fontFamilyValue = formatting?.isFontFamilyMixed ? '' : (formatting?.fontFamily ?? element.fontFamily)
  const resolvedFontSize = formatting?.isFontSizeMixed ? undefined : (formatting?.fontSize ?? element.fontSize)
  const resolvedFontSizePoints = fontSizePixelsToPoints(resolvedFontSize)
  const fontFamilyOptions = getFontFamilyOptions(fontFamilyValue)
  const fontSizeOptions = getFontSizeOptions(resolvedFontSize)
  const resolvedTextAlign = formatting?.isTextAlignMixed ? undefined : (formatting?.textAlign ?? element.textAlign)
  const resolvedColor = formatting?.isColorMixed ? undefined : (formatting?.color ?? element.color)
  const resolvedBulletType = formatting?.isBulletTypeMixed
    ? undefined
    : (formatting?.bulletType ?? firstParagraph?.bulletType ?? 'none')
  const resolvedBulletChar = formatting?.bulletChar ?? firstParagraph?.bulletChar ?? DEFAULT_BULLET_GLYPH
  const resolvedNumberingStyle = formatting?.numberingStyle ?? firstParagraph?.numberingStyle ?? 'arabicPeriod'
  const resolvedIndentLevel = formatting?.indentLevel ?? firstParagraph?.indentLevel ?? 0
  const canAdjustIndent = resolvedBulletType !== undefined && resolvedBulletType !== 'none'

  const boldState = formatting?.fontWeightState ?? (element.fontWeight === 'bold' ? 'on' : 'off')
  const italicState = formatting?.fontStyleState ?? (element.fontStyle === 'italic' ? 'on' : 'off')
  const underlineState = formatting?.underlineState ?? (element.textDecoration === 'underline' ? 'on' : 'off')
  const strikethroughState =
    formatting?.strikethroughState ?? (element.textDecoration === 'line-through' ? 'on' : 'off')

  return (
    <React.Fragment>
      {/* Font Family */}
      <Select value={fontFamilyValue} onValueChange={value => value && handleUpdate({ fontFamily: value })}>
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
      <SlideFontSizeControl
        value={resolvedFontSizePoints}
        options={fontSizeOptions}
        placeholder={formatting?.isFontSizeMixed ? '' : t('editor-font-size') || 'Font size'}
        ariaLabel={t('editor-font-size') || 'Font size'}
        testId={testId ? `${testId}-font-size-input` : undefined}
        className="gba:w-20"
        onCommit={nextFontSizePoints => {
          const nextFontSize = fontSizePointsToPixels(nextFontSizePoints)
          if (nextFontSize !== undefined) {
            handleUpdate({ fontSize: nextFontSize })
          }
        }}
      />

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Bold */}
      <IconTooltipButton
        variant={toggleVariantForState(boldState)}
        size="sm"
        className={toggleClassNameForState(boldState)}
        onClick={() => handleUpdate({ fontWeight: boldState === 'on' ? 'normal' : 'bold' })}
        tooltip={boldState === 'mixed' ? `${t('editor-bold')} (${mixedLabel})` : t('editor-bold') || 'Bold'}
        data-testid={testId ? `${testId}-bold` : undefined}
      >
        <TextBIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>

      {/* Italic */}
      <IconTooltipButton
        variant={toggleVariantForState(italicState)}
        size="sm"
        className={toggleClassNameForState(italicState)}
        onClick={() => handleUpdate({ fontStyle: italicState === 'on' ? 'normal' : 'italic' })}
        tooltip={italicState === 'mixed' ? `${t('editor-italic')} (${mixedLabel})` : t('editor-italic') || 'Italic'}
        data-testid={testId ? `${testId}-italic` : undefined}
      >
        <TextItalicIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>

      {/* Underline */}
      <IconTooltipButton
        variant={toggleVariantForState(underlineState)}
        size="sm"
        className={toggleClassNameForState(underlineState)}
        onClick={() => handleUpdate({ textDecoration: underlineState === 'on' ? 'none' : 'underline' })}
        tooltip={
          underlineState === 'mixed' ? `${t('editor-underline')} (${mixedLabel})` : t('editor-underline') || 'Underline'
        }
        data-testid={testId ? `${testId}-underline` : undefined}
      >
        <TextUnderlineIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>

      {/* Strikethrough */}
      <IconTooltipButton
        variant={toggleVariantForState(strikethroughState)}
        size="sm"
        className={toggleClassNameForState(strikethroughState)}
        onClick={() => handleUpdate({ textDecoration: strikethroughState === 'on' ? 'none' : 'line-through' })}
        tooltip={
          strikethroughState === 'mixed'
            ? `${t('editor-strikethrough')} (${mixedLabel})`
            : t('editor-strikethrough') || 'Strikethrough'
        }
        data-testid={testId ? `${testId}-strikethrough` : undefined}
      >
        <TextStrikethroughIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Alignment */}
      <IconTooltipButton
        variant={resolvedTextAlign === 'left' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'left' })}
        tooltip={t('editor-align-left') || 'Align left'}
        data-testid={testId ? `${testId}-align-left` : undefined}
      >
        <TextAlignLeftIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>
      <IconTooltipButton
        variant={resolvedTextAlign === 'center' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'center' })}
        tooltip={t('editor-align-center') || 'Align center'}
        data-testid={testId ? `${testId}-align-center` : undefined}
      >
        <TextAlignCenterIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>
      <IconTooltipButton
        variant={resolvedTextAlign === 'right' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleUpdate({ textAlign: 'right' })}
        tooltip={t('editor-align-right') || 'Align right'}
        data-testid={testId ? `${testId}-align-right` : undefined}
      >
        <TextAlignRightIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="gba:inline-flex">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={resolvedBulletType === 'bullet' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gba:h-8 gba:min-w-8 gba:px-1"
                    data-testid={testId ? `${testId}-list-bullets` : undefined}
                  >
                    <ListBulletsIcon className="gba:w-4 gba:h-4" />
                    <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('editor-list-bullets') || 'Bullets'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start" className="gba:w-72">
          <DropdownMenuItem
            onSelect={() => handleUpdate({ bulletType: 'none' })}
            className="gba:flex gba:items-center gba:gap-3 gba:py-2"
            data-testid={testId ? `${testId}-list-bullets-none` : undefined}
          >
            {renderListSelectionIndicator(resolvedBulletType === 'none')}
            <span className="gba:text-sm">{t('editor-list-none') || 'None'}</span>
          </DropdownMenuItem>
          {BULLET_PRESET_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.char}
              onSelect={() => handleUpdate({ bulletType: 'bullet', bulletChar: option.char })}
              className="gba:flex gba:items-center gba:gap-3 gba:py-2"
              aria-label={`${t('editor-list-bullets') || 'Bullets'} ${option.char}`}
              data-testid={testId ? `${testId}-list-bullet-${option.char.codePointAt(0)?.toString(16)}` : undefined}
            >
              {renderListSelectionIndicator(resolvedBulletType === 'bullet' && resolvedBulletChar === option.char)}
              <BulletStylePreview char={option.char} label={t(option.labelKey) || option.fallbackLabel} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="gba:inline-flex">
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={resolvedBulletType === 'number' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gba:h-8 gba:min-w-8 gba:px-1"
                    data-testid={testId ? `${testId}-list-numbering` : undefined}
                  >
                    <ListNumbersIcon className="gba:w-4 gba:h-4" />
                    <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('editor-list-numbering') || 'Numbering'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start" className="gba:w-72">
          <DropdownMenuItem
            onSelect={() => handleUpdate({ bulletType: 'none' })}
            className="gba:flex gba:items-center gba:gap-3 gba:py-2"
            data-testid={testId ? `${testId}-list-numbering-none` : undefined}
          >
            {renderListSelectionIndicator(resolvedBulletType === 'none')}
            <span className="gba:text-sm">{t('editor-list-none') || 'None'}</span>
          </DropdownMenuItem>
          {NUMBERING_STYLE_PRESETS.map(style => (
            <DropdownMenuItem
              key={style}
              onSelect={() => handleUpdate({ bulletType: 'number', numberingStyle: style })}
              className="gba:flex gba:items-center gba:gap-3 gba:py-2"
              aria-label={`${t('editor-list-numbering') || 'Numbering'} ${numberingStylePreview(style)}`}
              data-testid={testId ? `${testId}-list-numbering-${style}` : undefined}
            >
              {renderListSelectionIndicator(resolvedBulletType === 'number' && resolvedNumberingStyle === style)}
              <NumberingStylePreview preview={numberingStylePreview(style)} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-8 gba:min-w-8 gba:px-1"
                disabled={!canAdjustIndent || resolvedIndentLevel <= 0}
                onClick={() => handleUpdate({ indentLevel: Math.max(0, resolvedIndentLevel - 1) })}
                data-testid={testId ? `${testId}-list-outdent` : undefined}
              >
                <TextOutdentIcon className="gba:w-4 gba:h-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('editor-list-outdent') || 'Outdent'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="gba:h-8 gba:min-w-8 gba:px-1"
                disabled={!canAdjustIndent}
                onClick={() => handleUpdate({ indentLevel: resolvedIndentLevel + 1 })}
                data-testid={testId ? `${testId}-list-indent` : undefined}
              >
                <TextIndentIcon className="gba:w-4 gba:h-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('editor-list-indent') || 'Indent'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

      {/* Text Color */}
      <Popover>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="gba:inline-flex">
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid={testId ? `${testId}-text-color` : undefined}>
                    <PaletteIcon className="gba:w-4 gba:h-4" />
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
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('editor-text-color') || 'Text color'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
      <IconTooltipButton
        variant="ghost"
        size="sm"
        onClick={onShowLinkDialog}
        tooltip={t('editor-link') || 'Link'}
        data-testid={testId ? `${testId}-link` : undefined}
      >
        <LinkIcon className="gba:w-4 gba:h-4" />
      </IconTooltipButton>
    </React.Fragment>
  )
}
