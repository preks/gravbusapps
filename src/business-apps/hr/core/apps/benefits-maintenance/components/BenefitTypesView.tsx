import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Button, DataDisplay, toast, IconAvatar } from '@newwork/nw-design-system'
import { DownloadSimpleIcon, PlusIcon } from '@phosphor-icons/react'
import { getIconComponent, DEFAULT_BENEFIT_ICON } from './BenefitIconPicker'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  BenefitTypeEntry,
  BenefitTypeFormData,
  LegalEntityOption,
  BenefitsFilterConfiguration,
  BenefitsTranslationFn
} from '../types/benefitsMaintenanceTypes'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
import { DetailSheet } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/DetailSheet'
import { exportWorkbookToExcel } from '@/common/utils/excelExportUtils'
import useBenefitTypesCatalog from '../hooks/useBenefitTypesCatalog'
import useBenefitMutations from '../hooks/useBenefitMutations'
import BenefitTypeDialog from './BenefitTypeDialog'
import BenefitDetailPanel from './BenefitDetailPanel'

const LOG_PREFIX = '[BenefitTypesView]'

interface BenefitTypesViewProps extends BusinessAppContextProps {
  t: BenefitsTranslationFn
  legalEntities: LegalEntityOption[]
  legalEntitiesLoading: boolean
  onLoadLegalEntities: () => void
  onViewProviders: (benefitType: BenefitTypeEntry) => void
  onCreateBenefit: () => void
}

const formatCurrency = (amount: string, currencyCode?: string): string => {
  if (!currencyCode) return amount
  return `${amount} ${currencyCode.toUpperCase()}`
}

const isPublicBenefit = (groups?: string[]) => groups?.includes('all-employees') ?? false

function resolveLegalEntity(
  entry: BenefitTypeEntry,
  legalEntities: LegalEntityOption[]
): LegalEntityOption | undefined {
  const ov = entry.parsedObjectValue
  if (ov?.legalEntityId) {
    const match = legalEntities.find(le => le.id === ov.legalEntityId)
    if (match) return match
  }
  if (entry.parentEntryId) {
    return legalEntities.find(
      le => le.countryRef === entry.parentEntryId || entry.parentEntryId!.endsWith(`:${le.countryCode}`)
    )
  }
  return undefined
}

function buildBenefitTypesFilterConfig(
  t: BenefitsTranslationFn,
  entityOptions: Array<{ id: string; label: string }>
): BenefitsFilterConfiguration {
  return {
    id: 'benefit-types-filters',
    name: t('filter-search-placeholder'),
    groups: [
      {
        id: 'legal-entity-group',
        label: t('filter-legal-entity'),
        collapsible: true,
        filters: [
          {
            id: 'legalEntity',
            field: 'legalEntity',
            label: t('filter-legal-entity'),
            type: 'multi-select' as const,
            config: { options: entityOptions }
          }
        ]
      },
      {
        id: 'visibility-group',
        label: t('filter-visibility'),
        collapsible: true,
        filters: [
          {
            id: 'visibility',
            field: 'visibility',
            label: t('filter-visibility'),
            type: 'multi-select' as const,
            config: {
              options: [
                { id: 'public', label: t('filter-visibility-public') },
                { id: 'private', label: t('filter-visibility-private') }
              ]
            }
          }
        ]
      },
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
  }
}

function createBenefitTypeColumns(
  t: BenefitsTranslationFn,
  legalEntities: LegalEntityOption[]
): ColumnDef<BenefitTypeEntry>[] {
  return [
    {
      id: 'benefit',
      accessorKey: 'value',
      header: t('col-benefit'),
      cell: ({ row }) => {
        const entry = row.original
        const obj = entry.parsedObjectValue
        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:shrink-0">
              <IconAvatar
                icon={getIconComponent(obj?.icon) ?? DEFAULT_BENEFIT_ICON}
                variant="default"
                size="sm"
                decorative
              />
            </div>
            <div className="gba:min-w-0">
              <div className="gba:text-sm gba:font-medium gba:truncate">{entry.value}</div>
              {entry.description && (
                <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-48">
                  {entry.description}
                </div>
              )}
            </div>
          </div>
        )
      }
    },
    {
      id: 'legalEntity',
      accessorFn: row => {
        const entity = resolveLegalEntity(row, legalEntities)
        return entity?.name || row.parsedObjectValue?.legalEntityName || ''
      },
      header: t('col-legal-entity'),
      cell: ({ row }) => {
        const entity = resolveLegalEntity(row.original, legalEntities)
        const name = entity?.name || row.original.parsedObjectValue?.legalEntityName
        return name ? (
          <span className="gba:text-sm gba:truncate gba:max-w-40 gba:block">{name}</span>
        ) : (
          <span className="gba:text-muted-foreground">-</span>
        )
      }
    },
    {
      id: 'visibility',
      accessorFn: row => (isPublicBenefit(row.parsedObjectValue?.groups) ? 'public' : 'private'),
      header: t('col-visibility'),
      cell: ({ row }) => {
        const pub = isPublicBenefit(row.original.parsedObjectValue?.groups)
        return (
          <Badge variant={pub ? 'default' : 'secondary'} size="sm">
            {pub ? t('visibility-public') : t('visibility-private')}
          </Badge>
        )
      }
    },
    {
      id: 'companyContribution',
      accessorFn: row => (row.parsedObjectValue?.value ? Number(row.parsedObjectValue.value) : null),
      header: () => <div className="gba:text-right">{t('col-company-contribution')}</div>,
      cell: ({ row }) => {
        const obj = row.original.parsedObjectValue
        const entity = resolveLegalEntity(row.original, legalEntities)
        const currency = obj?.currency || entity?.currency
        return (
          <div className="gba:text-right gba:text-sm gba:tabular-nums">
            {obj?.value ? formatCurrency(obj.value, currency) : '-'}
          </div>
        )
      }
    },
    {
      id: 'employeeContribution',
      accessorFn: row =>
        row.parsedObjectValue?.employeeMonthlyContribution
          ? Number(row.parsedObjectValue.employeeMonthlyContribution)
          : null,
      header: () => <div className="gba:text-right">{t('col-employee-contribution')}</div>,
      cell: ({ row }) => {
        const obj = row.original.parsedObjectValue
        const amount = obj?.employeeMonthlyContribution
        const entity = resolveLegalEntity(row.original, legalEntities)
        const currency = obj?.currency || entity?.currency
        return (
          <div className="gba:text-right gba:text-sm gba:tabular-nums">
            {amount ? formatCurrency(amount, currency) : '-'}
          </div>
        )
      }
    },
    {
      id: 'period',
      accessorFn: row => row.parsedObjectValue?.period,
      header: t('col-period'),
      cell: ({ row }) => (
        <span className="gba:text-sm">
          {row.original.parsedObjectValue?.period ? t(`period-${row.original.parsedObjectValue.period}`) : '-'}
        </span>
      )
    },
    {
      id: 'providers',
      accessorFn: row => row.providersCount ?? 0,
      header: t('col-providers'),
      cell: ({ row }) => <span className="gba:text-sm gba:tabular-nums">{row.original.providersCount ?? 0}</span>
    },
    {
      id: 'status',
      accessorFn: row => (row.isDeleted ? 'archived' : 'active'),
      header: t('col-status'),
      cell: ({ row }) => {
        const isDeleted = row.original.isDeleted === true
        return (
          <Badge variant={isDeleted ? 'outline' : 'default'} size="sm">
            {isDeleted ? t('status-archived') : t('status-active')}
          </Badge>
        )
      }
    }
  ]
}

class BenefitTypesErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(LOG_PREFIX, 'RENDER CRASH:', error)
    console.error(LOG_PREFIX, 'Component stack:', info.componentStack)
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

const BenefitTypesView: React.FC<BenefitTypesViewProps> = ({
  t,
  legalEntities,
  legalEntitiesLoading,
  onLoadLegalEntities,
  onViewProviders,
  onCreateBenefit,
  ...context
}) => {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({ status: ['active'] })
  const [section, setSection] = useState('all')

  const deferredSearch = useDeferredValue(search)
  const deferredFilters = useDeferredValue(filters)
  const deferredSection = useDeferredValue(section)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingEntry, setEditingEntry] = useState<BenefitTypeEntry | undefined>()

  const [selectedEntry, setSelectedEntry] = useState<BenefitTypeEntry | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const {
    entries: allEntries,
    loading,
    error,
    fetchEntries,
    markAsDeleted
  } = useBenefitTypesCatalog({
    accessToken: context.accessToken
  })
  const mutations = useBenefitMutations(context)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (selectedEntry && allEntries.length > 0) {
      const fresh = allEntries.find(e => e.id === selectedEntry.id)
      if (fresh && fresh !== selectedEntry) {
        setSelectedEntry(fresh)
      }
    }
  }, [allEntries, selectedEntry])

  useEffect(() => {
    if (legalEntities.length === 0 && !legalEntitiesLoading) {
      onLoadLegalEntities()
    }
  }, [legalEntities.length, legalEntitiesLoading, onLoadLegalEntities])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchEntries({ search: undefined })
  }, [fetchEntries])

  const entityFilterOptions = useMemo(
    () =>
      legalEntities.map(le => ({
        id: le.id,
        label: le.name
      })),
    [legalEntities]
  )

  const filterConfig = useMemo(() => buildBenefitTypesFilterConfig(t, entityFilterOptions), [t, entityFilterOptions])

  const filteredEntries = useMemo(() => {
    let result = allEntries

    const statusFilter: string[] = deferredFilters.status ?? []
    if (statusFilter.length > 0) {
      result = result.filter(e => {
        const isArchived = e.isDeleted === true
        if (statusFilter.includes('active') && !isArchived) return true
        if (statusFilter.includes('archived') && isArchived) return true
        return false
      })
    }

    const entityFilter: string[] = deferredFilters.legalEntity ?? []
    if (entityFilter.length > 0) {
      result = result.filter(e => {
        const resolved = resolveLegalEntity(e, legalEntities)
        return resolved && entityFilter.includes(resolved.id)
      })
    }

    const visibilityFilter: string[] = deferredFilters.visibility ?? []
    if (visibilityFilter.length > 0) {
      result = result.filter(e => {
        const pub = isPublicBenefit(e.parsedObjectValue?.groups)
        if (visibilityFilter.includes('public') && pub) return true
        if (visibilityFilter.includes('private') && !pub) return true
        return false
      })
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      result = result.filter(
        e =>
          e.value?.toLowerCase().includes(q) ||
          e.code?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      )
    }

    if (deferredSection !== 'all') {
      result = result.filter(e => {
        const pub = isPublicBenefit(e.parsedObjectValue?.groups)
        return deferredSection === 'public' ? pub : !pub
      })
    }

    return result
  }, [allEntries, deferredFilters, deferredSearch, deferredSection, legalEntities])

  const titleSections = useMemo(() => {
    const activeEntries = allEntries.filter(e => !e.isDeleted)
    const publicCount = activeEntries.filter(e => isPublicBenefit(e.parsedObjectValue?.groups)).length
    const privateCount = activeEntries.length - publicCount
    return [
      { id: 'all', label: t('filter-visibility-all'), metadata: { count: activeEntries.length } },
      { id: 'public', label: t('visibility-public'), metadata: { count: publicCount } },
      { id: 'private', label: t('visibility-private'), metadata: { count: privateCount } }
    ]
  }, [allEntries, t])

  const handleEdit = useCallback((entry: BenefitTypeEntry) => {
    setSelectedEntry(null)
    setDialogMode('edit')
    setEditingEntry(entry)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(
    async (data: BenefitTypeFormData) => {
      try {
        if (dialogMode === 'create') {
          await mutations.createBenefitType(data)
          toast.success(t('toast-created', { name: data.value }))
        } else if (editingEntry) {
          await mutations.updateBenefitType(editingEntry.id, data, {
            code: editingEntry.code,
            parentEntryId: editingEntry.parentEntryId,
            objectValue: editingEntry.objectValue
          })
          toast.success(t('toast-updated', { name: data.value }))
        }
        hasFetched.current = false
        fetchEntries({ search: undefined })
      } catch (err) {
        console.error(LOG_PREFIX, 'handleSubmit error:', err)
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [dialogMode, editingEntry, mutations, t, fetchEntries]
  )

  const handleArchive = useCallback(
    async (entry: BenefitTypeEntry) => {
      setSelectedEntry(null)
      try {
        await mutations.deactivateBenefitType(entry.id, {
          code: entry.code,
          value: entry.value,
          description: entry.description,
          parentEntryId: entry.parentEntryId,
          objectValue: entry.objectValue
        })
        toast.success(t('toast-deactivated', { name: entry.value }))
        markAsDeleted(entry.id)
        await fetchEntries({ search: undefined })
      } catch (err) {
        console.error(LOG_PREFIX, 'handleArchive ERROR:', err)
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [mutations, t, markAsDeleted, fetchEntries]
  )

  const handleActivate = useCallback(
    async (entry: BenefitTypeEntry) => {
      setSelectedEntry(null)
      try {
        await mutations.activateBenefitType(entry.id, {
          code: entry.code,
          value: entry.value,
          description: entry.description,
          parentEntryId: entry.parentEntryId,
          objectValue: entry.objectValue
        })
        toast.success(t('toast-activated', { name: entry.value }))
        await fetchEntries({ search: undefined })
      } catch (err) {
        console.error(LOG_PREFIX, 'handleActivate ERROR:', err)
        toast.error(t('toast-error', { message: err instanceof Error ? err.message : String(err) }))
      }
    },
    [mutations, t, fetchEntries]
  )

  const handleExport = useCallback(async () => {
    if (isExporting || filteredEntries.length === 0) return
    setIsExporting(true)
    try {
      const data = filteredEntries.map(entry => {
        const obj = entry.parsedObjectValue
        const entity = resolveLegalEntity(entry, legalEntities)
        const currency = obj?.currency || entity?.currency
        return {
          name: entry.value || '',
          description: entry.description || '',
          legalEntity: entity?.name || '',
          visibility: isPublicBenefit(obj?.groups) ? 'Public' : 'Private',
          companyContribution: obj?.value ? formatCurrency(obj.value, currency) : '',
          employeeContribution: obj?.employeeMonthlyContribution
            ? formatCurrency(obj.employeeMonthlyContribution, currency)
            : '',
          period: obj?.period || '',
          status: entry.isDeleted ? 'Archived' : 'Active'
        }
      })
      await exportWorkbookToExcel('Benefit-Types', [
        {
          name: 'Benefits',
          columns: [
            { header: t('col-benefit'), key: 'name' },
            { header: t('col-description'), key: 'description' },
            { header: t('col-legal-entity'), key: 'legalEntity' },
            { header: t('col-visibility'), key: 'visibility' },
            { header: t('col-company-contribution'), key: 'companyContribution' },
            { header: t('col-employee-contribution'), key: 'employeeContribution' },
            { header: t('col-period'), key: 'period' },
            { header: t('col-status'), key: 'status' }
          ],
          data
        }
      ])
    } catch (err) {
      console.error('Export failed:', err)
      toast.error(t('toast-error', { message: 'Export failed' }))
    } finally {
      setIsExporting(false)
    }
  }, [filteredEntries, isExporting, legalEntities, t])

  const columns = useMemo(() => createBenefitTypeColumns(t, legalEntities), [t, legalEntities])

  const handleRowClick = useCallback((entry: BenefitTypeEntry) => {
    setSelectedEntry(prev => (prev?.id === entry.id ? null : entry))
  }, [])

  const errorFallback = (
    <div className="gba:p-8 gba:text-center">
      <p className="gba:text-destructive gba:font-medium">Something went wrong displaying benefits.</p>
      <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">Check browser console for details.</p>
    </div>
  )

  return (
    <BenefitTypesErrorBoundary fallback={errorFallback}>
      <DataDisplay
        titleSections={titleSections}
        currentSection={section}
        onSectionChange={setSection}
        searchValue={search}
        searchPlaceholder={t('filter-search-placeholder')}
        onSearchChange={setSearch}
        filters={filters}
        filterConfiguration={filterConfig}
        onFilterChange={setFilters}
        filterSheetTitle={t('filter-search-placeholder')}
        filterSheetDescription=""
        secondaryActions={
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || filteredEntries.length === 0}
            >
              <DownloadSimpleIcon className="gba:size-4 gba:mr-1.5" />
              {isExporting ? '...' : t('action-export')}
            </Button>
            <Button size="sm" onClick={onCreateBenefit} data-testid="BenefitTypesView-CreateButton">
              <PlusIcon className="gba:size-4 gba:mr-1.5" />
              {t('action-create-benefit')}
            </Button>
          </div>
        }
        toolbarDensity="compact"
      >
        <TabDataTable
          data={filteredEntries}
          columns={columns}
          loading={loading}
          error={error}
          emptyMessage={search || Object.keys(filters).length > 0 ? t('empty-no-results') : t('empty-description')}
          onRowClick={handleRowClick}
        />
      </DataDisplay>

      <DetailSheet
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry?.value || t('col-benefit')}
      >
        {selectedEntry && (
          <BenefitDetailPanel
            t={t}
            entry={selectedEntry}
            legalEntities={legalEntities}
            accessToken={context.accessToken}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onActivate={handleActivate}
            onViewProviders={onViewProviders}
            onLinkProvider={mutations.linkProviderToBenefit}
            onUnlinkProvider={mutations.unlinkProvider}
            onCreateProvider={async data => {
              await mutations.createProvider(data)
            }}
            onProvidersChanged={() => {
              hasFetched.current = false
              return fetchEntries({ search: undefined })
            }}
          />
        )}
      </DetailSheet>

      <BenefitTypeDialog
        t={t}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        mode={dialogMode}
        initialData={editingEntry}
        legalEntities={legalEntities}
        selectedLegalEntityId={null}
      />
    </BenefitTypesErrorBoundary>
  )
}

export default BenefitTypesView
