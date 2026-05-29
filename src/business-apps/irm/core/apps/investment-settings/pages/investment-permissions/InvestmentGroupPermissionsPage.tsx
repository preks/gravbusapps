import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Button, ButtonGroup, DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { ShieldCheckIcon } from '@phosphor-icons/react'
import { useInvestmentGroupPermissions } from '../../hooks'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { EditableComboboxCell } from '@/components/editable-cell'
import { Save, X, Trash, Columns3 } from 'lucide-react'

export interface InvestmentGroupPermissionsPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

type BucketKey = 'adminRoles' | 'viewerRoles' | 'managerRelationsRoles' | 'managerManagementRoles'

const InvestmentGroupPermissionsPage: React.FC<InvestmentGroupPermissionsPageProps> = ({
  className,
  prefixDataTestId = 'irm-investment-permissions',
  onBack,
  ...context
}) => {
  const testId = (s: string) => `${prefixDataTestId}-${s}`

  const {
    groups,
    groupsLoading,
    groupsError,
    error,
    fetchGroups,
    savePermission,
    deletePermission,
    permissionsByGroup
  } = useInvestmentGroupPermissions(context)

  // Local edits per groupRef for grid editing
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        adminRoles: string[]
        viewerRoles: string[]
        managerRelationsRoles: string[]
        managerManagementRoles: string[]
      }
    >
  >({})

  const rolesCatalog = useRolesCatalog(context)

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // Helpers to read/write bucket values for a given group
  const getBucketValue = useCallback(
    (groupRef: string, bucket: BucketKey): string[] => {
      const fromEdit = edits[groupRef]?.[bucket]
      if (fromEdit) return fromEdit
      const baseline = permissionsByGroup[groupRef]
      return baseline?.[bucket] ?? []
    },
    [edits, permissionsByGroup]
  )

  const setBucketValue = useCallback(
    (groupRef: string, bucket: BucketKey, next: string[]) => {
      setEdits(prev => {
        const current = {
          adminRoles: prev[groupRef]?.adminRoles ?? getBucketValue(groupRef, 'adminRoles'),
          viewerRoles: prev[groupRef]?.viewerRoles ?? getBucketValue(groupRef, 'viewerRoles'),
          managerRelationsRoles:
            prev[groupRef]?.managerRelationsRoles ?? getBucketValue(groupRef, 'managerRelationsRoles'),
          managerManagementRoles:
            prev[groupRef]?.managerManagementRoles ?? getBucketValue(groupRef, 'managerManagementRoles')
        }
        return { ...prev, [groupRef]: { ...current, [bucket]: next } }
      })
    },
    [getBucketValue]
  )

  const arraysEqual = useCallback((a: string[] = [], b: string[] = []) => JSON.stringify(a) === JSON.stringify(b), [])

  const isRowDirty = useCallback(
    (groupRef: string) => {
      const base = permissionsByGroup[groupRef]
      return (
        !arraysEqual(getBucketValue(groupRef, 'adminRoles'), base?.adminRoles || []) ||
        !arraysEqual(getBucketValue(groupRef, 'viewerRoles'), base?.viewerRoles || []) ||
        !arraysEqual(getBucketValue(groupRef, 'managerRelationsRoles'), base?.managerRelationsRoles || []) ||
        !arraysEqual(getBucketValue(groupRef, 'managerManagementRoles'), base?.managerManagementRoles || [])
      )
    },
    [getBucketValue, permissionsByGroup]
  )

  const hasAnyRoles = useCallback(
    (groupRef: string) => {
      const buckets: BucketKey[] = ['adminRoles', 'viewerRoles', 'managerRelationsRoles', 'managerManagementRoles']
      return buckets.some(b => getBucketValue(groupRef, b).length > 0)
    },
    [getBucketValue]
  )

  // Hidden columns controller: Admin/Viewer hidden by default
  const [showAdminCol, setShowAdminCol] = useState(false)
  const [showViewerCol, setShowViewerCol] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const onSaveRow = useCallback(
    async (groupRef: string) => {
      const base = permissionsByGroup[groupRef]
      // Convert any selected role IDs to role names for payload compatibility
      const localMap = new Map(roleOptionsRef.current.map(o => [o.id, o.name]))
      const toNames = (arr: string[] = []) => arr.map(v => roleNameByIdRef.current.get(v) ?? localMap.get(v) ?? v)
      await savePermission({
        id: base?.id,
        version: base?.version,
        investmentGroupRef: groupRef,
        adminRoles: toNames(getBucketValue(groupRef, 'adminRoles')),
        viewerRoles: toNames(getBucketValue(groupRef, 'viewerRoles')),
        managerRelationsRoles: toNames(getBucketValue(groupRef, 'managerRelationsRoles')),
        managerManagementRoles: toNames(getBucketValue(groupRef, 'managerManagementRoles'))
      })
      // Clear local edits for this row after successful save
      setEdits(prev => {
        const rest = { ...prev }
        delete rest[groupRef]
        return rest
      })
    },
    [getBucketValue, permissionsByGroup, savePermission]
  )

  const onDeleteRow = useCallback(
    async (groupRef: string) => {
      const base = permissionsByGroup[groupRef]
      if (!base?.id) return
      await deletePermission({ id: base.id, version: base.version, investmentGroupRef: groupRef })
      setEdits(prev => {
        const rest = { ...prev }
        delete rest[groupRef]
        return rest
      })
    },
    [deletePermission, permissionsByGroup]
  )

  const onResetRow = useCallback((groupRef: string) => {
    setEdits(prev => {
      const rest = { ...prev }
      delete rest[groupRef]
      return rest
    })
  }, [])

  // Build DataTable rows and columns
  type GridRow = { id: string; groupRef: string; groupLabel: string }

  const rows: GridRow[] = useMemo(
    () =>
      (groups || []).map((g: { id: string; value?: string; code?: string }) => ({
        id: g.id,
        groupRef: g.id,
        groupLabel: `${g.value || g.code || g.id}`
      })),
    // Re-render after save/delete via permissionsByGroup without tying to roles search lifecycle
    [groups, permissionsByGroup]
  )

  const roleOptions = useMemo(() => rolesCatalog.roles.map(r => ({ id: r.id, name: r.name })), [rolesCatalog.roles])

  // Keep dynamic role props in refs to avoid re-creating columns (which closes popovers on search)
  const roleOptionsRef = useRef(roleOptions)
  const rolesIsLoadingRef = useRef(rolesCatalog.isLoading)
  const rolesHasMoreRef = useRef(rolesCatalog.hasMore)
  const rolesOnSearchRef = useRef(rolesCatalog.onSearch)
  const rolesLoadMoreRef = useRef(rolesCatalog.loadMore)
  const rolesRefetchRef = useRef(rolesCatalog.refetch)
  const rolesErrorRef = useRef(rolesCatalog.error)
  // Accumulate a stable id->name cache across searches for reliable save mapping
  const roleNameByIdRef = useRef(new Map<string, string>())

  type CellCtx = { row: { original: GridRow } }

  // Keep refs in sync synchronously so cells see latest data during render
  roleOptionsRef.current = roleOptions
  // Update the id->name cache with latest options (union across searches)
  if (roleOptions?.length) {
    roleOptions.forEach(o => {
      if (o?.id) {
        roleNameByIdRef.current.set(o.id, o.name)
      }
    })
  }
  rolesIsLoadingRef.current = rolesCatalog.isLoading
  rolesHasMoreRef.current = rolesCatalog.hasMore
  rolesOnSearchRef.current = rolesCatalog.onSearch
  rolesLoadMoreRef.current = rolesCatalog.loadMore
  rolesRefetchRef.current = rolesCatalog.refetch
  rolesErrorRef.current = rolesCatalog.error

  // Common renderer for role bucket cells to avoid duplication
  const renderBucketCell = useCallback(
    (row: GridRow, bucket: BucketKey, key: BucketKey) => (
      <EditableComboboxCell
        value={getBucketValue(row.groupRef, bucket)}
        onChange={(next: string[] | string) => {
          rolesOnSearchRef.current('')
          setBucketValue(row.groupRef, bucket, (next as string[]) || [])
        }}
        options={roleOptionsRef.current}
        isLoading={rolesIsLoadingRef.current}
        onSearch={rolesOnSearchRef.current}
        onLoadMore={rolesLoadMoreRef.current}
        hasMore={rolesHasMoreRef.current}
        placeholder="Select roles..."
        mode="multiple"
        isEdited={!arraysEqual(getBucketValue(row.groupRef, bucket), permissionsByGroup[row.groupRef]?.[bucket] || [])}
        testId={testId(`row-${row.groupRef}-${key}`)}
      />
    ),
    [arraysEqual, getBucketValue, permissionsByGroup, setBucketValue]
  )

  const renderManagerRelationsCell = useCallback(
    ({ row }: CellCtx) => renderBucketCell(row.original, 'managerRelationsRoles', 'managerRelationsRoles'),
    [renderBucketCell]
  )

  const renderManagerManagementCell = useCallback(
    ({ row }: CellCtx) => renderBucketCell(row.original, 'managerManagementRoles', 'managerManagementRoles'),
    [renderBucketCell]
  )

  const renderAdminRolesCell = useCallback(
    ({ row }: CellCtx) => renderBucketCell(row.original, 'adminRoles', 'adminRoles'),
    [renderBucketCell]
  )

  const renderViewerRolesCell = useCallback(
    ({ row }: CellCtx) => renderBucketCell(row.original, 'viewerRoles', 'viewerRoles'),
    [renderBucketCell]
  )

  const renderActionsHeader = useCallback(
    () => (
      <div className="gba:flex gba:items-center gba:justify-end gba:w-full gba:relative">
        <Button
          size="iconSm"
          variant="secondary"
          className="gba:h-6"
          onClick={e => {
            e.stopPropagation()
            setPickerOpen(v => !v)
          }}
          title="Show/Hide columns"
          data-testid={testId('toggle-hidden-columns')}
        >
          <Columns3 className="gba:h-4 gba:w-4" />
        </Button>
        {pickerOpen && (
          <div
            className="gba:absolute gba:right-0 gba:top-7 gba:z-20 gba:bg-white gba:border gba:border-gray-200 gba:rounded-md gba:shadow-md gba:p-2"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
              <input
                id="show-admin-col"
                type="checkbox"
                checked={showAdminCol}
                onChange={e => setShowAdminCol(e.target.checked)}
              />
              <label htmlFor="show-admin-col" className="gba:text-xs">
                Admin Roles
              </label>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
              <input
                id="show-viewer-col"
                type="checkbox"
                checked={showViewerCol}
                onChange={e => setShowViewerCol(e.target.checked)}
              />
              <label htmlFor="show-viewer-col" className="gba:text-xs">
                Viewer Roles
              </label>
            </div>
            <div className="gba:flex gba:justify-end gba:pt-1">
              <Button size="sm" variant="secondary" className="gba:h-6" onClick={() => setPickerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    ),
    [pickerOpen, showAdminCol, showViewerCol]
  )

  const renderRowActions = useCallback(
    ({ row }: CellCtx) => {
      const groupRef = row.original.groupRef
      const base = permissionsByGroup[groupRef]
      const dirty = isRowDirty(groupRef)
      const canDelete = !!base?.id
      const anySelected = hasAnyRoles(groupRef)
      const canSave = dirty || (!base?.id && anySelected)
      return (
        <div className="gba:flex gba:justify-end gba:w-full">
          <ButtonGroup onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="gba:h-6">
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={() => onSaveRow(groupRef)}
              disabled={!canSave}
              title="Save changes"
            >
              <Save className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={() => onResetRow(groupRef)}
              disabled={!dirty}
              title="Discard changes"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={() => onDeleteRow(groupRef)}
              disabled={!canDelete}
              title="Delete"
            >
              <Trash className="gba:h-4 gba:w-4" />
            </Button>
          </ButtonGroup>
        </div>
      )
    },
    [hasAnyRoles, isRowDirty, onDeleteRow, onResetRow, onSaveRow, permissionsByGroup]
  )

  const columns = useMemo<ColumnDef<GridRow>[]>(() => {
    const cols: ColumnDef<GridRow>[] = [
      {
        id: 'group',
        header: 'Investment Group',
        accessorKey: 'groupLabel',
        size: 260,
        minSize: 220,
        maxSize: 360,
        enableResizing: false
      },
      {
        id: 'managerRelationsRoles',
        header: 'Manager (Relations) Roles',
        cell: renderManagerRelationsCell
      },
      {
        id: 'managerManagementRoles',
        header: 'Manager (Management) Roles',
        cell: renderManagerManagementCell
      }
    ]

    if (showAdminCol) {
      cols.push({ id: 'adminRoles', header: 'Admin Roles', cell: renderAdminRolesCell })
    }

    if (showViewerCol) {
      cols.push({ id: 'viewerRoles', header: 'Viewer Roles', cell: renderViewerRolesCell })
    }

    cols.push({
      id: 'actions',
      header: renderActionsHeader,
      size: 96,
      minSize: 84,
      maxSize: 120,
      enableResizing: false,
      meta: { align: 'right' },
      cell: renderRowActions
    })

    return cols
  }, [
    renderManagerRelationsCell,
    renderManagerManagementCell,
    renderAdminRolesCell,
    renderViewerRolesCell,
    renderActionsHeader,
    renderRowActions,
    showAdminCol,
    showViewerCol
  ])

  // removed unused rowActions useMemo to satisfy lints

  return (
    <PageLayout
      headerIcon={ShieldCheckIcon}
      headerTitle="Investment Group Permissions"
      headerDescription="Manage role buckets per Investment Group using roles from User Management"
      onBack={onBack}
      className={className}
      data-testid={testId('container')}
    >
      <div className="gba:flex gba:flex-col gba:gap-4">
        <DataTable<GridRow>
          data={rows}
          columns={columns}
          loading={groupsLoading}
          enablePagination={false}
          enableSorting={false}
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          emptyMessage={groupsLoading ? 'Loading...' : 'No investment groups found'}
          data-testid={testId('permissions-grid')}
        />

        {(groupsError || error) && (
          <div className="gba:text-destructive gba:text-sm" data-testid={testId('error')}>
            {groupsError || error}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
export default InvestmentGroupPermissionsPage
