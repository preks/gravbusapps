import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Plus, Trash2, Tags } from 'lucide-react'
import type { FlowTags } from '@/business-apps/flow/types'
import translations from '../../_i18n'
import { useCatalogLoader } from '@/common/data/flow/hooks/useCatalogLoader'
import { formatCatalogEntry, createCatalogValue } from '@/common/data/flow/utils/catalogFormatters'
import { handleAppChange, handleCategoryChange } from '@/common/data/flow/utils/tagHandlers'

type CustomLabelRow = { id: string; key: string; value: string }

const RESERVED_KEYS = new Set(['app', 'serviceCategory', 'digitalWorkplaceCategory'])

const parseCatalogCode = (v: string | undefined): string => {
  const raw = String(v || '').trim()
  if (!raw) return ''
  const parts = raw.split(':')
  return parts[parts.length - 1] || raw
}

const nextId = () => crypto.randomUUID()

interface TemplateLabelsDialogProps {
  open: boolean
  onClose: () => void
  accessToken: string
  value: FlowTags
  onChange: (tags: FlowTags) => void
  'data-testid'?: string
}

export const TemplateLabelsDialog: React.FC<TemplateLabelsDialogProps> = ({
  open,
  onClose,
  accessToken,
  value,
  onChange,
  'data-testid': testId = 'flow-studio-template-labels-dialog'
}) => {
  const { t } = useTranslation(translations)
  const [draftTags, setDraftTags] = useState<FlowTags>(value || {})
  const [customRows, setCustomRows] = useState<CustomLabelRow[]>(() => {
    const rows: CustomLabelRow[] = []
    for (const [k, v] of Object.entries(value || {})) {
      if (RESERVED_KEYS.has(k)) continue
      if (!k) continue
      rows.push({ id: nextId(), key: k, value: String(v || '') })
    }
    return rows.length ? rows : [{ id: nextId(), key: '', value: '' }]
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDraftTags(value || {})
    setCustomRows(() => {
      const rows: CustomLabelRow[] = []
      for (const [k, v] of Object.entries(value || {})) {
        if (RESERVED_KEYS.has(k)) continue
        if (!k) continue
        rows.push({ id: nextId(), key: k, value: String(v || '') })
      }
      return rows.length ? rows : [{ id: nextId(), key: '', value: '' }]
    })
  }, [open, value])

  const selectedApp = String(draftTags.app || '')
  const selectedServiceCategory = String(draftTags.serviceCategory || '')
  const selectedDigitalWorkplaceCategory = String(draftTags.digitalWorkplaceCategory || '')
  const isServicePortalSelected = selectedApp === 'AppCatalog:1:SVC'
  const isDigitalWorkplaceSelected = selectedApp === 'AppCatalog:1:DWP'

  const { entries: appCatalogEntries, isLoading: isLoadingApps } = useCatalogLoader({
    catalogIdentifier: 'AppCatalog',
    accessToken,
    enabled: open
  })

  const { entries: serviceCategoryEntries, isLoading: isLoadingServiceCategories } = useCatalogLoader({
    catalogIdentifier: 'ServicePortalCategory',
    accessToken,
    enabled: open && isServicePortalSelected
  })

  const { entries: digitalWorkplaceCategoryEntries, isLoading: isLoadingDigitalWorkplaceCategories } = useCatalogLoader(
    {
      catalogIdentifier: 'DigitalWorkplaceFlowCategory',
      accessToken,
      enabled: open && isDigitalWorkplaceSelected
    }
  )

  const applyAppChange = useCallback(
    (next: string) => {
      handleAppChange(next, draftTags, setDraftTags)
    },
    [draftTags]
  )

  const applyCategoryChange = useCallback(
    (next: string, key: 'serviceCategory' | 'digitalWorkplaceCategory') => {
      handleCategoryChange(next, key, draftTags, setDraftTags)
    },
    [draftTags]
  )

  const setRow = useCallback((rowId: string, partial: Partial<CustomLabelRow>) => {
    setCustomRows(prev => prev.map(r => (r.id === rowId ? { ...r, ...partial } : r)))
  }, [])

  const addRow = useCallback(() => {
    setCustomRows(prev => [...prev, { id: nextId(), key: '', value: '' }])
  }, [])

  const removeRow = useCallback((rowId: string) => {
    setCustomRows(prev =>
      prev.filter(r => r.id !== rowId).length
        ? prev.filter(r => r.id !== rowId)
        : [{ id: nextId(), key: '', value: '' }]
    )
  }, [])

  const normalizedCustom = useMemo(() => {
    const rows = customRows
      .map(r => ({ ...r, key: String(r.key || '').trim(), value: String(r.value || '').trim() }))
      .filter(r => r.key.length > 0)
    const keys = rows.map(r => r.key)
    const dup = keys.find((k, idx) => keys.indexOf(k) !== idx)
    return { rows, duplicateKey: dup }
  }, [customRows])

  const hasChanges = useMemo(() => {
    // Shallow compare is enough for our usage (all values are strings).
    const a = JSON.stringify(value || {})
    const b = JSON.stringify({
      ...draftTags,
      ...Object.fromEntries(normalizedCustom.rows.map(r => [r.key, r.value]))
    })
    return a !== b
  }, [draftTags, normalizedCustom.rows, value])

  const handleSave = useCallback(() => {
    setError(null)

    if (normalizedCustom.duplicateKey) {
      setError(t('labels-error-duplicate', { key: normalizedCustom.duplicateKey } as any))
      return
    }

    const next: FlowTags = { ...draftTags }
    // Clear out any reserved keys that are empty.
    for (const k of ['app', 'serviceCategory', 'digitalWorkplaceCategory'] as const) {
      const v = String((next as any)[k] || '').trim()
      if (!v) delete (next as any)[k]
    }

    // Remove any previous custom keys
    for (const k of Object.keys(next)) {
      if (RESERVED_KEYS.has(k)) continue
      delete (next as any)[k]
    }

    // Apply custom keys
    for (const row of normalizedCustom.rows) {
      ;(next as any)[row.key] = row.value
    }

    onChange(next)
    onClose()
  }, [draftTags, normalizedCustom, onChange, onClose, t])

  const handleClose = useCallback(() => {
    setError(null)
    setDraftTags(value || {})
    setCustomRows(() => {
      const rows: CustomLabelRow[] = []
      for (const [k, v] of Object.entries(value || {})) {
        if (RESERVED_KEYS.has(k)) continue
        if (!k) continue
        rows.push({ id: nextId(), key: k, value: String(v || '') })
      }
      return rows.length ? rows : [{ id: nextId(), key: '', value: '' }]
    })
    onClose()
  }, [onClose, value])

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Tags className="gba:h-4 gba:w-4" />
            {t('labels-title')}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid={`${testId}-error`}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="categories" className="gba:w-full" data-testid={`${testId}-tabs`}>
          <TabsList className="gba:w-full" data-testid={`${testId}-tabs-list`}>
            <TabsTrigger value="categories" data-testid={`${testId}-tab-categories`}>
              {t('labels-tab-categories')}
            </TabsTrigger>
            <TabsTrigger value="custom" data-testid={`${testId}-tab-custom`}>
              {t('labels-tab-custom')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="gba:mt-4">
            <div className="gba:space-y-4" data-testid={`${testId}-categories`}>
              <div className="gba:space-y-2">
                <Label className="gba:text-xs gba:font-medium">{t('labels-app')}</Label>
                <Select value={selectedApp || '__NONE__'} onValueChange={applyAppChange} disabled={isLoadingApps}>
                  <SelectTrigger className="gba:w-full" data-testid={`${testId}-app-select`}>
                    <SelectValue placeholder={t('labels-app-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">{t('labels-none')}</SelectItem>
                    {appCatalogEntries.map(entry => (
                      <SelectItem
                        key={entry.id}
                        value={createCatalogValue('AppCatalog', '1', entry.code)}
                        data-testid={`${testId}-app-option-${entry.code}`}
                      >
                        {formatCatalogEntry(entry)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isServicePortalSelected && (
                <div className="gba:space-y-2">
                  <Label className="gba:text-xs gba:font-medium">{t('labels-service-category')}</Label>
                  <Select
                    value={selectedServiceCategory || '__NONE__'}
                    onValueChange={v => applyCategoryChange(v, 'serviceCategory')}
                    disabled={isLoadingServiceCategories}
                  >
                    <SelectTrigger className="gba:w-full" data-testid={`${testId}-service-category-select`}>
                      <SelectValue placeholder={t('labels-service-category-placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">{t('labels-none')}</SelectItem>
                      {serviceCategoryEntries.map(entry => (
                        <SelectItem
                          key={entry.id}
                          value={createCatalogValue('ServicePortalCategory', '1', entry.code)}
                          data-testid={`${testId}-service-category-option-${entry.code}`}
                        >
                          {formatCatalogEntry(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isDigitalWorkplaceSelected && (
                <div className="gba:space-y-2">
                  <Label className="gba:text-xs gba:font-medium">{t('labels-dwp-category')}</Label>
                  <Select
                    value={selectedDigitalWorkplaceCategory || '__NONE__'}
                    onValueChange={v => applyCategoryChange(v, 'digitalWorkplaceCategory')}
                    disabled={isLoadingDigitalWorkplaceCategories}
                  >
                    <SelectTrigger className="gba:w-full" data-testid={`${testId}-dwp-category-select`}>
                      <SelectValue placeholder={t('labels-dwp-category-placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">{t('labels-none')}</SelectItem>
                      {digitalWorkplaceCategoryEntries.map(entry => (
                        <SelectItem
                          key={entry.id}
                          value={createCatalogValue('DigitalWorkplaceFlowCategory', '1', entry.code)}
                          data-testid={`${testId}-dwp-category-option-${entry.code}`}
                        >
                          {formatCatalogEntry(entry)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />
              <div className="gba:text-xs gba:text-muted-foreground">
                {t('labels-preview')}:{' '}
                <span className="gba:font-mono">
                  {[
                    selectedApp ? `app=${parseCatalogCode(selectedApp)}` : null,
                    selectedServiceCategory ? `service=${parseCatalogCode(selectedServiceCategory)}` : null,
                    selectedDigitalWorkplaceCategory
                      ? `dwp=${parseCatalogCode(selectedDigitalWorkplaceCategory)}`
                      : null
                  ]
                    .filter(Boolean)
                    .join(' · ') || t('labels-none')}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="gba:mt-4">
            <div className="gba:space-y-3" data-testid={`${testId}-custom`}>
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:text-sm gba:font-semibold">{t('labels-custom-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('labels-custom-description')}</div>
                </div>
                <Button variant="outline" size="sm" onClick={addRow} data-testid={`${testId}-custom-add`}>
                  <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                  {t('labels-custom-add')}
                </Button>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-2">
                {customRows.map(row => (
                  <div
                    key={row.id}
                    className="gba:flex gba:items-start gba:gap-2"
                    data-testid={`${testId}-row-${row.id}`}
                  >
                    <div className="gba:flex-1 gba:space-y-1">
                      <Label className="gba:text-[11px] gba:text-muted-foreground">{t('labels-key')}</Label>
                      <Input
                        value={row.key}
                        onChange={e => setRow(row.id, { key: e.target.value })}
                        placeholder={t('labels-key-placeholder')}
                        data-testid={`${testId}-row-key-${row.id}`}
                      />
                    </div>
                    <div className="gba:flex-1 gba:space-y-1">
                      <Label className="gba:text-[11px] gba:text-muted-foreground">{t('labels-value')}</Label>
                      <Input
                        value={row.value}
                        onChange={e => setRow(row.id, { value: e.target.value })}
                        placeholder={t('labels-value-placeholder')}
                        data-testid={`${testId}-row-value-${row.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      data-testid={`${testId}-row-remove-${row.id}`}
                      type="button"
                      className="gba:mt-6"
                    >
                      <Trash2 className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gba:mt-2">
          <Button variant="outline" onClick={handleClose} data-testid={`${testId}-cancel`}>
            {t('labels-cancel')}
          </Button>
          <Button variant="default" onClick={handleSave} disabled={!hasChanges} data-testid={`${testId}-save`}>
            {t('labels-save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
