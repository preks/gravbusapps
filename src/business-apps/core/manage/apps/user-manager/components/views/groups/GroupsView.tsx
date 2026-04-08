import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PlusIcon, UsersThreeIcon } from '@phosphor-icons/react'
import type { GroupRecord } from '@/common/network/users/types'
import { useGroupManagement } from '../../../hooks/useGroupManagement'
import { useUserManagement } from '../../../hooks/useUserManagement'
import { useRoleManagement } from '../../../hooks/useRoleManagement'
import translations from '../../../_i18n'
import { GroupDialog, type GroupDialogFormValues } from './dialogs/GroupDialog'
import { GroupDetailPanel } from '../../detail-panels/GroupDetailPanel'

const PAGE_SIZE = 20
const SYNC_STATUS_OPTIONS = ['all', 'SUCCESS', 'PENDING', 'ERROR'] as const

export interface GroupsViewProps {
  accessToken: string
  onRefresh?: () => void
}

export const GroupsView = ({ accessToken, onRefresh }: GroupsViewProps) => {
  const { t } = useTranslation(translations)
  const {
    groups,
    totalRecords,
    loading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    resynchronizeGroups,
    getGroupMembers,
    addUsersToGroup,
    removeUsersFromGroup,
    getGroupRoles,
    addRolesToGroup,
    removeRolesFromGroup,
    getGroupChildren,
    assignSubGroup
  } = useGroupManagement(accessToken)

  const { users: allUsers, loading: allUsersLoading, fetchUsers: fetchAllUsers } = useUserManagement(accessToken)
  const { roles: allRoles, loading: allRolesLoading, fetchRoles: fetchAllRoles } = useRoleManagement(accessToken)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [syncStatus, setSyncStatus] = useState<'SUCCESS' | 'PENDING' | 'ERROR' | undefined>()
  const [offset, setOffset] = useState(0)
  const [selectedGroup, setSelectedGroup] = useState<GroupRecord | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setOffset(0)
    }, 300)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setOffset(0)
  }, [syncStatus])

  const loadGroups = useCallback(async () => {
    await fetchGroups({ searchParam: debouncedSearch || undefined, offset, limit: PAGE_SIZE, syncStatus })
  }, [fetchGroups, debouncedSearch, offset, syncStatus])

  useEffect(() => {
    if (!accessToken) return
    void loadGroups()
  }, [accessToken, loadGroups])

  useEffect(() => {
    if (accessToken) {
      void fetchAllUsers({ limit: 500, offset: 0 })
      void fetchAllRoles({ limit: 500, offset: 0 })
    }
  }, [accessToken, fetchAllUsers, fetchAllRoles])

  useEffect(() => {
    if (selectedGroup) {
      const updated = groups.find(g => g.id === selectedGroup.id)
      if (updated) setSelectedGroup(updated)
    }
  }, [groups, selectedGroup])

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const afterMutation = useCallback(async () => {
    onRefresh?.()
    await loadGroups()
  }, [onRefresh, loadGroups])

  const handleCreateSubmit = async (values: GroupDialogFormValues) => {
    await createGroup({
      name: values.name,
      displayName: values.displayName || undefined,
      description: values.description || undefined
    })
    setCreateDialogOpen(false)
    await afterMutation()
  }

  return (
    <div className="gba:flex gba:h-full gba:flex-col" data-testid="user-management-groups-view">
      {/* Toolbar */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-b">
        <div className="gba:flex gba:items-center gba:gap-2">
          <UsersThreeIcon className="gba:h-5 gba:w-5" aria-hidden />
          <h1 className="gba:text-lg gba:font-semibold">{t('um-groups-title')}</h1>
        </div>
        <div className="gba:flex gba:flex-1 gba:items-center gba:gap-2 gba:flex-wrap gba:min-w-0">
          <div className="gba:relative gba:flex-1 gba:min-w-[180px] gba:max-w-xs">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:h-4 gba:w-4 gba:-translate-y-1/2 gba:text-muted-foreground" />
            <Input
              className="gba:pl-9"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('um-groups-search-placeholder')}
              data-testid="user-management-groups-input-search"
            />
          </div>
          <Select
            value={syncStatus ?? 'all'}
            onValueChange={val => setSyncStatus(val === 'all' ? undefined : (val as 'SUCCESS' | 'PENDING' | 'ERROR'))}
          >
            <SelectTrigger className="gba:w-36" data-testid="user-management-groups-sync-filter">
              <SelectValue placeholder={t('um-groups-column-sync-status')} />
            </SelectTrigger>
            <SelectContent>
              {SYNC_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt === 'all' ? t('um-groups-column-sync-status') : opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)} data-testid="user-management-groups-button-add">
          <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {t('um-groups-add-group')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:mx-4 gba:mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Master-detail body */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {/* List */}
        <div className="gba:flex gba:flex-col gba:w-80 gba:shrink-0 gba:border-r gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-y-auto gba:relative">
            {loading && (
              <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-background/60">
                <Spinner />
              </div>
            )}
            {groups.length === 0 && !loading ? (
              <p className="gba:p-4 gba:text-sm gba:text-muted-foreground" data-testid="user-management-groups-empty">
                {t('um-groups-empty')}
              </p>
            ) : (
              <ul>
                {groups.map(group => {
                  const isSelected = selectedGroup?.id === group.id
                  return (
                    <li key={group.id}>
                      <button
                        type="button"
                        className={`gba:w-full gba:text-left gba:px-4 gba:py-3 gba:border-b gba:transition-colors gba:hover:bg-muted/50 ${isSelected ? 'gba:bg-muted' : ''}`}
                        onClick={() => setSelectedGroup(group)}
                        data-testid={`user-management-groups-row-${group.id}`}
                      >
                        <p className="gba:text-sm gba:font-medium gba:truncate">{group.displayName || group.name}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:truncate">{group.path}</p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {/* Pagination */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:text-xs gba:text-muted-foreground">
            <span>{t('um-groups-pagination-page', { page: currentPage, total: totalPages })}</span>
            <div className="gba:flex gba:gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset <= 0 || loading}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                data-testid="user-management-groups-button-page-prev"
              >
                {t('um-groups-pagination-prev')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset + PAGE_SIZE >= totalRecords || loading}
                onClick={() => setOffset(o => o + PAGE_SIZE)}
                data-testid="user-management-groups-button-page-next"
              >
                {t('um-groups-pagination-next')}
              </Button>
            </div>
          </div>
        </div>

        {/* Detail */}
        <div className="gba:flex-1 gba:overflow-y-auto">
          {selectedGroup ? (
            <GroupDetailPanel
              group={selectedGroup}
              accessToken={accessToken}
              allUsers={allUsers}
              allUsersLoading={allUsersLoading}
              allRoles={allRoles}
              allRolesLoading={allRolesLoading}
              allGroups={groups}
              allGroupsLoading={loading}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
              onResynchronizeGroups={resynchronizeGroups}
              onGetGroupMembers={getGroupMembers}
              onAddUsersToGroup={addUsersToGroup}
              onRemoveUsersFromGroup={removeUsersFromGroup}
              onGetGroupRoles={getGroupRoles}
              onAddRolesToGroup={addRolesToGroup}
              onRemoveRolesFromGroup={removeRolesFromGroup}
              onGetGroupChildren={getGroupChildren}
              onAssignSubGroup={assignSubGroup}
              onDeleted={() => {
                setSelectedGroup(null)
                void afterMutation()
              }}
              onChanged={() => void afterMutation()}
            />
          ) : (
            <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-muted-foreground gba:text-sm">
              {t('user-management-detail-select-prompt')}
            </div>
          )}
        </div>
      </div>

      <GroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        group={null}
        onSubmit={values => void handleCreateSubmit(values)}
        submitting={false}
      />
    </div>
  )
}
