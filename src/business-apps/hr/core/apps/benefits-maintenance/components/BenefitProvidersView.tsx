import React, { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataDisplay, toast } from '@newwork/nw-design-system'
import { PencilSimpleIcon, ArchiveIcon, ArrowLeftIcon, PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogEntry, useCatalogEntries } from '@/common/data/catalog'
import {
  BenefitTypeEntry,
  BenefitProviderFormData,
  BenefitsFilterConfiguration,
  BenefitsTranslationFn
} from '../types/benefitsMaintenanceTypes'
import { BENEFIT_PROVIDER_CATALOG, BENEFIT_PROVIDER_VERSION } from '../constants/benefitsMaintenanceConstants'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import { DetailSheet } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/DetailSheet'
import useBenefitMutations from '../hooks/useBenefitMutations'
import BenefitProviderDialog from './BenefitProviderDialog'

interface BenefitProvidersViewProps extends BusinessAppContextProps {
  t: BenefitsTranslationFn
  parentBenefitType: BenefitTypeEntry | null
  benefitTypes: BenefitTypeEntry[]
  onBack: () => void
}

interface ProviderRow {
  id: string
  entry: CatalogEntry
  parentName: string
}

function resolveProviderParentName(
  entry: CatalogEntry,
  parentBenefitType: BenefitTypeEntry | null,
  benefitTypeByRef: Map<string, BenefitTypeEntry>
): string {
  if (parentBenefitType && entry.parentEntryId === parentBenefitType.id) {
    return parentBenefitType.value || ''
  }

  const parentRef = entry.parentEntryId ?? ''
  const matchedBenefitType = benefitTypeByRef.get(parentRef)
  if (matchedBenefitType) {
    return matchedBenefitType.value || matchedBenefitType.code || ''
  }

  const parentCode = parentRef.split(':').pop() ?? ''
  return parentCode.replace(/_/g, ' ')
}

function createProviderColumns(t: BenefitsTranslationFn, hasParentBenefitType: boolean): ColumnDef<ProviderRow>[] {
  const baseColumns: ColumnDef<ProviderRow>[] = [
    {
      id: 'provider',
      accessorFn: row => row.entry.value,
      header: t('providers-col-provider'),
      cell: ({ row }) => <span className="gba:text-sm gba:font-medium">{row.original.entry.value}</span>
    },
    {
      id: 'code',
      accessorFn: row => row.entry.code,
      header: t('col-code'),
      cell: ({ row }) => <span className="gba:font-mono gba:text-xs">{row.original.entry.code}</span>
    }
  ]

  if (!hasParentBenefitType) {
    baseColumns.push({
      id: 'parent',
      accessorFn: row => row.parentName,
      header: t('providers-col-parent'),
      cell: ({ row }) =>
        row.original.parentName ? (
          <Badge variant="secondary" size="sm">
            {row.original.parentName}
          </Badge>
        ) : (
          <span className="gba:text-muted-foreground">-</span>
        )
    })
  }

  baseColumns.push(
    {
      id: 'description',
      accessorFn: row => row.entry.description,
      header: t('col-description'),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-64 gba:block">
          {row.original.entry.description || '-'}
        </span>
      )
    },
    {
      id: 'status',
      accessorFn: row => (row.entry.isDeleted ? 'archived' : 'active'),
      header: t('col-status'),
      cell: ({ row }) => {
        const isDeleted = row.original.entry.isDeleted === true
        return (
          <Badge variant={isDeleted ? 'outline' : 'default'} size="sm">
            {isDeleted ? t('status-archived') : t('status-active')}
          </Badge>
        )
      }
    }
  )

  return baseColumns
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:py-1.5 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:max-w-64 gba:text-right gba:font-medium gba:text-foreground">
      {children || <span className="gba:text-muted-foreground">-</span>}
    </span>
  </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="gba:mb-6">
    <h4 className="gba:mb-3 gba:border-b gba:border-border gba:pb-2 gba:text-sm gba:font-semibold gba:text-foreground">
      {title}
    </h4>
    <div className="gba:space-y-1">{children}</div>
  </div>
)

const BenefitProvidersView: React.FC<BenefitProvidersViewProps> = ({
  t,
  parentBenefitType,
  benefitTypes,
  onBack,
  ...context
}) => {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | undefined>()
  const [selectedRow, setSelectedRow] = useState<ProviderRow | null>(null)

  const deferredSearch = useDeferredValue(search)

  const { fetchCatalogEntries } = useCatalogEntries({ accessToken: context.accessToken })
  const mutations = useBenefitMutations(context)

  const [allEntries, setAllEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { entries: raw } = await fetchCatalogEntries({
        catalogIdentifier: BENEFIT_PROVIDER_CATALOG,
        version: BENEFIT_PROVIDER_VERSION,
        limit: 200,
        orderBy: [{ field: 'displayOrder', direction: 'ASC_NULLS_LAST' }]
      })
      setAllEntries(raw)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
      setAllEntries([])
    } finally {
      setLoading(false)
    }
  }, [fetchCatalogEntries])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  useEffect(() => {
    setFilters(prev => {
      if (parentBenefitType) {
        return { ...prev, parent: [parentBenefitType.id] }
      }

      const next = { ...prev }
      delete next.parent
      return next
    })
  }, [parentBenefitType])

  const benefitTypeByRef = useMemo(() => {
    const map = new Map<string, BenefitTypeEntry>()
    for (const benefitType of benefitTypes) {
      map.set(benefitType.id, benefitType)
      if (benefitType.code) {
        map.set(benefitType.code, benefitType)
      }
    }
    return map
  }, [benefitTypes])

  const providerRows = useMemo<ProviderRow[]>(() => {
    return allEntries.map(entry => {
      return {
        id: entry.id,
        entry,
        parentName: resolveProviderParentName(entry, parentBenefitType, benefitTypeByRef)
      }
    })
  }, [allEntries, parentBenefitType, benefitTypeByRef])

  const parentBenefitOptions = useMemo(() => {
    const parents = new Map<string, string>()
    if (parentBenefitType) {
      parents.set(parentBenefitType.id, parentBenefitType.value || parentBenefitType.code || parentBenefitType.id)
    }

    for (const r of providerRows) {
      if (r.parentName && r.entry.parentEntryId) {
        parents.set(r.entry.parentEntryId, r.parentName)
      }
    }
    return Array.from(parents.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [providerRows, parentBenefitType])

  const filterConfig = useMemo<BenefitsFilterConfiguration>(
    () => ({
      id: parentBenefitOptions.length > 0 ? 'providers-filters-with-parent' : 'providers-filters',
      name: t('providers-search-placeholder'),
      groups: [
        ...(parentBenefitOptions.length > 0
          ? [
              {
                id: 'parent-group',
                label: t('providers-col-parent'),
                collapsible: true,
                defaultExpanded: true,
                filters: [
                  {
                    id: 'parent',
                    field: 'parent',
                    label: t('providers-col-parent'),
                    type: 'multi-select' as const,
                    config: { options: parentBenefitOptions }
                  }
                ]
              }
            ]
          : []),
        {
          id: 'status-group',
          label: t('filter-status'),
          collapsible: true,
          filters: [
            {
              id: 'status',
              field: 'status',
              label: t('filter-status'),
              type: 'multi-select' as const,
              config: {
                options: [
                  { id: 'active', label: t('filter-status-active') },
                  { id: 'archived', label: t('filter-status-archived') }
                ]
              }
            }
          ]
        }
      ]
    }),
    [t, parentBenefitOptions]
  )

  const filteredRows = useMemo(() => {
    let rows = providerRows

    const statusFilter: string[] = filters.status ?? []
    if (statusFilter.length > 0) {
      rows = rows.filter(r => {
        const isArchived = r.entry.isDeleted === true
        if (statusFilter.includes('active') && !isArchived) return true
        if (statusFilter.includes('archived') && isArchived) return true
        return false
      })
    } else {
      rows = rows.filter(r => !r.entry.isDeleted)
    }

    const parentFilter: string[] = filters.parent ?? []
    if (parentFilter.length > 0) {
      rows = rows.filter(r => r.entry.parentEntryId && parentFilter.includes(r.entry.parentEntryId))
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      rows = rows.filter(
        r =>
          r.entry.value?.toLowerCase().includes(q) ||
          r.entry.code?.toLowerCase().includes(q) ||
          r.parentName.toLowerCase().includes(q)
      )
    }
    return rows
  }, [providerRows, deferredSearch, filters])

  const handleEdit = useCallback((entry: CatalogEntry) => {
    setSelectedRow(null)
    setDialogMode('edit')
    setEditingEntry(entry)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (entry: CatalogEntry) => {
      try {
        await mutations.deleteProvider(entry.id, {
          code: entry.code,
          value: entry.value,
          parentEntryId: entry.parentEntryId,
          objectValue: entry.objectValue
        })
        toast.success(t('toast-provider-deleted', { name: entry.value }))
        setSelectedRow(null)
        await loadProviders()
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [mutations, t, loadProviders]
  )

  const handleSubmit = useCallback(
    async (data: BenefitProviderFormData) => {
      try {
        if (dialogMode === 'create') {
          await mutations.createProvider(data)
          toast.success(t('toast-provider-created', { name: data.value }))
        } else if (editingEntry) {
          await mutations.updateProvider(editingEntry.id, data, {
            code: editingEntry.code,
            parentEntryId: editingEntry.parentEntryId,
            objectValue: editingEntry.objectValue
          })
          toast.success(t('toast-provider-updated', { name: data.value }))
        }
        await loadProviders()
      } catch (err) {
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [dialogMode, editingEntry, mutations, t, loadProviders]
  )

  const titleSections = useMemo(
    () => [{ id: 'all', label: t('providers-title'), metadata: { count: filteredRows.length } }],
    [filteredRows.length, t]
  )

  const columns = useMemo(() => createProviderColumns(t, Boolean(parentBenefitType)), [t, parentBenefitType])

  return (
    <>
      <DataDisplay
        key={filterConfig.id}
        titleSections={titleSections}
        currentSection="all"
        onSectionChange={() => {}}
        searchValue={search}
        searchPlaceholder={t('providers-search-placeholder')}
        onSearchChange={setSearch}
        filters={filters}
        filterConfiguration={filterConfig}
        onFilterChange={setFilters}
        filterSheetTitle={t('providers-search-placeholder')}
        filterSheetDescription=""
        secondaryActions={
          <div className="gba:flex gba:items-center gba:gap-2">
            {parentBenefitType && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeftIcon className="gba:size-4 gba:mr-1.5" />
                {t('action-back')}
              </Button>
            )}
            {parentBenefitType && (
              <Button
                size="sm"
                onClick={() => {
                  setDialogMode('create')
                  setEditingEntry(undefined)
                  setDialogOpen(true)
                }}
              >
                <PlusIcon className="gba:size-4 gba:mr-1.5" />
                {t('action-create-provider')}
              </Button>
            )}
          </div>
        }
        toolbarDensity="compact"
      >
        <TabDataTable
          data={filteredRows}
          columns={columns}
          loading={loading}
          error={error}
          emptyMessage={t('providers-empty')}
          onRowClick={setSelectedRow}
        />
      </DataDisplay>

      <DetailSheet
        open={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        title={selectedRow?.entry.value || t('providers-col-provider')}
      >
        {selectedRow && (
          <div>
            <Section title={t('detail-section-basic')}>
              <Field label={t('providers-col-provider')}>{selectedRow.entry.value}</Field>
              <Field label={t('col-code')}>
                <span className="gba:font-mono">{selectedRow.entry.code}</span>
              </Field>
              <Field label={t('col-description')}>{selectedRow.entry.description}</Field>
              <Field label={t('providers-col-parent')}>
                {selectedRow.parentName ? (
                  <Badge variant="secondary" size="sm">
                    {selectedRow.parentName}
                  </Badge>
                ) : null}
              </Field>
              <Field label={t('col-status')}>
                <Badge variant={selectedRow.entry.isDeleted ? 'outline' : 'default'} size="sm">
                  {selectedRow.entry.isDeleted ? t('status-archived') : t('status-active')}
                </Badge>
              </Field>
            </Section>

            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:pt-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(selectedRow.entry)}>
                <PencilSimpleIcon className="gba:size-3.5 gba:mr-1.5" />
                {t('action-edit')}
              </Button>
              {!selectedRow.entry.isDeleted && (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedRow.entry)}>
                  <ArchiveIcon className="gba:size-3.5 gba:mr-1.5" />
                  {t('action-archive-benefit')}
                </Button>
              )}
            </div>
          </div>
        )}
      </DetailSheet>

      <BenefitProviderDialog
        t={t}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={dialogMode}
        initialData={editingEntry}
        parentBenefitType={
          parentBenefitType ? { id: parentBenefitType.id, value: parentBenefitType.value || '' } : undefined
        }
      />
    </>
  )
}

export default BenefitProvidersView
