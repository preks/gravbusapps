/**
 * EditorToolbar Component
 *
 * Professional Word-like toolbar for the PagedDocumentEditor
 * with comprehensive formatting options.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Input,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { VoiceInputButton, VoiceVisualizer, useVoiceInput, normalizeDictationTranscript } from '../../../shared'
import translations from '../../_i18n'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Link,
  Image,
  Table,
  Subscript,
  Superscript,
  Highlighter,
  Minus,
  ChevronDown,
  Palette,
  Type,
  IndentIncrease,
  IndentDecrease,
  RemoveFormatting,
  SeparatorHorizontal,
  Check,
  AlignVerticalJustifyCenter,
  ListChecks
} from 'lucide-react'
import { getCurrentSpacing } from './extensions/LineAndParagraphSpacing'

interface EditorToolbarProps {
  editor: Editor | null
  onInsertPageBreak?: () => void
  /** When set, link toolbar button opens Link dialog instead of URL prompt */
  onOpenLinkDialog?: () => void
  /** When set, image toolbar button opens Insert Image dialog instead of URL prompt */
  onOpenInsertImageDialog?: () => void
  'data-testid'?: string
}

// Font families available (labels via i18n)
const FONT_FAMILY_KEYS: Record<string, string> = {
  '': 'editor-font-default',
  'Arial, sans-serif': 'editor-font-arial',
  'Times New Roman, serif': 'editor-font-times',
  'Georgia, serif': 'editor-font-georgia',
  'Verdana, sans-serif': 'editor-font-verdana',
  'Courier New, monospace': 'editor-font-courier',
  'Garamond, serif': 'editor-font-garamond',
  'Trebuchet MS, sans-serif': 'editor-font-trebuchet',
  'Calibri, Candara, Segoe UI, sans-serif': 'editor-font-calibri',
  'Cambria, Georgia, serif': 'editor-font-cambria',
  'Tahoma, Verdana, sans-serif': 'editor-font-tahoma',
  'Comic Sans MS, cursive': 'editor-font-comic-sans',
  'Consolas, Courier New, monospace': 'editor-font-consolas',
  'Palatino Linotype, Palatino, Book Antiqua, serif': 'editor-font-palatino',
  'Century Gothic, CenturyGothic, sans-serif': 'editor-font-century-gothic',
  'Constantia, Georgia, serif': 'editor-font-constantia',
  'Candara, Segoe UI, sans-serif': 'editor-font-candara',
  'Corbel, Candara, sans-serif': 'editor-font-corbel'
}
const FONT_FAMILIES = [
  { value: '' },
  { value: 'Arial, sans-serif' },
  { value: 'Times New Roman, serif' },
  { value: 'Georgia, serif' },
  { value: 'Verdana, sans-serif' },
  { value: 'Courier New, monospace' },
  { value: 'Garamond, serif' },
  { value: 'Trebuchet MS, sans-serif' },
  { value: 'Calibri, Candara, Segoe UI, sans-serif' },
  { value: 'Cambria, Georgia, serif' },
  { value: 'Tahoma, Verdana, sans-serif' },
  { value: 'Comic Sans MS, cursive' },
  { value: 'Consolas, Courier New, monospace' },
  { value: 'Palatino Linotype, Palatino, Book Antiqua, serif' },
  { value: 'Century Gothic, CenturyGothic, sans-serif' },
  { value: 'Constantia, Georgia, serif' },
  { value: 'Candara, Segoe UI, sans-serif' },
  { value: 'Corbel, Candara, sans-serif' }
]

// Font sizes
const FONT_SIZES = [
  { label: '5', value: '5pt' },
  { label: '5.5', value: '5.5pt' },
  { label: '6.5', value: '6.5pt' },
  { label: '7.5', value: '7.5pt' },
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '10.5', value: '10.5pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '22', value: '22pt' },
  { label: '24', value: '24pt' },
  { label: '26', value: '26pt' },
  { label: '28', value: '28pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
  { label: '72', value: '72pt' }
]

// Heading levels
const HEADING_LEVELS = [
  { label: 'Normal', value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
  { label: 'Heading 4', value: 4 },
  { label: 'Heading 5', value: 5 },
  { label: 'Heading 6', value: 6 }
]

// Line spacing presets (value = line-height multiplier). Single uses 1.15 to match Google Docs.
const LINE_SPACING_OPTIONS = [
  { key: 'single', value: 1 },
  { key: '1-15', value: 1.15 },
  { key: '1-5', value: 1.5 },
  { key: 'double', value: 2 }
]

const PARAGRAPH_SPACING_EM = '0.5em'

// Color palette
const COLORS = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#B7B7B7',
  '#CCCCCC',
  '#D9D9D9',
  '#EFEFEF',
  '#F3F3F3',
  '#FFFFFF',
  '#980000',
  '#FF0000',
  '#FF9900',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#4A86E8',
  '#0000FF',
  '#9900FF',
  '#FF00FF',
  '#E6B8AF',
  '#F4CCCC',
  '#FCE5CD',
  '#FFF2CC',
  '#D9EAD3',
  '#D0E0E3',
  '#C9DAF8',
  '#CFE2F3',
  '#D9D2E9',
  '#EAD1DC',
  '#DD7E6B',
  '#EA9999',
  '#F9CB9C',
  '#FFE599',
  '#B6D7A8',
  '#A2C4C9',
  '#A4C2F4',
  '#9FC5E8',
  '#B4A7D6',
  '#D5A6BD',
  '#CC4125',
  '#E06666',
  '#F6B26B',
  '#FFD966',
  '#93C47D',
  '#76A5AF',
  '#6D9EEB',
  '#6FA8DC',
  '#8E7CC3',
  '#C27BA0',
  '#A61C00',
  '#CC0000',
  '#E69138',
  '#F1C232',
  '#6AA84F',
  '#45818E',
  '#3C78D8',
  '#3D85C6',
  '#674EA7',
  '#A64D79',
  '#85200C',
  '#990000',
  '#B45F06',
  '#BF9000',
  '#38761D',
  '#134F5C',
  '#1155CC',
  '#0B5394',
  '#351C75',
  '#741B47'
]

// Highlight colors
const HIGHLIGHT_COLORS = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FF0000', '#0000FF', '#FFA500', '#FFB6C1']

/**
 * Toolbar button with tooltip
 */
const ToolbarButton: React.FC<{
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
  children: React.ReactNode
}> = ({ onClick, isActive, disabled, tooltip, children }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="gba:h-8 gba:w-8 gba:p-0"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

/**
 * EditorToolbar Component
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onInsertPageBreak,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  'data-testid': testId = 'editor-toolbar'
}) => {
  const { t, locale } = useTranslation(translations)
  const editorRef = useRef(editor)
  editorRef.current = editor
  const dictationStartRef = useRef<number | null>(null)
  const dictationEndRef = useRef<number | null>(null)
  const dictationLanguage = locale ?? 'en-US'

  const applyDictationToEditor = useCallback((text: string) => {
    const ed = editorRef.current
    if (!ed || !text) return
    let start = dictationStartRef.current
    const end = dictationEndRef.current ?? start ?? ed.state.selection.from
    try {
      const content = { type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }
      if (start == null) {
        start = ed.state.selection.from
        ed.chain().focus().deleteSelection().insertContent(content).run()
        dictationStartRef.current = start
        dictationEndRef.current = ed.state.selection.from
        return
      }
      if (start === end) {
        ed.chain().focus().setTextSelection(start).insertContent(content).run()
      } else {
        ed.chain().focus().setTextSelection({ from: start, to: end }).deleteSelection().insertContent(content).run()
      }
      dictationEndRef.current = ed.state.selection.from
    } catch (err) {
      console.error('[EditorToolbar] dictate insert failed', err)
    }
  }, [])

  const voiceInput = useVoiceInput({
    language: dictationLanguage,
    continuous: true,
    interimResults: true,
    autoStopOnSilence: false,
    onTranscript: (transcript: string) => {
      const raw = transcript.trim()
      if (!raw) return
      const text = normalizeDictationTranscript(raw, dictationLanguage)
      requestAnimationFrame(() => applyDictationToEditor(text))
    },
    onEnd: () => {
      // Text is already in the document from onTranscript; only clear dictation range.
      dictationStartRef.current = null
      dictationEndRef.current = null
    }
  })

  const handleStartListening = useCallback(() => {
    if (editor) {
      dictationStartRef.current = editor.state.selection.from
      dictationEndRef.current = editor.state.selection.from
    }
    voiceInput.startListening()
  }, [editor, voiceInput.startListening])

  useEffect(() => {
    if (!voiceInput.isListening) {
      dictationStartRef.current = null
      dictationEndRef.current = null
    }
  }, [voiceInput.isListening])

  useEffect(() => {
    if (!editor && voiceInput.isListening) {
      voiceInput.stopListening()
    }
  }, [editor, voiceInput.isListening, voiceInput.stopListening])

  const handleLinkClick = useCallback(() => {
    if (!editor) return
    if (onOpenLinkDialog) {
      onOpenLinkDialog()
    } else {
      const previousUrl = editor.getAttributes('link').href
      const url = window.prompt(t('editor-toolbar-link-prompt'), previousUrl)
      if (url === null) return
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor, t, onOpenLinkDialog])

  const addImage = useCallback(() => {
    if (!editor) return
    if (onOpenInsertImageDialog) {
      onOpenInsertImageDialog()
      return
    }
    const url = window.prompt(t('editor-toolbar-image-prompt'))
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor, t, onOpenInsertImageDialog])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const getCurrentHeading = () => {
    if (!editor) return t('editor-heading-normal')
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) {
        return t(`editor-heading-${i}`)
      }
    }
    return t('editor-heading-normal')
  }

  const [, setSelectionTick] = useState(0)
  const [fontSizeInputValue, setFontSizeInputValue] = useState<string | null>(null)
  useEffect(() => {
    if (!editor) return
    const onSelectionUpdate = () => setSelectionTick(t => t + 1)
    editor.on('selectionUpdate', onSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate)
    }
  }, [editor])

  const getCurrentFont = (): { label: string; value: string } => {
    if (!editor) return { label: t('editor-font-default'), value: '' }
    const fontFamily = editor.getAttributes('textStyle').fontFamily as string | undefined
    const value = fontFamily?.trim() ?? ''
    const label =
      value && FONT_FAMILY_KEYS[value] != null ? t(FONT_FAMILY_KEYS[value]) : value || t('editor-font-default')
    return { label, value }
  }

  const getCurrentFontSize = (): string => {
    if (!editor) return '12'
    const fontSize = editor.getAttributes('textStyle').fontSize as string | undefined
    if (!fontSize) return '12'
    const re = /^(\d+(?:\.\d+)?)/
    const match = re.exec(fontSize)
    return match ? match[1] : '12'
  }

  const applyCustomFontSize = useCallback(
    (raw: string) => {
      if (!editor) return
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

  if (!editor) {
    return null
  }

  const currentFont = getCurrentFont()
  const currentFontSize = getCurrentFontSize()
  const fontSizeDisplay = fontSizeInputValue ?? currentFontSize

  return (
    <>
      <div
        className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:p-2 gba:border-b gba:bg-muted/30"
        data-testid={testId}
      >
        {/* Undo/Redo */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip={t('editor-toolbar-undo')}
          >
            <Undo className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip={t('editor-toolbar-redo')}
          >
            <Redo className="gba:h-4 gba:w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Dictate */}
        {voiceInput.isSupported && (
          <>
            <VoiceInputButton
              isListening={voiceInput.isListening}
              isSupported={voiceInput.isSupported}
              volume={voiceInput.volume}
              error={voiceInput.error}
              onStartListening={handleStartListening}
              onStopListening={voiceInput.stopListening}
              size="sm"
              data-testid={`${testId}-dictate`}
            />
            <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />
          </>
        )}

        {/* Heading/Paragraph Style */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-8 gba:min-w-[100px] gba:justify-between">
              <span className="gba:text-xs">{getCurrentHeading()}</span>
              <ChevronDown className="gba:h-3 gba:w-3 gba:ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {HEADING_LEVELS.map(({ label, value }) => (
              <DropdownMenuItem
                key={label}
                onClick={() => {
                  if (value === 0) {
                    editor.chain().focus().setParagraph().run()
                  } else {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: value as 1 | 2 | 3 | 4 | 5 | 6 })
                      .run()
                  }
                }}
              >
                {value === 0 ? t('editor-heading-normal') : t(`editor-heading-${value}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Family — shows the font at the current cursor position */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-8 gba:min-w-[100px] gba:justify-between"
              data-testid="editor-toolbar-font"
            >
              <Type className="gba:h-3 gba:w-3 gba:mr-1" />
              <span className="gba:text-xs gba:truncate" style={{ fontFamily: currentFont.value || 'inherit' }}>
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
                  if (value) {
                    editor.chain().focus().setFontFamily(value).run()
                  } else {
                    editor.chain().focus().unsetFontFamily().run()
                  }
                }}
                style={{ fontFamily: value || 'inherit' }}
              >
                {t(FONT_FAMILY_KEYS[value] ?? 'editor-font-default')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size — editable like MS Word: type any value or pick from presets */}
        <div
          className="gba:flex gba:items-center gba:h-8 gba:border gba:rounded-md gba:border-border gba:overflow-hidden gba:min-w-0"
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
                className="gba:h-8 gba:w-7 gba:p-0 gba:rounded-none gba:border-l gba:border-border"
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

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Text Formatting */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
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
        </div>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Text Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
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

        {/* Highlight Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
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

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Alignment */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip={t('editor-toolbar-align-left')}
          >
            <AlignLeft className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip={t('editor-toolbar-align-center')}
          >
            <AlignCenter className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip={t('editor-toolbar-align-right')}
          >
            <AlignRight className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            tooltip={t('editor-toolbar-justify')}
          >
            <AlignJustify className="gba:h-4 gba:w-4" />
          </ToolbarButton>
        </div>

        {/* Line and paragraph spacing */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-8 gba:w-8 gba:p-0"
              data-testid="editor-toolbar-line-spacing"
              title={t('editor-toolbar-line-paragraph-spacing')}
            >
              <AlignVerticalJustifyCenter className="gba:h-4 gba:w-4" />
              <ChevronDown className="gba:h-3 gba:w-3 gba:ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={e => {
              e.preventDefault()
              editor.commands.focus()
            }}
          >
            {LINE_SPACING_OPTIONS.map(({ key, value }) => {
              const spacing = getCurrentSpacing(editor)
              const effective = spacing.lineHeight ?? 1.15
              const isActive = Math.abs(Number(effective) - value) < 0.01
              return (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => {
                    const v = value
                    requestAnimationFrame(() => {
                      editor.chain().focus().setLineHeight(v).run()
                    })
                  }}
                >
                  {isActive ? <Check className="gba:h-4 gba:w-4 gba:mr-2" /> : <span className="gba:w-4 gba:mr-2" />}
                  {t(`editor-line-spacing-${key}`)}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                requestAnimationFrame(() => {
                  editor.chain().focus().setMarginBefore(PARAGRAPH_SPACING_EM).run()
                })
              }}
            >
              {t('editor-paragraph-spacing-before')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                requestAnimationFrame(() => {
                  editor.chain().focus().setMarginAfter(PARAGRAPH_SPACING_EM).run()
                })
              }}
            >
              {t('editor-paragraph-spacing-after')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                requestAnimationFrame(() => {
                  editor.chain().focus().unsetMarginBefore().run()
                })
              }}
            >
              {t('editor-paragraph-spacing-remove-before')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                requestAnimationFrame(() => {
                  editor.chain().focus().unsetMarginAfter().run()
                })
              }}
            >
              {t('editor-paragraph-spacing-remove-after')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* List dropdown (Bullet, Ordered, Task) & Indentation */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <DropdownMenu>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={
                        editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')
                          ? 'secondary'
                          : 'ghost'
                      }
                      size="sm"
                      className="gba:h-8 gba:min-w-8 gba:px-1"
                      data-testid={testId ? `${testId}-list-dropdown-trigger` : undefined}
                    >
                      <List className="gba:h-4 gba:w-4" />
                      <ChevronDown className="gba:h-3.5 gba:w-3.5 gba:ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('editor-toolbar-bullet-list')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start" className="gba:min-w-[10rem]">
              <DropdownMenuItem
                onSelect={() => editor.chain().focus().toggleBulletList().run()}
                data-testid={testId ? `${testId}-list-dropdown-bullet` : undefined}
              >
                <List className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('editor-toolbar-bullet-list')}
                {editor.isActive('bulletList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => editor.chain().focus().toggleOrderedList().run()}
                data-testid={testId ? `${testId}-list-dropdown-ordered` : undefined}
              >
                <ListOrdered className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('editor-toolbar-numbered-list')}
                {editor.isActive('orderedList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => editor.chain().focus().toggleTaskList().run()}
                data-testid={testId ? `${testId}-list-dropdown-task` : undefined}
              >
                <ListChecks className="gba:h-4 gba:w-4 gba:mr-2" />
                {t('editor-toolbar-task-list')}
                {editor.isActive('taskList') && <Check className="gba:ml-auto gba:h-4 gba:w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarButton
            onClick={() => {
              const itemType = editor.isActive('taskList') ? 'taskItem' : 'listItem'
              editor.chain().focus().liftListItem(itemType).run()
            }}
            disabled={!editor.can().liftListItem('listItem') && !editor.can().liftListItem('taskItem')}
            tooltip={t('editor-toolbar-decrease-indent')}
          >
            <IndentDecrease className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              const itemType = editor.isActive('taskList') ? 'taskItem' : 'listItem'
              editor.chain().focus().sinkListItem(itemType).run()
            }}
            disabled={!editor.can().sinkListItem('listItem') && !editor.can().sinkListItem('taskItem')}
            tooltip={t('editor-toolbar-increase-indent')}
          >
            <IndentIncrease className="gba:h-4 gba:w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Block Elements */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip={t('editor-toolbar-quote')}
          >
            <Quote className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            tooltip={t('editor-toolbar-code-block')}
          >
            <Code className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip={t('editor-toolbar-horizontal-rule')}
          >
            <Minus className="gba:h-4 gba:w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Insert Elements */}
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <ToolbarButton
            onClick={handleLinkClick}
            isActive={editor.isActive('link')}
            tooltip={t('editor-toolbar-insert-link')}
          >
            <Link className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} tooltip={t('editor-toolbar-insert-image')}>
            <Image className="gba:h-4 gba:w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={insertTable} tooltip={t('editor-toolbar-insert-table')}>
            <Table className="gba:h-4 gba:w-4" />
          </ToolbarButton>
        </div>

        <Separator orientation="vertical" className="gba:h-6 gba:mx-1" />

        {/* Page Break */}
        <ToolbarButton
          onClick={() => {
            editor.chain().focus().setPageBreak().run()
            onInsertPageBreak?.()
          }}
          tooltip={t('editor-toolbar-page-break')}
        >
          <SeparatorHorizontal className="gba:h-4 gba:w-4" />
        </ToolbarButton>

        {/* Clear Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tooltip={t('editor-toolbar-clear-formatting')}
        >
          <RemoveFormatting className="gba:h-4 gba:w-4" />
        </ToolbarButton>
      </div>

      {voiceInput.isListening && (
        <div className="gba:px-2 gba:py-2 gba:border-b gba:bg-muted/20" data-testid={`${testId}-voice-visualizer`}>
          <VoiceVisualizer
            volume={voiceInput.volume}
            isListening={voiceInput.isListening}
            interimText={voiceInput.interimTranscript}
            data-testid="document-toolbar-voice-visualizer"
          />
        </div>
      )}
    </>
  )
}

export default EditorToolbar
