'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataDisplay,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { fetchActiveStructureBootstrap } from '../setup/lib/activeStructureBootstrap'
import { UserManagementClient } from '@/common/network/users/UserManagementClient'
import { AddEmployeeForm } from '../setup-add-employees/AddEmployeeForm'
import { EditEmployeeForm } from '../setup-add-employees/EditEmployeeForm'
import { ResetEmployeePasswordForm } from '../setup-add-employees/ResetEmployeePasswordForm'
import peopleTranslations from './_i18n'
import {
  fetchOrganizationalUnitsPage,
  type PeopleEmployeeRow,
  type PeopleOrganizationalUnitRow
} from './peopleStructureData'
import { fetchHrActiveEmployeesPage } from './peopleHrActiveEmployeesApi'
import { startTerminateEmployeeProcess } from './peopleTerminateEmployeeApi'
import { OrgchartClient } from '@/common/network/orgchart/OrgchartClient'
import { PeopleAddDepartmentForm, PeopleEditDepartmentForm } from './PeopleDepartmentForms'
import {
  fetchPeopleOuDeleteFeasibility,
  mapOrgchartOrganizationalUnitDeleteError,
  type PeopleOuDeleteFeasibility
} from './peopleDepartmentDeleteFeasibility'

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
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [addDepartmentOpen, setAddDepartmentOpen] = useState(false)
  const [editDepartmentRow, setEditDepartmentRow] = useState<PeopleOrganizationalUnitRow | null>(null)
  const [removeDepartmentRow, setRemoveDepartmentRow] = useState<PeopleOrganizationalUnitRow | null>(null)
  const [removeFeasibility, setRemoveFeasibility] = useState<PeopleOuDeleteFeasibility | null>(null)
  const [removeFeasibilityLoading, setRemoveFeasibilityLoading] = useState(false)
  const [removeFeasibilityError, setRemoveFeasibilityError] = useState<string | null>(null)
  const [removeConfirmBusy, setRemoveConfirmBusy] = useState(false)
  const [removeActionError, setRemoveActionError] = useState<string | null>(null)
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null)
  const [resetPasswordEmployeeId, setResetPasswordEmployeeId] = useState<string | null>(null)
  const [terminateTarget, setTerminateTarget] = useState<{
    id: string
    displayName: string
    userId?: string | null
  } | null>(null)
  const [terminateBusy, setTerminateBusy] = useState(false)
  const [terminateError, setTerminateError] = useState<string | null>(null)
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
          const localeCode = typeof navigator !== 'undefined' ? navigator.language : undefined
          const r = await fetchHrActiveEmployeesPage(accessToken, {
            limit,
            offset,
            search: searchQuery,
            sortColumnId,
            sortDesc,
            localeCode
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
    if (!removeDepartmentRow || !accessToken?.trim() || !structureId) {
      setRemoveFeasibility(null)
      setRemoveFeasibilityError(null)
      setRemoveFeasibilityLoading(false)
      return
    }
    let cancelled = false
    setRemoveFeasibilityLoading(true)
    setRemoveFeasibilityError(null)
    setRemoveFeasibility(null)
    setRemoveActionError(null)
    void fetchPeopleOuDeleteFeasibility(accessToken, structureId, removeDepartmentRow.id)
      .then(f => {
        if (!cancelled) setRemoveFeasibility(f)
      })
      .catch(e => {
        if (!cancelled) setRemoveFeasibilityError(e instanceof Error ? e.message : t('error-load'))
      })
      .finally(() => {
        if (!cancelled) setRemoveFeasibilityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [removeDepartmentRow, accessToken, structureId, t])

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
        accessorFn: row => row.workEmail?.trim() || '—',
        header: t('col-email')
      },
      {
        id: 'jobTitle',
        accessorFn: row => row.jobTitle?.trim() || '—',
        header: t('col-job-title')
      },
      {
        // Avoid id `actions`: DataTable applies a fixed `w-12` cell width to that id, which stacks multiple buttons.
        id: 'employeeRowActions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const canResetPassword = Boolean(row.original.userId?.trim())
          return (
            <div className="gba:flex gba:flex-row gba:flex-nowrap gba:items-center gba:justify-end gba:gap-2">
              <span
                className="gba:inline-flex"
                title={canResetPassword ? undefined : t('tooltip-reset-password-no-user')}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canResetPassword}
                  onClick={() => setResetPasswordEmployeeId(row.original.id)}
                >
                  {t('action-reset-password')}
                </Button>
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditEmployeeId(row.original.id)}>
                {t('action-edit')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setTerminateError(null)
                  setTerminateTarget({
                    id: row.original.id,
                    displayName: displayNameForRow(row.original),
                    userId: row.original.userId
                  })
                }}
              >
                {t('action-remove-employee')}
              </Button>
            </div>
          )
        }
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
      },
      {
        id: 'departmentRowActions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <div className="gba:flex gba:flex-row gba:flex-nowrap gba:items-center gba:justify-end gba:gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDepartmentRow(row.original)}>
                {t('action-edit')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRemoveActionError(null)
                  setRemoveDepartmentRow(row.original)
                }}
              >
                {t('action-remove-department')}
              </Button>
            </div>
          )
        }
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
      <Card className="gba:mx-auto gba:max-w-7xl">
        <CardHeader className="gba:flex gba:flex-row gba:items-start gba:justify-between gba:gap-4">
          <div>
            <CardTitle>{t('people-title')}</CardTitle>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('people-subtitle')}</p>
          </div>
          {structureId && accessToken?.trim() ? (
            activeTab === 'employees' ? (
              <Button type="button" variant="default" onClick={() => setAddEmployeeOpen(true)}>
                {t('action-add-employee')}
              </Button>
            ) : (
              <Button type="button" variant="default" onClick={() => setAddDepartmentOpen(true)}>
                {t('action-add-department')}
              </Button>
            )
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

      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
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
                setAddEmployeeOpen(false)
                setRefreshKey(k => k + 1)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addDepartmentOpen} onOpenChange={setAddDepartmentOpen}>
        <DialogContent className="gba:max-h-[90vh] gba:overflow-y-auto gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog-add-department-title')}</DialogTitle>
            <DialogDescription>{t('dialog-add-department-description')}</DialogDescription>
          </DialogHeader>
          {accessToken?.trim() && structureId ? (
            <PeopleAddDepartmentForm
              embedded
              accessToken={accessToken}
              structureId={structureId}
              onSuccess={() => {
                setAddDepartmentOpen(false)
                setRefreshKey(k => k + 1)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removeDepartmentRow)}
        onOpenChange={open => {
          if (!open) {
            setRemoveDepartmentRow(null)
            setRemoveFeasibility(null)
            setRemoveFeasibilityError(null)
            setRemoveFeasibilityLoading(false)
            setRemoveConfirmBusy(false)
            setRemoveActionError(null)
          }
        }}
      >
        <DialogContent className="gba:max-w-lg" data-testid="people-remove-department-dialog">
          <DialogHeader>
            <DialogTitle>
              {removeDepartmentRow
                ? t('dialog-remove-department-title', { name: removeDepartmentRow.name })
                : t('dialog-remove-department-title-fallback')}
            </DialogTitle>
            <DialogDescription>{t('dialog-remove-department-intro')}</DialogDescription>
          </DialogHeader>
          <div className="gba:flex gba:flex-col gba:gap-3 gba:text-sm gba:text-muted-foreground">
            <p>{t('dialog-remove-department-what-happens')}</p>
            {removeFeasibilityLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
                <Spinner size="sm" />
                <span>{t('dialog-remove-department-checking')}</span>
              </div>
            ) : null}
            {removeFeasibilityError ? (
              <Alert variant="destructive">
                <AlertDescription>{removeFeasibilityError}</AlertDescription>
              </Alert>
            ) : null}
            {removeActionError ? (
              <Alert variant="destructive">
                <AlertDescription>{removeActionError}</AlertDescription>
              </Alert>
            ) : null}
            {!removeFeasibilityLoading && removeFeasibility && !removeFeasibilityError ? (
              <>
                {removeFeasibility.childOrgUnitNodeCount > 0 ? (
                  <p>{t('dialog-remove-department-children', { count: removeFeasibility.childOrgUnitNodeCount })}</p>
                ) : (
                  <p>{t('dialog-remove-department-no-children')}</p>
                )}
                {!removeFeasibility.hasNoBlockingAssignments ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {t('dialog-remove-department-blocker-assignments', {
                        employees: removeFeasibility.rowsWithEmployee,
                        jobPositions: removeFeasibility.rowsWithJobPosition
                      })}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {removeFeasibility.structureLoadFailed ? (
                  <Alert variant="destructive">
                    <AlertDescription>{t('dialog-remove-department-blocker-structure')}</AlertDescription>
                  </Alert>
                ) : null}
                {!removeFeasibility.structureLoadFailed && removeFeasibility.hasNoBlockingAssignments ? (
                  <>
                    {!removeFeasibility.hasOrgchartNode ? (
                      <Alert variant="destructive">
                        <AlertDescription>{t('dialog-remove-department-blocker-no-node')}</AlertDescription>
                      </Alert>
                    ) : null}
                    {removeFeasibility.hasOrgchartNode && !removeFeasibility.hasGraphParent ? (
                      <Alert variant="destructive">
                        <AlertDescription>{t('dialog-remove-department-blocker-no-parent')}</AlertDescription>
                      </Alert>
                    ) : null}
                  </>
                ) : null}
                {removeFeasibility.canDeleteByPreview ? (
                  <Alert>
                    <AlertDescription>{t('dialog-remove-department-ready')}</AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}
          </div>
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={removeConfirmBusy}
              onClick={() => {
                setRemoveDepartmentRow(null)
                setRemoveFeasibility(null)
                setRemoveFeasibilityError(null)
                setRemoveActionError(null)
              }}
            >
              {t('dialog-remove-department-cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                removeConfirmBusy ||
                removeFeasibilityLoading ||
                Boolean(removeFeasibilityError) ||
                !removeFeasibility?.canDeleteByPreview ||
                !accessToken?.trim() ||
                !removeDepartmentRow
              }
              onClick={() => {
                if (!accessToken?.trim() || !removeDepartmentRow) return
                setRemoveConfirmBusy(true)
                setRemoveActionError(null)
                const client = new OrgchartClient()
                client.setAccessToken(accessToken)
                void client
                  .deleteOrganizationalUnit(removeDepartmentRow.id, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  })
                  .then(() => {
                    setRemoveDepartmentRow(null)
                    setRemoveFeasibility(null)
                    setRefreshKey(k => k + 1)
                  })
                  .catch(err => {
                    setRemoveActionError(mapOrgchartOrganizationalUnitDeleteError(err, t))
                  })
                  .finally(() => {
                    setRemoveConfirmBusy(false)
                  })
              }}
              data-testid="people-remove-department-confirm"
            >
              {removeConfirmBusy ? t('dialog-remove-department-busy') : t('dialog-remove-department-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editDepartmentRow)} onOpenChange={open => !open && setEditDepartmentRow(null)}>
        <DialogContent className="gba:max-h-[90vh] gba:overflow-y-auto gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog-edit-department-title')}</DialogTitle>
            <DialogDescription>{t('dialog-edit-department-description')}</DialogDescription>
          </DialogHeader>
          {accessToken?.trim() && structureId && editDepartmentRow ? (
            <PeopleEditDepartmentForm
              embedded
              accessToken={accessToken}
              structureId={structureId}
              row={editDepartmentRow}
              onSuccess={() => {
                setEditDepartmentRow(null)
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

      <Dialog open={Boolean(resetPasswordEmployeeId)} onOpenChange={open => !open && setResetPasswordEmployeeId(null)}>
        <DialogContent className="gba:max-h-[90vh] gba:overflow-y-auto gba:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog-reset-password-title')}</DialogTitle>
          </DialogHeader>
          {accessToken?.trim() && structureId && resetPasswordEmployeeId ? (
            <ResetEmployeePasswordForm
              embedded
              accessToken={accessToken}
              structureId={structureId}
              employeeId={resetPasswordEmployeeId}
              onSuccess={() => {
                setRefreshKey(k => k + 1)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(terminateTarget)}
        onOpenChange={open => {
          if (!open) {
            setTerminateTarget(null)
            setTerminateError(null)
            setTerminateBusy(false)
          }
        }}
      >
        <DialogContent className="gba:max-w-md" data-testid="people-terminate-employee-dialog">
          <DialogHeader>
            <DialogTitle>{t('dialog-terminate-title')}</DialogTitle>
            <DialogDescription>
              {terminateTarget ? t('dialog-terminate-description', { name: terminateTarget.displayName }) : null}
            </DialogDescription>
          </DialogHeader>
          {terminateError ? (
            <Alert variant="destructive" data-testid="people-terminate-employee-error">
              <AlertDescription>{terminateError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={terminateBusy}
              onClick={() => {
                setTerminateTarget(null)
                setTerminateError(null)
              }}
            >
              {t('dialog-terminate-cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={terminateBusy || !accessToken?.trim() || !terminateTarget}
              onClick={() => {
                if (!accessToken?.trim() || !terminateTarget) return
                setTerminateBusy(true)
                setTerminateError(null)
                const row = employeeRows.find(e => e.id === terminateTarget.id)
                const terminateJobPosition = Boolean(row?.jobTitle?.trim())
                const userIdToDeactivate = terminateTarget.userId?.trim()
                void startTerminateEmployeeProcess(accessToken, {
                  employeeId: terminateTarget.id,
                  terminateJobPosition
                })
                  .then(async () => {
                    if (userIdToDeactivate) {
                      try {
                        const um = new UserManagementClient()
                        um.setAccessToken(accessToken)
                        await um.activateUser(userIdToDeactivate, { active: false })
                      } catch (e) {
                        console.error('[People] deactivate user after terminate failed', e)
                      }
                    }
                    setTerminateTarget(null)
                    setRefreshKey(k => k + 1)
                  })
                  .catch(e => {
                    setTerminateError(e instanceof Error ? e.message : t('error-load'))
                  })
                  .finally(() => {
                    setTerminateBusy(false)
                  })
              }}
              data-testid="people-terminate-employee-confirm"
            >
              {terminateBusy ? t('dialog-terminate-busy') : t('dialog-terminate-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PeopleRemoteApp
