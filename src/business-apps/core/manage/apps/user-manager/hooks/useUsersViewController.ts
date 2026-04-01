import { useCallback, useEffect, useState } from 'react'
import { useUserManagement } from './useUserManagement'
import type { GetUsersParams } from '@/common/network/users/types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

export const USERS_VIEW_PAGE_SIZE = PAGE_SIZE

export function useUsersViewController(accessToken: string) {
  const {
    users,
    totalRecords,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    upsertPassword,
    activateUser,
    updateUserProfile,
    resynchronizeUsers,
    getUserGroups,
    addGroupsToUser,
    removeGroupsFromUser,
    getUserRoles,
    assignRolesToUser,
    removeRolesFromUser
  } = useUserManagement(accessToken)

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [syncStatus, setSyncStatus] = useState<GetUsersParams['syncStatus']>(undefined)

  const reloadUsers = useCallback(async () => {
    await fetchUsers({
      searchParam: debouncedSearch || undefined,
      offset,
      limit: PAGE_SIZE,
      syncStatus
    })
  }, [fetchUsers, debouncedSearch, offset, syncStatus])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => globalThis.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch, syncStatus])

  useEffect(() => {
    if (!accessToken) return
    void fetchUsers({
      searchParam: debouncedSearch || undefined,
      offset,
      limit: PAGE_SIZE,
      syncStatus
    })
  }, [accessToken, debouncedSearch, offset, syncStatus, fetchUsers])

  return {
    users,
    totalRecords,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    upsertPassword,
    activateUser,
    updateUserProfile,
    resynchronizeUsers,
    getUserGroups,
    addGroupsToUser,
    removeGroupsFromUser,
    getUserRoles,
    assignRolesToUser,
    removeRolesFromUser,
    searchInput,
    setSearchInput,
    debouncedSearch,
    offset,
    setOffset,
    syncStatus,
    setSyncStatus,
    reloadUsers,
    pageSize: PAGE_SIZE
  }
}
