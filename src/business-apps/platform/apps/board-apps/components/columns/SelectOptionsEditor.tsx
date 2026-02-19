import React, { useCallback, useState } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Plus, X, GripVertical } from 'lucide-react'
import type { SelectOption } from '../../types'

const COLOR_TOKENS = [
  { token: 'primary', cls: 'gba:bg-primary' },
  { token: 'success', cls: 'gba:bg-success' },
  { token: 'info', cls: 'gba:bg-info' },
  { token: 'warning', cls: 'gba:bg-warning' },
  { token: 'destructive', cls: 'gba:bg-destructive' },
  { token: 'muted', cls: 'gba:bg-muted-foreground' }
]

export interface SelectOptionsEditorProps {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
  'data-testid'?: string
}

export const SelectOptionsEditor: React.FC<SelectOptionsEditorProps> = ({
  options,
  onChange,
  'data-testid': testId = 'select-options-editor'
}) => {
  const [newLabel, setNewLabel] = useState('')

  const handleAdd = useCallback(() => {
    const label = newLabel.trim()
    if (!label) return
    const value = label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
    const existing = new Set(options.map(o => o.value))
    let finalValue = value
    let i = 2
    while (existing.has(finalValue)) {
      finalValue = `${value}_${i}`
      i++
    }

    onChange([...options, { value: finalValue, label, colorToken: 'muted' }])
    setNewLabel('')
  }, [newLabel, options, onChange])

  const handleRemove = useCallback(
    (idx: number) => {
      onChange(options.filter((_, i) => i !== idx))
    },
    [options, onChange]
  )

  const handleLabelChange = useCallback(
    (idx: number, label: string) => {
      onChange(options.map((o, i) => (i === idx ? { ...o, label } : o)))
    },
    [options, onChange]
  )

  const handleColorChange = useCallback(
    (idx: number, colorToken: string) => {
      onChange(options.map((o, i) => (i === idx ? { ...o, colorToken } : o)))
    },
    [options, onChange]
  )

  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx <= 0) return
      const next = [...options]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      onChange(next)
    },
    [options, onChange]
  )

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {options.map((opt, idx) => (
        <div key={opt.value} className="gba:flex gba:items-center gba:gap-1.5">
          <button
            type="button"
            onClick={() => handleMoveUp(idx)}
            className="gba:p-0.5 gba:text-muted-foreground gba:hover:text-foreground gba:cursor-grab"
            data-testid={`${testId}-grip-${idx}`}
          >
            <GripVertical className="gba:w-3 gba:h-3" />
          </button>

          <ColorPicker
            value={opt.colorToken || 'muted'}
            onChange={token => handleColorChange(idx, token)}
            testId={`${testId}-color-${idx}`}
          />

          <Input
            value={opt.label}
            onChange={e => handleLabelChange(idx, e.target.value)}
            className="gba:h-7 gba:text-xs gba:flex-1"
            data-testid={`${testId}-label-${idx}`}
          />

          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="gba:p-0.5 gba:text-muted-foreground gba:hover:text-destructive gba:transition-colors"
            data-testid={`${testId}-remove-${idx}`}
          >
            <X className="gba:w-3 gba:h-3" />
          </button>
        </div>
      ))}

      <div className="gba:flex gba:items-center gba:gap-1.5">
        <Input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="New option..."
          className="gba:h-7 gba:text-xs gba:flex-1"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          data-testid={`${testId}-new-input`}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAdd}
          disabled={!newLabel.trim()}
          className="gba:h-7 gba:px-2"
          data-testid={`${testId}-add`}
        >
          <Plus className="gba:w-3 gba:h-3" />
        </Button>
      </div>
    </div>
  )
}

const ColorPicker: React.FC<{ value: string; onChange: (token: string) => void; testId: string }> = ({
  value,
  onChange,
  testId
}) => {
  const [open, setOpen] = useState(false)
  const current = COLOR_TOKENS.find(t => t.token === value) || COLOR_TOKENS[5]

  return (
    <div className="gba:relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`gba:w-4 gba:h-4 gba:rounded-full gba:flex-shrink-0 gba:ring-1 gba:ring-border ${current.cls}`}
        data-testid={testId}
      />
      {open && (
        <div className="gba:absolute gba:top-full gba:left-0 gba:mt-1 gba:bg-popover gba:border gba:rounded-md gba:p-1.5 gba:z-50 gba:flex gba:gap-1">
          {COLOR_TOKENS.map(ct => (
            <button
              key={ct.token}
              type="button"
              onClick={() => {
                onChange(ct.token)
                setOpen(false)
              }}
              className={`gba:w-5 gba:h-5 gba:rounded-full ${ct.cls} ${ct.token === value ? 'gba:ring-2 gba:ring-primary' : 'gba:ring-1 gba:ring-border'}`}
              data-testid={`${testId}-${ct.token}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
