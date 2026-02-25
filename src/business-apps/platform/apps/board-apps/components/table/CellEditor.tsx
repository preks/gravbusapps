import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Input,
  Checkbox,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { BoardColumn } from '../../types'
import { RatingEditor, TagsEditor, DateEditor, DateTimeEditor } from './CellEditorSpecialized'

export interface CellEditorProps {
  column: BoardColumn
  value: unknown
  onSave: (value: unknown) => void
  onCancel: () => void
  onMoveNext?: () => void
  initialKey?: string
  boardId?: string
  sheetId?: string
}

export const CellEditor: React.FC<CellEditorProps> = ({
  column,
  value,
  onSave,
  onCancel,
  onMoveNext,
  initialKey,
  boardId,
  sheetId
}) => {
  switch (column.type) {
    case 'boolean':
      return <BooleanEditor value={value} onSave={onSave} onCancel={onCancel} />
    case 'status':
    case 'priority':
    case 'select':
    case 'people':
      return <SelectEditor column={column} value={value} onSave={onSave} onCancel={onCancel} />
    case 'multiselect':
      return <MultiSelectEditor column={column} value={value} onSave={onSave} onCancel={onCancel} />
    case 'tags':
      return (
        <TagsEditor
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          boardId={boardId}
          sheetId={sheetId}
          columnName={column.name}
          initialKey={initialKey}
        />
      )
    case 'rating':
      return <RatingEditor value={value} onSave={onSave} onCancel={onCancel} />
    case 'date':
      return <DateEditor value={value} onSave={onSave} onCancel={onCancel} />
    case 'datetime':
      return <DateTimeEditor value={value} onSave={onSave} onCancel={onCancel} />
    case 'number':
    case 'currency':
    case 'percentage':
    case 'progress':
      return (
        <NumberEditor
          value={value}
          onSave={onSave}
          onCancel={onCancel}
          onMoveNext={onMoveNext}
          initialKey={initialKey}
        />
      )
    default:
      return (
        <TextEditor value={value} onSave={onSave} onCancel={onCancel} onMoveNext={onMoveNext} initialKey={initialKey} />
      )
  }
}

const TextEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
  onMoveNext?: () => void
  initialKey?: string
}> = ({ value, onSave, onCancel, onMoveNext, initialKey }) => {
  const [text, setText] = useState(initialKey !== undefined ? initialKey : value != null ? String(value) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initialKey !== undefined) {
      inputRef.current?.setSelectionRange(text.length, text.length)
    } else {
      inputRef.current?.select()
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSave(text)
        onMoveNext?.()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        onSave(text)
        onMoveNext?.()
      }
    },
    [text, onSave, onCancel, onMoveNext]
  )

  return (
    <Input
      ref={inputRef}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => onSave(text)}
      onKeyDown={handleKeyDown}
      className="gba:h-6 gba:text-xs gba:px-1 gba:py-0"
    />
  )
}

const NumberEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
  onMoveNext?: () => void
  initialKey?: string
}> = ({ value, onSave, onCancel, onMoveNext, initialKey }) => {
  const initial = initialKey !== undefined ? initialKey : value != null ? String(value) : ''
  const [text, setText] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const commit = useCallback(() => {
    const num = parseFloat(text)
    onSave(isNaN(num) ? text : num)
  }, [text, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
        onMoveNext?.()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        commit()
        onMoveNext?.()
      }
    },
    [commit, onCancel, onMoveNext]
  )

  return (
    <Input
      ref={inputRef}
      type="number"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="gba:h-6 gba:text-xs gba:px-1 gba:py-0"
    />
  )
}

const BooleanEditor: React.FC<{
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ value, onSave }) => {
  const current = String(value) === 'true'
  useEffect(() => {
    onSave(!current)
  }, [])
  return <Checkbox checked={!current} className="gba:h-3.5 gba:w-3.5" />
}

const SelectEditor: React.FC<{
  column: BoardColumn
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ column, value, onSave, onCancel }) => {
  const opts = column.selectOptions || []
  const currentVal = String(value || '')
  const [search, setSearch] = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const showSearch = opts.length > 8

  useEffect(() => {
    if (showSearch) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [showSearch])

  const filtered = useMemo(() => {
    if (!search.trim()) return opts
    const term = search.toLowerCase()
    return opts.filter(o => o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term))
  }, [opts, search])

  useEffect(() => {
    setFocusedIdx(-1)
  }, [search])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIdx(prev => {
          const next = Math.min(prev + 1, filtered.length - 1)
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIdx(prev => {
          const next = Math.max(prev - 1, 0)
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < filtered.length) {
          onSave(filtered[focusedIdx].value)
        } else if (filtered.length === 1) {
          onSave(filtered[0].value)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [filtered, focusedIdx, onSave, onCancel]
  )

  return (
    <Popover
      open
      onOpenChange={open => {
        if (!open) onCancel()
      }}
    >
      <PopoverTrigger asChild>
        <button className="gba:flex gba:items-center gba:gap-1 gba:h-6 gba:text-xs gba:px-1 gba:w-full gba:text-left">
          {(() => {
            const selectedOpt = currentVal ? opts.find(o => o.value === currentVal) : undefined
            const displayLabel = selectedOpt?.label || currentVal || 'Select...'
            if (selectedOpt?.avatarUrl) {
              const ti = displayLabel
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0].toUpperCase())
                .join('')
              return (
                <>
                  <Avatar size="sm" className="gba:h-4 gba:w-4 gba:flex-shrink-0">
                    <AvatarImage src={selectedOpt.avatarUrl} alt={displayLabel} />
                    <AvatarFallback className="gba:text-[7px]">{ti}</AvatarFallback>
                  </Avatar>
                  <span className="gba:truncate gba:flex-1">{displayLabel}</span>
                </>
              )
            }
            return <span className="gba:truncate gba:flex-1">{displayLabel}</span>
          })()}
          <ChevronDown className="gba:w-3 gba:h-3 gba:shrink-0 gba:text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="gba:w-56 gba:p-0"
        onOpenAutoFocus={e => e.preventDefault()}
        onKeyDown={!showSearch ? handleKeyDown : undefined}
      >
        {showSearch && (
          <div className="gba:p-2 gba:border-b gba:border-border">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-2 gba:top-1.5 gba:h-3 gba:w-3 gba:text-muted-foreground gba:pointer-events-none" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="gba:h-7 gba:pl-6 gba:text-xs"
              />
            </div>
          </div>
        )}
        <div ref={listRef} className="gba:overflow-y-auto gba:p-1" style={{ maxHeight: '15rem' }}>
          {filtered.length === 0 && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-3">No options found</p>
          )}
          {filtered.map((opt, idx) => {
            const hasAvatar = Boolean(opt.avatarUrl)
            const isFocused = idx === focusedIdx
            const isSelected = opt.value === currentVal
            const initials = opt.label
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0].toUpperCase())
              .join('')
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => onSave(opt.value)}
                onMouseEnter={() => setFocusedIdx(idx)}
                className={`gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:rounded gba:text-xs gba:cursor-pointer gba:select-none ${
                  isFocused ? 'gba:bg-accent' : isSelected ? 'gba:bg-primary/10 gba:text-primary' : ''
                }`}
              >
                {isSelected && <Check className="gba:w-3 gba:h-3 gba:shrink-0" />}
                {!isSelected && <span className="gba:w-3" />}
                {hasAvatar && (
                  <Avatar size="sm" className="gba:h-5 gba:w-5 gba:flex-shrink-0">
                    <AvatarImage src={opt.avatarUrl} alt={opt.label} />
                    <AvatarFallback className="gba:text-[8px]">{initials}</AvatarFallback>
                  </Avatar>
                )}
                <span className="gba:truncate">{opt.label}</span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const MultiSelectEditor: React.FC<{
  column: BoardColumn
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}> = ({ column, value, onSave, onCancel }) => {
  const opts = column.selectOptions || []
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = useMemo<string[]>(() => {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value === 'string' && value)
      return value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    return []
  }, [value])

  const [localSelected, setLocalSelected] = useState<string[]>(selected)

  useEffect(() => {
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return opts
    const term = search.toLowerCase()
    return opts.filter(o => o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term))
  }, [opts, search])

  const toggle = (val: string) => {
    const next = localSelected.includes(val) ? localSelected.filter(v => v !== val) : [...localSelected, val]
    setLocalSelected(next)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      onSave(localSelected)
      onCancel()
    }
  }

  return (
    <Popover open onOpenChange={handleClose}>
      <PopoverTrigger asChild>
        <button className="gba:flex gba:items-center gba:gap-1 gba:h-6 gba:text-xs gba:px-1 gba:w-full gba:text-left">
          <span className="gba:truncate gba:flex-1">
            {localSelected.length > 0 ? `${localSelected.length} selected` : 'Select...'}
          </span>
          <ChevronDown className="gba:w-3 gba:h-3 gba:shrink-0 gba:text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="gba:w-56 gba:p-0" onOpenAutoFocus={e => e.preventDefault()}>
        {opts.length > 8 && (
          <div className="gba:p-2 gba:border-b gba:border-border">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-2 gba:top-1.5 gba:h-3 gba:w-3 gba:text-muted-foreground gba:pointer-events-none" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="gba:h-7 gba:pl-6 gba:text-xs"
              />
            </div>
          </div>
        )}
        <div className="gba:overflow-y-auto gba:p-1" style={{ maxHeight: '15rem' }}>
          {filtered.length === 0 && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-3">No options found</p>
          )}
          {filtered.map(opt => {
            const isChecked = localSelected.includes(opt.value)
            return (
              <div
                key={opt.value}
                role="button"
                tabIndex={0}
                onClick={() => toggle(opt.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') toggle(opt.value)
                }}
                className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:rounded gba:text-xs gba:cursor-pointer gba:select-none gba:hover:bg-accent"
              >
                <Checkbox checked={isChecked} tabIndex={-1} />
                <span className="gba:truncate">{opt.label}</span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
