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
import { MagnifyingGlassIcon, PlusIcon, UsersIcon, WarningIcon } from '@phosphor-icons/react'
import type { User } from '@/common/network/users/types'
import { useUsersViewController } from '../../../hooks/useUsersViewController'
import { useGroupManagement } from '../../../hooks/useGroupManagement'
import { useRoleManagement } from '../../../hooks/useRoleManagement'
import translations from '../../../_i18n'
import { UserDialog } from './dialogs/UserDialog'
import { UserDetailPanel } from '../../detail-panels/UserDetailPanel'

export interface UsersViewProps {
  accessToken: string
  onRefresh?: () => void
}

const SYNC_STATUS_OPTIONS = ['all', 'SUCCESS', 'PENDING', 'ERROR'] as const

export const UsersView = ({ accessToken, onRefresh }: UsersViewProps) => {
  const { t } = useTranslation(translations)
  const {
    users,
    totalRecords,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    upsertPassword,
    activateUser,
    getUserGroups,
    addGroupsToUser,
    removeGroupsFromUser,
    getUserRoles,
    assignRolesToUser,
    removeRolesFromUser,
    searchInput,
    setSearchInput,
    offset,
    setOffset,
    reloadUsers,
    pageSize,
    syncStatus,
    setSyncStatus
  } = useUsersViewController(accessToken)

  const { groups: allGroups, loading: allGroupsLoading, fetchGroups: fetchAllGroups } = useGroupManagement(accessToken)
  const { roles: allRoles, loading: allRolesLoading, fetchRoles: fetchAllRoles } = useRoleManagement(accessToken)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (accessToken) {
      void fetchAllGroups({ limit: 500, offset: 0 })
      void fetchAllRoles({ limit: 500, offset: 0 })
    }
  }, [accessToken, fetchAllGroups, fetchAllRoles])

  // Keep selected user in sync when list reloads
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find(u => u.id === selectedUser.id)
      if (updated) setSelectedUser(updated)
    }
  }, [users, selectedUser])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const currentPage = Math.floor(offset / pageSize) + 1

  const afterMutation = useCallback(async () => {
    onRefresh?.()
    await reloadUsers()
  }, [onRefresh, reloadUsers])

  const handleUserDeleted = useCallback(async () => {
    setSelectedUser(null)
    await afterMutation()
  }, [afterMutation])

  return (
    <div className="gba:flex gba:h-full gba:flex-col gba:gap-0" data-testid="user-management-users-view">
      {/* Toolbar */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-b">
        <div className="gba:flex gba:items-center gba:gap-2">
          <UsersIcon className="gba:h-5 gba:w-5" aria-hidden />
          <h1 className="gba:text-lg gba:font-semibold">{t('user-management-view-title')}</h1>
        </div>
        <div className="gba:flex gba:flex-1 gba:items-center gba:gap-2 gba:flex-wrap gba:min-w-0">
          <div className="gba:relative gba:flex-1 gba:min-w-[180px] gba:max-w-xs">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:h-4 gba:w-4 gba:-translate-y-1/2 gba:text-muted-foreground" />
            <Input
              className="gba:pl-9"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('user-management-search-placeholder')}
              data-testid="user-management-search-input"
              aria-label={t('user-management-search-placeholder')}
            />
          </div>
          <Select
            value={syncStatus ?? 'all'}
            onValueChange={val => {
              setSyncStatus(val === 'all' ? undefined : (val as 'SUCCESS' | 'PENDING' | 'ERROR'))
              setOffset(0)
            }}
          >
            <SelectTrigger className="gba:w-36" data-testid="user-management-sync-filter">
              <SelectValue placeholder={t('user-management-column-sync-status')} />
            </SelectTrigger>
            <SelectContent>
              {SYNC_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt === 'all' ? t('user-management-column-sync-status') : opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => setCreateDialogOpen(true)} data-testid="user-management-add-user-button">
          <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
          {t('user-management-add-user')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:mx-4 gba:mt-3" data-testid="user-management-list-error">
          <WarningIcon className="gba:h-4 gba:w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Master-detail body */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {/* List (left) */}
        <div className="gba:flex gba:flex-col gba:w-80 gba:shrink-0 gba:border-r gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-y-auto gba:relative">
            {loading && (
              <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-background/60">
                <Spinner />
              </div>
            )}
            {users.length === 0 && !loading ? (
              <p className="gba:p-4 gba:text-sm gba:text-muted-foreground" data-testid="user-management-empty">
                {t('user-management-empty')}
              </p>
            ) : (
              <ul>
                {users.map(user => {
                  const displayName = [user.givenName, user.familyName].filter(Boolean).join(' ') || user.name || '—'
                  const isSelected = selectedUser?.id === user.id
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        className={`gba:w-full gba:text-left gba:px-4 gba:py-3 gba:border-b gba:transition-colors gba:hover:bg-muted/50 ${isSelected ? 'gba:bg-muted' : ''}`}
                        onClick={() => setSelectedUser(user)}
                        data-testid={`user-management-row-${user.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span
                            className={`gba:h-2 gba:w-2 gba:rounded-full gba:shrink-0 ${user.active ? 'gba:bg-green-500' : 'gba:bg-muted-foreground'}`}
                            aria-hidden
                          />
                          <div className="gba:min-w-0">
                            <p className="gba:text-sm gba:font-medium gba:truncate">{displayName}</p>
                            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                              {user.email || user.preferredUsername || '—'}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {/* Pagination */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:text-xs gba:text-muted-foreground">
            <span data-testid="user-management-pagination-info">
              {t('user-management-pagination-page', { current: currentPage, total: totalPages, records: totalRecords })}
            </span>
            <div className="gba:flex gba:gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset <= 0 || loading}
                onClick={() => setOffset(o => Math.max(0, o - pageSize))}
                data-testid="user-management-pagination-prev"
              >
                {t('user-management-pagination-prev')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={offset + pageSize >= totalRecords || loading}
                onClick={() => setOffset(o => o + pageSize)}
                data-testid="user-management-pagination-next"
              >
                {t('user-management-pagination-next')}
              </Button>
            </div>
          </div>
        </div>

        {/* Detail panel (right) */}
        <div className="gba:flex-1 gba:overflow-y-auto">
          {selectedUser ? (
            <UserDetailPanel
              user={selectedUser}
              accessToken={accessToken}
              allGroups={allGroups}
              allGroupsLoading={allGroupsLoading}
              allRoles={allRoles}
              allRolesLoading={allRolesLoading}
              onUpdateUser={updateUser}
              onActivateUser={activateUser}
              onUpsertPassword={upsertPassword}
              onGetUserGroups={getUserGroups}
              onAddGroupsToUser={addGroupsToUser}
              onRemoveGroupsFromUser={removeGroupsFromUser}
              onGetUserRoles={getUserRoles}
              onAssignRolesToUser={assignRolesToUser}
              onRemoveRolesFromUser={removeRolesFromUser}
              onDeleteUser={deleteUser}
              onDeleted={() => void handleUserDeleted()}
              onChanged={() => void afterMutation()}
            />
          ) : (
            <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-muted-foreground gba:text-sm">
              {t('user-management-detail-select-prompt')}
            </div>
          )}
        </div>
      </div>

      <UserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        accessToken={accessToken}
        userId={null}
        getUserById={getUserById}
        createUser={createUser}
        updateUser={updateUser}
        onCompleted={() => void afterMutation()}
      />
    </div>
  )
}

export default UsersView
