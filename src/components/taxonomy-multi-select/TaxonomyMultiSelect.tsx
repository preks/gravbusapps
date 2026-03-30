import React, { useState, useRef, useCallback } from 'react'
import { Badge, Button, Input, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { X, Plus, CaretDown } from '@phosphor-icons/react'

export interface TaxonomyOption {
  id: string
  name: string
}

interface TaxonomyMultiSelectProps {
  options: TaxonomyOption[]
  value: string[]
  onValueChange: (ids: string[]) => void
  onCreateNew?: (name: string) => Promise<string>
  isLoading?: boolean
  placeholder?: string
  'data-testid'?: string
}

export const TaxonomyMultiSelect: React.FC<TaxonomyMultiSelectProps> = ({
  options,
  value,
  onValueChange,
  onCreateNew,
  isLoading = false,
  placeholder = 'Select or create...',
  'data-testid': testId
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOptions = value.map(id => {
    const found = options.find(o => o.id === id)
    return found ? found : { id, name: id }
  })

  const unselectedOptions = options.filter(o => !value.includes(o.id))
  const filteredOptions = search
    ? unselectedOptions.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : unselectedOptions

  const handleRemove = useCallback(
    (id: string) => {
      onValueChange(value.filter(v => v !== id))
    },
    [value, onValueChange]
  )

  const handleSelect = useCallback(
    (id: string) => {
      if (!value.includes(id)) {
        onValueChange([...value, id])
      }
      setSearch('')
    },
    [value, onValueChange]
  )

  const handleCreate = useCallback(async () => {
    const trimmed = search.trim()
    if (!trimmed || !onCreateNew) return

    setIsCreating(true)
    try {
      const newId = await onCreateNew(trimmed)
      onValueChange([...value, newId])
      setSearch('')
    } finally {
      setIsCreating(false)
    }
  }, [search, onCreateNew, value, onValueChange])

  const showCreateOption =
    !!search.trim() && !!onCreateNew && !options.some(o => o.name.toLowerCase() === search.trim().toLowerCase())

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {selectedOptions.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {selectedOptions.map(opt => (
            <Badge key={opt.id} variant="secondary" className="gba:flex gba:items-center gba:gap-1 gba:pr-1">
              <span>{opt.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(opt.id)}
                className="gba:ml-1 gba:rounded-full gba:hover:bg-muted gba:p-0.5"
                aria-label={`Remove ${opt.name}`}
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gba:w-full gba:justify-between gba:font-normal"
            disabled={isLoading}
          >
            <span className="gba:text-muted-foreground">{isLoading ? 'Loading...' : placeholder}</span>
            <CaretDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-64 gba:p-2" align="start">
          <div className="gba:space-y-2">
            <Input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or create..."
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreateOption) {
                  e.preventDefault()
                  handleCreate()
                }
              }}
            />
            <div className="gba:max-h-48 gba:overflow-y-auto gba:space-y-0.5">
              {filteredOptions.length === 0 && !showCreateOption && (
                <div className="gba:text-sm gba:text-muted-foreground gba:py-2 gba:text-center">
                  {search ? 'No matches found' : 'No options available'}
                </div>
              )}
              {filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    handleSelect(opt.id)
                    setOpen(false)
                  }}
                  className="gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-sm hover:gba:bg-accent gba:transition-colors"
                >
                  {opt.name}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={() => {
                    handleCreate()
                    setOpen(false)
                  }}
                  disabled={isCreating}
                  className="gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-sm hover:gba:bg-accent gba:transition-colors gba:flex gba:items-center gba:gap-1 gba:text-primary"
                >
                  <Plus size={12} />
                  <span>{isCreating ? 'Creating...' : `Create "${search.trim()}"`}</span>
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
