'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataDisplay,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
  useTranslation
} from '@newwork/nw-design-system'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import { fetchActiveStructureBootstrap } from '../setup/lib/activeStructureBootstrap'
import { AddEmployeeForm } from '../setup-add-employees/AddEmployeeForm'
import { EditEmployeeForm } from '../setup-add-employees/EditEmployeeForm'
import peopleTranslations from './_i18n'
import {
  fetchEmployeesPage,
  fetchOrganizationalUnitsPage,
  type PeopleEmployeeRow,
  type PeopleOrganizationalUnitRow
} from './peopleStructureData'

export type PeopleRemoteAppViewProps = {
  accessToken?: string
  additionalData?: Record<string, unknown>
}

type PeopleTab = 'employees' | 'departments'

type PeopleDataPanelProps<T extends { id: string }> = {
  'data-testid': string
  sectionLabel: string
  totalCount: number
  isLoading: boolean
  searchValue: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  sortableColumns: Array<{ id: string; label: string }>
  data: T[]
  columns: ColumnDef<T>[]
  emptyMessage: string
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
}

function PeopleDataPanel<T extends { id: string }>({
  'data-testid': dataTestId,
  sectionLabel,
  totalCount,
  isLoading,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  sorting,
  onSortingChange,
  sortableColumns,
  data,
  columns,
  emptyMessage,
  pagination,
  onPaginationChange
}: Readonly<PeopleDataPanelProps<T>>) {
  return (
    <DataDisplay
      data-testid={dataTestId}
      titleSections={[
        {
          id: 'list',
          label: sectionLabel,
          metadata: { count: totalCount, isLoading }
        }
      ]}
      currentSection="list"
      toolbarDensity="default"
      searchValue={searchValue}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={onSortingChange}
      className="gba:min-h-[360px]"
    >
      <TooltipProvider>
        <DataTable<T>
          key={`${dataTestId}-${isLoading ? 'loading' : 'ready'}`}
          data={data}
          columns={columns}
          loading={isLoading}
          totalCount={totalCount}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          enablePagination
          enableSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="auto"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          data-testid={`${dataTestId}-table`}
        />
      </TooltipProvider>
    </DataDisplay>
  )
}

export function PeopleRemoteApp({ accessToken }: PeopleRemoteAppViewProps) {
  const { t } = useTranslation(peopleTranslations as unknown as Record<string, string>)
  const [structureLoading, setStructureLoading] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)
  const [structureId, setStructureId] = useState('')

  const [employeeRows, setEmployeeRows] = useState<PeopleEmployeeRow[]>([])
  const [employeeTotal, setEmployeeTotal] = useState(0)
  const [departmentRows, setDepartmentRows] = useState<PeopleOrganizationalUnitRow[]>([])
  const [departmentTotal, setDepartmentTotal] = useState(0)

  const [listLoading, setListLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [activeTab, setActiveTab] = useState<PeopleTab>('employees')
  const [searchQuery, setSearchQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const sortColumnId = sorting[0]?.id ?? null
  const sortDesc = Boolean(sorting[0]?.desc)

  const currentTotal = useMemo(() => {
    if (activeTab === 'employees') return employeeTotal
    return departmentTotal
  }, [activeTab, employeeTotal, departmentTotal])

  useEffect(() => {
    if (!accessToken?.trim()) {
      setStructureId('')
      setStructureError(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    setStructureError(null)
    void fetchActiveStructureBootstrap(accessToken)
      .then(bootstrap => {
        if (cancelled) return
        if (bootstrap.hasActiveStructure && bootstrap.structureId?.trim()) {
          setStructureId(bootstrap.structureId.trim())
        } else {
          setStructureId('')
        }
      })
      .catch(e => {
        if (cancelled) return
        setStructureError(e instanceof Error ? e.message : t('error-load'))
        setStructureId('')
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, t])

  useEffect(() => {
    if (!accessToken?.trim() || !structureId || structureLoading) {
      setEmployeeRows([])
      setEmployeeTotal(0)
      setDepartmentRows([])
      setDepartmentTotal(0)
      return
    }

    let cancelled = false
    setListLoading(true)
    setDataError(null)

    const limit = pagination.pageSize
    const offset = pagination.pageIndex * pagination.pageSize

    void (async () => {
      try {
        if (activeTab === 'employees') {
          const r = await fetchEmployeesPage(accessToken, {
            structureId,
            limit,
            offset,
            search: searchQuery,
            sortColumnId,
            sortDesc
          })
          if (cancelled) return
          setEmployeeRows(r.rows)
          setEmployeeTotal(r.totalCount)
        } else {
          const r = await fetchOrganizationalUnitsPage(accessToken, {
            structureId,
            limit,
            offset,
            search: searchQuery,
            sortColumnId,
            sortDesc
          })
          if (cancelled) return
          setDepartmentRows(r.rows)
          setDepartmentTotal(r.totalCount)
        }
      } catch (e) {
        if (cancelled) return
        setDataError(e instanceof Error ? e.message : t('error-load'))
        setEmployeeRows([])
        setEmployeeTotal(0)
        setDepartmentRows([])
        setDepartmentTotal(0)
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    structureId,
    structureLoading,
    activeTab,
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    sortColumnId,
    sortDesc,
    refreshKey,
    t
  ])

  useEffect(() => {
    const maxPageIndex = currentTotal === 0 ? 0 : Math.max(0, Math.ceil(currentTotal / pagination.pageSize) - 1)
    if (pagination.pageIndex > maxPageIndex) {
      setPagination(p => {
        if (p.pageIndex === maxPageIndex) return p
        return { ...p, pageIndex: maxPageIndex }
      })
    }
  }, [currentTotal, pagination.pageIndex, pagination.pageSize])

  const displayNameForRow = useCallback((row: PeopleEmployeeRow) => {
    return row.displayName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.id
  }, [])

  const employeeColumns = useMemo<ColumnDef<PeopleEmployeeRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: row => displayNameForRow(row),
        header: t('col-name')
      },
      {
        id: 'email',
        accessorFn: row => getWorkEmailFromCommunication(row.communication ?? []) || '—',
        header: t('col-email')
      },
      {
        id: 'jobTitle',
        accessorFn: row => row.employeePosition?.jobPosition?.name ?? '—',
        header: t('col-job-title')
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditEmployeeId(row.original.id)}>
            {t('action-edit')}
          </Button>
        )
      }
    ],
    [displayNameForRow, t]
  )

  const ouColumns = useMemo<ColumnDef<PeopleOrganizationalUnitRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('col-unit-name')
      },
      {
        id: 'manager',
        accessorFn: row => row.managerDisplayName?.trim() || '—',
        header: t('col-manager'),
        enableSorting: false
      }
    ],
    [t]
  )

  const employeeSortableColumns = useMemo(
    () => [
      { id: 'name', label: t('col-name') },
      { id: 'email', label: t('col-email') },
      { id: 'jobTitle', label: t('col-job-title') }
    ],
    [t]
  )

  const ouSortableColumns = useMemo(() => [{ id: 'name', label: t('col-unit-name') }], [t])

  const searchPlaceholder = activeTab === 'employees' ? t('table-search-employees') : t('table-search-departments')

  const handleTabChange = (value: string) => {
    setActiveTab(value as PeopleTab)
    setSearchQuery('')
    setSorting([])
    setPagination({ pageIndex: 0, pageSize: 20 })
  }

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [searchQuery])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [sorting])

  const noStructure = !structureLoading && !structureError && accessToken?.trim() && !structureId

  return (
    <div className="gba:bg-background gba:min-h-[50vh] gba:p-6">
      <Card className="gba:mx-auto gba:max-w-4xl">
        <CardHeader className="gba:flex gba:flex-row gba:items-start gba:justify-between gba:gap-4">
          <div>
            <CardTitle>{t('people-title')}</CardTitle>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('people-subtitle')}</p>
          </div>
          {structureId && accessToken?.trim() ? (
            <Button type="button" variant="default" onClick={() => setAddOpen(true)}>
              {t('action-add-employee')}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-4">
          {structureError ? <p className="gba:text-sm gba:text-destructive">{structureError}</p> : null}
          {noStructure ? <p className="gba:text-sm gba:text-muted-foreground">{t('error-no-structure')}</p> : null}
          {!accessToken?.trim() ? <p className="gba:text-sm gba:text-muted-foreground">{t('error-load')}</p> : null}

          {structureLoading ? (
            <div className="gba:flex gba:items-center gba:gap-3 gba:py-8">
              <Spinner size="md" />
              <span className="gba:text-sm gba:text-muted-foreground">{t('loading-structure')}</span>
            </div>
          ) : null}

          {dataError ? <p className="gba:text-sm gba:text-destructive">{dataError}</p> : null}

          {structureId && !structureLoading ? (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="gba:flex-wrap">
                <TabsTrigger value="employees">{t('tab-employees')}</TabsTrigger>
                <TabsTrigger value="departments">{t('tab-departments')}</TabsTrigger>
              </TabsList>
              <TabsContent value="employees" className="gba:mt-4">
                <PeopleDataPanel<PeopleEmployeeRow>
                  data-testid="people-employees-display"
                  sectionLabel={t('tab-employees')}
                  totalCount={employeeTotal}
                  isLoading={listLoading}
                  searchValue={searchQuery}
                  searchPlaceholder={searchPlaceholder}
                  onSearchChange={setSearchQuery}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  sortableColumns={employeeSortableColumns}
                  data={employeeRows}
                  columns={employeeColumns}
                  emptyMessage={t('empty-employees')}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                />
              </TabsContent>
              <TabsContent value="departments" className="gba:mt-4">
                <PeopleDataPanel<PeopleOrganizationalUnitRow>
                  data-testid="people-departments-display"
                  sectionLabel={t('tab-departments')}
                  totalCount={departmentTotal}
                  isLoading={listLoading}
                  searchValue={searchQuery}
                  searchPlaceholder={searchPlaceholder}
                  onSearchChange={setSearchQuery}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  sortableColumns={ouSortableColumns}
                  data={departmentRows}
                  columns={ouColumns}
                  emptyMessage={t('empty-departments')}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                />
              </TabsContent>
            </Tabs>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="gba:max-h-[90vh] gba:overflow-y-auto gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog-add-employee-title')}</DialogTitle>
          </DialogHeader>
          {accessToken?.trim() && structureId ? (
            <AddEmployeeForm
              embedded
              accessToken={accessToken}
              structureId={structureId}
              onSuccess={() => {
                setAddOpen(false)
                setRefreshKey(k => k + 1)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editEmployeeId)} onOpenChange={open => !open && setEditEmployeeId(null)}>
        <DialogContent className="gba:max-h-[90vh] gba:overflow-y-auto gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog-edit-employee-title')}</DialogTitle>
          </DialogHeader>
          {accessToken?.trim() && structureId && editEmployeeId ? (
            <EditEmployeeForm
              embedded
              accessToken={accessToken}
              structureId={structureId}
              employeeId={editEmployeeId}
              onSuccess={() => {
                setRefreshKey(k => k + 1)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PeopleRemoteApp
