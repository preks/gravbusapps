import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Code2,
  ImageIcon,
  type LucideIcon
} from 'lucide-react'
import translations from '../../_i18n'

interface SlashMenuItem {
  title: string
  description: string
  icon: LucideIcon
  command: (editor: Editor) => void
}

interface RowPageSlashMenuProps {
  editor: Editor | null
  onInsertImage: () => void
}

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

function buildItems(t: TranslateFn, onInsertImage: () => void): SlashMenuItem[] {
  return [
    {
      title: t('board-rich-text-heading-1'),
      description: t('board-slash-heading-1-description'),
      icon: Heading1,
      command: ed => ed.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
      title: t('board-rich-text-heading-2'),
      description: t('board-slash-heading-2-description'),
      icon: Heading2,
      command: ed => ed.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      title: t('board-rich-text-heading-3'),
      description: t('board-slash-heading-3-description'),
      icon: Heading3,
      command: ed => ed.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
      title: t('board-slash-bullet-list'),
      description: t('board-slash-bullet-list-description'),
      icon: List,
      command: ed => ed.chain().focus().toggleBulletList().run()
    },
    {
      title: t('board-slash-numbered-list'),
      description: t('board-slash-numbered-list-description'),
      icon: ListOrdered,
      command: ed => ed.chain().focus().toggleOrderedList().run()
    },
    {
      title: t('board-slash-task-list'),
      description: t('board-slash-task-list-description'),
      icon: CheckSquare,
      command: ed => ed.chain().focus().toggleTaskList().run()
    },
    {
      title: t('board-slash-quote'),
      description: t('board-slash-quote-description'),
      icon: Quote,
      command: ed => ed.chain().focus().toggleBlockquote().run()
    },
    {
      title: t('board-slash-divider'),
      description: t('board-slash-divider-description'),
      icon: Minus,
      command: ed => ed.chain().focus().setHorizontalRule().run()
    },
    {
      title: t('board-slash-code-block'),
      description: t('board-slash-code-block-description'),
      icon: Code2,
      command: ed => ed.chain().focus().toggleCodeBlock().run()
    },
    {
      title: t('board-slash-image'),
      description: t('board-slash-image-description'),
      icon: ImageIcon,
      command: () => onInsertImage()
    }
  ]
}

export function RowPageSlashMenu({ editor, onInsertImage }: RowPageSlashMenuProps) {
  const { t } = useTranslation(translations)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const slashPosRef = useRef<number | null>(null)

  const items = buildItems(t, onInsertImage)
  const filtered = query
    ? items.filter(
        item =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
    : items

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
    slashPosRef.current = null
  }, [])

  const executeCommand = useCallback(
    (index: number) => {
      if (!editor || !filtered[index]) return
      const pos = slashPosRef.current
      if (pos != null) {
        const currentPos = editor.state.selection.from
        editor.chain().focus().deleteRange({ from: pos, to: currentPos }).run()
      }
      filtered[index].command(editor)
      close()
    },
    [editor, filtered, close]
  )

  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(i => (i + 1) % filtered.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        executeCommand(selectedIndex)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    const element = editor.view.dom
    element.addEventListener('keydown', handleKeyDown, true)
    return () => element.removeEventListener('keydown', handleKeyDown, true)
  }, [editor, isOpen, filtered.length, selectedIndex, executeCommand, close])

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const { state } = editor
      const { from } = state.selection
      const blockText = state.doc.textBetween(Math.max(0, from - 50), from, '\n', '\0')
      const currentLine = blockText.split('\n').pop() ?? ''
      const slashMatch = currentLine.match(/(?:^|\s)\/([\w]*)$/)

      if (slashMatch) {
        const queryLen = slashMatch[1].length
        const absolutePos = from - queryLen - 1
        slashPosRef.current = absolutePos

        setQuery(slashMatch[1])
        setSelectedIndex(0)
        setIsOpen(true)

        const coords = editor.view.coordsAtPos(from)
        const editorRect = editor.view.dom.closest('[data-testid]')?.getBoundingClientRect()
        if (editorRect) {
          setPosition({
            top: coords.bottom - editorRect.top + 4,
            left: coords.left - editorRect.left
          })
        } else {
          setPosition({ top: coords.bottom + 4, left: coords.left })
        }
      } else if (isOpen) {
        close()
      }
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor, isOpen, close])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  if (!isOpen || !position || filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="gba:absolute gba:z-50 gba:w-64 gba:max-h-72 gba:overflow-auto gba:rounded-lg gba:border gba:bg-popover gba:shadow-lg gba:animate-in gba:fade-in-0 gba:zoom-in-95"
      style={{ top: position.top, left: position.left }}
      data-testid="row-page-slash-menu"
    >
      <div className="gba:p-1">
        {filtered.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              type="button"
              className={`gba:flex gba:items-center gba:gap-3 gba:w-full gba:rounded-md gba:px-2.5 gba:py-2 gba:text-left gba:transition-colors ${
                index === selectedIndex
                  ? 'gba:bg-accent gba:text-accent-foreground'
                  : 'gba:text-popover-foreground gba:hover:bg-accent/50'
              }`}
              onClick={() => executeCommand(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              data-testid={`slash-item-${item.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <span className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-md gba:border gba:bg-background gba:shrink-0">
                <Icon className="gba:h-4 gba:w-4" />
              </span>
              <span className="gba:flex gba:flex-col gba:min-w-0">
                <span className="gba:text-sm gba:font-medium gba:truncate">{item.title}</span>
                <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{item.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
