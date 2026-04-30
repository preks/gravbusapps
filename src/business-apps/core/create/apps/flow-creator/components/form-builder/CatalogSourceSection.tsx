import React, { useEffect, useMemo } from 'react'
import { Combobox, Label } from '@newwork/nw-design-system'
import type { DataSource, InputBlock } from '@/common/data/flow/types/flowTemplate'

interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

interface CatalogSourceSectionProps {
  field: InputBlock
  catalogs?: CatalogOption[]
  catalogsLoading?: boolean
  catalogsError?: string | null
  catalogsHasMore?: boolean
  onSearchCatalogs?: (query: string) => Promise<void>
  onLoadMoreCatalogs?: () => Promise<void>
  showFieldMapping?: boolean
  index: number
  onChange: (updated: InputBlock) => void
  testId: string
}

export const CatalogSourceSection: React.FC<CatalogSourceSectionProps> = ({
  field,
  catalogs,
  catalogsLoading,
  catalogsError,
  catalogsHasMore,
  onSearchCatalogs,
  onLoadMoreCatalogs,
  index,
  onChange,
  testId
}) => {
  const selected = field.dataSource?.type === 'CATALOG' ? field.dataSource.catalog || '' : ''
  const list = Array.isArray(catalogs) ? catalogs : []

  useEffect(() => {
    if (!onSearchCatalogs) return
    if (list.length > 0) return
    if (catalogsLoading) return
    void onSearchCatalogs('')
  }, [catalogsLoading, list.length, onSearchCatalogs])

  const options = useMemo(
    () =>
      list.map(c => ({
        value: c.identifier,
        label: (
          <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1 gba:text-left">
            <div className="gba:text-sm gba:font-medium gba:truncate">{c.name}</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
              {c.identifier} · {c.version}
            </div>
          </div>
        )
      })),
    [list]
  )

  const setCatalog = (catalogId: string) => {
    onChange({
      ...field,
      dataSource: {
        ...(field.dataSource?.type === 'CATALOG' ? field.dataSource : { type: 'CATALOG' }),
        type: 'CATALOG',
        catalog: catalogId,
        valueField: 'code',
        labelField: 'value'
      } as DataSource
    })
  }

  const emptyText = (() => {
    if (catalogsLoading) return 'Loading catalogs…'
    if (catalogsError) return `Catalogs unavailable: ${catalogsError}`
    return 'No catalogs found'
  })()

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Catalog</Label>
      <Combobox
        className="gba:w-full gba:h-auto"
        options={options as any}
        value={selected}
        onValueChange={setCatalog}
        placeholder="Select catalog…"
        searchPlaceholder="Search catalogs…"
        emptyText={emptyText}
        onSearch={q => onSearchCatalogs?.(q)}
        searchDebounce={300}
        loading={Boolean(catalogsLoading)}
        onLoadMore={() => onLoadMoreCatalogs?.()}
        hasMore={Boolean(catalogsHasMore)}
        data-testid={`${testId}-${index}-catalog`}
        align="start"
      />
    </div>
  )
}
