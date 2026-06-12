import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PageLayout,
  Button,
  Card,
  EmptyState,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge,
  Combobox
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { ShieldCheckIcon, FolderIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useInvestmentGroupPermissions } from '../../hooks'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'

export interface InvestmentGroupPermissionsPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const InvestmentGroupPermissionsPage: React.FC<InvestmentGroupPermissionsPageProps> = ({
  className,
  prefixDataTestId = 'irm-investment-permissions',
  onBack,
  ...context
}) => {
  const testId = (s: string) => `${prefixDataTestId}-${s}`

  const { groups, groupsLoading, groupsError, error, fetchGroups, savePermission, permissionsByGroup } =
    useInvestmentGroupPermissions(context)

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupSearchTerm, setGroupSearchTerm] = useState('')
  const [roleSearchTerm, setRoleSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [tempRoles, setTempRoles] = useState<string[] | string>([])
  const [pickerValue, setPickerValue] = useState<string>('')

  const rolesCatalog = useRolesCatalog(context, { includeRoles: 'STANDARD' })

  // Infinite load configuration for the Add Roles combobox
  const TARGET_VISIBLE_OPTIONS = 50
  const MAX_EXTRA_LOADS = 5

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const getSecurityRoles = useCallback(
    (groupRef: string): string[] => {
      const baseline = permissionsByGroup[groupRef]
      return baseline?.securityRoles ?? []
    },
    [permissionsByGroup]
  )

  // Helpers to persist roles and manage dialog
  const persistRoles = useCallback(
    async (groupRef: string, roles: string[]) => {
      const base = permissionsByGroup[groupRef]
      const localMap = new Map(roleOptionsRef.current.map(o => [o.id, o.name]))
      const toNames = (arr: string[] = []) => arr.map(v => roleNameByIdRef.current.get(v) ?? localMap.get(v) ?? v)
      await savePermission({
        id: base?.id,
        version: base?.version,
        investmentGroupRef: groupRef,
        securityRoles: toNames(roles)
      })
    },
    [permissionsByGroup, savePermission]
  )

  const onDeleteRole = useCallback(
    async (groupRef: string, index: number) => {
      const current = getSecurityRoles(groupRef)
      const next = current.filter((_, i) => i !== index)
      await persistRoles(groupRef, next)
    },
    [getSecurityRoles, persistRoles]
  )

  const openAddDialog = useCallback(() => {
    setDialogMode('add')
    setEditingIndex(null)
    setTempRoles([])
    setIsDialogOpen(true)
    // Seed options to ensure chip labels resolve to role names immediately
    if (typeof rolesOnSearchRef.current === 'function') {
      rolesOnSearchRef.current('')
    }
  }, [])

  const openEditDialog = useCallback(
    (index: number, groupRef: string) => {
      setDialogMode('edit')
      setEditingIndex(index)
      const current = getSecurityRoles(groupRef)
      setTempRoles(current[index] ?? '')
      setIsDialogOpen(true)
      // Seed options so the single-select label resolves quickly
      if (typeof rolesOnSearchRef.current === 'function') {
        rolesOnSearchRef.current('')
      }
    },
    [getSecurityRoles]
  )

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
    setTempRoles([])
    setEditingIndex(null)
  }, [])

  const toRoleDisplay = useCallback((val: string): string => {
    const localMap = new Map(roleOptionsRef.current.map(o => [o.id, o.name]))
    return roleNameByIdRef.current.get(val) ?? localMap.get(val) ?? val
  }, [])

  const addTempRole = useCallback((val: string) => {
    if (!val) return
    setTempRoles(prev => {
      const list = Array.isArray(prev) ? prev.slice() : []
      if (!list.includes(val)) list.push(val)
      return list
    })
  }, [])

  const removeTempRole = useCallback((idx: number) => {
    setTempRoles(prev => {
      const list = Array.isArray(prev) ? prev.slice() : []
      return list.filter((_, i) => i !== idx)
    })
  }, [])

  const onDialogSave = useCallback(async () => {
    if (!selectedGroupId) return
    const base = getSecurityRoles(selectedGroupId)
    let next: string[] = []
    if (dialogMode === 'add') {
      const addList = Array.isArray(tempRoles) ? tempRoles : [tempRoles].filter(Boolean)
      next = Array.from(new Set([...base, ...addList]))
    } else {
      const replacement = Array.isArray(tempRoles) ? tempRoles[0] : tempRoles
      next = base.map((r, i) => (i === (editingIndex ?? -1) ? replacement || r : r))
    }
    await persistRoles(selectedGroupId, next)
    closeDialog()
  }, [closeDialog, dialogMode, editingIndex, getSecurityRoles, persistRoles, selectedGroupId, tempRoles])

  // Build sidebar items
  const groupItems = useMemo(
    () =>
      (groups || []).map((g: { id: string; value?: string; code?: string }) => ({
        id: g.id,
        label: g.value || g.code || g.id,
        code: g.code || '',
        value: g.value || ''
      })),
    [groups]
  )

  const filteredGroupItems = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase()
    if (!term) return groupItems
    return groupItems.filter(
      g =>
        g.label.toLowerCase().includes(term) ||
        g.code.toLowerCase().includes(term) ||
        g.value.toLowerCase().includes(term)
    )
  }, [groupItems, groupSearchTerm])

  // Auto-select first group when available
  useEffect(() => {
    if (!selectedGroupId && filteredGroupItems.length > 0) {
      setSelectedGroupId(filteredGroupItems[0].id)
    }
  }, [filteredGroupItems, selectedGroupId])

  const roleOptions = useMemo(() => rolesCatalog.roles.map(r => ({ id: r.id, name: r.name })), [rolesCatalog.roles])

  // Keep dynamic role props in refs to avoid re-creating columns (which closes popovers on search)
  const roleOptionsRef = useRef(roleOptions)
  const rolesIsLoadingRef = useRef(rolesCatalog.isLoading)
  const rolesHasMoreRef = useRef(rolesCatalog.hasMore)
  const rolesOnSearchRef = useRef(rolesCatalog.onSearch)
  const rolesLoadMoreRef = useRef(rolesCatalog.loadMore)
  // Accumulate a stable id->name cache across searches for reliable save mapping
  const roleNameByIdRef = useRef(new Map<string, string>())

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

  // Compute how many options remain visible after excluding saved and currently selected
  const computeFilteredCount = useCallback(() => {
    try {
      const selectedIds = new Set(Array.isArray(tempRoles) ? tempRoles : [])
      const savedNames = selectedGroupId ? getSecurityRoles(selectedGroupId) : []
      let count = 0
      for (const o of roleOptionsRef.current) {
        if (!selectedIds.has(o.id) && !savedNames.includes(o.name)) count++
      }
      return count
    } catch {
      return 0
    }
  }, [selectedGroupId, tempRoles, getSecurityRoles])

  // Progressively load more pages until we reach the target or exhaust pages
  const progressiveFill = useCallback(async () => {
    let loads = 0
    while (computeFilteredCount() < TARGET_VISIBLE_OPTIONS && rolesHasMoreRef.current && loads < MAX_EXTRA_LOADS) {
      try {
        await rolesLoadMoreRef.current?.()
      } catch {
        break
      }
      loads += 1
      // allow state to settle before the next check
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }, [computeFilteredCount])

  const scheduleProgressiveFill = useCallback(() => {
    setTimeout(() => progressiveFill(), 0)
  }, [progressiveFill])

  // When dialog opens or selection/search context changes, try to fill to target
  useEffect(() => {
    if (isDialogOpen && dialogMode === 'add') {
      scheduleProgressiveFill()
    }
  }, [isDialogOpen, dialogMode, tempRoles, selectedGroupId, scheduleProgressiveFill])

  // Right panel renders a roles grid with search and an add/edit dialog

  return (
    <PageLayout
      headerIcon={ShieldCheckIcon}
      headerTitle="Investment Group Permissions"
      headerDescription="Manage security roles per Investment Group using roles from User Management"
      onBack={onBack}
      className={className}
      data-testid={testId('container')}
    >
      {groupsLoading ? (
        <div className="gba:py-12">Loading...</div>
      ) : (
        <div className="gba:flex gba:gap-6 gba:h-full">
          {/* Left Sidebar - Investment Groups (read-only) */}
          <div className="gba:w-80 gba:flex-shrink-0">
            <Card>
              <div className="gba:p-4 gba:border-b gba:flex gba:items-center gba:justify-between">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Investment Groups</h3>
              </div>
              <div className="gba:p-4 gba:border-b">
                <DebouncedInput
                  value={groupSearchTerm}
                  onChange={(v: string) => setGroupSearchTerm(v)}
                  placeholder="Search groups..."
                  debounceDelay={300}
                  data-testid={testId('group-search')}
                />
              </div>
              <div className="gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                {filteredGroupItems.length === 0 ? (
                  <div className="gba:p-4">
                    <EmptyState title="No investment groups" description="No groups available" />
                  </div>
                ) : (
                  filteredGroupItems.map(g => (
                    <div
                      key={g.id}
                      tabIndex={0}
                      className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:cursor-pointer gba:border-b gba:transition-colors ${
                        selectedGroupId === g.id ? 'gba:bg-accent gba:text-accent-foreground' : 'hover:gba:bg-muted'
                      }`}
                      onClick={() => setSelectedGroupId(g.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedGroupId(g.id)
                        }
                      }}
                      data-testid={testId(`group-${g.id}`)}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                        <FolderIcon className="gba:w-4 gba:h-4" />
                        <div>
                          <div className="gba:text-sm gba:font-medium">{g.label}</div>
                          <div className="gba:text-xs gba:text-muted-foreground">{g.code}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel - Security Roles Editor */}
          <div className="gba:flex-1">
            {selectedGroupId ? (
              <div className="gba:space-y-4">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <div>
                    <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
                      {groupItems.find(g => g.id === selectedGroupId)?.label}
                    </h2>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                      Manage security roles for this investment group
                    </p>
                  </div>
                  <Button onClick={openAddDialog} data-testid={testId('add-roles-button')}>
                    <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" /> Add Roles
                  </Button>
                </div>

                <div className="gba:rounded-md gba:border gba:p-4">
                  <div className="gba:mb-4">
                    <DebouncedInput
                      value={roleSearchTerm}
                      onChange={(v: string) => setRoleSearchTerm(v)}
                      placeholder="Search roles..."
                      debounceDelay={300}
                      data-testid={testId('role-search')}
                    />
                  </div>

                  <Table data-testid={testId('roles-table')}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const all = getSecurityRoles(selectedGroupId)
                        const filtered = roleSearchTerm
                          ? all.filter(r => r.toLowerCase().includes(roleSearchTerm.toLowerCase()))
                          : all
                        if (filtered.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={2} className="gba:text-center gba:py-8">
                                <EmptyState
                                  title={roleSearchTerm ? 'No roles found' : 'No roles yet'}
                                  description={
                                    roleSearchTerm ? 'Try adjusting your search' : 'Click "Add Roles" to assign roles'
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )
                        }
                        return filtered.map((role, idx) => (
                          <TableRow key={`${role}-${idx}`}>
                            <TableCell>
                              <span className="gba:inline-flex gba:items-center gba:gap-2">
                                <span className="gba:text-xs gba:font-medium gba:px-2 gba:py-0.5 gba:border gba:rounded-full">
                                  {role}
                                </span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="gba:flex gba:gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(idx, selectedGroupId)}
                                  data-testid={testId(`role-edit-${idx}`)}
                                >
                                  <PencilSimpleIcon className="gba:w-4 gba:h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDeleteRole(selectedGroupId, idx)}
                                  data-testid={testId(`role-delete-${idx}`)}
                                >
                                  <TrashIcon className="gba:w-4 gba:h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="gba:py-12">
                <EmptyState
                  title="Select an investment group"
                  description="Choose a group from the sidebar to edit roles"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {(groupsError || error) && (
        <Alert variant="destructive" data-testid={testId('error')}>
          {groupsError || error}
        </Alert>
      )}

      {/* Dialog for adding/editing roles */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid={testId('roles-dialog')}>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add Roles' : 'Edit Role'}</DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-2">
            {dialogMode === 'add' ? (
              <>
                {/* Chip cloud of selected roles (wraps and scrolls if long) */}
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:max-h-48 gba:overflow-y-auto gba:p-2 gba:border gba:rounded-md">
                  {(Array.isArray(tempRoles) ? tempRoles : []).map((val, idx) => (
                    <Badge
                      key={`${val}-${idx}`}
                      variant="secondary"
                      className="gba:flex gba:items-center gba:gap-1 gba:pr-1"
                      title={toRoleDisplay(val)}
                    >
                      <span>{toRoleDisplay(val)}</span>
                      <button
                        type="button"
                        className="gba:ml-0.5 gba:rounded gba:p-0.5 gba:hover:bg-muted gba:transition-colors"
                        aria-label="Remove role"
                        onClick={() => removeTempRole(idx)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Single-add picker to add roles one-by-one */}
                <div className="gba:w-full">
                  {(() => {
                    const selectedIds = new Set(Array.isArray(tempRoles) ? tempRoles : [])
                    const savedNames = selectedGroupId ? getSecurityRoles(selectedGroupId) : []
                    const filteredOptions = roleOptionsRef.current
                      .filter(o => !selectedIds.has(o.id) && !savedNames.includes(o.name))
                      .map(o => ({ value: o.id, label: o.name }))
                    return (
                      <Combobox
                        value={pickerValue}
                        onValueChange={val => {
                          setPickerValue(val)
                          if (val) {
                            addTempRole(val)
                            setPickerValue('')
                          }
                        }}
                        options={filteredOptions}
                        placeholder="Type to search..."
                        loading={rolesIsLoadingRef.current}
                        onSearch={q => {
                          if (typeof rolesOnSearchRef.current === 'function') {
                            rolesOnSearchRef.current(q)
                          }
                          scheduleProgressiveFill()
                        }}
                        onLoadMore={() => rolesLoadMoreRef.current?.()}
                        hasMore={rolesHasMoreRef.current}
                        searchDebounce={300}
                        className="gba:w-full gba:text-sm"
                        data-testid={testId('roles-dialog-combobox')}
                      />
                    )
                  })()}
                </div>
              </>
            ) : (
              <div className="gba:w-full">
                <Combobox
                  value={typeof tempRoles === 'string' ? tempRoles : ''}
                  onValueChange={val => setTempRoles(val || '')}
                  options={roleOptionsRef.current.map(o => ({ value: o.id, label: o.name }))}
                  placeholder="Select role..."
                  loading={rolesIsLoadingRef.current}
                  onSearch={q => {
                    if (typeof rolesOnSearchRef.current === 'function') {
                      rolesOnSearchRef.current(q)
                    }
                  }}
                  onLoadMore={() => rolesLoadMoreRef.current?.()}
                  hasMore={rolesHasMoreRef.current}
                  searchDebounce={300}
                  className="gba:w-full gba:text-sm"
                  data-testid={testId('roles-dialog-combobox')}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid={testId('roles-dialog-cancel')}>
              Cancel
            </Button>
            <Button onClick={onDialogSave} data-testid={testId('roles-dialog-save')} disabled={!selectedGroupId}>
              {dialogMode === 'add' ? 'Add' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
export default InvestmentGroupPermissionsPage
