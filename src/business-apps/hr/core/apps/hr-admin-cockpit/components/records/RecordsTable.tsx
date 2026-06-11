import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  Button,
  DataDisplay,
  DataTable,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import { buildIssueDetail, CATEGORY_I18N_KEY, HINT_I18N_KEY } from '../../services/dataQualityCompute'
import type { EmployeeAttentionRow } from '../../types/dataQuality.types'
import { useDataQualityContext } from '../../hooks/dataQualityHooks'
import { useEmployeeActionRefresh } from '../../hooks/useEmployeeActionRefresh'
import { RecordDetailsSheet } from './RecordDetailsSheet'
import translations from '../../_i18n'

function getSeverityWeight(severity: EmployeeAttentionRow['severity']): number {
  if (severity === 'critical') return 3
  if (severity === 'warning') return 2
  return 1
}

function getSortableStringValue(row: EmployeeAttentionRow, columnId: string): string {
  if (columnId === 'employeeName') return row.employeeName.trim()
  if (columnId === 'legalEntity') return (row.legalEntity ?? '').trim()
  if (columnId === 'location') return (row.location ?? '').trim()
  if (columnId === 'severity') return row.severity.trim()
  return ''.trim()
}

function applySorting(
  rows: EmployeeAttentionRow[],
  sorting: Array<{ id: string; desc: boolean }>
): EmployeeAttentionRow[] {
  if (sorting.length === 0) return rows

  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

  const sorted = [...rows]
  sorted.sort((left, right) => {
    for (const rule of sorting) {
      // The design-system table emits `desc` inverted vs. expected TanStack semantics.
      // Normalize so "ascending" in the UI behaves as ascending in the data.
      const direction = rule.desc ? 1 : -1
      let compare = 0
      if (rule.id === 'severity') {
        compare = getSeverityWeight(left.severity) - getSeverityWeight(right.severity)
      } else {
        const leftValue = getSortableStringValue(left, rule.id)
        const rightValue = getSortableStringValue(right, rule.id)
        const leftEmpty = leftValue.trim() === ''
        const rightEmpty = rightValue.trim() === ''
        if (leftEmpty && !rightEmpty) compare = 1
        else if (!leftEmpty && rightEmpty) compare = -1
        else compare = collator.compare(leftValue, rightValue)
      }

      if (compare !== 0) {
        return direction * compare
      }
    }
    return 0
  })
  return sorted
}

function clampPageIndex(totalCount: number, pageSize: number, pageIndex: number): number {
  if (totalCount <= 0) return 0
  const maxPageIndex = Math.max(0, Math.ceil(totalCount / pageSize) - 1)
  return Math.min(pageIndex, maxPageIndex)
}

export function severityToBadgeStatus(severity: EmployeeAttentionRow['severity']) {
  if (severity === 'critical') return 'destructive' as const
  if (severity === 'warning') return 'warning' as const
  return 'info' as const
}

export function severityToLabel(t: (key: string) => string, severity: EmployeeAttentionRow['severity']): string {
  if (severity === 'critical') return t('severity-critical')
  if (severity === 'warning') return t('severity-warning')
  return t('severity-info')
}

interface RecordsTableProps {
  readonly accessToken: string
  readonly initialFilters?: Record<string, string[]> | null
}

function buildRecordsTableColumns(t: (key: string) => string): ColumnDef<EmployeeAttentionRow>[] {
  return [
    {
      id: 'employeeName',
      accessorKey: 'employeeName',
      header: t('col-employee'),
      size: 280,
      maxSize: 320,
      cell: ({ row }) => (
        <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:shrink-0">
            <UserIcon className="gba:size-3.5 gba:text-muted-foreground" />
          </div>
          <span
            className="gba:block gba:max-w-[220px] gba:truncate gba:font-medium gba:text-sm"
            title={row.original.employeeName}
          >
            {row.original.employeeName}
          </span>
        </div>
      )
    },
    {
      id: 'legalEntity',
      accessorKey: 'legalEntity',
      header: t('col-legal-entity'),
      size: 190,
      maxSize: 240,
      cell: ({ row }) => (
        <span className="gba:block gba:max-w-[180px] gba:truncate gba:text-sm" title={row.original.legalEntity ?? '-'}>
          {row.original.legalEntity ?? '-'}
        </span>
      )
    },
    {
      id: 'location',
      accessorKey: 'location',
      header: t('col-location'),
      size: 180,
      maxSize: 220,
      cell: ({ row }) => (
        <span className="gba:block gba:max-w-[170px] gba:truncate gba:text-sm" title={row.original.location ?? '-'}>
          {row.original.location ?? '-'}
        </span>
      )
    },
    {
      id: 'missingFields',
      header: t('col-missing-fields'),
      enableSorting: false,
      size: 360,
      maxSize: 420,
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {row.original.missingFields.map(code => (
              <Tooltip key={code}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={code === 'tax' || code === 'payroll_bank' ? 'destructive' : 'warning'}
                    size="sm"
                    className="gba:cursor-help"
                  >
                    {CATEGORY_I18N_KEY[code] ? t(CATEGORY_I18N_KEY[code]) : code}
                  </Badge>
                </TooltipTrigger>
                {HINT_I18N_KEY[code] && <TooltipContent>{t(HINT_I18N_KEY[code])}</TooltipContent>}
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )
    },
    {
      id: 'severity',
      accessorKey: 'severity',
      header: t('col-severity'),
      size: 150,
      maxSize: 170,
      cell: ({ row }) => (
        <StatusBadge
          size="sm"
          status={severityToBadgeStatus(row.original.severity)}
          leftLabel={severityToLabel(t, row.original.severity)}
        />
      )
    }
  ]
}

export function RecordsTable({ accessToken, initialFilters }: Readonly<RecordsTableProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [tableFilters, setTableFilters] = useState<Record<string, string[]>>(initialFilters ?? {})
  const handleActionStarted = useEmployeeActionRefresh()

  useEffect(() => {
    setTableFilters(initialFilters ?? {})
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [initialFilters])

  const selectedRow = useMemo(
    () => ctx.employeeAttentionRows.find(r => r.employeeId === selectedEmployeeId) ?? null,
    [selectedEmployeeId, ctx.employeeAttentionRows]
  )

  const checklist = useMemo(() => {
    if (!selectedEmployeeId) return []
    const emp = ctx.employeeById.get(selectedEmployeeId)
    if (!emp) return []
    const dummy = ctx.recordsNeedingAttention.find(
      r => r.entityKind === 'employee' && r.entityId === selectedEmployeeId
    )
    if (!dummy) return []
    return buildIssueDetail(dummy, ctx.employeeById).checklist
  }, [selectedEmployeeId, ctx.recordsNeedingAttention, ctx.employeeById])

  const filterConfiguration = useMemo(() => {
    const rows = ctx.employeeAttentionRows
    const legalEntities = [...new Set(rows.map(r => r.legalEntity).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b)
    )
    const locations = [...new Set(rows.map(r => r.location).filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b)
    )
    const missingFieldCodes = [...new Set(rows.flatMap(r => r.missingFields))].sort((a, b) => a.localeCompare(b))

    return {
      id: 'records-filters',
      name: t('records-filter-title'),
      groups: [
        {
          id: 'severity-group',
          label: t('filter-severity'),
          collapsible: true,
          filters: [
            {
              id: 'severity',
              field: 'severity',
              label: t('filter-severity'),
              type: 'multi-select' as const,
              config: {
                options: [
                  { id: 'critical', label: t('filter-severity-critical') },
                  { id: 'warning', label: t('filter-severity-warning') }
                ]
              }
            }
          ]
        },
        {
          id: 'missing-fields-group',
          label: t('filter-missing-fields'),
          collapsible: true,
          filters: [
            {
              id: 'missingFields',
              field: 'missingFields',
              label: t('filter-missing-fields'),
              type: 'multi-select' as const,
              config: {
                options: missingFieldCodes.map(code => ({
                  id: code,
                  label: CATEGORY_I18N_KEY[code] ? t(CATEGORY_I18N_KEY[code]) : code
                }))
              }
            }
          ]
        },
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
              config: {
                options: legalEntities.map(le => ({ id: le, label: le }))
              }
            }
          ]
        },
        {
          id: 'location-group',
          label: t('filter-location'),
          collapsible: true,
          filters: [
            {
              id: 'location',
              field: 'location',
              label: t('filter-location'),
              type: 'multi-select' as const,
              config: {
                options: locations.map(loc => ({ id: loc, label: loc }))
              }
            }
          ]
        }
      ]
    }
  }, [ctx.employeeAttentionRows, t])

  const columns = useMemo<ColumnDef<EmployeeAttentionRow>[]>(() => buildRecordsTableColumns(t), [t])

  const sortableColumns = useMemo(
    () => [
      { id: 'employeeName', label: t('col-employee') },
      { id: 'legalEntity', label: t('col-legal-entity') },
      { id: 'location', label: t('col-location') },
      { id: 'severity', label: t('col-severity') }
    ],
    [t]
  )

  const allColumnDefs = useMemo(
    () => [
      { id: 'employeeName', label: t('col-employee') },
      { id: 'legalEntity', label: t('col-legal-entity') },
      { id: 'location', label: t('col-location') },
      { id: 'missingFields', label: t('col-missing-fields') },
      { id: 'severity', label: t('col-severity') }
    ],
    [t]
  )

  const [visibleColumns, setVisibleColumns] = useState(() => allColumnDefs.map(c => c.id))

  const filteredData = useMemo(() => {
    let rows = ctx.employeeAttentionRows

    if (tableSearch) {
      const q = tableSearch.toLowerCase()
      rows = rows.filter(
        r =>
          r.employeeName.toLowerCase().includes(q) ||
          r.legalEntity?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q)
      )
    }

    const severityFilter = tableFilters.severity
    if (severityFilter?.length) rows = rows.filter(r => severityFilter.includes(r.severity))

    const missingFilter = tableFilters.missingFields
    if (missingFilter?.length) rows = rows.filter(r => r.missingFields.some(f => missingFilter.includes(f)))

    const leFilter = tableFilters.legalEntity
    if (leFilter?.length) rows = rows.filter(r => r.legalEntity && leFilter.includes(r.legalEntity))

    const locFilter = tableFilters.location
    if (locFilter?.length) rows = rows.filter(r => r.location && locFilter.includes(r.location))

    return rows
  }, [ctx.employeeAttentionRows, tableSearch, tableFilters])

  const sortedData = useMemo(() => applySorting(filteredData, sorting), [filteredData, sorting])
  const totalCount = sortedData.length

  useEffect(() => {
    setPagination(p => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
  }, [tableSearch, tableFilters, sorting])

  useEffect(() => {
    setPagination(p => {
      const pageIndex = clampPageIndex(totalCount, p.pageSize, p.pageIndex)
      return pageIndex === p.pageIndex ? p : { ...p, pageIndex }
    })
  }, [totalCount])

  const displayedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedData.slice(start, end)
  }, [sortedData, pagination.pageIndex, pagination.pageSize])

  const visibleCols = useMemo(
    () => columns.filter(col => typeof col.id === 'string' && visibleColumns.includes(col.id)),
    [columns, visibleColumns]
  )
  const errorMessage = ctx.error?.startsWith('error-') ? t(ctx.error) : ctx.error

  return (
    <>
      <DataDisplay
        titleSections={[
          {
            id: 'attention',
            label: t('section-records-attention'),
            metadata: { count: filteredData.length, isLoading: ctx.loading }
          }
        ]}
        currentSection="attention"
        searchValue={tableSearch}
        searchPlaceholder={t('records-search-placeholder')}
        onSearchChange={setTableSearch}
        filters={tableFilters}
        filterConfiguration={filterConfiguration}
        onFilterChange={setTableFilters}
        filterSheetTitle={t('records-filter-title')}
        filterSheetDescription={t('records-filter-description')}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={allColumnDefs}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        secondaryActions={
          ctx.filters.issueFocus ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ctx.setFilters(f => ({ ...f, issueFocus: null }))}
            >
              {t('records-clear-focus')}
            </Button>
          ) : undefined
        }
      >
        <DataTable<EmployeeAttentionRow>
          data={displayedRows}
          columns={visibleCols}
          loading={ctx.loading}
          error={errorMessage}
          enableSorting
          enablePagination
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={next => {
            setPagination(prev => {
              const resolvedNext = next && typeof next === 'object' ? { ...prev, ...next } : prev
              const nextPageIndex = resolvedNext.pageIndex ?? prev.pageIndex
              const nextPageSize = resolvedNext.pageSize ?? prev.pageSize
              const pageIndex = nextPageSize === prev.pageSize ? nextPageIndex : 0
              return {
                pageIndex: clampPageIndex(totalCount, nextPageSize, pageIndex),
                pageSize: nextPageSize
              }
            })
          }}
          totalCount={totalCount}
          density="compact"
          emptyMessage={t('records-empty')}
          onRowClick={record => setSelectedEmployeeId(record.employeeId)}
        />
      </DataDisplay>

      <RecordDetailsSheet
        selectedRow={selectedRow}
        setSelectedEmployeeId={setSelectedEmployeeId}
        checklist={checklist}
        accessToken={accessToken}
        onActionStarted={handleActionStarted}
      />
    </>
  )
}
