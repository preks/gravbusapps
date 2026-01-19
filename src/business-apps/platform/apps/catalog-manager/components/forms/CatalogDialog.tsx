import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogs, Catalog } from '@/common/data/catalog'
import { DebouncedInput } from '@/components/debounced-input'
import { Database, ChevronDown, X } from 'lucide-react'

export interface CatalogFormData {
  parentId?: string
  parentName?: string
  name: string
  identifier: string
  validFrom?: string
  validTo?: string
  defaultLocale?: 'en-US' | 'de-DE' | 'ro-RO'
  description?: string
}

interface CatalogDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CatalogFormData) => Promise<void>
  'data-testid'?: string
  mode?: 'create' | 'update'
  initialData?: Partial<CatalogFormData & { id?: string; version?: string }>
  title?: string
  submitLabel?: string
}

const toPascalCase = (value: string): string => {
  return (value || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}

export const CatalogDialog: React.FC<CatalogDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  'data-testid': dataTestId = 'CatalogDialog',
  mode = 'create',
  initialData,
  title,
  submitLabel,
  ...context
}) => {
  const [form, setForm] = useState<CatalogFormData>({
    name: '',
    identifier: '',
    defaultLocale: 'en-US'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({ name: '', identifier: '', defaultLocale: 'en-US' })
      setIsSubmitting(false)
    }
  }, [open])

  // Initialize from initialData when opening
  useEffect(() => {
    if (open && initialData) {
      setForm(prev => ({
        ...prev,
        parentId: initialData.parentId ?? prev.parentId,
        parentName: initialData.parentName ?? prev.parentName,
        name: initialData.name ?? prev.name,
        identifier: initialData.identifier ?? prev.identifier,
        validFrom: initialData.validFrom ?? prev.validFrom,
        validTo: initialData.validTo ?? prev.validTo,
        defaultLocale: (initialData.defaultLocale as any) ?? prev.defaultLocale,
        description: initialData.description ?? prev.description
      }))
    }
  }, [open, initialData])

  // Auto-generate identifier from name (create mode only)
  useEffect(() => {
    if (mode === 'create') {
      const generated = toPascalCase(form.name)
      setForm(prev => ({ ...prev, identifier: generated }))
    }
  }, [form.name, mode])

  const handleChange = useCallback((key: keyof CatalogFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onSubmit, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[680px]" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>{title || (mode === 'create' ? 'Create Catalog' : 'Update Catalog')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Parent Catalog */}
          <div className="gba:space-y-2">
            <Label htmlFor="parentCatalog">Parent Catalog</Label>
            <ParentCatalogSelector
              value={form.parentId}
              onChange={catalog => {
                handleChange('parentId', catalog?.id)
                handleChange('parentName', catalog?.name || catalog?.identifier || '')
              }}
              {...context}
              data-testid={`${dataTestId}-ParentSelector`}
            />
          </div>

          {/* Name */}
          <div className="gba:space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Enter catalog name"
              data-testid={`${dataTestId}-NameInput`}
            />
          </div>

          {/* Identifier (auto) */}
          <div className="gba:space-y-2">
            <Label htmlFor="identifier">Identifier (auto)</Label>
            <Input
              id="identifier"
              value={form.identifier}
              onChange={e => handleChange('identifier', e.target.value)}
              placeholder="Auto-generated from name"
              data-testid={`${dataTestId}-IdentifierInput`}
            />
          </div>

          {/* Dates */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                value={form.validFrom || ''}
                onChange={e => handleChange('validFrom', e.target.value)}
                data-testid={`${dataTestId}-ValidFrom`}
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="validTo">Valid To</Label>
              <Input
                id="validTo"
                type="date"
                value={form.validTo || ''}
                onChange={e => handleChange('validTo', e.target.value)}
                data-testid={`${dataTestId}-ValidTo`}
              />
            </div>
          </div>

          {/* Default Locale */}
          <div className="gba:space-y-2">
            <Label htmlFor="defaultLocale">Default Locale</Label>
            <select
              id="defaultLocale"
              className="gba:w-full gba:h-9 gba:rounded-md gba:border"
              value={form.defaultLocale}
              onChange={e => handleChange('defaultLocale', e.target.value as any)}
              data-testid={`${dataTestId}-DefaultLocale`}
            >
              <option value="en-US">en-US</option>
              <option value="de-DE">de-DE</option>
              <option value="ro-RO">ro-RO</option>
            </select>
          </div>

          {/* Description */}
          <div className="gba:space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Optional description"
              data-testid={`${dataTestId}-Description`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${dataTestId}-CancelButton`}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.name || !form.identifier}
            data-testid={`${dataTestId}-CreateButton`}
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : submitLabel || (mode === 'create' ? 'Create' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ParentCatalogSelectorProps extends BusinessAppContextProps {
  value?: string
  onChange: (catalog: Catalog | null) => void
  'data-testid'?: string
}

const ITEMS_PER_PAGE = 20

const ParentCatalogSelector: React.FC<ParentCatalogSelectorProps> = ({
  value,
  onChange,
  'data-testid': dataTestId = 'ParentCatalogSelector',
  ...context
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Catalog[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { fetchCatalogs } = useCatalogs(context)

  const selected = useMemo(() => items.find(c => c.id === value), [items, value])

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true)
      try {
        const list = await fetchCatalogs({
          limit: ITEMS_PER_PAGE,
          offset: reset ? 0 : (page - 1) * ITEMS_PER_PAGE,
          search: search || undefined
        })
        const newItems = reset ? list.items : [...items, ...list.items]
        setItems(newItems)
        setHasMore(newItems.length < (list.total || newItems.length))
        setPage(reset ? 2 : page + 1)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchCatalogs, page, search, items]
  )

  useEffect(() => {
    if (isOpen && items.length === 0) {
      load(true)
    }
  }, [isOpen, items.length, load])

  useEffect(() => {
    // Reset list on search change
    setItems([])
    setPage(1)
    setHasMore(true)
    if (isOpen) {
      load(true)
    }
  }, [search])

  const display = selected ? `${selected.name} (${selected.identifier})` : 'Select parent catalog'

  return (
    <div className="gba:w-full" data-testid={dataTestId}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="gba:w-full gba:justify-between"
            data-testid={`${dataTestId}-Trigger`}
          >
            <span className="gba:truncate">{display}</span>
            <div className="gba:flex gba:items-center gba:gap-1">
              {selected && (
                <X
                  className="gba:h-4 gba:w-4"
                  onClick={e => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                />
              )}
              <ChevronDown className="gba:h-4 gba:w-4" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:[&&]:w-[520px]">
          <div className="gba:p-3">
            <DebouncedInput
              placeholder="Search catalogs..."
              className="gba:h-9"
              value={search}
              onChange={setSearch}
              data-testid={`${dataTestId}-Search`}
            />
          </div>
          <div className="gba:max-h-[300px] gba:overflow-y-auto">
            {items.map(cat => (
              <div
                key={cat.id}
                className="gba:p-2 gba:cursor-pointer gba:border-b"
                onClick={() => {
                  onChange(cat)
                  setIsOpen(false)
                }}
                data-testid={`${dataTestId}-Option-${cat.id}`}
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Database className="gba:h-4 gba:w-4" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:truncate">{cat.name}</div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{cat.identifier}</div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="gba:p-3 gba:flex gba:justify-center">
                <Spinner size="sm" />
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <div className="gba:p-3 gba:text-center gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                No catalogs found
              </div>
            )}
            {!isLoading && hasMore && (
              <div className="gba:p-2">
                <Button
                  variant="outline"
                  className="gba:w-full"
                  onClick={() => load(false)}
                  data-testid={`${dataTestId}-LoadMore`}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default CatalogDialog
