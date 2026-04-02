import { useState, useCallback } from 'react'
import { Button, Badge, Combobox, Spinner, Label } from '@newwork/nw-design-system'
import { PlusIcon, XIcon } from '@phosphor-icons/react'

export interface RelationshipItem {
  id: string
  label: string
  sublabel?: string
}

export interface RelationshipOption {
  value: string
  label: string
}

export interface RelationshipSectionProps {
  title: string
  items: RelationshipItem[]
  loading?: boolean
  addLoading?: boolean
  removeLoadingId?: string | null
  options?: RelationshipOption[]
  optionsLoading?: boolean
  addPlaceholder?: string
  onAdd?: (id: string) => Promise<void>
  onRemove?: (id: string) => Promise<void>
  onSearchOptions?: (query: string) => void
  readOnly?: boolean
  'data-testid'?: string
}

export const RelationshipSection = ({
  title,
  items,
  loading = false,
  addLoading = false,
  removeLoadingId = null,
  options = [],
  optionsLoading = false,
  addPlaceholder = 'Search...',
  onAdd,
  onRemove,
  onSearchOptions,
  readOnly = false,
  'data-testid': dataTestId
}: RelationshipSectionProps) => {
  const [addValue, setAddValue] = useState('')

  const handleAdd = useCallback(
    async (value: string) => {
      if (!value || !onAdd) return
      await onAdd(value)
      setAddValue('')
    },
    [onAdd]
  )

  const filteredOptions = options.filter(opt => !items.some(item => item.id === opt.value))

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <Label className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {title}
      </Label>
      {loading ? (
        <div className="gba:flex gba:justify-center gba:py-2">
          <Spinner />
        </div>
      ) : (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:min-h-[28px]">
          {items.map(item => (
            <Badge
              key={item.id}
              variant="secondary"
              className="gba:flex gba:items-center gba:gap-1 gba:pr-1"
              data-testid={`${dataTestId}-item-${item.id}`}
            >
              <span>{item.label}</span>
              {item.sublabel && <span className="gba:text-muted-foreground gba:text-xs">&middot; {item.sublabel}</span>}
              {!readOnly && onRemove && (
                <button
                  type="button"
                  className="gba:ml-0.5 gba:rounded gba:p-0.5 gba:hover:bg-muted gba:transition-colors"
                  onClick={() => void onRemove(item.id)}
                  disabled={removeLoadingId === item.id}
                  data-testid={`${dataTestId}-remove-${item.id}`}
                  aria-label={`Remove ${item.label}`}
                >
                  {removeLoadingId === item.id ? (
                    <Spinner className="gba:h-3 gba:w-3" />
                  ) : (
                    <XIcon className="gba:h-3 gba:w-3" />
                  )}
                </button>
              )}
            </Badge>
          ))}
          {items.length === 0 && !loading && (
            <span className="gba:text-xs gba:text-muted-foreground gba:italic">None</span>
          )}
        </div>
      )}
      {!readOnly && onAdd && (
        <div className="gba:flex gba:gap-2 gba:items-center">
          <Combobox
            value={addValue}
            onValueChange={value => setAddValue(value)}
            options={filteredOptions}
            placeholder={addPlaceholder}
            loading={optionsLoading || addLoading}
            onSearch={onSearchOptions}
            searchDebounce={300}
            className="gba:flex-1 gba:text-sm"
            data-testid={`${dataTestId}-add-combobox`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!addValue || addLoading}
            onClick={() => void handleAdd(addValue)}
            data-testid={`${dataTestId}-add-button`}
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
