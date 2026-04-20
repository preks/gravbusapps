import React, { useCallback, useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  Link2Off,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
import translations from '../../_i18n'

interface RowPageToolbarProps {
  editor: Editor
}

function ToolbarButton({
  isActive,
  onClick,
  icon: Icon,
  label,
  testId
}: {
  isActive: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  testId: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`gba:h-7 gba:w-7 gba:shrink-0 ${isActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
      aria-label={label}
      data-testid={testId}
    >
      <Icon className="gba:h-3.5 gba:w-3.5" />
    </Button>
  )
}

export function RowPageToolbar({ editor }: RowPageToolbarProps) {
  const { t } = useTranslation(translations)
  const [linkInput, setLinkInput] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  const toggleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const existing = editor.getAttributes('link').href ?? ''
    setLinkInput(existing)
    setShowLinkInput(true)
  }, [editor])

  const submitLink = useCallback(() => {
    const url = linkInput.trim()
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkInput('')
  }, [editor, linkInput])

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed, state }) => {
        const { from, to } = state.selection
        if (from === to) return false
        if (ed.isActive('image')) return false
        return true
      }}
      tippyOptions={{ duration: 150, placement: 'top', maxWidth: 'none' }}
    >
      <div
        className="gba:flex gba:items-center gba:gap-0.5 gba:rounded-lg gba:border gba:bg-popover gba:p-1 gba:shadow-lg"
        data-testid="row-page-toolbar"
      >
        {showLinkInput ? (
          <div className="gba:flex gba:items-center gba:gap-1">
            <input
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitLink()
                }
                if (e.key === 'Escape') {
                  setShowLinkInput(false)
                  setLinkInput('')
                }
              }}
              placeholder="https://..."
              className="gba:h-7 gba:w-44 gba:rounded gba:border gba:bg-background gba:px-2 gba:text-xs gba:outline-none gba:focus:ring-1 gba:focus:ring-ring"
              autoFocus
              data-testid="row-page-toolbar-link-input"
            />
            <Button variant="ghost" size="icon" className="gba:h-7 gba:w-7" onClick={submitLink}>
              <Link2 className="gba:h-3.5 gba:w-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <ToolbarButton
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              icon={Bold}
              label={t('board-rich-text-bold')}
              testId="toolbar-bold"
            />
            <ToolbarButton
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              icon={Italic}
              label={t('board-rich-text-italic')}
              testId="toolbar-italic"
            />
            <ToolbarButton
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              icon={Underline}
              label={t('board-rich-text-underline')}
              testId="toolbar-underline"
            />
            <ToolbarButton
              isActive={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              icon={Strikethrough}
              label={t('board-rich-text-strikethrough')}
              testId="toolbar-strike"
            />
            <ToolbarButton
              isActive={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
              icon={Code}
              label={t('board-rich-text-code')}
              testId="toolbar-code"
            />

            <div className="gba:mx-0.5 gba:h-4 gba:w-px gba:bg-border" />

            <ToolbarButton
              isActive={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              icon={Highlighter}
              label={t('board-rich-text-highlight')}
              testId="toolbar-highlight"
            />
            <ToolbarButton
              isActive={editor.isActive('link')}
              onClick={toggleLink}
              icon={editor.isActive('link') ? Link2Off : Link2}
              label={t('board-rich-text-link')}
              testId="toolbar-link"
            />

            <div className="gba:mx-0.5 gba:h-4 gba:w-px gba:bg-border" />

            <ToolbarButton
              isActive={editor.isActive({ textAlign: 'left' })}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              icon={AlignLeft}
              label={t('board-rich-text-align-left')}
              testId="toolbar-align-left"
            />
            <ToolbarButton
              isActive={editor.isActive({ textAlign: 'center' })}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              icon={AlignCenter}
              label={t('board-rich-text-align-center')}
              testId="toolbar-align-center"
            />
            <ToolbarButton
              isActive={editor.isActive({ textAlign: 'right' })}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              icon={AlignRight}
              label={t('board-rich-text-align-right')}
              testId="toolbar-align-right"
            />

            <div className="gba:mx-0.5 gba:h-4 gba:w-px gba:bg-border" />

            <ToolbarButton
              isActive={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              icon={Heading1}
              label={t('board-rich-text-heading-1')}
              testId="toolbar-h1"
            />
            <ToolbarButton
              isActive={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              icon={Heading2}
              label={t('board-rich-text-heading-2')}
              testId="toolbar-h2"
            />
            <ToolbarButton
              isActive={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              icon={Heading3}
              label={t('board-rich-text-heading-3')}
              testId="toolbar-h3"
            />
          </>
        )}
      </div>
    </BubbleMenu>
  )
}
