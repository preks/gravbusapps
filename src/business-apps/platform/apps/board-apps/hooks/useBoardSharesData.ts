import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { BoardApiService } from '../services/BoardApiService'
import { CollectionApiService } from '../services/CollectionApiService'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_LIGHT_BY_USER_ID,
  GET_EMPLOYEES_LIGHT_BY_USER_IDS
} from '@/common/data/employee/queries/employeeQueries'
import type { BoardPermission, BoardShare } from '../types'
import type { CollectionMember } from '../types/collection'

export interface ShareWithUserInfo extends BoardShare {
  userAvatar?: string
  isLoading?: boolean
}

interface UseBoardSharesDataParams {
  open: boolean
  boardId: string
  accessToken: string
  collectionId?: string | null
  onSharesChanged?: () => void
}

export function useBoardSharesData({
  open,
  boardId,
  accessToken,
  collectionId,
  onSharesChanged
}: UseBoardSharesDataParams) {
  const [shares, setShares] = useState<ShareWithUserInfo[]>([])
  const [inheritedMembers, setInheritedMembers] = useState<CollectionMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null)
  const [removingShareId, setRemovingShareId] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const rawShares = await BoardApiService.getBoardSharedUsers(boardId)
      const placeholder: ShareWithUserInfo[] = rawShares.map(s => ({
        ...s,
        userAvatar: undefined,
        isLoading: true
      }))
      setShares(placeholder)

      const userIds = rawShares.map(s => s.userId)
      if (userIds.length > 0 && graphqlClient) {
        const results = await Promise.all(
          userIds.map(async userId => {
            try {
              const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
              const result = await graphqlClient.request<{
                Employee: Array<{
                  id: string
                  displayName: string
                  firstName?: string
                  lastName?: string
                  userId: string
                  pictureThumbnail?: string
                }>
              }>(query)
              const emp = result.Employee?.[0]
              if (emp) {
                return {
                  userId,
                  displayName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                  pictureThumbnail: emp.pictureThumbnail
                }
              }
            } catch {
              /* fallback below */
            }
            return { userId, displayName: undefined, pictureThumbnail: undefined }
          })
        )
        const infoMap = new Map(results.map(u => [u.userId, u]))
        setShares(prev =>
          prev.map(s => {
            const info = infoMap.get(s.userId)
            return {
              ...s,
              userName: info?.displayName || `User ${s.userId.slice(0, 8)}...`,
              userAvatar: info?.pictureThumbnail
                ? info.pictureThumbnail.startsWith('data:')
                  ? info.pictureThumbnail
                  : `data:image/png;base64,${info.pictureThumbnail}`
                : undefined,
              isLoading: false
            }
          })
        )
      }
    } catch {
      setError('Failed to load shared users')
    } finally {
      setIsLoading(false)
    }
  }, [boardId, graphqlClient])

  const loadInheritedMembers = useCallback(async () => {
    if (!collectionId) {
      setInheritedMembers([])
      return
    }
    try {
      const members = await CollectionApiService.getMembers(collectionId)
      setInheritedMembers(members)
      const userIds = members.map(m => m.userId).filter(Boolean)
      if (userIds.length > 0 && graphqlClient) {
        const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(userIds)
        const result = await graphqlClient.request<{
          Employee: Array<{
            userId: string
            displayName: string
            firstName?: string
            lastName?: string
            pictureThumbnail?: string
          }>
        }>(query)
        const empMap = new Map<string, { name: string; avatar?: string }>()
        for (const emp of result.Employee || []) {
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
          const avatar = emp.pictureThumbnail
            ? emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            : undefined
          empMap.set(emp.userId, { name, avatar })
        }
        setInheritedMembers(prev =>
          prev.map(m => {
            const info = empMap.get(m.userId)
            return info ? { ...m, userName: info.name, userAvatar: info.avatar } : m
          })
        )
      }
    } catch {
      setInheritedMembers([])
    }
  }, [collectionId, graphqlClient])

  useEffect(() => {
    if (open && boardId) {
      loadShares()
      loadInheritedMembers()
    }
  }, [open, boardId, loadShares, loadInheritedMembers])

  const handleUpdatePermission = useCallback(
    async (shareId: string, newPermission: BoardPermission) => {
      setUpdatingShareId(shareId)
      try {
        const success = await BoardApiService.updateBoardSharePermission(shareId, newPermission)
        if (success) {
          setShares(prev => prev.map(s => (s.id === shareId ? { ...s, permission: newPermission } : s)))
          toast.success('Permission updated')
          onSharesChanged?.()
        } else {
          toast.error('Failed to update permission')
        }
      } catch {
        toast.error('Failed to update permission')
      } finally {
        setUpdatingShareId(null)
      }
    },
    [onSharesChanged]
  )

  const handleRemoveShare = useCallback(
    async (shareId: string, userName: string) => {
      if (!confirm(`Remove access for ${userName}?`)) return
      setRemovingShareId(shareId)
      try {
        const success = await BoardApiService.revokeBoardShare(shareId)
        if (success) {
          setShares(prev => prev.filter(s => s.id !== shareId))
          toast.success(`Removed access for ${userName}`)
          onSharesChanged?.()
        } else {
          toast.error('Failed to remove access')
        }
      } catch {
        toast.error('Failed to remove access')
      } finally {
        setRemovingShareId(null)
      }
    },
    [onSharesChanged]
  )

  const overriddenUserIds = useMemo(() => new Set(shares.map(s => s.userId)), [shares])

  return {
    shares,
    inheritedMembers,
    setInheritedMembers,
    isLoading,
    error,
    updatingShareId,
    removingShareId,
    overriddenUserIds,
    handleUpdatePermission,
    handleRemoveShare
  }
}
