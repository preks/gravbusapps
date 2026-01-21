/**
 * NoteAppsHub Component
 *
 * The main entry point for the Notes application.
 * Modern OneDrive-inspired design with sidebar navigation.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Card,
  Button,
  Input,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Checkbox
} from '@newwork/nw-design-system'
import {
  StickyNote,
  Plus,
  Search,
  List,
  Pin,
  Archive,
  Users,
  Sparkles,
  FileText,
  MoreHorizontal,
  Star,
  Clock,
  Trash2,
  Home,
  FolderClosed,
  ArrowUpDown,
  Check,
  RefreshCw,
  Copy,
  Share2,
  Link2,
  User,
  LayoutGrid,
  ChevronLeft
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'

// Components
import { type SharedUserInfo } from './components/NotePreviewCard'
import { NoteEditor } from './NoteEditor'
import { ShareNoteDialog, type SharedNoteUser } from './components/ShareNoteDialog'

// Hooks
import { useNotes } from './hooks/useNotes'

// GraphQL
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

// Services
import { NoteApiService } from './services/NoteApiService'

// Types
import type { NoteSummary, CreateNoteInput, NoteColor } from './types'

export interface NoteAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'editor'
type SidebarSection = 'home' | 'my-notes' | 'shared' | 'pinned' | 'recent' | 'archived'

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format date for table display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * NoteAppsHub Component
 */
export const NoteAppsHub: React.FC<NoteAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'note-apps-hub'
}) => {
  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-notes')
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('note-favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Data state
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [sharedUsersMap] = useState<Record<string, SharedUserInfo[]>>({})
  const [ownerInfoMap, setOwnerInfoMap] = useState<Map<string, { name: string; avatar?: string }>>(new Map())

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [noteToShare, setNoteToShare] = useState<NoteSummary | null>(null)
  const [shareDialogSharedUsers, setShareDialogSharedUsers] = useState<SharedNoteUser[]>([])

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // URL helpers for deep linking
  const getUrlParams = useCallback((): { noteId: string | null; view: HubView | null } => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      noteId: urlParams.get('noteId'),
      view: urlParams.get('view') as HubView | null
    }
  }, [])

  const updateUrl = useCallback((noteId: string | null, view?: HubView) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (noteId) {
      urlParams.set('noteId', noteId)
      if (view) urlParams.set('view', view)
    } else {
      urlParams.delete('noteId')
      urlParams.delete('view')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({ noteId, view }, '', newUrl)
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
    archiveNote,
    clearCurrentNote,
    refreshNotes,
    shareNote,
    getSharedUsers
  } = useNotes({ accessToken, userId: currentUserId })

  // GraphQL client for fetching user info
  const graphqlClient = useGraphQLClient(accessToken)

  // Track which note ID we've attempted to load
  const loadAttemptedRef = useRef<string | null>(null)

  // Load note from URL on mount
  useEffect(() => {
    const { noteId, view } = getUrlParams()
    if (noteId && !currentNote && !isLoadingNotes && loadAttemptedRef.current !== noteId) {
      loadAttemptedRef.current = noteId
      loadNote(noteId).then(note => {
        if (note) {
          setSelectedNoteId(noteId)
          setCurrentView(view === 'editor' ? 'editor' : 'editor')
        }
      })
    }
  }, [getUrlParams, loadNote, currentNote, isLoadingNotes])

  // Track if we came from desk
  const cameFromDeskRef = useRef(false)
  useEffect(() => {
    const referrer = document.referrer
    const urlParams = new URLSearchParams(window.location.search)
    cameFromDeskRef.current =
      referrer.includes('/platform/apps/desk') ||
      referrer.includes('?app=platform/apps/desk') ||
      urlParams.get('from') === 'desk'

    // Push state to track navigation from desk
    if (cameFromDeskRef.current && currentView === 'list') {
      window.history.replaceState({ fromDesk: true }, '', window.location.href)
    }
  }, [currentView])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { noteId?: string; view?: HubView; fromDesk?: boolean } | null

      // If we came from desk and there's no note, go back to desk
      if (state?.fromDesk && !state?.noteId && currentView === 'list') {
        navigateTo('/platform/apps/desk')
        return
      }

      if (state?.noteId) {
        loadNote(state.noteId).then(note => {
          if (note) {
            setSelectedNoteId(state.noteId!)
            setCurrentView(state.view || 'editor')
          }
        })
      } else {
        setSelectedNoteId(null)
        setCurrentView('list')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [loadNote, currentView])

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('note-favorites', JSON.stringify(Array.from(favorites)))
  }, [favorites])

  // Fetch owner info for notes - match spreadsheet pattern
  const loadingOwnerInfoRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!graphqlClient) return

    const loadOwnerInfo = async () => {
      for (const note of notes) {
        const ownerId = note.ownerId
        if (!ownerId || ownerInfoMap.has(ownerId) || loadingOwnerInfoRef.current.has(ownerId)) continue
        loadingOwnerInfoRef.current.add(ownerId)

        try {
          const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(ownerId)
          const result = await graphqlClient.request<{
            Employee: Array<{ displayName: string; pictureThumbnail?: string }>
          }>(query)
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
        } catch {
          // Ignore errors - just show fallback
          setOwnerInfoMap(prev =>
            new Map(prev).set(ownerId, {
              name: `User ${ownerId.slice(0, 8)}`
            })
          )
        } finally {
          loadingOwnerInfoRef.current.delete(ownerId)
        }
      }
    }

    loadOwnerInfo()
  }, [notes, graphqlClient, ownerInfoMap])

  // Separate notes into categories
  const { myNotes, sharedNotes, pinnedNotes, archivedNotes, recentNotes } = useMemo(() => {
    const my: NoteSummary[] = []
    const shared: NoteSummary[] = []
    const pinned: NoteSummary[] = []
    const archived: NoteSummary[] = []
    const recent: NoteSummary[] = []

    // Sort by updatedAt for recent
    const sortedByDate = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recentSet = new Set(sortedByDate.slice(0, 10).map(n => n.id))

    notes.forEach(note => {
      if (note.isArchived) {
        archived.push(note)
        return
      }
      if (note.isPinned) {
        pinned.push(note)
      }
      if (recentSet.has(note.id)) {
        recent.push(note)
      }
      const isSharedWithMe = note.isShared === true || (note.ownerId !== currentUserId && note.permission !== 'owner')
      if (isSharedWithMe) {
        shared.push(note)
      } else {
        my.push(note)
      }
    })

    return { myNotes: my, sharedNotes: shared, pinnedNotes: pinned, archivedNotes: archived, recentNotes: recent }
  }, [notes, currentUserId])

  // Filter and sort notes based on current section
  const filteredNotes = useMemo(() => {
    let baseNotes: NoteSummary[] = []

    switch (activeSection) {
      case 'home':
        baseNotes = [...myNotes, ...sharedNotes]
        break
      case 'pinned':
        baseNotes = pinnedNotes
        break
      case 'shared':
        baseNotes = sharedNotes
        break
      case 'archived':
        baseNotes = archivedNotes
        break
      case 'recent':
        baseNotes = recentNotes
        break
      default:
        baseNotes = myNotes
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      baseNotes = baseNotes.filter(
        note =>
          note.title?.toLowerCase().includes(query) ||
          note.preview?.toLowerCase().includes(query) ||
          note.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Sort
    baseNotes.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.title || '').localeCompare(b.title || '')
          break
        case 'modified':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case 'created':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
      }
      return sortOrder === 'asc' ? -comparison : comparison
    })

    return baseNotes
  }, [myNotes, sharedNotes, pinnedNotes, archivedNotes, recentNotes, activeSection, searchQuery, sortBy, sortOrder])

  /**
   * Create new note
   */
  const handleCreateNew = useCallback(
    async (options?: { color?: NoteColor }) => {
      const input: CreateNoteInput = {
        title: '',
        content: '<p></p>',
        color: options?.color
      }

      const newNote = await createNote(input)

      if (newNote) {
        setSelectedNoteId(newNote.id)
        setCurrentView('editor')
        updateUrl(newNote.id, 'editor')
      }
    },
    [createNote, updateUrl]
  )

  /**
   * Open a note
   */
  const handleOpenNote = useCallback(
    async (id: string) => {
      const note = await loadNote(id)
      if (note) {
        setSelectedNoteId(id)
        setCurrentView('editor')
        updateUrl(id, 'editor')
      }
    },
    [loadNote, updateUrl]
  )

  /**
   * Handle delete note
   */
  const handleDeleteNote = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this note?')) {
        const success = await deleteNote(id)
        if (success && selectedNoteId === id) {
          setSelectedNoteId(null)
          setCurrentView('list')
          updateUrl(null)
        }
      }
    },
    [deleteNote, selectedNoteId, updateUrl]
  )

  /**
   * Handle duplicate note
   */
  const handleDuplicateNote = useCallback(
    async (id: string) => {
      await duplicateNote(id)
      toast.success('Note duplicated')
    },
    [duplicateNote]
  )

  /**
   * Handle toggle pin
   */
  const handleTogglePin = useCallback(
    async (id: string) => {
      const success = await togglePin(id)
      if (success) {
        const note = notes.find(n => n.id === id)
        toast.success(note?.isPinned ? 'Note unpinned' : 'Note pinned')
      }
    },
    [togglePin, notes]
  )

  /**
   * Handle archive note
   */
  const handleArchiveNote = useCallback(
    async (id: string) => {
      const success = await archiveNote(id)
      if (success) {
        toast.success('Note archived')
        if (selectedNoteId === id) {
          setSelectedNoteId(null)
          setCurrentView('list')
        }
      }
    },
    [archiveNote, selectedNoteId]
  )

  /**
   * Go back to list
   */
  const handleBack = useCallback(() => {
    clearCurrentNote()
    loadAttemptedRef.current = null
    setSelectedNoteId(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentNote, updateUrl])

  /**
   * Toggle favorite
   */
  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.success('Removed from favorites')
      } else {
        next.add(id)
        toast.success('Added to favorites')
      }
      return next
    })
  }, [])

  /**
   * Toggle select note
   */
  const toggleSelectNote = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * Select all notes
   */
  const selectAllNotes = useCallback(() => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set())
    } else {
      setSelectedNotes(new Set(filteredNotes.map(n => n.id)))
    }
  }, [selectedNotes.size, filteredNotes])

  /**
   * Copy link
   */
  const copyLink = useCallback((note: NoteSummary) => {
    const url = new URL(window.location.href)
    url.searchParams.set('noteId', note.id)
    url.searchParams.set('view', 'editor')
    navigator.clipboard.writeText(url.toString())
    toast.success('Link copied to clipboard')
  }, [])

  /**
   * Handle share note - open dialog
   */
  const handleShareNote = useCallback(
    async (id: string) => {
      const note = notes.find(n => n.id === id)
      if (!note) return

      setNoteToShare(note)

      // Load shared users for this note
      try {
        const sharedUsers = await getSharedUsers(id)
        setShareDialogSharedUsers(sharedUsers || [])
      } catch (err) {
        console.error('Failed to load shared users:', err)
        setShareDialogSharedUsers([])
      }

      setShareDialogOpen(true)
    },
    [notes, getSharedUsers]
  )

  /**
   * Handle share submission
   */
  const handleShareSubmit = useCallback(
    async (userIds: string[], permission: 'view' | 'edit' | 'comment') => {
      if (!noteToShare) return false
      const success = await shareNote(
        noteToShare.id,
        userIds.map(userId => ({ userId, permission }))
      )
      return success
    },
    [noteToShare, shareNote]
  )

  /**
   * Handle unshare
   */
  const handleUnshare = useCallback(
    async (userId: string, shareId?: string) => {
      if (!noteToShare || !accessToken) return false
      try {
        await NoteApiService.revokeShareById(accessToken, noteToShare.id, shareId || userId)
        return true
      } catch (err) {
        console.error('Failed to unshare:', err)
        return false
      }
    },
    [noteToShare, accessToken]
  )

  /**
   * Refresh shares for dialog
   */
  const refreshShares = useCallback(async () => {
    if (!noteToShare) return
    try {
      const sharedUsers = await getSharedUsers(noteToShare.id)
      setShareDialogSharedUsers(sharedUsers || [])
    } catch (err) {
      console.error('Failed to refresh shares:', err)
    }
  }, [noteToShare, getSharedUsers])

  // Keyboard shortcut for new note
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateNew()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreateNew])

  // Get section title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'home':
        return 'Home'
      case 'my-notes':
        return 'My Notes'
      case 'shared':
        return 'Shared with me'
      case 'pinned':
        return 'Pinned'
      case 'recent':
        return 'Recent'
      case 'archived':
        return 'Archived'
      default:
        return 'Notes'
    }
  }

  // Render editor view
  if (currentView === 'editor' && currentNote) {
    // IMPORTANT: Default to 'owner' if permission is null/undefined (means user owns the note)
    const effectivePermission = currentNotePermission || 'owner'
    const canEdit = effectivePermission === 'owner' || effectivePermission === 'edit'
    const isOwner = currentNote.ownerId === currentUserId || effectivePermission === 'owner'

    console.log('[NoteAppsHub] Editor permissions:', {
      currentNotePermission,
      effectivePermission,
      canEdit,
      isOwner,
      noteOwnerId: currentNote.ownerId,
      currentUserId
    })

    return (
      <NoteEditor
        note={currentNote}
        onSave={async (title, content, contentJson) => {
          await updateNote(currentNote.id, { title, content, contentJson })
        }}
        onBack={handleBack}
        onTogglePin={() => handleTogglePin(currentNote.id)}
        onArchive={() => handleArchiveNote(currentNote.id)}
        onDelete={() => handleDeleteNote(currentNote.id)}
        onShare={isOwner ? () => handleShareNote(currentNote.id) : undefined}
        onDuplicate={() => handleDuplicateNote(currentNote.id)}
        isReadOnly={!canEdit}
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid={`${testId}-editor`}
      />
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <aside className="gba:w-60 gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0">
        {/* Logo / Brand */}
        <div className="gba:p-4 gba:border-b">
          {/* Back button row */}
          <button
            onClick={() => navigateTo('/platform/apps/platform/apps/desk')}
            className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:mb-3"
          >
            <ChevronLeft className="gba:w-4 gba:h-4" />
            <span>Back to Desk</span>
          </button>

          {/* Existing brand section */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-amber-500 gba:to-orange-600 gba:flex gba:items-center gba:justify-center">
              <StickyNote className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:font-semibold gba:text-foreground">Notes</h1>
              <p className="gba:text-xs gba:text-muted-foreground">NEWWORK Apps</p>
            </div>
          </div>
        </div>

        {/* New Button */}
        <div className="gba:p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gba:w-full gba:justify-start gba:gap-2 gba:bg-gradient-to-r gba:from-amber-500 gba:to-orange-600 gba:text-white hover:gba:from-amber-600 hover:gba:to-orange-700">
                <Plus className="gba:w-4 gba:h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
              <DropdownMenuItem onClick={() => handleCreateNew()}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-amber-500" />
                <div>
                  <div className="gba:font-medium">Blank Note</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateNew({ color: 'yellow' })}>
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
                <div>
                  <div className="gba:font-medium">From Template</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Choose a template</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2">
          <div className="gba:space-y-1">
            <button
              onClick={() => setActiveSection('home')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'home'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Home className="gba:w-4 gba:h-4" />
              Home
            </button>

            <button
              onClick={() => setActiveSection('my-notes')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'my-notes'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <FolderClosed className="gba:w-4 gba:h-4" />
              My Notes
            </button>

            <button
              onClick={() => setActiveSection('shared')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'shared'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Users className="gba:w-4 gba:h-4" />
              Shared with me
              {sharedNotes.length > 0 && (
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {sharedNotes.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveSection('pinned')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'pinned'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Pin className="gba:w-4 gba:h-4" />
              Pinned
              {pinnedNotes.length > 0 && (
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {pinnedNotes.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveSection('recent')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'recent'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Clock className="gba:w-4 gba:h-4" />
              Recent
            </button>

            <button
              onClick={() => setActiveSection('archived')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'archived'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Archive className="gba:w-4 gba:h-4" />
              Archived
            </button>
          </div>

          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Summary</p>
            <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <StickyNote className="gba:w-4 gba:h-4 gba:text-amber-500" />
                <span className="gba:text-xs gba:text-muted-foreground">Real-time collaboration</span>
              </div>
              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                <div
                  className="gba:h-full gba:bg-gradient-to-r gba:from-amber-500 gba:to-orange-500 gba:rounded-full"
                  style={{ width: `${Math.min((notes.length / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">{notes.length} notes</p>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:overflow-hidden">
        {/* Header */}
        <header className="gba:border-b gba:bg-card">
          <div className="gba:px-6 gba:py-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-4">
                <h2 className="gba:text-xl gba:font-semibold">{getSectionTitle()}</h2>
                {filteredNotes.length > 0 && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gba:gap-1">
                          <ArrowUpDown className="gba:w-4 gba:h-4" />
                          Sort
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy('name')
                            setSortOrder('asc')
                          }}
                        >
                          {sortBy === 'name' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                          Name
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy('modified')
                            setSortOrder('desc')
                          }}
                        >
                          {sortBy === 'modified' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                          Modified
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSortBy('created')
                            setSortOrder('desc')
                          }}
                        >
                          {sortBy === 'created' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                          Created
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="sm" onClick={() => refreshNotes()}>
                      <RefreshCw className="gba:w-4 gba:h-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:relative">
                  <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="gba:pl-9 gba:w-64 gba:h-9"
                  />
                </div>
                <div className="gba:flex gba:items-center gba:border gba:rounded-md">
                  <Button
                    variant={viewLayout === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewLayout('list')}
                    className="gba:rounded-r-none"
                  >
                    <List className="gba:w-4 gba:h-4" />
                  </Button>
                  <Button
                    variant={viewLayout === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewLayout('grid')}
                    className="gba:rounded-l-none"
                  >
                    <LayoutGrid className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="gba:flex-1 gba:overflow-auto">
          {/* Loading state */}
          {isLoadingNotes && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Spinner size="lg" />
            </div>
          )}

          {/* Error state */}
          {notesError && (
            <div className="gba:p-6">
              <Card className="gba:p-6 gba:text-center">
                <p className="gba:text-destructive">{notesError}</p>
              </Card>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingNotes && !notesError && filteredNotes.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
              <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-amber-500/20 gba:to-orange-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                <StickyNote className="gba:w-12 gba:h-12 gba:text-amber-500" />
              </div>
              <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                {activeSection === 'pinned'
                  ? 'No pinned notes'
                  : activeSection === 'shared'
                    ? 'Nothing shared with you'
                    : activeSection === 'archived'
                      ? 'No archived notes'
                      : 'No notes yet'}
              </h3>
              <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                {activeSection === 'pinned'
                  ? 'Pin your important notes to access them quickly.'
                  : activeSection === 'shared'
                    ? 'When someone shares a note with you, it will appear here.'
                    : activeSection === 'archived'
                      ? 'Archived notes will appear here.'
                      : 'Create your first note to get started.'}
              </p>
              {activeSection !== 'pinned' && activeSection !== 'shared' && activeSection !== 'archived' && (
                <Button onClick={() => handleCreateNew()}>
                  <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Create Note
                </Button>
              )}
            </div>
          )}

          {/* List View */}
          {!isLoadingNotes && filteredNotes.length > 0 && viewLayout === 'list' && (
            <div className="gba:w-full">
              {/* Table Header */}
              <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
                <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                  <div className="gba:w-8 gba:flex-shrink-0">
                    <Checkbox
                      checked={selectedNotes.size === filteredNotes.length && filteredNotes.length > 0}
                      onCheckedChange={selectAllNotes}
                    />
                  </div>
                  <div className="gba:w-8 gba:flex-shrink-0" />
                  <div
                    className="gba:flex-1 gba:min-w-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                    onClick={() => {
                      setSortBy('name')
                      setSortOrder(sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                  >
                    Name
                    {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div
                    className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                    onClick={() => {
                      setSortBy('modified')
                      setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                    }}
                  >
                    Modified
                    {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div className="gba:w-40 gba:flex-shrink-0">Owner</div>
                  <div
                    className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                    onClick={() => {
                      setSortBy('created')
                      setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                    }}
                  >
                    Created
                    {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div className="gba:w-10 gba:flex-shrink-0" />
                </div>
              </div>

              {/* Table Body */}
              <div className="gba:divide-y gba:divide-border">
                {filteredNotes.map(note => {
                  const isOwner = note.ownerId === currentUserId || note.permission === 'owner'
                  const isSelected = selectedNotes.has(note.id)
                  const isFavorite = favorites.has(note.id)
                  const ownerInfo = note.ownerId ? ownerInfoMap.get(note.ownerId) : undefined
                  const sharedWith = sharedUsersMap[note.id] || []

                  return (
                    <div
                      key={note.id}
                      className={`gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer ${
                        isSelected ? 'gba:bg-primary/5' : 'hover:gba:bg-muted/30'
                      }`}
                      onClick={() => handleOpenNote(note.id)}
                    >
                      {/* Checkbox */}
                      <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectNote(note.id)} />
                      </div>

                      {/* Star */}
                      <div className="gba:w-8 gba:flex-shrink-0">
                        <button
                          onClick={e => toggleFavorite(note.id, e)}
                          className={`gba:p-1 gba:rounded hover:gba:bg-muted ${isFavorite ? 'gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                        >
                          <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Name & Icon */}
                      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-3">
                        <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-amber-500/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          <span className="gba:text-lg">{note.icon || '📝'}</span>
                        </div>
                        <div className="gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:font-medium gba:text-foreground gba:truncate">
                              {note.title || 'Untitled'}
                            </span>
                            {note.isPinned && <Pin className="gba:w-3 gba:h-3 gba:text-amber-500" />}
                            {note.isShared && !isOwner && (
                              <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                Shared
                              </Badge>
                            )}
                            {isOwner && sharedWith.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleShareNote(note.id)
                                      }}
                                      className="gba:flex gba:items-center gba:-space-x-1 hover:gba:opacity-80 gba:transition-opacity"
                                    >
                                      {sharedWith.slice(0, 3).map(user => (
                                        <Avatar
                                          key={user.userId}
                                          className="gba:w-5 gba:h-5 gba:border gba:border-background"
                                        >
                                          {user.userAvatar && <AvatarImage src={user.userAvatar} />}
                                          <AvatarFallback className="gba:text-[8px] gba:bg-muted">
                                            {user.userName ? getInitials(user.userName) : '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {sharedWith.length > 3 && (
                                        <div className="gba:w-5 gba:h-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-[8px] gba:border gba:border-background">
                                          +{sharedWith.length - 3}
                                        </div>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Shared with {sharedWith.length} {sharedWith.length === 1 ? 'person' : 'people'}
                                    </p>
                                    <p className="gba:text-xs gba:text-muted-foreground">Click to manage</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {note.preview && (
                            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{note.preview}</p>
                          )}
                        </div>
                      </div>

                      {/* Modified */}
                      <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </div>

                      {/* Owner */}
                      <div className="gba:w-40 gba:flex-shrink-0">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:w-6 gba:h-6">
                            {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                            <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                              {ownerInfo?.name ? getInitials(ownerInfo.name) : <User className="gba:w-3 gba:h-3" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                            {isOwner ? 'You' : ownerInfo?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Created */}
                      <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                        {formatDate(note.createdAt)}
                      </div>

                      {/* Actions */}
                      <div
                        className="gba:w-10 gba:flex-shrink-0 gba:flex gba:justify-end"
                        onClick={e => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
                              <MoreHorizontal className="gba:w-4 gba:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenNote(note.id)}>
                              <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                              Open
                            </DropdownMenuItem>
                            {isOwner && (
                              <DropdownMenuItem onClick={() => handleShareNote(note.id)}>
                                <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                Share
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyLink(note)}>
                              <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateNote(note.id)}>
                              <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleTogglePin(note.id)}>
                              <Pin
                                className={`gba:w-4 gba:h-4 gba:mr-2 ${note.isPinned ? 'gba:fill-current gba:text-amber-500' : ''}`}
                              />
                              {note.isPinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(note.id)}>
                              <Star
                                className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                              />
                              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveNote(note.id)}>
                              <Archive className="gba:w-4 gba:h-4 gba:mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gba:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grid View */}
          {!isLoadingNotes && filteredNotes.length > 0 && viewLayout === 'grid' && (
            <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
              {filteredNotes.map(note => {
                const isOwner = note.ownerId === currentUserId || note.permission === 'owner'
                const isSelected = selectedNotes.has(note.id)
                const isFavorite = favorites.has(note.id)

                return (
                  <Card
                    key={note.id}
                    className={`gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg ${
                      isSelected ? 'gba:ring-2 gba:ring-primary' : ''
                    }`}
                    onClick={() => handleOpenNote(note.id)}
                  >
                    {/* Preview area */}
                    <div className="gba:relative gba:aspect-[4/3] gba:bg-gradient-to-br gba:from-amber-500/10 gba:to-orange-500/10 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                      <span className="gba:text-4xl">{note.icon || '📝'}</span>

                      {/* Hover overlay */}
                      <div className="gba:absolute gba:inset-0 gba:bg-black/0 group-hover:gba:bg-black/5 gba:transition-colors gba:rounded-t-lg" />

                      {/* Selection checkbox */}
                      <div
                        className={`gba:absolute gba:top-2 gba:left-2 gba:opacity-0 group-hover:gba:opacity-100 ${isSelected ? 'gba:opacity-100' : ''} gba:transition-opacity`}
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectNote(note.id)}
                          className="gba:bg-background"
                        />
                      </div>

                      {/* Favorite star */}
                      <button
                        className={`gba:absolute gba:top-2 gba:right-2 gba:p-1.5 gba:rounded-full gba:bg-background/80 gba:backdrop-blur-sm gba:opacity-0 group-hover:gba:opacity-100 ${isFavorite ? 'gba:opacity-100 gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'} gba:transition-all`}
                        onClick={e => toggleFavorite(note.id, e)}
                      >
                        <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                      </button>

                      {/* Pinned badge */}
                      {note.isPinned && (
                        <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                          <Pin className="gba:w-3 gba:h-3 gba:mr-1" />
                          Pinned
                        </Badge>
                      )}

                      {/* Shared badge */}
                      {note.isShared && !isOwner && (
                        <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                          <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="gba:p-3">
                      <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                        {note.title || 'Untitled'}
                      </h3>
                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                        <span>{formatRelativeTime(note.updatedAt)}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Share Dialog */}
      {noteToShare && (
        <ShareNoteDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          noteId={noteToShare.id}
          noteTitle={noteToShare.title || 'Untitled Note'}
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
