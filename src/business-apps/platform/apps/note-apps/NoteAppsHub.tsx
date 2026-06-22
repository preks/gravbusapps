import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Plus, FileText, PenTool, FolderPlus } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

import { NoteTreeSidebar } from './components/NoteTreeSidebar'
import { NoteHero } from './components/NoteHero'
import { NoteContentArea } from './components/NoteContentArea'
import { NoteEditor } from './NoteEditor'
import { HandwritingNote } from './components/HandwritingNote'
import { ShareNoteDialog, type SharedNoteUser } from './components/ShareNoteDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import type { QuickAccessSection } from './components/NoteTreeQuickAccess'
import type { PaperStyle, StrokeData } from './components/handwriting'

import { useNotes } from './hooks/useNotes'
import { useNoteAppsHubFavorites } from './hooks/useNoteAppsHubFavorites'
import { useNoteTree } from './hooks/useNoteTree'
import { useNoteAppsHubUrlState } from './hooks/useNoteAppsHubUrlState'
import { useResizableSidebar } from './hooks/useResizableSidebar'
import { useNoteTreeDragDrop } from './hooks/useNoteTreeDragDrop'
import { useNoteAppsHubShareLookup } from './hooks/useNoteAppsHubShareLookup'
import {
  BulkShareEntitiesDialog,
  getShareCapabilities,
  NOTE_SHARE_PERMISSIONS
} from '@/business-apps/core/office/sharing'
import { useHubPagination } from '../shared/hooks/useHubPagination'
import { HubPaginationFooter } from '../shared/components/HubPaginationFooter'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'

import { NoteApiService } from './services/NoteApiService'
import type { NotePermission, NoteShare, NoteSummary, CreateNoteInput, NoteColor, NoteTreeNode } from './types'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import { NoteTrashList } from './components/NoteTrashList'
import { TrashedNoteReadonlyDialog } from './components/TrashedNoteReadonlyDialog'
import translations from './_i18n'

export interface NoteAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'editor' | 'trash'
type SidebarSection = 'home' | 'my-notes' | 'shared' | 'pinned' | 'recent' | 'trash'

const QUICK_ACCESS_TO_SECTION: Record<QuickAccessSection, SidebarSection> = {
  'all-notes': 'my-notes',
  favorites: 'home',
  pinned: 'pinned',
  shared: 'shared',
  recent: 'recent',
  trash: 'trash'
}

const SECTION_TO_QUICK_ACCESS: Record<SidebarSection, QuickAccessSection> = {
  home: 'favorites',
  'my-notes': 'all-notes',
  pinned: 'pinned',
  shared: 'shared',
  recent: 'recent',
  trash: 'trash'
}

export const NoteAppsHub: React.FC<NoteAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'note-apps-hub'
}) => {
  const { t } = useTranslation(translations)
  /** Catalog key `preview.enabled` (Feature.Preview.Enabled.Key). Hide handwriting UI unless explicitly enabled. */
  const previewFeatureRaw = useFeature<boolean | string>(Feature.Preview.Enabled.Key)
  const previewEnabled = previewFeatureRaw === true || previewFeatureRaw === 'true'

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeQuickAccess, setActiveQuickAccess] = useState<QuickAccessSection | null>('all-notes')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-notes')
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<Array<{ id: string; title: string }>>([])
  const [favoriteNotes, setFavoriteNotes] = useState<NoteSummary[]>([])
  const { favorites, toggleFavorite: toggleNoteFavorite } = useNoteAppsHubFavorites({ accessToken })

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [ownerInfoMap, setOwnerInfoMap] = useState<Map<string, { name: string; avatar?: string }>>(new Map())
  const [isRestoringTrashedNote, setIsRestoringTrashedNote] = useState(false)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [pendingTrashNoteIds, setPendingTrashNoteIds] = useState<string[]>([])
  const [isMovingToTrash, setIsMovingToTrash] = useState(false)
  const [trashCount, setTrashCount] = useState(0)

  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [bulkShareDialogOpen, setBulkShareDialogOpen] = useState(false)
  const [noteToShare, setNoteToShare] = useState<NoteSummary | null>(null)
  const [shareDialogSharedUsers, setShareDialogSharedUsers] = useState<SharedNoteUser[]>([])
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [noteToManageShares, setNoteToManageShares] = useState<NoteSummary | null>(null)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const currentUserAvatar = useMemo(() => {
    const avatar = userInfo?.employeeDetails?.pictureThumbnail
    if (!avatar) return undefined
    return avatar.startsWith('data:') ? avatar : `data:image/png;base64,${avatar}`
  }, [userInfo?.employeeDetails?.pictureThumbnail])

  // Clear space return URL if not opened from a space
  useEffect(() => {
    try {
      const params = new URLSearchParams(globalThis.window.location.search)
      if (!params.get('spaceId')) sessionStorage.removeItem('space_return_url')
    } catch {
      // ignore
    }
  }, [])

  // Hooks
  const {
    notes,
    currentNote,
    isLoading: isLoadingNotes,
    error: notesError,
    currentNotePermission,
    loadNote,
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,
    togglePin,
    clearCurrentNote,
    refreshNotes,
    shareNote,
    getSharedUsers,
    patchNoteInState
  } = useNotes({ accessToken, userId: currentUserId, translate: t })

  const noteTree = useNoteTree({ autoLoad: true, t })

  const { updateUrl, resetLoadAttempt } = useNoteAppsHubUrlState({
    currentView,
    currentNoteId: selectedNoteId,
    isLoadingNote: isLoadingNotes,
    loadNoteById: loadNote,
    setCurrentView,
    setSelectedNoteId,
    activeSection,
    setActiveSection
  })

  const sidebar = useResizableSidebar(true)

  const dragDrop = useNoteTreeDragDrop({
    flatNodes: noteTree.flatNodes,
    expandedIds: noteTree.expandedIds,
    onMoveNode: noteTree.moveNodeOptimistic,
    toggleExpand: noteTree.toggleExpand
  })

  // GraphQL client for fetching user info
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const nextQuickAccess = SECTION_TO_QUICK_ACCESS[activeSection]
    if (nextQuickAccess !== activeQuickAccess) {
      setActiveQuickAccess(nextQuickAccess)
    }
  }, [activeQuickAccess, activeSection])

  const mapShareUsers = useCallback(
    (users: NoteShare[]): SharedNoteUser[] =>
      users.map(user => ({
        ...user,
        shareId: user.id,
        userName: user.userName || user.userEmail || ''
      })),
    []
  )

  // Fetch owner info
  const loadingOwnerInfoRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!graphqlClient) return
    for (const note of notes) {
      const ownerId = note.ownerId
      if (!ownerId || ownerInfoMap.has(ownerId) || loadingOwnerInfoRef.current.has(ownerId)) continue
      loadingOwnerInfoRef.current.add(ownerId)
      graphqlClient
        .request<{ Employee: Array<{ displayName: string; pictureThumbnail?: string }> }>(
          GET_EMPLOYEE_LIGHT_BY_USER_ID(ownerId)
        )
        .then(result => {
          const emp = result.Employee?.[0]
          setOwnerInfoMap(prev =>
            new Map(prev).set(ownerId, {
              name: emp?.displayName || `User ${ownerId.slice(0, 8)}`,
              avatar: emp?.pictureThumbnail
                ? emp.pictureThumbnail.startsWith('data:')
                  ? emp.pictureThumbnail
                  : `data:image/png;base64,${emp.pictureThumbnail}`
                : undefined
            })
          )
        })
        .catch(() => {
          setOwnerInfoMap(prev => new Map(prev).set(ownerId, { name: `User ${ownerId.slice(0, 8)}` }))
        })
        .finally(() => loadingOwnerInfoRef.current.delete(ownerId))
    }
  }, [notes, graphqlClient, ownerInfoMap])

  const loadTrashCount = useCallback(async () => {
    if (!accessToken || !currentUserId) {
      setTrashCount(0)
      return
    }

    try {
      DriveApiService.setAccessToken(accessToken)
      const PAGE_SIZE = 200
      let page = 1
      let count = 0
      let hasMore = true

      while (hasMore) {
        const result = await DriveApiService.listItems({
          section: 'trash',
          type: 'note',
          limit: PAGE_SIZE,
          page
        })
        count += result.items.filter(item => item.ownerId === currentUserId && !item.spaceId).length
        hasMore = result.items.length === PAGE_SIZE
        page += 1
      }

      setTrashCount(count)
    } catch (error) {
      console.error('[NoteAppsHub] Failed to load trash count:', error)
    }
  }, [accessToken, currentUserId])

  useEffect(() => {
    void loadTrashCount()
  }, [loadTrashCount])

  useEffect(() => {
    if (!accessToken) {
      setFavoriteNotes([])
      return
    }

    let cancelled = false

    const loadFavoriteNotes = async () => {
      try {
        const PAGE_SIZE = 100
        let page = 1
        let hasMore = true
        let nextFavoriteNotes: NoteSummary[] = []

        while (hasMore) {
          const result = await NoteApiService.listNotes({
            section: 'favorites',
            includeShared: true,
            limit: PAGE_SIZE,
            page
          })
          nextFavoriteNotes = [...nextFavoriteNotes, ...result.items]
          hasMore = result.items.length === PAGE_SIZE
          page += 1
        }

        if (!cancelled) {
          setFavoriteNotes(nextFavoriteNotes)
        }
      } catch (error) {
        if (!cancelled) {
          setFavoriteNotes([])
        }
        console.error('[NoteAppsHub] Failed to load favorite notes:', error)
      }
    }

    void loadFavoriteNotes()

    return () => {
      cancelled = true
    }
  }, [accessToken, favorites])

  // Categorise notes
  const { myNotes, sharedNotes, pinnedNotes, recentNotes } = useMemo(() => {
    const my: NoteSummary[] = []
    const shared: NoteSummary[] = []
    const pinned: NoteSummary[] = []
    const sortedByDate = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recentIds = new Set(sortedByDate.slice(0, 10).map(n => n.id))
    const recent: NoteSummary[] = []

    notes.forEach(note => {
      if (note.isArchived || note.trashedAt) {
        return
      }
      if (note.isPinned) pinned.push(note)
      if (recentIds.has(note.id)) recent.push(note)
      const isSharedWithMe = note.isShared === true || (note.ownerId !== currentUserId && note.permission !== 'owner')
      if (isSharedWithMe) shared.push(note)
      else my.push(note)
    })
    return { myNotes: my, sharedNotes: shared, pinnedNotes: pinned, recentNotes: recent }
  }, [notes, currentUserId])

  // Quick access counts — count all actual notes (not folders) across all nesting levels
  const isFolder = (n: NoteSummary) => n.icon === '📁'
  const quickAccessCounts = useMemo(
    () => ({
      'all-notes': myNotes.filter(n => !isFolder(n)).length,
      favorites: favoriteNotes.filter(n => !isFolder(n)).length,
      pinned: pinnedNotes.filter(n => !isFolder(n)).length,
      shared: sharedNotes.filter(n => !isFolder(n)).length,
      recent: recentNotes.filter(n => !isFolder(n)).length,
      trash: trashCount
    }),
    [favoriteNotes, myNotes, pinnedNotes, recentNotes, sharedNotes, trashCount]
  )

  // Filter + sort notes
  const filteredNotes = useMemo(() => {
    let base: NoteSummary[] = []
    switch (activeSection) {
      case 'pinned':
        base = pinnedNotes
        break
      case 'shared':
        base = sharedNotes
        break
      case 'trash':
        base = []
        break
      case 'recent':
        base = recentNotes
        break
      case 'home':
        base = [...myNotes, ...sharedNotes]
        break
      default:
        base = myNotes
    }

    if (activeQuickAccess === 'favorites') {
      base = favoriteNotes
    }

    if (currentFolderId) {
      base = base.filter(n => n.parentId === currentFolderId)
    } else if (activeSection === 'my-notes' || activeSection === 'home') {
      base = base.filter(n => !n.parentId)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter(
        n =>
          n.title?.toLowerCase().includes(q) ||
          n.preview?.toLowerCase().includes(q) ||
          n.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    const isFolder = (n: NoteSummary) => n.icon === '📁'
    base.sort((a, b) => {
      if (isFolder(a) !== isFolder(b)) return isFolder(a) ? -1 : 1
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = (a.title || '').localeCompare(b.title || '')
          break
        case 'modified':
          cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case 'created':
          cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
      }
      return sortOrder === 'asc' ? -cmp : cmp
    })
    return base
  }, [
    myNotes,
    sharedNotes,
    pinnedNotes,
    recentNotes,
    activeSection,
    activeQuickAccess,
    searchQuery,
    sortBy,
    sortOrder,
    favoriteNotes,
    currentFolderId
  ])

  const {
    paginatedItems: paginatedNotes,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    pageSize
  } = useHubPagination({ items: filteredNotes, pageSize: 20 })

  const { hasSharesForNote, refreshSharesForNote } = useNoteAppsHubShareLookup({
    notes: filteredNotes,
    currentUserId
  })

  // Handlers
  const handleCreateNew = useCallback(
    async (options?: {
      color?: NoteColor
      noteType?: 'text' | 'handwriting'
      paperStyle?: PaperStyle
      parentId?: string
    }) => {
      if (options?.noteType === 'handwriting' && !previewEnabled) {
        toast.error(t('handwriting-preview-disabled-toast'))
        return
      }
      const input: CreateNoteInput = {
        title: '',
        content: '<p></p>',
        color: options?.color,
        parentId: options?.parentId
      }
      if (options?.noteType === 'handwriting') {
        ;(input as any).contentJson = {
          _noteType: 'handwriting',
          _paperStyle: options.paperStyle || 'lined',
          strokes: []
        }
      }
      const newNote = await createNote(input)
      if (newNote) {
        await loadNote(newNote.id)
        setSelectedNoteId(newNote.id)
        noteTree.setSelectedId(newNote.id)
        setCurrentView('editor')
        updateUrl(newNote.id, 'editor')
        noteTree.loadTree()
      }
    },
    [createNote, loadNote, noteTree, previewEnabled, t, updateUrl]
  )

  const handleCreateFolder = useCallback(async () => {
    const input: CreateNoteInput = {
      title: t('folder-new-folder-name'),
      content: '',
      icon: '📁',
      parentId: currentFolderId || undefined
    }
    const folder = await createNote(input)
    if (folder) {
      toast.success(t('toast-folder-created'))
      refreshNotes()
      noteTree.loadTree()
    }
  }, [createNote, t, noteTree, currentFolderId, refreshNotes])

  const handleOpenNote = useCallback(
    async (id: string) => {
      const note = await loadNote(id)
      if (note) {
        setSelectedNoteId(id)
        noteTree.setSelectedId(id)
        const nextView = note.trashedAt ? 'trash' : 'editor'
        setCurrentView(nextView)
        updateUrl(id, nextView)
      }
    },
    [loadNote, updateUrl, noteTree]
  )

  const handleOpenTrashedNote = useCallback(
    async (id: string) => {
      const note = await loadNote(id)
      if (!note) {
        return
      }

      setSelectedNoteId(id)
      noteTree.setSelectedId(id)
      setCurrentView(note.trashedAt ? 'trash' : 'editor')
      updateUrl(id, note.trashedAt ? 'trash' : 'editor', 'trash')
    },
    [loadNote, noteTree, updateUrl]
  )

  const handleOpenFolder = useCallback(
    (folderId: string) => {
      const folder = notes.find(n => n.id === folderId)
      if (folder) {
        setFolderBreadcrumbs(prev => [...prev, { id: folderId, title: folder.title || t('folder-new-folder-name') }])
        setCurrentFolderId(folderId)
      }
    },
    [notes, t]
  )

  const handleBreadcrumbNav = useCallback(
    (id: string | null) => {
      if (!id) {
        setCurrentFolderId(null)
        setFolderBreadcrumbs([])
        return
      }
      const idx = folderBreadcrumbs.findIndex(b => b.id === id)
      if (idx >= 0) {
        setFolderBreadcrumbs(prev => prev.slice(0, idx + 1))
        setCurrentFolderId(id)
      }
    },
    [folderBreadcrumbs]
  )

  const handleMoveToFolder = useCallback(
    async (noteId: string, folderId: string) => {
      try {
        await NoteApiService.moveNote(noteId, { parentId: folderId, position: 0 })
        toast.success(t('toast-note-moved'))
        refreshNotes()
        noteTree.loadTree()
      } catch (err) {
        console.error('Move to folder failed:', err)
        toast.error(t('toast-move-failed'))
      }
    },
    [refreshNotes, noteTree, t]
  )

  const handleRenameNote = useCallback(
    async (noteId: string, newTitle: string) => {
      try {
        await NoteApiService.updateNote(noteId, { title: newTitle })
        noteTree.updateNodeTitleOptimistic(noteId, newTitle)
        refreshNotes()
      } catch (err) {
        console.error('Rename failed:', err)
        toast.error(t('toast-move-failed'))
      }
    },
    [noteTree, refreshNotes, t]
  )

  const handleDeleteNote = useCallback((id: string) => {
    setPendingTrashNoteIds([id])
    setTrashConfirmOpen(true)
  }, [])

  const handleDuplicateNote = useCallback(
    async (id: string) => {
      await duplicateNote(id)
      toast.success(t('toast-note-duplicated'))
      noteTree.loadTree()
    },
    [duplicateNote, t, noteTree]
  )

  const handleTogglePin = useCallback(
    async (id: string) => {
      const note = notes.find(n => n.id === id)
      const wasPinned = note?.isPinned
      const success = await togglePin(id)
      if (success) {
        toast.success(wasPinned ? t('toast-note-unpinned') : t('toast-note-pinned'))
        noteTree.loadTree()
      }
    },
    [togglePin, notes, t, noteTree]
  )

  const selectedNotesForDelete = useMemo(
    () =>
      Array.from(selectedNotes)
        .map(id => {
          const note = notes.find(item => item.id === id)
          if (!note) {
            return null
          }

          const capabilities = getShareCapabilities({
            permission: note.permission,
            isOwner: Boolean(note.ownerId === currentUserId || note.permission === 'owner')
          })

          return capabilities.canDelete ? note : null
        })
        .filter((note): note is NoteSummary => note !== null),
    [currentUserId, notes, selectedNotes]
  )

  const canBulkDeleteNotes = selectedNotes.size > 0 && selectedNotesForDelete.length === selectedNotes.size

  const selectedNotesForShare = useMemo(
    () =>
      Array.from(selectedNotes)
        .map(id => {
          const note = notes.find(item => item.id === id)
          if (!note) {
            return null
          }

          const capabilities = getShareCapabilities({
            permission: note.permission,
            isOwner: Boolean(note.ownerId === currentUserId || note.permission === 'owner')
          })

          return capabilities.canManageSharing ? note : null
        })
        .filter((note): note is NoteSummary => note !== null),
    [currentUserId, notes, selectedNotes]
  )

  const canBulkShareNotes = selectedNotes.size > 0 && selectedNotesForShare.length === selectedNotes.size

  const bulkShareNotes = useMemo(
    () =>
      selectedNotesForShare.map(note => ({
        entityType: 'note',
        entityId: note.id,
        entityTitle: note.title || t('title-untitled-note')
      })),
    [selectedNotesForShare, t]
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedNotesForDelete.length === 0) return
    setPendingTrashNoteIds(selectedNotesForDelete.map(note => note.id))
    setTrashConfirmOpen(true)
  }, [selectedNotesForDelete])

  const pendingTrashNoteNames = useMemo(
    () =>
      pendingTrashNoteIds.map(noteId => {
        const matchingNote = notes.find(note => note.id === noteId)
        if (matchingNote?.title?.trim()) {
          return matchingNote.title
        }

        if (currentNote?.id === noteId && currentNote.title?.trim()) {
          return currentNote.title
        }

        return t('title-untitled-note')
      }),
    [currentNote?.id, currentNote?.title, notes, pendingTrashNoteIds, t]
  )

  const confirmMoveToTrash = useCallback(async () => {
    if (pendingTrashNoteIds.length === 0) return

    setIsMovingToTrash(true)
    try {
      for (const noteId of pendingTrashNoteIds) {
        const success = await deleteNote(noteId)
        if (!success) {
          continue
        }

        noteTree.removeNodeOptimistic(noteId)

        if (selectedNoteId === noteId) {
          setSelectedNoteId(null)
          setCurrentView('list')
          updateUrl(null)
        }
      }

      setSelectedNotes(prev => {
        const next = new Set(prev)
        pendingTrashNoteIds.forEach(noteId => next.delete(noteId))
        return next
      })
      await loadTrashCount()
    } finally {
      setIsMovingToTrash(false)
      setPendingTrashNoteIds([])
    }
  }, [deleteNote, loadTrashCount, noteTree, pendingTrashNoteIds, selectedNoteId, updateUrl])

  const handleTrashConfirmOpenChange = useCallback(
    (open: boolean) => {
      setTrashConfirmOpen(open)
      if (!open && !isMovingToTrash) {
        setPendingTrashNoteIds([])
      }
    },
    [isMovingToTrash]
  )

  const handleBulkPin = useCallback(async () => {
    const ids = Array.from(selectedNotes)
    for (const id of ids) await togglePin(id)
    noteTree.loadTree()
    setSelectedNotes(new Set())
  }, [selectedNotes, togglePin, noteTree])

  const handleClearSelection = useCallback(() => {
    setSelectedNotes(new Set())
  }, [])

  const handleBack = useCallback(() => {
    try {
      const spaceReturnUrl = sessionStorage.getItem('space_return_url')
      if (spaceReturnUrl) {
        sessionStorage.removeItem('space_return_url')
        globalThis.window.location.href = spaceReturnUrl
        return
      }
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(globalThis.window.location.search)
    const returnUrl = params.get('returnUrl')
    if (returnUrl) {
      globalThis.window.location.href = returnUrl
      return
    }
    clearCurrentNote()
    resetLoadAttempt()
    setSelectedNoteId(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentNote, resetLoadAttempt, updateUrl])

  const handleGoToNotesHome = useCallback(() => {
    clearCurrentNote()
    resetLoadAttempt()
    setSelectedNoteId(null)
    setCurrentView('list')
    setActiveSection('my-notes')
    updateUrl(null, undefined, 'my-notes')
  }, [clearCurrentNote, resetLoadAttempt, updateUrl])

  const isTrashedNote = Boolean(currentNote?.trashedAt)
  const canEditCurrentNote = useMemo(() => {
    if (!currentNote) return false
    const p = currentNotePermission || 'owner'
    return getShareCapabilities({ permission: p, isOwner: p === 'owner' }).canEdit
  }, [currentNote, currentNotePermission])
  const canManageTrashedNote = Boolean(
    isTrashedNote &&
      currentNotePermission === 'owner' &&
      currentNote?.ownerId === currentUserId &&
      !currentNote?.spaceId
  )

  const handleRestoreTrashedNote = useCallback(async () => {
    if (!currentNote?.id || !canManageTrashedNote) {
      return
    }

    setIsRestoringTrashedNote(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems([{ entityType: 'note', entityId: currentNote.id }])
      const restoredNote = await loadNote(currentNote.id)
      if (!restoredNote) {
        return
      }

      setSelectedNoteId(currentNote.id)
      setActiveSection('my-notes')
      setCurrentView('editor')
      updateUrl(currentNote.id, 'editor', 'my-notes')
      toast.success(t('toast-note-restored'))
      await refreshNotes()
      await loadTrashCount()
      noteTree.loadTree()
    } catch (error) {
      console.error('[NoteAppsHub] Failed to restore trashed note:', error)
      toast.error(t('toast-note-restore-failed'))
    } finally {
      setIsRestoringTrashedNote(false)
    }
  }, [
    accessToken,
    canManageTrashedNote,
    currentNote?.id,
    currentUserId,
    currentNotePermission,
    loadNote,
    loadTrashCount,
    noteTree,
    refreshNotes,
    t,
    updateUrl
  ])

  const toggleFavorite = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      const wasFavorite = favorites.has(id)
      await toggleNoteFavorite(id)
      await refreshNotes()
      toast.success(t(wasFavorite ? 'toast-favorite-removed' : 'toast-favorite-added'))
    },
    [favorites, refreshNotes, t, toggleNoteFavorite]
  )

  const toggleSelectNote = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllNotes = useCallback(() => {
    setSelectedNotes(prev => (prev.size === filteredNotes.length ? new Set() : new Set(filteredNotes.map(n => n.id))))
  }, [filteredNotes])

  const copyLink = useCallback(
    (note: NoteSummary) => {
      const url = new URL(window.location.href)
      url.searchParams.set('noteId', note.id)
      url.searchParams.set('view', 'editor')
      navigator.clipboard.writeText(url.toString())
      toast.success(t('toast-link-copied'))
    },
    [t]
  )

  const handleShareNote = useCallback(
    async (id: string) => {
      const note = notes.find(n => n.id === id)
      if (!note) return
      setNoteToShare(note)
      try {
        const users = (await getSharedUsers(id)) || []
        setShareDialogSharedUsers(mapShareUsers(users))
        await refreshSharesForNote(id)
      } catch {
        setShareDialogSharedUsers([])
      }
      setShareDialogOpen(true)
    },
    [notes, getSharedUsers, mapShareUsers, refreshSharesForNote]
  )

  const handleShareSubmit = useCallback(
    async (userIds: string[], permission: NotePermission) => {
      if (!noteToShare) return false
      return shareNote(
        noteToShare.id,
        userIds.map(userId => ({ userId, permission }))
      )
    },
    [noteToShare, shareNote]
  )

  const handleUnshare = useCallback(
    async (_userId: string, shareId?: string) => {
      if (!noteToShare || !accessToken || !shareId) return false
      try {
        await NoteApiService.revokeShareById(shareId)
        return true
      } catch {
        return false
      }
    },
    [noteToShare, accessToken]
  )

  const refreshShares = useCallback(async () => {
    if (!noteToShare) return
    try {
      setShareDialogSharedUsers(mapShareUsers((await getSharedUsers(noteToShare.id)) || []))
      await refreshSharesForNote(noteToShare.id)
    } catch {
      /* ignore */
    }
  }, [noteToShare, getSharedUsers, mapShareUsers, refreshSharesForNote])

  const handleManageShares = useCallback(
    (id: string) => {
      const note = notes.find(item => item.id === id) ?? (currentNote?.id === id ? currentNote : null)
      if (!note) return
      setNoteToManageShares(note)
      setManageSharesDialogOpen(true)
    },
    [currentNote, notes]
  )

  const handleOpenManageSharesFromShareDialog = useCallback(() => {
    if (!noteToShare) return
    setShareDialogOpen(false)
    setNoteToManageShares(noteToShare)
    setManageSharesDialogOpen(true)
  }, [noteToShare])

  const handleShareDialogOpenChange = useCallback(
    (open: boolean) => {
      setShareDialogOpen(open)
      if (!open && noteToShare) {
        void refreshSharesForNote(noteToShare.id)
      }
    },
    [noteToShare, refreshSharesForNote]
  )

  const handleQuickAccessChange = useCallback(
    (section: QuickAccessSection) => {
      setActiveQuickAccess(section)
      const mapped = QUICK_ACCESS_TO_SECTION[section] || 'my-notes'
      setActiveSection(mapped)
      noteTree.setSelectedId(null)
      setCurrentFolderId(null)
      setFolderBreadcrumbs([])
      if (currentView === 'editor' || currentView === 'trash') {
        clearCurrentNote()
        setSelectedNoteId(null)
        setCurrentView('list')
      }
      updateUrl(null, undefined, mapped)
    },
    [currentView, clearCurrentNote, updateUrl, noteTree]
  )

  const handleTreeSelect = useCallback(
    (id: string) => {
      noteTree.setSelectedId(id)
      handleOpenNote(id)
    },
    [noteTree, handleOpenNote]
  )

  const handleTitleChanged = useCallback(
    (noteId: string, newTitle: string) => {
      noteTree.updateNodeTitleOptimistic(noteId, newTitle)
      refreshNotes()
    },
    [noteTree, refreshNotes]
  )

  const handleContentSaved = useCallback(
    (noteId: string) => {
      noteTree.bumpNodeTimestamp(noteId)
    },
    [noteTree]
  )

  const handleNoteColorChange = useCallback(
    (color: NoteColor) => {
      const id = currentNote?.id
      if (!id || isTrashedNote || !canEditCurrentNote) return
      void updateNote(id, { color, createVersion: false })
      noteTree.updateNodeColorOptimistic(id, color)
    },
    [canEditCurrentNote, currentNote?.id, isTrashedNote, noteTree, updateNote]
  )

  const handleRemoteNoteColor = useCallback(
    (color: NoteColor) => {
      const id = currentNote?.id
      if (!id || isTrashedNote) return
      patchNoteInState(id, { color })
      noteTree.updateNodeColorOptimistic(id, color)
    },
    [currentNote?.id, isTrashedNote, noteTree, patchNoteInState]
  )

  const breadcrumbs = useMemo(() => {
    if (currentView === 'list' && folderBreadcrumbs.length > 0) {
      return folderBreadcrumbs.map(b => ({
        id: b.id,
        title: b.title,
        children: [] as NoteTreeNode[],
        depth: 0,
        position: 0,
        ownerId: '',
        createdAt: '',
        updatedAt: '',
        isPinned: false,
        isArchived: false
      })) as NoteTreeNode[]
    }
    if (!noteTree.selectedId) return []
    return noteTree.getParentChain(noteTree.selectedId)
  }, [noteTree, currentView, folderBreadcrumbs])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateNew()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        sidebar.toggleCollapsed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleCreateNew, sidebar])

  // Reusable sidebar element for both editor and list views
  const sidebarElement = !sidebar.isCollapsed ? (
    <NoteTreeSidebar
      width={sidebar.width}
      isResizing={sidebar.isResizing}
      tree={noteTree.tree}
      recentNotes={recentNotes}
      expandedIds={noteTree.expandedIds}
      selectedId={noteTree.selectedId}
      isLoadingTree={noteTree.isLoading}
      dragDrop={dragDrop}
      onSelectNode={handleTreeSelect}
      onToggleExpand={noteTree.toggleExpand}
      onCreateNote={opts => handleCreateNew(opts)}
      handwritingNotesEnabled={previewEnabled}
      onCreateFolder={handleCreateFolder}
      onDelete={handleDeleteNote}
      onTogglePin={handleTogglePin}
      onCollapse={sidebar.toggleCollapsed}
      onResizeStart={sidebar.handleMouseDown}
    />
  ) : null

  // "New" dropdown rendered inside the hero header (mirrors the office apps layout)
  const heroNewButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="gba:gap-1.5 gba:bg-white/15 gba:text-white gba:border gba:border-white/20 hover:gba:bg-white/25 gba:backdrop-blur-sm"
          data-testid={`${testId}-hero-new-btn`}
        >
          <Plus className="gba:w-4 gba:h-4" />
          {t('sidebar-new')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="gba:w-52">
        <DropdownMenuItem onClick={() => handleCreateNew()}>
          <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-warning" />
          <div>
            <div className="gba:font-medium gba:text-sm">{t('menu-new-text-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-text-description')}</div>
          </div>
        </DropdownMenuItem>
        {previewEnabled ? (
          <DropdownMenuItem onClick={() => handleCreateNew({ noteType: 'handwriting' })}>
            <PenTool className="gba:w-4 gba:h-4 gba:mr-2 gba:text-info" />
            <div>
              <div className="gba:font-medium gba:text-sm">{t('menu-new-handwriting-title')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-handwriting-description')}</div>
            </div>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateFolder}>
          <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
          <div>
            <div className="gba:font-medium gba:text-sm">{t('menu-new-folder-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-folder-description')}</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const notesHero = (
    <NoteHero
      activeSection={activeQuickAccess}
      onSectionChange={handleQuickAccessChange}
      newButton={heroNewButton}
      counts={quickAccessCounts}
      t={t}
      data-testid={`${testId}-hero`}
    />
  )

  if (currentView === 'trash' && selectedNoteId && !currentNote) {
    return (
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        {sidebarElement}
        <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:min-w-0">
          <div className="gba:flex gba:justify-center gba:py-12" data-testid={`${testId}-trash-loading`}>
            <span className="gba:text-sm gba:text-muted-foreground">{t('loading-message')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'list' && activeSection === 'trash') {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
        {notesHero}
        <div className="gba:flex gba:flex-1 gba:min-h-0">
          {sidebarElement}
          <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:overflow-auto gba:p-6">
            <NoteTrashList
              accessToken={accessToken}
              currentUserId={currentUserId}
              searchQuery={searchQuery}
              onOpenItem={item => handleOpenTrashedNote(item.id)}
              onItemsChanged={() => {
                void refreshNotes()
                void loadTrashCount()
                noteTree.loadTree()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  const shouldRenderEditorView = (currentView === 'editor' || currentView === 'trash') && Boolean(currentNote)

  if (shouldRenderEditorView && currentNote) {
    const effectivePermission = currentNotePermission || 'owner'
    const noteCapabilities = getShareCapabilities({
      permission: effectivePermission,
      isOwner: currentNote.ownerId === currentUserId || effectivePermission === 'owner'
    })
    const canEdit = noteCapabilities.canEdit
    const contentJson = currentNote.contentJson as
      | {
          _noteType?: string
          _paperStyle?: PaperStyle
          strokes?: StrokeData[]
          _summary?: string | null
          _translation?: any[]
          actionItemFlows?: any[]
        }
      | undefined
    const noteType = currentNote.noteType || contentJson?._noteType || 'text'
    const trashedDialog = isTrashedNote ? (
      <>
        <TrashedNoteReadonlyDialog
          noteTitle={currentNote.title}
          canManage={canManageTrashedNote}
          isRestoring={isRestoringTrashedNote}
          onGoToNotesHome={handleGoToNotesHome}
          onRestore={() => {
            void handleRestoreTrashedNote()
          }}
          data-testid={`${testId}-trashed-note-dialog`}
        />
      </>
    ) : null

    if (noteType === 'handwriting') {
      return (
        <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
          {sidebarElement}
          <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
            <HandwritingNote
              key={currentNote.id}
              noteId={currentNote.id}
              title={currentNote.title || t('title-untitled-note')}
              initialStrokes={contentJson?.strokes || []}
              initialPaperStyle={contentJson?._paperStyle || 'lined'}
              initialSummary={contentJson?._summary || null}
              initialTranslations={(contentJson?._translation as any[]) || []}
              initialActionItemFlows={(contentJson?.actionItemFlows as any[]) || []}
              onPersist={async ({ title, strokes, paperStyle, summary, translations, actionItemFlows }) => {
                await updateNote(currentNote.id, {
                  title,
                  contentJson: {
                    _noteType: 'handwriting',
                    _paperStyle: paperStyle,
                    strokes,
                    ...(summary ? { _summary: summary } : {}),
                    ...(translations.length > 0 ? { _translation: translations } : {}),
                    ...(actionItemFlows.length > 0 ? { actionItemFlows } : {})
                  }
                })
              }}
              onBack={handleBack}
              onConvertToText={async text => {
                await NoteApiService.resetYjsState(currentNote.id, {
                  title: currentNote.title,
                  content: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
                  contentJson: {
                    _noteType: 'text',
                    ...(contentJson?._summary ? { _summary: contentJson._summary } : {}),
                    ...(Array.isArray(contentJson?._translation) && contentJson._translation.length > 0
                      ? { _translation: contentJson._translation }
                      : {}),
                    ...(Array.isArray(contentJson?.actionItemFlows) && contentJson.actionItemFlows.length > 0
                      ? { actionItemFlows: contentJson.actionItemFlows }
                      : {})
                  }
                })
                loadNote(currentNote.id)
              }}
              onCreateTextNote={async (text, title) => {
                const newNote = await createNote({ title, content: `<p>${text.replace(/\n/g, '</p><p>')}</p>` })
                if (newNote) toast.success(t('toast-text-note-created'))
              }}
              isSidebarCollapsed={sidebar.isCollapsed}
              onToggleSidebar={sidebar.toggleCollapsed}
              accessToken={accessToken}
              userInfo={userInfo}
              data-testid={`${testId}-handwriting-editor`}
            />
          </div>
          {!isTrashedNote && noteToShare && (
            <ShareNoteDialog
              open={shareDialogOpen}
              onOpenChange={handleShareDialogOpenChange}
              noteId={noteToShare.id}
              noteTitle={noteToShare.title || t('title-untitled-note')}
              accessToken={accessToken}
              currentUserId={currentUserId}
              currentUserName={userInfo?.employeeDetails?.displayName}
              currentUserAvatar={currentUserAvatar}
              isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
              sharedUsers={shareDialogSharedUsers}
              onShare={handleShareSubmit}
              onUnshare={handleUnshare}
              onRefreshShares={refreshShares}
              onManageAccess={handleOpenManageSharesFromShareDialog}
            />
          )}
          {noteToManageShares && (
            <ManageSharesDialog
              open={manageSharesDialogOpen}
              onOpenChange={open => {
                setManageSharesDialogOpen(open)
                if (!open) setNoteToManageShares(null)
              }}
              noteId={noteToManageShares.id}
              noteTitle={noteToManageShares.title || t('title-untitled-note')}
              accessToken={accessToken}
              onSharesChanged={() => {
                void refreshNotes()
                void refreshShares()
                void refreshSharesForNote(noteToManageShares.id)
              }}
            />
          )}
          {trashedDialog}
        </div>
      )
    }

    return (
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        {sidebarElement}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
          <NoteEditor
            key={currentNote.id}
            note={currentNote}
            onSave={async (title, _content, contentJson) => {
              await updateNote(currentNote.id, { title, contentJson })
            }}
            onBack={handleBack}
            onTogglePin={() => handleTogglePin(currentNote.id)}
            onShare={
              !isTrashedNote && noteCapabilities.canManageSharing ? () => handleShareNote(currentNote.id) : undefined
            }
            onManageShares={
              !isTrashedNote && noteCapabilities.canManageSharing && hasSharesForNote(currentNote.id)
                ? () => handleManageShares(currentNote.id)
                : undefined
            }
            onDuplicate={() => handleDuplicateNote(currentNote.id)}
            isReadOnly={isTrashedNote || !canEdit}
            isTrashedNote={isTrashedNote}
            isSidebarCollapsed={sidebar.isCollapsed}
            onToggleSidebar={sidebar.toggleCollapsed}
            onTitleChanged={handleTitleChanged}
            onContentSaved={handleContentSaved}
            onColorChange={!isTrashedNote && canEditCurrentNote ? handleNoteColorChange : undefined}
            onRemoteNoteColor={!isTrashedNote ? handleRemoteNoteColor : undefined}
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid={`${testId}-editor`}
          />
        </div>
        {!isTrashedNote && noteToShare && (
          <ShareNoteDialog
            open={shareDialogOpen}
            onOpenChange={handleShareDialogOpenChange}
            noteId={noteToShare.id}
            noteTitle={noteToShare.title || t('title-untitled-note')}
            accessToken={accessToken}
            currentUserId={currentUserId}
            currentUserName={userInfo?.employeeDetails?.displayName}
            currentUserAvatar={currentUserAvatar}
            isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
            currentUserPermission={noteToShare.permission}
            sharedUsers={shareDialogSharedUsers}
            onShare={handleShareSubmit}
            onUnshare={handleUnshare}
            onRefreshShares={refreshShares}
            onManageAccess={handleOpenManageSharesFromShareDialog}
          />
        )}
        {noteToManageShares && (
          <ManageSharesDialog
            open={manageSharesDialogOpen}
            onOpenChange={open => {
              setManageSharesDialogOpen(open)
              if (!open) setNoteToManageShares(null)
            }}
            noteId={noteToManageShares.id}
            noteTitle={noteToManageShares.title || t('title-untitled-note')}
            accessToken={accessToken}
            currentUserId={currentUserId}
            currentUserName={userInfo?.employeeDetails?.displayName}
            currentUserAvatar={currentUserAvatar}
            onSharesChanged={() => {
              void refreshNotes()
              void refreshShares()
              void refreshSharesForNote(noteToManageShares.id)
            }}
          />
        )}
        {trashedDialog}
      </div>
    )
  }

  // List view: hero + (sidebar + content)
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {notesHero}

      <div className="gba:flex gba:flex-1 gba:min-h-0">
        {sidebarElement}

        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
          {/* Content */}
          <NoteContentArea
            notes={paginatedNotes}
            breadcrumbs={breadcrumbs}
            viewLayout={viewLayout}
            sortBy={sortBy}
            sortOrder={sortOrder}
            isLoading={isLoadingNotes}
            error={notesError}
            isSidebarCollapsed={sidebar.isCollapsed}
            currentUserId={currentUserId}
            selectedNotes={selectedNotes}
            favorites={favorites}
            ownerInfoMap={ownerInfoMap}
            activeSection={activeSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onViewLayoutChange={setViewLayout}
            onSortByChange={setSortBy}
            onSortOrderToggle={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            onBreadcrumbClick={handleBreadcrumbNav}
            onToggleSidebar={sidebar.toggleCollapsed}
            onCreateNote={opts => handleCreateNew({ ...opts, parentId: currentFolderId || undefined })}
            onRefresh={() => {
              refreshNotes()
              noteTree.loadTree()
            }}
            onOpenNote={handleOpenNote}
            onOpenFolder={handleOpenFolder}
            onDeleteNote={handleDeleteNote}
            onDuplicateNote={handleDuplicateNote}
            onTogglePin={handleTogglePin}
            onShareNote={handleShareNote}
            onManageShares={handleManageShares}
            hasSharesForNote={hasSharesForNote}
            onCopyLink={copyLink}
            onToggleFavorite={toggleFavorite}
            onToggleSelect={toggleSelectNote}
            onSelectAll={selectAllNotes}
            onBulkShare={canBulkShareNotes ? () => setBulkShareDialogOpen(true) : undefined}
            onBulkDelete={canBulkDeleteNotes ? handleBulkDelete : undefined}
            onBulkPin={handleBulkPin}
            onClearSelection={handleClearSelection}
            onMoveToFolder={handleMoveToFolder}
            onRenameNote={handleRenameNote}
          />

          {/* Pagination */}
          {!isLoadingNotes && filteredNotes.length > 0 && (
            <div className="gba:flex-shrink-0 gba:max-w-6xl gba:mx-auto gba:w-full">
              <HubPaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={goToPage}
                data-testid={`${testId}-pagination`}
              />
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={trashConfirmOpen}
        onOpenChange={handleTrashConfirmOpenChange}
        itemNames={pendingTrashNoteNames}
        onConfirm={() => {
          void confirmMoveToTrash()
        }}
        isDeleting={isMovingToTrash}
        t={t}
        data-testid={`${testId}-trash-confirm`}
      />

      {/* Share Dialog */}
      {noteToShare && (
        <ShareNoteDialog
          open={shareDialogOpen}
          onOpenChange={handleShareDialogOpenChange}
          noteId={noteToShare.id}
          noteTitle={noteToShare.title || t('title-untitled-note')}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={userInfo?.employeeDetails?.displayName}
          currentUserAvatar={currentUserAvatar}
          isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
          currentUserPermission={noteToShare.permission}
          sharedUsers={shareDialogSharedUsers}
          onShare={handleShareSubmit}
          onUnshare={handleUnshare}
          onRefreshShares={refreshShares}
          onManageAccess={handleOpenManageSharesFromShareDialog}
        />
      )}
      {bulkShareNotes.length > 0 && (
        <BulkShareEntitiesDialog
          open={bulkShareDialogOpen}
          onOpenChange={setBulkShareDialogOpen}
          accessToken={accessToken}
          currentUserId={currentUserId}
          entities={bulkShareNotes}
          permissionOptions={NOTE_SHARE_PERMISSIONS}
          onShareComplete={async () => {
            handleClearSelection()
            await refreshNotes()
          }}
          data-testid={`${testId}-bulk-share-dialog`}
        />
      )}
      {noteToManageShares && (
        <ManageSharesDialog
          open={manageSharesDialogOpen}
          onOpenChange={open => {
            setManageSharesDialogOpen(open)
            if (!open) setNoteToManageShares(null)
          }}
          noteId={noteToManageShares.id}
          noteTitle={noteToManageShares.title || t('title-untitled-note')}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={userInfo?.employeeDetails?.displayName}
          currentUserAvatar={currentUserAvatar}
          onSharesChanged={() => {
            void refreshNotes()
            void refreshShares()
            void refreshSharesForNote(noteToManageShares.id)
          }}
        />
      )}
    </div>
  )
}

export default NoteAppsHub
