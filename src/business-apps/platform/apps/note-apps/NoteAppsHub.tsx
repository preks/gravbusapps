import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

import { NoteTreeSidebar } from './components/NoteTreeSidebar'
import { NoteContentArea } from './components/NoteContentArea'
import { NoteEditor } from './NoteEditor'
import { HandwritingNote } from './components/HandwritingNote'
import { ShareNoteDialog, type SharedNoteUser } from './components/ShareNoteDialog'
import type { QuickAccessSection } from './components/NoteTreeQuickAccess'
import type { PaperStyle, StrokeData } from './components/handwriting'

import { useNotes } from './hooks/useNotes'
import { useNoteTree } from './hooks/useNoteTree'
import { useNoteAppsHubUrlState } from './hooks/useNoteAppsHubUrlState'
import { useResizableSidebar } from './hooks/useResizableSidebar'
import { useNoteTreeDragDrop } from './hooks/useNoteTreeDragDrop'
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
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('note-favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [ownerInfoMap, setOwnerInfoMap] = useState<Map<string, { name: string; avatar?: string }>>(new Map())
  const [isRestoringTrashedNote, setIsRestoringTrashedNote] = useState(false)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [pendingTrashNoteIds, setPendingTrashNoteIds] = useState<string[]>([])
  const [isMovingToTrash, setIsMovingToTrash] = useState(false)

  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [noteToShare, setNoteToShare] = useState<NoteSummary | null>(null)
  const [shareDialogSharedUsers, setShareDialogSharedUsers] = useState<SharedNoteUser[]>([])

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

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
    getSharedUsers
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

  const sidebar = useResizableSidebar()

  const dragDrop = useNoteTreeDragDrop({
    flatNodes: noteTree.flatNodes,
    expandedIds: noteTree.expandedIds,
    onMoveNode: noteTree.moveNodeOptimistic,
    toggleExpand: noteTree.toggleExpand
  })

  // GraphQL client for fetching user info
  const graphqlClient = useGraphQLClient(accessToken)

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('note-favorites', JSON.stringify(Array.from(favorites)))
  }, [favorites])

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
        userName: user.userName || user.userEmail || t('owner-unknown')
      })),
    [t]
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
      'all-notes': myNotes.filter(n => !isFolder(n)).length + sharedNotes.filter(n => !isFolder(n)).length,
      favorites: Array.from(favorites).filter(id => notes.some(n => n.id === id && !isFolder(n))).length,
      pinned: pinnedNotes.filter(n => !isFolder(n)).length,
      shared: sharedNotes.filter(n => !isFolder(n)).length,
      recent: recentNotes.filter(n => !isFolder(n)).length,
      trash: 0
    }),
    [myNotes, sharedNotes, pinnedNotes, recentNotes, favorites, notes]
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
      base = base.filter(n => favorites.has(n.id))
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
    favorites,
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

  // Handlers
  const handleCreateNew = useCallback(
    async (options?: {
      color?: NoteColor
      noteType?: 'text' | 'handwriting'
      paperStyle?: PaperStyle
      parentId?: string
    }) => {
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
    [createNote, loadNote, updateUrl, noteTree]
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

  const handleBulkDelete = useCallback(() => {
    if (selectedNotes.size === 0) return
    setPendingTrashNoteIds(Array.from(selectedNotes))
    setTrashConfirmOpen(true)
  }, [selectedNotes])

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
    } finally {
      setIsMovingToTrash(false)
      setPendingTrashNoteIds([])
    }
  }, [deleteNote, noteTree, pendingTrashNoteIds, selectedNoteId, updateUrl])

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
    noteTree,
    refreshNotes,
    t,
    updateUrl
  ])

  const toggleFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          toast.success(t('toast-favorite-removed'))
        } else {
          next.add(id)
          toast.success(t('toast-favorite-added'))
        }
        return next
      })
    },
    [t]
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
        setShareDialogSharedUsers(mapShareUsers((await getSharedUsers(id)) || []))
      } catch {
        setShareDialogSharedUsers([])
      }
      setShareDialogOpen(true)
    },
    [notes, getSharedUsers, mapShareUsers]
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
    } catch {
      /* ignore */
    }
  }, [noteToShare, getSharedUsers, mapShareUsers])

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
      expandedIds={noteTree.expandedIds}
      selectedId={noteTree.selectedId}
      isLoadingTree={noteTree.isLoading}
      activeQuickAccess={activeQuickAccess}
      quickAccessCounts={quickAccessCounts}
      searchQuery={searchQuery}
      dragDrop={dragDrop}
      onSearchChange={setSearchQuery}
      onQuickAccessChange={handleQuickAccessChange}
      onSelectNode={handleTreeSelect}
      onToggleExpand={noteTree.toggleExpand}
      onCreateNote={opts => handleCreateNew(opts)}
      onCreateFolder={handleCreateFolder}
      onDelete={handleDeleteNote}
      onTogglePin={handleTogglePin}
      onCollapse={sidebar.toggleCollapsed}
      onResizeStart={sidebar.handleMouseDown}
    />
  ) : null

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
      <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
        {sidebarElement}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:p-6">
          <NoteTrashList
            accessToken={accessToken}
            currentUserId={currentUserId}
            searchQuery={searchQuery}
            onOpenItem={item => handleOpenTrashedNote(item.id)}
            onItemsChanged={() => {
              void refreshNotes()
              noteTree.loadTree()
            }}
          />
        </div>
      </div>
    )
  }

  const shouldRenderEditorView = (currentView === 'editor' || currentView === 'trash') && Boolean(currentNote)

  if (shouldRenderEditorView && currentNote) {
    const effectivePermission = currentNotePermission || 'owner'
    const canEdit = effectivePermission === 'owner' || effectivePermission === 'edit'
    const isOwner = currentNote.ownerId === currentUserId || effectivePermission === 'owner'
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
                await updateNote(currentNote.id, {
                  title: currentNote.title,
                  content: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
                  contentJson: { _noteType: 'text' }
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
              onOpenChange={setShareDialogOpen}
              noteId={noteToShare.id}
              noteTitle={noteToShare.title || t('title-untitled-note')}
              accessToken={accessToken}
              currentUserId={currentUserId}
              currentUserName={userInfo?.employeeDetails?.displayName}
              isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
              sharedUsers={shareDialogSharedUsers}
              onShare={handleShareSubmit}
              onUnshare={handleUnshare}
              onRefreshShares={refreshShares}
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
            onSave={async (title, content, contentJson) => {
              await updateNote(currentNote.id, { title, content, contentJson })
            }}
            onBack={handleBack}
            onTogglePin={() => handleTogglePin(currentNote.id)}
            onShare={!isTrashedNote && isOwner ? () => handleShareNote(currentNote.id) : undefined}
            onDuplicate={() => handleDuplicateNote(currentNote.id)}
            isReadOnly={isTrashedNote || !canEdit}
            isTrashedNote={isTrashedNote}
            isSidebarCollapsed={sidebar.isCollapsed}
            onToggleSidebar={sidebar.toggleCollapsed}
            onTitleChanged={handleTitleChanged}
            onContentSaved={handleContentSaved}
            accessToken={accessToken}
            userInfo={userInfo}
            data-testid={`${testId}-editor`}
          />
        </div>
        {!isTrashedNote && noteToShare && (
          <ShareNoteDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            noteId={noteToShare.id}
            noteTitle={noteToShare.title || t('title-untitled-note')}
            accessToken={accessToken}
            currentUserId={currentUserId}
            currentUserName={userInfo?.employeeDetails?.displayName}
            isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
            sharedUsers={shareDialogSharedUsers}
            onShare={handleShareSubmit}
            onUnshare={handleUnshare}
            onRefreshShares={refreshShares}
          />
        )}
        {trashedDialog}
      </div>
    )
  }

  // List view: sidebar + content
  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {sidebarElement}

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
        onViewLayoutChange={setViewLayout}
        onSortByChange={setSortBy}
        onSortOrderToggle={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
        onBreadcrumbClick={handleBreadcrumbNav}
        onToggleSidebar={sidebar.toggleCollapsed}
        onCreateNote={opts => handleCreateNew({ ...opts, parentId: currentFolderId || undefined })}
        onCreateFolder={handleCreateFolder}
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
        onCopyLink={copyLink}
        onToggleFavorite={toggleFavorite}
        onToggleSelect={toggleSelectNote}
        onSelectAll={selectAllNotes}
        onBulkDelete={handleBulkDelete}
        onBulkPin={handleBulkPin}
        onClearSelection={handleClearSelection}
        onMoveToFolder={handleMoveToFolder}
        onRenameNote={handleRenameNote}
      />

      {/* Pagination */}
      {!isLoadingNotes && filteredNotes.length > 0 && (
        <div
          className="gba:absolute gba:bottom-0 gba:right-0 gba:left-0"
          style={!sidebar.isCollapsed ? { marginLeft: `${sidebar.width}px` } : undefined}
        >
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
          onOpenChange={setShareDialogOpen}
          noteId={noteToShare.id}
          noteTitle={noteToShare.title || t('title-untitled-note')}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={userInfo?.employeeDetails?.displayName}
          isOwner={noteToShare.ownerId === currentUserId || noteToShare.permission === 'owner'}
          sharedUsers={shareDialogSharedUsers}
          onShare={handleShareSubmit}
          onUnshare={handleUnshare}
          onRefreshShares={refreshShares}
        />
      )}
    </div>
  )
}

export default NoteAppsHub
