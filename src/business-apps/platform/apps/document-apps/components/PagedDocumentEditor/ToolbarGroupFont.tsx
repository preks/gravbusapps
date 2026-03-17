/**
 * Ribbon group: Font family, size, bold/italic/underline, color, highlight.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  ChevronDown,
  Palette,
  Type
} from 'lucide-react'
import translations from '../../_i18n'
import {
  ToolbarButton,
  RibbonGroup,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY_KEYS,
  FONT_FAMILIES,
  FONT_SIZES,
  COLORS,
  HIGHLIGHT_COLORS
} from './editorToolbarShared'

interface ToolbarGroupFontProps {
  editor: Editor
  testId?: string
}

export function ToolbarGroupFont({ editor, testId = 'editor-toolbar' }: Readonly<ToolbarGroupFontProps>) {
  const { t } = useTranslation(translations)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setter used for selection sync; value intentionally unused (Sonar S3735)
  const [_selectionTick, setSelectionTick] = useState(0)
  const [fontSizeInputValue, setFontSizeInputValue] = useState<string | null>(null)

  useEffect(() => {
    const onSelectionUpdate = () => setSelectionTick(s => s + 1)
    editor.on('selectionUpdate', onSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor])

  const getCurrentFont = (): { label: string; value: string } => {
    const fontFamily = editor.getAttributes('textStyle').fontFamily as string | undefined
    const value = fontFamily?.trim() ?? ''
    const effectiveValue = value || DEFAULT_FONT_FAMILY
    const label = FONT_FAMILY_KEYS[value] != null ? t(FONT_FAMILY_KEYS[value]) : effectiveValue
    return { label, value: effectiveValue }
  }

  const getCurrentFontSize = (): string => {
    const fontSize = editor.getAttributes('textStyle').fontSize as string | undefined
    if (!fontSize) return '12'
    const match = /^(\d+(?:\.\d+)?)/.exec(fontSize)
    return match ? match[1] : '12'
  }

  const applyCustomFontSize = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) {
        setFontSizeInputValue(null)
        return
      }
      const num = Number.parseFloat(trimmed.replace(',', '.'))
      if (Number.isNaN(num) || num < 0.5 || num > 1638) {
        setFontSizeInputValue(null)
        return
      }
      editor.chain().focus().setFontSize(`${num}pt`).run()
      setFontSizeInputValue(null)
    },
    [editor]
  )

  const currentFont = getCurrentFont()
  const currentFontSize = getCurrentFontSize()
  const fontSizeDisplay = fontSizeInputValue ?? currentFontSize

  return (
    <RibbonGroup label={t('editor-ribbon-group-font')} data-testid={testId ? `${testId}-group-font` : undefined}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:w-[140px] gba:justify-between gba:border-border/70 gba:bg-background"
            data-testid="editor-toolbar-font"
          >
            <Type className="gba:h-3 gba:w-3 gba:mr-1" />
            <span
              className="gba:min-w-0 gba:flex-1 gba:text-xs gba:truncate gba:text-left"
              style={{ fontFamily: currentFont.value }}
            >
              {currentFont.label}
            </span>
            <ChevronDown className="gba:h-3 gba:w-3 gba:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {FONT_FAMILIES.map(({ value }) => (
            <DropdownMenuItem
              key={value || 'default'}
              onClick={() => {
                if (value) editor.chain().focus().setFontFamily(value).run()
                else editor.chain().focus().unsetFontFamily().run()
              }}
              style={{ fontFamily: value || DEFAULT_FONT_FAMILY }}
            >
              {t(FONT_FAMILY_KEYS[value] ?? 'editor-font-times')}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div
        className="gba:flex gba:min-w-0 gba:items-center gba:h-8 gba:overflow-hidden gba:rounded-md gba:border gba:border-border/70 gba:bg-background"
        data-testid="editor-toolbar-font-size"
      >
        <Input
          type="text"
          inputMode="decimal"
          value={fontSizeDisplay}
          onChange={e => setFontSizeInputValue(e.target.value)}
          onFocus={() => setFontSizeInputValue(currentFontSize)}
          onBlur={() => applyCustomFontSize(fontSizeDisplay)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyCustomFontSize(fontSizeDisplay)
              ;(e.target as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              setFontSizeInputValue(null)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="gba:h-8 gba:w-12 gba:border-0 gba:rounded-none gba:text-xs gba:text-center gba:focus-visible:ring-0"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-8 gba:w-7 gba:rounded-none gba:border-l gba:border-border/70 gba:p-0"
            >
              <ChevronDown className="gba:h-3 gba:w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="gba:max-h-64 gba:overflow-y-auto">
            {FONT_SIZES.map(({ label, value }) => (
              <DropdownMenuItem
                key={label}
                onClick={() => {
                  editor.chain().focus().setFontSize(value).run()
                  setFontSizeInputValue(null)
                }}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        tooltip={t('editor-toolbar-bold')}
      >
        <Bold className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        tooltip={t('editor-toolbar-italic')}
      >
        <Italic className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        tooltip={t('editor-toolbar-underline')}
      >
        <Underline className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        tooltip={t('editor-toolbar-strike')}
      >
        <Strikethrough className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        tooltip={t('editor-toolbar-subscript')}
      >
        <Subscript className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        tooltip={t('editor-toolbar-superscript')}
      >
        <Superscript className="gba:h-4 gba:w-4" />
      </ToolbarButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:w-8 gba:border-border/70 gba:bg-background gba:p-0"
          >
            <Palette className="gba:h-4 gba:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="gba:w-64 gba:p-2">
          <div className="gba:text-xs gba:font-medium gba:mb-2">{t('editor-toolbar-text-color')}</div>
          <div className="gba:grid gba:grid-cols-10 gba:gap-1">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="gba:w-5 gba:h-5 gba:rounded gba:border gba:border-border hover:gba:scale-110 gba:transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <DropdownMenuSeparator className="gba:my-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="gba:w-full gba:text-xs"
          >
            {t('editor-toolbar-remove-color')}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gba:h-8 gba:w-8 gba:border-border/70 gba:bg-background gba:p-0"
          >
            <Highlighter className="gba:h-4 gba:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="gba:p-2">
          <div className="gba:text-xs gba:font-medium gba:mb-2">{t('editor-toolbar-highlight')}</div>
          <div className="gba:grid gba:grid-cols-4 gba:gap-1">
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color}
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                className="gba:w-6 gba:h-6 gba:rounded gba:border gba:border-border hover:gba:scale-110 gba:transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <DropdownMenuSeparator className="gba:my-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="gba:w-full gba:text-xs"
          >
            {t('editor-toolbar-remove-highlight')}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </RibbonGroup>
  )
}
