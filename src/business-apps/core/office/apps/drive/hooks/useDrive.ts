import { useState, useEffect, useCallback, useRef } from 'react'
import { DriveApiService } from '../services/DriveApiService'
import type { DriveItem, DriveFolder, DriveSection, DriveSortBy, DriveBreadcrumb } from '../types/drive.types'

interface UseDriveOptions {
  accessToken: string | undefined
  section: DriveSection
  folderId: string | null
  sortBy: DriveSortBy
  sortOrder: 'ASC' | 'DESC'
  page: number
  limit: number
}

interface UseDriveResult {
  items: DriveItem[]
  folders: DriveFolder[]
  breadcrumbs: DriveBreadcrumb[]
  isCurrentFolderShared: boolean
  total: number
  totalPages: number
  isLoading: boolean
  error: string | null
  refresh: () => void
  createFolder: (name: string, parentId?: string) => Promise<DriveFolder | null>
  deleteFolder: (id: string) => Promise<boolean>
  renameFolder: (id: string, name: string) => Promise<boolean>
  trashItems: (items: Array<{ entityType: string; entityId: string }>) => Promise<boolean>
  restoreItems: (items: Array<{ entityType: string; entityId: string }>) => Promise<boolean>
  moveItems: (items: Array<{ entityType: string; entityId: string }>, folderId: string | null) => Promise<boolean>
  moveOrCreateShortcut: (driveItems: DriveItem[], targetFolderId: string | null) => Promise<boolean>
  addToMyDrive: (entityType: string, entityId: string, folderId?: string | null) => Promise<boolean>
  removeShortcut: (shortcutId: string) => Promise<boolean>
  toggleFavorite: (entityType: string, entityId: string, isFavorite: boolean) => Promise<boolean>
  emptyTrash: () => Promise<boolean>
}

export function useDrive(options: UseDriveOptions): UseDriveResult {
  const { accessToken, section, folderId, sortBy, sortOrder, page, limit } = options
  const [items, setItems] = useState<DriveItem[]>([])
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([])
  const [isCurrentFolderShared, setIsCurrentFolderShared] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (!accessToken) return
    DriveApiService.setAccessToken(accessToken)
  }, [accessToken])

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return
      if (!silent) setIsLoading(true)
      setError(null)
      try {
        const [listResult, folderList, crumbsResult] = await Promise.all([
          DriveApiService.listItems({ section, folderId: folderId ?? undefined, sortBy, sortOrder, page, limit }),
          section === 'my-drive' ? DriveApiService.listFolders(folderId ?? undefined) : Promise.resolve([]),
          folderId ? DriveApiService.getBreadcrumbs(folderId) : Promise.resolve({ breadcrumbs: [], isShared: false })
        ])
        setItems(listResult.items)
        setTotal(listResult.total)
        setTotalPages(listResult.totalPages)
        setFolders(folderList)
        setBreadcrumbs(crumbsResult.breadcrumbs)
        setIsCurrentFolderShared(crumbsResult.isShared)
        initialLoadDone.current = true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drive')
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [accessToken, section, folderId, sortBy, sortOrder, page, limit]
  )

  useEffect(() => {
    initialLoadDone.current = false
    fetchData()
  }, [fetchData])

  const silentRefresh = useCallback(() => {
    fetchData(true)
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData(false)
  }, [fetchData])

  const createFolder = useCallback(
    async (name: string, parentId?: string): Promise<DriveFolder | null> => {
      try {
        const folder = await DriveApiService.createFolder(name, parentId)
        setFolders(prev => [...prev, folder])
        silentRefresh()
        return folder
      } catch {
        return null
      }
    },
    [silentRefresh]
  )

  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setFolders(prev => prev.filter(f => f.id !== id))
        await DriveApiService.deleteFolder(id)
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh]
  )

  const renameFolder = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      try {
        setFolders(prev => prev.map(f => (f.id === id ? { ...f, name } : f)))
        await DriveApiService.updateFolder(id, { name })
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh]
  )

  const trashItems = useCallback(
    async (refs: Array<{ entityType: string; entityId: string }>): Promise<boolean> => {
      const shortcutItems = items.filter(
        i => i.isShortcut && i.shortcutId && refs.some(r => r.entityType === i.type && r.entityId === i.id)
      )
      const nonShortcutRefs = refs.filter(
        r => !shortcutItems.some(si => si.type === r.entityType && si.id === r.entityId)
      )
      const trashSet = new Set(refs.map(r => `${r.entityType}:${r.entityId}`))
      setItems(prev => prev.filter(i => !trashSet.has(`${i.type}:${i.id}`)))
      setFolders(prev => prev.filter(f => !trashSet.has(`drive_folder:${f.id}`)))
      setTotal(prev => Math.max(0, prev - refs.length))
      try {
        await Promise.all([
          ...shortcutItems.map(si => DriveApiService.deleteShortcut(si.shortcutId!)),
          ...(nonShortcutRefs.length > 0 ? [DriveApiService.trashItems(nonShortcutRefs)] : [])
        ])
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh, items]
  )

  const restoreItems = useCallback(
    async (refs: Array<{ entityType: string; entityId: string }>): Promise<boolean> => {
      const restoreSet = new Set(refs.map(r => `${r.entityType}:${r.entityId}`))
      setItems(prev => prev.filter(i => !restoreSet.has(`${i.type}:${i.id}`)))
      setTotal(prev => Math.max(0, prev - refs.length))
      try {
        await DriveApiService.restoreItems(refs)
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh]
  )

  const moveItems = useCallback(
    async (refs: Array<{ entityType: string; entityId: string }>, targetFolderId: string | null): Promise<boolean> => {
      const shortcutMoves = items.filter(
        i => i.isShortcut && i.shortcutId && refs.some(r => r.entityType === i.type && r.entityId === i.id)
      )
      const nonShortcutRefs = refs.filter(
        r => !shortcutMoves.some(si => si.type === r.entityType && si.id === r.entityId)
      )
      const moveSet = new Set(refs.map(r => `${r.entityType}:${r.entityId}`))
      setItems(prev => prev.filter(i => !moveSet.has(`${i.type}:${i.id}`)))
      setTotal(prev => Math.max(0, prev - refs.length))
      try {
        await Promise.all([
          ...shortcutMoves.map(si => DriveApiService.moveShortcut(si.shortcutId!, targetFolderId)),
          ...(nonShortcutRefs.length > 0 ? [DriveApiService.moveItems(nonShortcutRefs, targetFolderId)] : [])
        ])
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh, items]
  )

  const moveOrCreateShortcut = useCallback(
    async (driveItems: DriveItem[], targetFolderId: string | null): Promise<boolean> => {
      const shortcuts = driveItems.filter(i => i.isShortcut && i.shortcutId)
      const owned = driveItems.filter(i => !i.isShortcut)
      const moveSet = new Set(driveItems.map(i => `${i.type}:${i.id}`))
      setItems(prev => prev.filter(i => !moveSet.has(`${i.type}:${i.id}`)))
      setTotal(prev => Math.max(0, prev - driveItems.length))
      try {
        await Promise.all([
          ...shortcuts.map(si => DriveApiService.moveShortcut(si.shortcutId!, targetFolderId)),
          ...(owned.length > 0
            ? [
                DriveApiService.moveItems(
                  owned.map(i => ({ entityType: i.type, entityId: i.id })),
                  targetFolderId
                )
              ]
            : [])
        ])
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh]
  )

  const addToMyDrive = useCallback(
    async (entityType: string, entityId: string, targetFolderId?: string | null): Promise<boolean> => {
      try {
        await DriveApiService.createShortcut(entityType, entityId, targetFolderId)
        silentRefresh()
        return true
      } catch {
        return false
      }
    },
    [silentRefresh]
  )

  const removeShortcut = useCallback(
    async (shortcutId: string): Promise<boolean> => {
      setItems(prev => prev.filter(i => i.shortcutId !== shortcutId))
      setTotal(prev => Math.max(0, prev - 1))
      try {
        await DriveApiService.deleteShortcut(shortcutId)
        silentRefresh()
        return true
      } catch {
        silentRefresh()
        return false
      }
    },
    [silentRefresh]
  )

  const toggleFavorite = useCallback(
    async (entityType: string, entityId: string, isFav: boolean): Promise<boolean> => {
      setItems(prev => prev.map(i => (i.type === entityType && i.id === entityId ? { ...i, isFavorite: !isFav } : i)))
      try {
        if (isFav) await DriveApiService.removeFavorite(entityType, entityId)
        else await DriveApiService.addFavorite(entityType, entityId)
        silentRefresh()
        return true
      } catch {
        setItems(prev => prev.map(i => (i.type === entityType && i.id === entityId ? { ...i, isFavorite: isFav } : i)))
        return false
      }
    },
    [silentRefresh]
  )

  const emptyTrashFn = useCallback(async (): Promise<boolean> => {
    setItems([])
    setFolders([])
    setTotal(0)
    setTotalPages(0)
    try {
      await DriveApiService.emptyTrash()
      return true
    } catch {
      silentRefresh()
      return false
    }
  }, [silentRefresh])

  return {
    items,
    folders,
    breadcrumbs,
    isCurrentFolderShared,
    total,
    totalPages,
    isLoading,
    error,
    refresh,
    createFolder,
    deleteFolder,
    renameFolder,
    trashItems,
    restoreItems,
    moveItems,
    moveOrCreateShortcut,
    addToMyDrive,
    removeShortcut,
    toggleFavorite,
    emptyTrash: emptyTrashFn
  }
}
