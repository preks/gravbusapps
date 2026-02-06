import { useState, useEffect, useCallback } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailFolder } from '../types'

/** Sort order for well-known folder types */
const FOLDER_SORT: Record<string, number> = {
  inbox: 0,
  starred: 1,
  sent: 2,
  drafts: 3,
  spam: 4,
  trash: 5,
  archive: 6,
  custom: 7
}

export function useEmailFolders(accessToken: string, accountId?: string) {
  const [folders, setFolders] = useState<EmailFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    EmailApiService.setAccessToken(accessToken)
  }, [accessToken])

  const loadFolders = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const data = await EmailApiService.listFolders(accountId)
      // Sort by type priority, then name
      const sorted = data.sort((a, b) => {
        const aOrder = FOLDER_SORT[a.type] ?? 99
        const bOrder = FOLDER_SORT[b.type] ?? 99
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.name.localeCompare(b.name)
      })
      setFolders(sorted)
    } catch (err) {
      console.error('Failed to load folders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, accountId])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const inboxFolder = folders.find(f => f.type === 'inbox')
  const totalUnread = folders.reduce((sum, f) => sum + f.unreadCount, 0)

  return { folders, isLoading, inboxFolder, totalUnread, refreshFolders: loadFolders }
}
