/**
 * SlidesAppsHub Component
 *
 * Main entry point for slide decks (presentations).
 * OneDrive-inspired design with sidebar navigation - matching DocumentAppsHub.
 */

import React, { useState, useCallback, useEffect } from 'react'
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
  Checkbox,
  Dialog,
  DialogContent
} from '@newwork/nw-design-system'
import {
  Presentation,
  Plus,
  Search,
  Users,
  Home,
  FolderClosed,
  MoreHorizontal,
  Copy,
  Trash2,
  ChevronLeft,
  Star,
  Clock,
  Archive,
  ArrowUpDown,
  LayoutGrid,
  List,
  Share2,
  Link2,
  Check,
  RefreshCw,
  User,
  AlertCircle,
  Database,
  Sparkles,
  Upload,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSlides } from './hooks/useSlides'
import {
  useSlidesHubUrlState,
  useSlidesHubFavorites,
  useSlidesHubFiltering,
  useSlidesHubUserLookup,
  type SlideHubSidebarSection,
  type SlideHubSortBy,
  type SlideHubSortOrder
} from './hooks'
import { SlideEditor, ShareSlideDialog, ManageSharesDialog, PowerPointUploader } from './components'
import { useHubPagination } from '../shared/hooks/useHubPagination'
import { HubPaginationFooter } from '../shared/components/HubPaginationFooter'
import type { SlideSummary } from './types'
import type { ParsedPowerPointDocument } from './hooks/usePowerPointParser'

export interface SlidesAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type ViewMode = 'grid' | 'list'
type HubView = 'list' | 'editor'

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Format date for display */
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

/** Format relative time */
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

export const SlidesAppsHub: React.FC<SlidesAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'slide-apps-hub'
}) => {
  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SlideHubSidebarSection>('my-slides')

  // Clear space return URL if not opened from a space
  useEffect(() => {
    try {
      const params = new URLSearchParams(globalThis.window.location.search)
      const spaceId = params.get('spaceId')
      if (!spaceId) {
        // Slide opened from hub, not from a space - clear any stale return URL
        sessionStorage.removeItem('space_return_url')
      }
    } catch (e) {
      console.warn('Failed to check/clear space_return_url:', e)
    }
  }, [])
  const [selectedSlides, setSelectedSlides] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SlideHubSortBy>('modified')
  const [sortOrder, setSortOrder] = useState<SlideHubSortOrder>('desc')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('slides-hub-sidebar-collapsed')
    return saved === 'true'
  })

  // Data state
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [slideForShare, setSlideForShare] = useState<string | null>(null)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [slideForManageShares, setSlideForManageShares] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Hooks
  const {
    slides,
    currentSlide,
    isLoading,
    error,
    loadSlide,
    createSlide,
    deleteSlide,
    duplicateSlide,
    shareSlide,
    clearCurrentSlide,
    refreshSlides
  } = useSlides(accessToken)

  const { favorites, setFavorites } = useSlidesHubFavorites()
  const { ownerInfoMap, sharedUsersMap, refreshSharedUsersForSlide } = useSlidesHubUserLookup({
    accessToken: accessToken || '',
    slides,
    currentUserId
  })
  const { filteredSlides, sharedSlides } = useSlidesHubFiltering({
    slides,
    activeSection,
    favorites,
    searchQuery,
    sortBy,
    sortOrder
  })

  const {
    paginatedItems: paginatedSlides,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    pageSize
  } = useHubPagination({ items: filteredSlides, pageSize: 20 })

  const { updateUrl, resetLoadAttempt } = useSlidesHubUrlState({
    currentView,
    currentSlideId: selectedSlideId,
    isLoadingSlide: isLoading,
    loadSlideById: loadSlide,
    setCurrentView,
    setSelectedSlideId,
    activeSection,
    setActiveSection
  })

  // Update URL whenever activeSection changes (when user clicks sidebar)
  useEffect(() => {
    if (currentView === 'list' && !selectedSlideId) {
      updateUrl(null)
    }
  }, [activeSection, currentView, selectedSlideId, updateUrl])

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('slides-hub-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  // Store access token for API service
  useEffect(() => {
    if (accessToken) {
      try {
        localStorage.setItem('business-app-ide-access-token', accessToken)
      } catch {
        // ignore
      }
    }
  }, [accessToken])

  /** Create new blank slide */
  const handleCreateNew = useCallback(async () => {
    const created = await createSlide({ title: 'Untitled Slide' })
    if (created) {
      setSelectedSlideId(created.id)
      setCurrentView('editor')
      updateUrl(created.id, 'editor')
      loadSlide(created.id)
    }
  }, [createSlide, loadSlide, updateUrl])

  /** Open a slide */
  const handleOpenSlide = useCallback(
    async (id: string) => {
      const slide = await loadSlide(id)
      if (slide) {
        setSelectedSlideId(id)
        setCurrentView('editor')
        updateUrl(id, 'editor')
      }
    },
    [loadSlide, updateUrl]
  )

  /** Go back to list or return URL */
  const handleBack = useCallback(() => {
    // Check if there's a space return URL in sessionStorage (takes priority)
    try {
      const spaceReturnUrl = sessionStorage.getItem('space_return_url')
      if (spaceReturnUrl) {
        sessionStorage.removeItem('space_return_url')
        globalThis.window.location.href = spaceReturnUrl
        return
      }
    } catch (e) {
      console.warn('Failed to read space_return_url from sessionStorage:', e)
    }

    // Fallback: Check if there's a returnUrl parameter
    const params = new URLSearchParams(globalThis.window.location.search)
    const returnUrl = params.get('returnUrl')

    if (returnUrl) {
      // Navigate back to the specified URL (e.g., space)
      globalThis.window.location.href = returnUrl
      return
    }

    // Otherwise, go back to the list view
    clearCurrentSlide()
    resetLoadAttempt()
    setSelectedSlideId(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentSlide, resetLoadAttempt, updateUrl])

  /** Delete slide */
  const handleDeleteSlide = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this slide?')) {
        const success = await deleteSlide(id)
        if (success && selectedSlideId === id) {
          setSelectedSlideId(null)
          setCurrentView('list')
          updateUrl(null)
        }
        setSelectedSlides(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [deleteSlide, selectedSlideId, updateUrl]
  )

  /** Duplicate slide */
  const handleDuplicateSlide = useCallback(
    async (id: string) => {
      const duplicated = await duplicateSlide(id)
      if (duplicated) {
        toast.success('Slide duplicated')
      }
    },
    [duplicateSlide]
  )

  /** Share slide click */
  const handleShareClick = useCallback((id: string) => {
    setSlideForShare(id)
    setShareDialogOpen(true)
  }, [])

  /** Manage shares click */
  const handleManageSharesClick = useCallback((id: string) => {
    setSlideForManageShares(id)
    setManageSharesDialogOpen(true)
  }, [])

  /** Toggle favorite */
  const toggleFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
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
    },
    [setFavorites]
  )

  /** Toggle select slide */
  const toggleSelectSlide = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedSlides(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /** Select all slides */
  const selectAllSlides = useCallback(() => {
    if (selectedSlides.size === filteredSlides.length) {
      setSelectedSlides(new Set())
    } else {
      setSelectedSlides(new Set(filteredSlides.map(s => s.id)))
    }
  }, [selectedSlides.size, filteredSlides])

  /** Copy link */
  const copyLink = useCallback((slide: SlideSummary) => {
    const url = new URL(window.location.href)
    url.searchParams.set('slideId', slide.id)
    url.searchParams.set('view', 'editor')
    navigator.clipboard.writeText(url.toString())
    toast.success('Link copied to clipboard')
  }, [])

  /** Handle PowerPoint import */
  const handlePowerPointImport = useCallback(
    async (parsedDoc: ParsedPowerPointDocument) => {
      try {
        // Create new slide with imported content
        const created = await createSlide({
          title: parsedDoc.fileName.replace('.pptx', ''),
          contentJson: {
            slides: parsedDoc.slides,
            themeId: 'corporate' // Default theme
          }
        })

        if (created) {
          setShowImportDialog(false)
          setSelectedSlideId(created.id)
          setCurrentView('editor')
          updateUrl(created.id, 'editor')
          loadSlide(created.id)
          toast.success(`Imported ${parsedDoc.slideCount} slides`)
        }
      } catch (err) {
        console.error('[SlidesAppsHub] Import error:', err)
        toast.error('Failed to import PowerPoint')
      }
    },
    [createSlide, loadSlide, updateUrl]
  )

  // Get section title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'home':
        return 'Home'
      case 'my-slides':
        return 'My Slides'
      case 'shared':
        return 'Shared with me'
      case 'favorites':
        return 'Favorites'
      case 'recent':
        return 'Recent'
      case 'archived':
        return 'Archived'
      default:
        return 'Slides'
    }
  }

  // Render editor view
  if (currentView === 'editor' && selectedSlideId && currentSlide) {
    return (
      <SlideEditor
        slideId={selectedSlideId}
        slide={currentSlide}
        accessToken={accessToken}
        userInfo={userInfo}
        onBack={handleBack}
        data-testid={`${testId}-editor`}
      />
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:bg-background" data-testid={testId}>
      {/* Sidebar */}
      <aside
        className={`gba:border-r gba:bg-card gba:flex gba:flex-col gba:flex-shrink-0 gba:transition-all gba:duration-300 ${isSidebarCollapsed ? 'gba:w-16' : 'gba:w-60'}`}
      >
        {/* Logo / Brand */}
        <div className={`gba:border-b ${isSidebarCollapsed ? 'gba:p-2' : 'gba:p-4'}`}>
          {/* Back button and collapse toggle row */}
          <div
            className={`gba:flex gba:items-center gba:mb-2 ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:justify-between'}`}
          >
            <TooltipProvider>
              {!isSidebarCollapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateTo('/platform/every-office')}
                      data-testid={`${testId}-back-to-desk`}
                    >
                      <ChevronLeft className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Desk</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    data-testid={`${testId}-toggle-sidebar`}
                  >
                    {isSidebarCollapsed ? (
                      <PanelLeft className="gba:w-4 gba:h-4" />
                    ) : (
                      <PanelLeftClose className="gba:w-4 gba:h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Brand section */}
          {!isSidebarCollapsed && (
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-orange-500 gba:to-pink-600 gba:flex gba:items-center gba:justify-center">
                <Presentation className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
              <div>
                <h1 className="gba:font-semibold gba:text-foreground">Slides</h1>
                <p className="gba:text-xs gba:text-muted-foreground">NEWWORK Apps</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:flex gba:justify-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-orange-500 gba:to-pink-600 gba:flex gba:items-center gba:justify-center">
                <Presentation className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
            </div>
          )}
        </div>

        {/* New Button */}
        <div className={isSidebarCollapsed ? 'gba:p-2' : 'gba:p-3'}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={`gba:w-full gba:gap-2 gba:bg-gradient-to-r gba:from-orange-500 gba:to-pink-600 gba:text-white hover:gba:from-orange-600 hover:gba:to-pink-700 ${isSidebarCollapsed ? 'gba:justify-center gba:px-0' : 'gba:justify-start'}`}
              >
                <Plus className="gba:w-4 gba:h-4" />
                {!isSidebarCollapsed && 'New'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
              <DropdownMenuItem onClick={handleCreateNew}>
                <Presentation className="gba:w-4 gba:h-4 gba:mr-2 gba:text-orange-500" />
                <div>
                  <div className="gba:font-medium">Blank Slide</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateNew}>
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
                <div>
                  <div className="gba:font-medium">From Template</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Choose a template</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
                <div>
                  <div className="gba:font-medium">Import PowerPoint</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Upload .pptx file</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="gba:flex-1 gba:overflow-y-auto gba:px-2 gba:py-2">
          <div className="gba:space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('home')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'home'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Home className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && 'Home'}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Home</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('my-slides')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'my-slides'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <FolderClosed className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && 'My Slides'}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">My Slides</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('shared')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'shared'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Users className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && (
                      <>
                        Shared with me
                        {sharedSlides.length > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {sharedSlides.length}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    Shared with me {sharedSlides.length > 0 && `(${sharedSlides.length})`}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('favorites')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'favorites'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Star className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && 'Favorites'}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Favorites</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('recent')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'recent'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Clock className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && 'Recent'}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Recent</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('archived')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'archived'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <Archive className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && 'Archived'}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">Archived</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>

          {!isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t">
              <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Storage</p>
              <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <Database className="gba:w-4 gba:h-4 gba:text-orange-500" />
                  <span className="gba:text-xs gba:text-muted-foreground">Cloud storage</span>
                </div>
                <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                  <div
                    className="gba:h-full gba:bg-gradient-to-r gba:from-orange-500 gba:to-pink-500 gba:rounded-full"
                    style={{ width: `${Math.min((slides.length / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">{slides.length} slides</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:flex gba:justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="gba:p-2">
                      <Database className="gba:w-4 gba:h-4 gba:text-orange-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <p className="gba:font-medium">Cloud storage</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{slides.length} slides</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
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
                {filteredSlides.length > 0 && (
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
                    <Button variant="ghost" size="sm" onClick={() => refreshSlides()}>
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
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Spinner size="lg" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="gba:p-6">
              <Card className="gba:p-6 gba:text-center">
                <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
                <p className="gba:text-destructive">{error}</p>
              </Card>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredSlides.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
              <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-orange-500/20 gba:to-pink-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                <Presentation className="gba:w-12 gba:h-12 gba:text-orange-500" />
              </div>
              <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                {activeSection === 'favorites'
                  ? 'No favorites yet'
                  : activeSection === 'shared'
                    ? 'Nothing shared with you'
                    : activeSection === 'archived'
                      ? 'No archived slides'
                      : 'No slides yet'}
              </h3>
              <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                {activeSection === 'favorites'
                  ? 'Star your frequently used slides to see them here.'
                  : activeSection === 'shared'
                    ? 'When someone shares a slide with you, it will appear here.'
                    : activeSection === 'archived'
                      ? 'Archived slides will appear here.'
                      : 'Create your first slide to get started.'}
              </p>
              {activeSection !== 'favorites' && activeSection !== 'shared' && activeSection !== 'archived' && (
                <Button onClick={handleCreateNew}>
                  <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                  Create Slide
                </Button>
              )}
            </div>
          )}

          {/* List View */}
          {!isLoading && filteredSlides.length > 0 && viewLayout === 'list' && (
            <div className="gba:w-full">
              {/* Table Header */}
              <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
                <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                  <div className="gba:w-8 gba:flex-shrink-0">
                    <Checkbox
                      checked={selectedSlides.size === paginatedSlides.length && paginatedSlides.length > 0}
                      onCheckedChange={selectAllSlides}
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
                    Name {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div
                    className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                    onClick={() => {
                      setSortBy('modified')
                      setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                    }}
                  >
                    Modified {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div className="gba:w-40 gba:flex-shrink-0">Owner</div>
                  <div
                    className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                    onClick={() => {
                      setSortBy('created')
                      setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                    }}
                  >
                    Created {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                  </div>
                  <div className="gba:w-10 gba:flex-shrink-0" />
                </div>
              </div>

              {/* Table Body */}
              <div className="gba:divide-y gba:divide-border">
                {paginatedSlides.map(slide => {
                  const isOwner = slide.isOwner || slide.permission === 'owner' || slide.createdBy === currentUserId
                  const isSelected = selectedSlides.has(slide.id)
                  const isFavorite = favorites.has(slide.id)
                  const ownerInfo = slide.createdBy ? ownerInfoMap.get(slide.createdBy) : undefined
                  const sharedWith = sharedUsersMap[slide.id] || []

                  return (
                    <div
                      key={slide.id}
                      className={`gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer ${
                        isSelected ? 'gba:bg-primary/5' : 'hover:gba:bg-muted/30'
                      }`}
                      onClick={() => handleOpenSlide(slide.id)}
                    >
                      {/* Checkbox */}
                      <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectSlide(slide.id)} />
                      </div>

                      {/* Star */}
                      <div className="gba:w-8 gba:flex-shrink-0">
                        <button
                          onClick={e => toggleFavorite(slide.id, e)}
                          className={`gba:p-1 gba:rounded hover:gba:bg-muted ${isFavorite ? 'gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                        >
                          <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Name & Icon */}
                      <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-3">
                        <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-orange-500/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                          <Presentation className="gba:w-5 gba:h-5 gba:text-orange-600" />
                        </div>
                        <div className="gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:font-medium gba:text-foreground gba:truncate">
                              {slide.title || 'Untitled'}
                            </span>
                            {slide.isShared && !isOwner && (
                              <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                Shared
                              </Badge>
                            )}
                            {isOwner && sharedWith.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleManageSharesClick(slide.id)
                                      }}
                                      className="gba:flex gba:items-center gba:-space-x-1 hover:gba:opacity-80 gba:transition-opacity gba:cursor-pointer"
                                    >
                                      {sharedWith.slice(0, 3).map(user => (
                                        <Avatar
                                          key={user.odataId || user.userId}
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
                                    </div>
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
                          {slide.description && (
                            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{slide.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Modified */}
                      <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                        {formatDate(slide.updatedAt)}
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
                        {formatDate(slide.createdAt)}
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
                            <DropdownMenuItem onClick={() => handleOpenSlide(slide.id)}>
                              <Presentation className="gba:w-4 gba:h-4 gba:mr-2" />
                              Open
                            </DropdownMenuItem>
                            {isOwner && (
                              <DropdownMenuItem onClick={() => handleShareClick(slide.id)}>
                                <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                Share
                              </DropdownMenuItem>
                            )}
                            {isOwner && sharedWith.length > 0 && (
                              <DropdownMenuItem onClick={() => handleManageSharesClick(slide.id)}>
                                <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                Manage sharing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyLink(slide)}>
                              <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateSlide(slide.id)}>
                              <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleFavorite(slide.id)}>
                              <Star
                                className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                              />
                              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isOwner && (
                              <DropdownMenuItem
                                className="gba:text-destructive"
                                onClick={() => handleDeleteSlide(slide.id)}
                              >
                                <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
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
          {!isLoading && filteredSlides.length > 0 && viewLayout === 'grid' && (
            <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
              {paginatedSlides.map(slide => {
                const isOwner = slide.isOwner || slide.permission === 'owner' || slide.createdBy === currentUserId
                const isSelected = selectedSlides.has(slide.id)
                const isFavorite = favorites.has(slide.id)

                return (
                  <Card
                    key={slide.id}
                    className={`gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg ${
                      isSelected ? 'gba:ring-2 gba:ring-primary' : ''
                    }`}
                    onClick={() => handleOpenSlide(slide.id)}
                  >
                    {/* Preview area */}
                    <div className="gba:relative gba:aspect-[16/10] gba:bg-gradient-to-br gba:from-orange-500/10 gba:to-pink-500/10 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                      <Presentation className="gba:w-16 gba:h-16 gba:text-orange-500/50" />

                      {/* Hover overlay */}
                      <div className="gba:absolute gba:inset-0 gba:bg-black/0 group-hover:gba:bg-black/5 gba:transition-colors gba:rounded-t-lg" />

                      {/* Selection checkbox */}
                      <div
                        className={`gba:absolute gba:top-2 gba:left-2 gba:opacity-0 group-hover:gba:opacity-100 ${isSelected ? 'gba:opacity-100' : ''} gba:transition-opacity`}
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectSlide(slide.id)}
                          className="gba:bg-background"
                        />
                      </div>

                      {/* Favorite star */}
                      <button
                        className={`gba:absolute gba:top-2 gba:right-2 gba:p-1.5 gba:rounded-full gba:bg-background/80 gba:backdrop-blur-sm gba:opacity-0 group-hover:gba:opacity-100 ${isFavorite ? 'gba:opacity-100 gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'} gba:transition-all`}
                        onClick={e => toggleFavorite(slide.id, e)}
                      >
                        <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                      </button>

                      {/* Shared badge */}
                      {slide.isShared && !isOwner && (
                        <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                          <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="gba:p-3">
                      <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                        {slide.title || 'Untitled'}
                      </h3>
                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                        <span>{formatRelativeTime(slide.updatedAt)}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredSlides.length > 0 && (
          <HubPaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={goToPage}
            data-testid={`${testId}-pagination`}
          />
        )}
      </main>

      {/* Share Slide Dialog */}
      {slideForShare && (
        <ShareSlideDialog
          open={shareDialogOpen}
          onOpenChange={open => {
            setShareDialogOpen(open)
            if (!open) setSlideForShare(null)
          }}
          slideId={slideForShare}
          slideTitle={slides.find(s => s.id === slideForShare)?.title || 'Untitled Slide'}
          currentUserId={currentUserId}
          currentUserName={userInfo?.displayName || userInfo?.employeeDetails?.displayName}
          accessToken={accessToken}
          shareSlide={shareSlide}
          onShareComplete={async () => {
            refreshSlides()
            await refreshSharedUsersForSlide(slideForShare)
          }}
          data-testid={`${testId}-share-dialog`}
        />
      )}

      {/* Manage Shares Dialog */}
      {slideForManageShares && (
        <ManageSharesDialog
          open={manageSharesDialogOpen}
          onOpenChange={open => {
            setManageSharesDialogOpen(open)
            if (!open) setSlideForManageShares(null)
          }}
          slideId={slideForManageShares}
          slideTitle={slides.find(s => s.id === slideForManageShares)?.title || 'Untitled Slide'}
          accessToken={accessToken}
          onSharesChanged={async () => {
            refreshSlides()
            await refreshSharedUsersForSlide(slideForManageShares)
          }}
          onAddMoreUsers={() => {
            setManageSharesDialogOpen(false)
            setSlideForShare(slideForManageShares)
            setShareDialogOpen(true)
          }}
          data-testid={`${testId}-manage-shares-dialog`}
        />
      )}

      {/* Import PowerPoint Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="gba:max-w-2xl">
          <PowerPointUploader
            onFileParsed={handlePowerPointImport}
            onCancel={() => setShowImportDialog(false)}
            onError={err => {
              console.error('[SlidesAppsHub] Import error:', err)
              toast.error(err)
            }}
            data-testid={`${testId}-import-uploader`}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SlidesAppsHub
