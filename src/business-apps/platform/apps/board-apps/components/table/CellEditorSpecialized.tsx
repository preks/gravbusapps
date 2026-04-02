/**
 * Specialized cell editors: Rating (clickable stars), Tags (free-form),
 * Date, DateTime. Extracted from CellEditor to stay under 300 lines.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input, Badge } from '@newwork/nw-design-system'
import { Star, X } from 'lucide-react'
import { BoardApiService } from '../../services/BoardApiService'

export const RatingEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ value, onSave, onCancel }) => {
  const current = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      const num = parseInt(e.key, 10)
      if (num >= 0 && num <= 5) onSave(num)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onSave, onCancel])

  const display = hovered ?? current

  return (
    <div className="gba:flex gba:items-center gba:gap-0.5 gba:py-0.5" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onSave(i === current ? 0 : i)}
          onMouseEnter={() => setHovered(i)}
          className="gba:p-0 gba:border-0 gba:bg-transparent gba:cursor-pointer"
          data-testid={`rating-star-${i}`}
        >
          <Star
            className={`gba:w-4 gba:h-4 gba:transition-colors ${
              i <= display ? 'gba:text-warning gba:fill-warning' : 'gba:text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export const TagsEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
  boardId?: string
  sheetId?: string
  columnName?: string
  initialKey?: string
}> = ({ value, onSave, onCancel, boardId, sheetId, columnName, initialKey }) => {
  const initial = useMemo<string[]>(() => {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value === 'string' && value)
      return value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    return []
  }, [value])

  const [tags, setTags] = useState<string[]>(initial)
  const [input, setInput] = useState(initialKey ?? '')
  const [allKnown, setAllKnown] = useState<string[]>([])
  const [hlIdx, setHlIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!boardId || !sheetId || !columnName) return
    let cancelled = false
    void BoardApiService.getColumnTags(boardId, sheetId, columnName).then(res => {
      if (!cancelled) setAllKnown(res)
    })
    return () => {
      cancelled = true
    }
  }, [boardId, sheetId, columnName])

  const items = useMemo<Array<{ label: string; value: string; isCreate?: boolean }>>(() => {
    const term = input.trim().toLowerCase()
    const matches = allKnown
      .filter(t => !tags.includes(t) && (!term || t.toLowerCase().includes(term)))
      .map(t => ({ label: t, value: t }))
    const exactMatch = term && allKnown.some(t => t.toLowerCase() === term)
    const alreadyAdded = term && tags.some(t => t.toLowerCase() === term)
    if (term && !exactMatch && !alreadyAdded) {
      matches.push({ label: `Create "${input.trim()}"`, value: input.trim(), isCreate: true })
    }
    return matches
  }, [allKnown, tags, input])

  useEffect(() => {
    setHlIdx(-1)
  }, [items.length, input])

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed || tags.includes(trimmed)) {
        setInput('')
        return
      }
      setTags(prev => [...prev, trimmed])
      setInput('')
    },
    [tags]
  )

  const save = useCallback(
    (finalTags: string[]) => {
      onSave(finalTags)
    },
    [onSave]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHlIdx(p => (items.length === 0 ? -1 : p + 1 >= items.length ? 0 : p + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHlIdx(p => (items.length === 0 ? -1 : p <= 0 ? items.length - 1 : p - 1))
        return
      }

      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        if (items.length > 0 && hlIdx >= 0 && hlIdx < items.length) {
          addTag(items[hlIdx].value)
        } else if (input.trim()) {
          addTag(input.trim())
        } else {
          save(tags)
        }
        return
      }
      if (e.key === 'Backspace' && !input && tags.length > 0) {
        setTags(prev => prev.slice(0, -1))
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        save(input.trim() ? [...tags, input.trim()] : tags)
      }
    },
    [addTag, input, tags, onCancel, items, hlIdx, save]
  )

  const handleBlur = useCallback(() => {
    blurRef.current = setTimeout(() => save(input.trim() ? [...tags, input.trim()] : tags), 150)
  }, [tags, input, save])

  const handleItemClick = useCallback(
    (val: string) => {
      if (blurRef.current) clearTimeout(blurRef.current)
      addTag(val)
      inputRef.current?.focus()
    },
    [addTag]
  )

  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const showDrop = items.length > 0

  useLayoutEffect(() => {
    if (!showDrop || !containerRef.current) {
      setDropPos(null)
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 180) })
  }, [showDrop, tags, input])

  return (
    <div ref={containerRef}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:min-h-6 gba:py-0.5">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gba:text-[10px] gba:gap-0.5 gba:pr-0.5 gba:py-0">
            {tag}
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                if (blurRef.current) clearTimeout(blurRef.current)
                setTags(prev => prev.filter(t => t !== tag))
                inputRef.current?.focus()
              }}
              className="gba:p-0 gba:border-0 gba:bg-transparent gba:cursor-pointer gba:rounded gba:hover:bg-muted"
            >
              <X className="gba:w-2.5 gba:h-2.5" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? 'Search or create tag...' : 'Add...'}
          className="gba:flex-1 gba:min-w-16 gba:h-5 gba:text-xs gba:bg-transparent gba:outline-none gba:border-0 gba:p-0"
          data-testid="tags-editor-input"
        />
      </div>
      {showDrop &&
        dropPos &&
        createPortal(
          <div
            className="gba:fixed gba:z-[9999] gba:rounded-md gba:border gba:border-border gba:bg-popover gba:shadow-md gba:overflow-y-auto gba:max-h-40 gba:py-0.5"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          >
            {items.map((item, i) => (
              <button
                key={item.isCreate ? '__create__' : item.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleItemClick(item.value)}
                className={`gba:w-full gba:text-left gba:px-2 gba:py-1 gba:text-xs gba:cursor-pointer gba:border-0 ${
                  i === hlIdx ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:bg-transparent gba:hover:bg-muted'
                } ${item.isCreate ? 'gba:italic gba:text-muted-foreground' : ''}`}
                data-testid={item.isCreate ? 'tags-create-new' : `tags-suggestion-${item.value}`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

export const DateEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ value, onSave, onCancel }) => {
  const initial = (() => {
    if (!value) return ''
    try {
      const d = new Date(String(value))
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    } catch {
      /* ignore */
    }
    return String(value)
  })()

  const [text, setText] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSave(text)
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [text, onSave, onCancel]
  )

  return (
    <Input
      ref={inputRef}
      type="date"
      value={text}
      onChange={e => {
        setText(e.target.value)
        onSave(e.target.value)
      }}
      onBlur={() => onSave(text)}
      onKeyDown={handleKeyDown}
      className="gba:h-6 gba:text-xs gba:px-1 gba:py-0"
    />
  )
}

export const DateTimeEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ value, onSave, onCancel }) => {
  const initial = (() => {
    if (!value) return ''
    try {
      const d = new Date(String(value))
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 16)
    } catch {
      /* ignore */
    }
    return String(value)
  })()

  const [text, setText] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSave(text)
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [text, onSave, onCancel]
  )

  return (
    <Input
      ref={inputRef}
      type="datetime-local"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => onSave(text)}
      onKeyDown={handleKeyDown}
      className="gba:h-6 gba:text-xs gba:px-1 gba:py-0"
    />
  )
}
