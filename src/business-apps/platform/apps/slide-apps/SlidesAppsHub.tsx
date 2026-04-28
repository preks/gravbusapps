/**
 * SlidesAppsHub Component
 *
 * Main entry point for slide decks (presentations).
 * Hero-based layout with section tabs replacing the sidebar.
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
  DialogContent,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Presentation,
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Copy,
  Trash2,
  Star,
  ArrowUpDown,
  LayoutGrid,
  List,
  Share2,
  Link2,
  RefreshCw,
  User,
  AlertCircle,
  Sparkles,
  Upload,
  SortAsc,
  SortDesc,
  X,
  RotateCcw
  // Wand2 — re-enable when "Generate with AI" menu item is restored
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { sanitizeSameOriginReturnUrl } from '@/common/utils/safeUrlUtils'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'
import {
  OfficeTrashListTable,
  OfficeTrashListToolbar,
  useOfficeTrashList
} from '@/business-apps/platform/apps/shared/components/OfficeTrashList'
import { PermanentDeleteConfirmDialog } from '@/business-apps/platform/apps/shared/components/PermanentDeleteConfirmDialog'
import { SlidesHero } from './components/SlidesHero'
import type { SlideSection } from './components/SlidesHero'
import { useSlides } from './hooks/useSlides'
import { useSlidesHubUrlState, useSlidesHubFavorites, useSlidesHubFiltering, useSlidesHubUserLookup } from './hooks'
import type { SlideHubSidebarSection, SlideHubSortBy, SlideHubSortOrder } from './hooks/useSlidesHubFiltering'
import {
  SlideEditor,
  ShareSlideDialog,
  ManageSharesDialog,
  PowerPointUploader,
  TemplateBrowserDialog,
  CastReceiver,
  GeneratePresentationDialogChat,
  TrashedSlideReadonlyDialog
} from './components'
import type { SlideData } from './components/slideElements'
import { useHubPagination } from '../shared/hooks/useHubPagination'
import { HubPaginationFooter } from '../shared/components/HubPaginationFooter'
import type { SlideSummary } from './types'
import type { ParsedPowerPointDocument } from './hooks/usePowerPointParser'
import { normalizeImportedSlideMedia } from './hooks/pptxImport'
import type { NormalizeImportedMediaProgress } from './hooks/pptxImport/normalizeImportedMedia'
import type { PptxImportProgressState } from './hooks/pptxImport/importProgress'
import {
  createImageUploadImportProgress,
  createPreparingImportProgress,
  createVideoProcessingImportProgress,
  ensureMonotonicImportProgress
} from './hooks/pptxImport/importProgress'
import {
  createMediaFailurePlaceholderDataUrl,
  DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT
} from './hooks/pptxImport/mediaHosting'
import translations from './_i18n'

export interface SlidesAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type ViewMode = 'grid' | 'list'
type HubView = 'list' | 'editor' | 'trash'

/** Get initials from a name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Format date for display - uses t for relative time strings */
function createFormatDate(t: (key: string, vars?: Record<string, unknown>) => string) {
  return (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    if (diffDays === 1) return t('time-yesterday')
    if (diffDays < 7) return t('time-days-ago', { count: diffDays })
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

/** Format relative time - uses t for labels */
function createFormatRelativeTime(t: (key: string, vars?: Record<string, unknown>) => string) {
  return (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('time-just-now')
    if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
    if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
    if (diffDays < 7) return t('time-days-short-ago', { count: diffDays })
    return date.toLocaleDateString()
  }
}

export const SlidesAppsHub: React.FC<SlidesAppsHubProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'slide-apps-hub'
}) => {
  const { t } = useTranslation(translations)
  const formatDate = createFormatDate(t)
  const formatRelativeTime = createFormatRelativeTime(t)

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [trashSearchQuery, setTrashSearchQuery] = useState('')
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set())
  const [bulkDeleteTrashOpen, setBulkDeleteTrashOpen] = useState(false)
  const [isBulkDeletingTrash, setIsBulkDeletingTrash] = useState(false)
  const [isBulkRestoringTrash, setIsBulkRestoringTrash] = useState(false)
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

  // Data state
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [slideForShare, setSlideForShare] = useState<string | null>(null)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [slideForManageShares, setSlideForManageShares] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [powerPointImportProgress, setPowerPointImportProgress] = useState<PptxImportProgressState | null>(null)
  const [showTemplateBrowserDialog, setShowTemplateBrowserDialog] = useState(false)
  const [showGenerateDialogChat, setShowGenerateDialogChat] = useState(false)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [isMovingToTrash, setIsMovingToTrash] = useState(false)
  const [isRestoringTrashedSlide, setIsRestoringTrashedSlide] = useState(false)
  const [pendingTrashSlides, setPendingTrashSlides] = useState<Array<{ id: string; name: string }>>([])
  const [pendingTemplateSlides, setPendingTemplateSlides] = useState<{
    slides: SlideData[]
    themeId: string
  } | null>(null)

  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Hooks
  const {
    slides,
    currentSlide,
    isLoading,
    error,
    loadSlide,
    loadTrashedSlide,
    createSlide,
    importSlide,
    deleteSlide,
    duplicateSlide,
    shareSlide,
    clearCurrentSlide,
    refreshSlides
  } = useSlides(accessToken)

  const trashList = useOfficeTrashList({
    accessToken: accessToken ?? '',
    entityType: 'slide',
    searchQuery: trashSearchQuery,
    enabled: currentView === 'list' && activeSection === 'trash',
    defaultSortBy: 'trashedAt',
    defaultSortOrder: 'desc',
    onItemsChanged: () => {
      void refreshSlides()
    }
  })

  const handleToggleTrashSelect = useCallback((id: string) => {
    setSelectedTrashIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAllTrash = useCallback(() => {
    const allIds = trashList.sortedItems.map(i => i.id)
    setSelectedTrashIds(prev => (prev.size === allIds.length && allIds.length > 0 ? new Set() : new Set(allIds)))
  }, [trashList.sortedItems])

  const handleBulkRestoreTrash = useCallback(async () => {
    if (!accessToken || selectedTrashIds.size === 0) return
    const toRestore = trashList.sortedItems.filter(item => selectedTrashIds.has(item.id))
    setIsBulkRestoringTrash(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems(toRestore.map(item => ({ entityType: item.type, entityId: item.id })))
      toast.success(`${toRestore.length} item${toRestore.length === 1 ? '' : 's'} restored`)
      setSelectedTrashIds(new Set())
      await trashList.refresh()
      void refreshSlides()
    } catch (error) {
      console.error('[SlidesAppsHub] Failed to bulk restore trash items:', error)
      toast.error('Failed to restore some items')
    } finally {
      setIsBulkRestoringTrash(false)
    }
  }, [accessToken, refreshSlides, selectedTrashIds, trashList])

  const handleBulkDeleteTrash = useCallback(async () => {
    if (!accessToken || selectedTrashIds.size === 0) return
    const toDelete = trashList.sortedItems.filter(item => selectedTrashIds.has(item.id))
    setIsBulkDeletingTrash(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      for (const item of toDelete) {
        await DriveApiService.deleteTrashedItem(item.type, item.id)
      }
      toast.success(`${toDelete.length} item${toDelete.length === 1 ? '' : 's'} deleted permanently`)
      setSelectedTrashIds(new Set())
      await trashList.refresh()
      void refreshSlides()
    } catch (error) {
      console.error('[SlidesAppsHub] Failed to bulk delete trash items:', error)
      toast.error('Failed to delete some items permanently')
    } finally {
      setIsBulkDeletingTrash(false)
      setBulkDeleteTrashOpen(false)
    }
  }, [accessToken, refreshSlides, selectedTrashIds, trashList])

  const { favorites, setFavorites } = useSlidesHubFavorites()
  const { ownerInfoMap, sharedUsersMap, refreshSharedUsersForSlide } = useSlidesHubUserLookup({
    accessToken: accessToken || '',
    slides,
    currentUserId
  })
  const { filteredSlides } = useSlidesHubFiltering({
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

  // Track if initial URL load has been processed
  const [initialUrlProcessed, setInitialUrlProcessed] = useState(false)

  const { updateUrl, resetLoadAttempt } = useSlidesHubUrlState({
    currentView,
    currentSlideId: selectedSlideId,
    isLoadingSlide: isLoading,
    loadSlideById: loadSlide,
    loadTrashedSlideById: loadTrashedSlide,
    setCurrentView,
    setSelectedSlideId,
    activeSection,
    setActiveSection,
    onInitialLoadComplete: () => setInitialUrlProcessed(true)
  })

  const updatePowerPointImportProgress = useCallback((nextProgress: PptxImportProgressState) => {
    setPowerPointImportProgress(previousProgress => ensureMonotonicImportProgress(nextProgress, previousProgress))
  }, [])

  const resetPowerPointImportProgress = useCallback(() => {
    setPowerPointImportProgress(null)
  }, [])

  const handleNormalizedMediaProgress = useCallback(
    (progress: NormalizeImportedMediaProgress) => {
      if (progress.phase === 'uploading-images') {
        updatePowerPointImportProgress(createImageUploadImportProgress(progress.current, progress.total))
        return
      }

      updatePowerPointImportProgress(createVideoProcessingImportProgress(progress.current, progress.total))
    },
    [updatePowerPointImportProgress]
  )

  const handleImportDialogOpenChange = useCallback(
    (open: boolean) => {
      setShowImportDialog(open)
      if (!open) resetPowerPointImportProgress()
    },
    [resetPowerPointImportProgress]
  )

  // Update URL whenever activeSection changes (when user clicks sidebar)
  // Only run after initial URL processing is complete to avoid clearing slideId on refresh
  useEffect(() => {
    if (!initialUrlProcessed) return
    if (currentView === 'list' && !selectedSlideId) {
      updateUrl(null)
    }
  }, [activeSection, currentView, selectedSlideId, updateUrl, initialUrlProcessed])

  /** Create new blank slide */
  const handleCreateNew = useCallback(async () => {
    const created = await createSlide({ title: t('title-untitled-slide') })
    if (created) {
      setSelectedSlideId(created.id)
      setCurrentView('editor')
      updateUrl(created.id, 'editor')
      loadSlide(created.id)
    }
  }, [createSlide, loadSlide, updateUrl, t])

  /** Handle template selection from template browser */
  const handleTemplateSelected = useCallback(
    async (templateSlides: SlideData[], themeId: string) => {
      // Close the template browser dialog
      setShowTemplateBrowserDialog(false)

      const result = await importSlide({
        title: t('title-untitled-slide'),
        contentJson: { slides: templateSlides, themeId }
      })
      if (result) {
        setPendingTemplateSlides(null)
        setSelectedSlideId(result.slide.id)
        setCurrentView('editor')
        updateUrl(result.slide.id, 'editor')
      }
    },
    [importSlide, updateUrl, t]
  )

  /** Clear pending template after it's been applied */
  const handleInitialTemplateApplied = useCallback(() => {
    setPendingTemplateSlides(null)
  }, [])

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

  const handleOpenTrashedSlide = useCallback(
    async (id: string) => {
      const slide = await loadTrashedSlide(id)
      if (!slide) {
        return
      }

      setSelectedSlideId(id)
      const nextView = slide.trashedAt ? 'trash' : 'editor'
      setCurrentView(nextView)
      updateUrl(id, nextView)
    },
    [loadTrashedSlide, updateUrl]
  )

  /** Go back to list or return URL */
  const handleBack = useCallback(() => {
    // Check if there's a space return URL in sessionStorage (takes priority)
    try {
      const spaceReturnUrl = sanitizeSameOriginReturnUrl(sessionStorage.getItem('space_return_url'))
      if (spaceReturnUrl) {
        sessionStorage.removeItem('space_return_url')
        navigateTo(spaceReturnUrl)
        return
      }
    } catch (e) {
      console.warn('Failed to read space_return_url from sessionStorage:', e)
    }

    // Fallback: Check if there's a returnUrl parameter
    const params = new URLSearchParams(globalThis.window.location.search)
    const returnUrl = sanitizeSameOriginReturnUrl(params.get('returnUrl'))

    if (returnUrl) {
      // Navigate back to the specified URL (e.g., space)
      navigateTo(returnUrl)
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
    (ids: string | string[], names?: string[]) => {
      const idList = Array.isArray(ids) ? ids : [ids]
      const slideNames = new Map(slides.map(slide => [slide.id, slide.title || t('title-untitled-slide')]))

      setPendingTrashSlides(
        idList.map((id, index) => ({
          id,
          name: names?.[index] || slideNames.get(id) || t('title-untitled-slide')
        }))
      )
      setTrashConfirmOpen(true)
    },
    [slides, t]
  )

  const confirmMoveToTrash = useCallback(async () => {
    if (pendingTrashSlides.length === 0) return

    setIsMovingToTrash(true)
    try {
      for (const pendingSlide of pendingTrashSlides) {
        const success = await deleteSlide(pendingSlide.id)
        if (success && selectedSlideId === pendingSlide.id) {
          setSelectedSlideId(null)
          setCurrentView('list')
          updateUrl(null)
        }
      }

      setSelectedSlides(prev => {
        const next = new Set(prev)
        pendingTrashSlides.forEach(slide => next.delete(slide.id))
        return next
      })
    } finally {
      setIsMovingToTrash(false)
      setPendingTrashSlides([])
    }
  }, [deleteSlide, pendingTrashSlides, selectedSlideId, updateUrl])

  const handleTrashConfirmOpenChange = useCallback(
    (open: boolean) => {
      setTrashConfirmOpen(open)
      if (!open && !isMovingToTrash) {
        setPendingTrashSlides([])
      }
    },
    [isMovingToTrash]
  )

  const isTrashedSlide = Boolean(currentSlide?.trashedAt)
  const canRestoreTrashedSlide = Boolean(
    isTrashedSlide && currentSlide?.permission === 'owner' && !currentSlide?.spaceId
  )

  const handleRestoreTrashedSlide = useCallback(async () => {
    if (!currentSlide?.id || !canRestoreTrashedSlide) {
      return
    }

    setIsRestoringTrashedSlide(true)
    try {
      DriveApiService.setAccessToken(accessToken ?? null)
      await DriveApiService.restoreItems([{ entityType: 'slide', entityId: currentSlide.id }])
      const restoredSlide = await loadSlide(currentSlide.id)
      if (!restoredSlide) {
        return
      }

      setSelectedSlideId(currentSlide.id)
      setActiveSection('my-slides')
      setCurrentView('editor')
      updateUrl(currentSlide.id, 'editor', 'my-slides')
      toast.success(t('toast-restored'))
      await refreshSlides()
    } catch (error) {
      console.error('[SlidesAppsHub] Failed to restore trashed slide:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsRestoringTrashedSlide(false)
    }
  }, [accessToken, canRestoreTrashedSlide, currentSlide?.id, loadSlide, refreshSlides, t, updateUrl])

  /** Duplicate slide */
  const handleDuplicateSlide = useCallback(
    async (id: string) => {
      const duplicated = await duplicateSlide(id)
      if (duplicated) {
        toast.success(t('toast-slide-duplicated'))
      }
    },
    [duplicateSlide, t]
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
          toast.success(t('toast-favorite-removed'))
        } else {
          next.add(id)
          toast.success(t('toast-favorite-added'))
        }
        return next
      })
    },
    [setFavorites, t]
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
  const copyLink = useCallback(
    (slide: SlideSummary) => {
      const url = new URL(window.location.href)
      url.searchParams.set('slideId', slide.id)
      url.searchParams.set('view', 'editor')
      navigator.clipboard.writeText(url.toString())
      toast.success(t('toast-link-copied'))
    },
    [t]
  )

  /** Handle PowerPoint import */
  const handlePowerPointImport = useCallback(
    async (parsedDoc: ParsedPowerPointDocument) => {
      try {
        updatePowerPointImportProgress(createPreparingImportProgress())
        const imageFailurePlaceholderDataUrl = createMediaFailurePlaceholderDataUrl({
          title: t('import-image-upload-placeholder-title'),
          subtitle: t('import-image-upload-placeholder-subtitle')
        })
        const normalizedMedia = await normalizeImportedSlideMedia(parsedDoc.slides, {
          imageFailurePlaceholderDataUrl,
          uploadRetryCount: DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT,
          onProgress: handleNormalizedMediaProgress
        })

        // Pre-flight: measure the final JSON payload. The document service
        // rejects bodies over 10 MB (which surfaces as a generic "content
        // could not be saved" toast and leaves an empty deck behind). We
        // surface a specific "too large" warning instead so the user knows
        // what to do (split the deck, strip images) — see
        // `toast-import-partial-too-large`. 10.5 MB gives headroom for the
        // title/wrapper fields added on top of the slide array.
        const contentJson = {
          slides: normalizedMedia.slides,
          themeId: parsedDoc.themeId || 'corporate'
        }
        const payloadBytes = JSON.stringify(contentJson).length
        const payloadMb = payloadBytes / 1024 / 1024
        console.info(`[SlidesAppsHub] Import payload: ${payloadMb.toFixed(2)} MB, ${parsedDoc.slideCount} slides`)
        const exceedsBackendLimit = payloadBytes > 10 * 1024 * 1024

        const result = await importSlide(
          {
            title: parsedDoc.fileName.replace('.pptx', ''),
            contentJson
          },
          {
            onProgress: updatePowerPointImportProgress
          }
        )

        if (!result) {
          resetPowerPointImportProgress()
          toast.error(t('toast-import-failed'))
          return
        }

        setShowImportDialog(false)
        resetPowerPointImportProgress()
        setSelectedSlideId(result.slide.id)
        setCurrentView('editor')
        updateUrl(result.slide.id, 'editor')
        // `importSlide()` already stores the freshly updated slide in local
        // state. Re-fetching immediately can race against backend persistence
        // and replace the imported content with a stale snapshot.

        if (result.contentSaved) {
          toast.success(t('toast-imported-slides', { count: parsedDoc.slideCount }))
          if (normalizedMedia.warnings.imageUploadFailures > 0) {
            toast.warning(
              t('parser-image-upload-failed', { count: String(normalizedMedia.warnings.imageUploadFailures) })
            )
          }
          if (normalizedMedia.warnings.embeddedVideoUploadFailures > 0) {
            toast.warning(
              t('parser-video-upload-failed', { count: String(normalizedMedia.warnings.embeddedVideoUploadFailures) })
            )
          }
          if (normalizedMedia.warnings.videoPreviewFailures > 0) {
            toast.warning(
              t('parser-video-preview-failed', { count: String(normalizedMedia.warnings.videoPreviewFailures) })
            )
          }
          if (normalizedMedia.warnings.videoPreviewUploadFailures > 0) {
            toast.warning(
              t('parser-video-preview-upload-failed', {
                count: String(normalizedMedia.warnings.videoPreviewUploadFailures)
              })
            )
          }
        } else if (exceedsBackendLimit) {
          toast.warning(t('toast-import-partial-too-large', { size: payloadMb.toFixed(1) }))
        } else {
          toast.warning(t('toast-import-partial'))
        }
      } catch (err) {
        resetPowerPointImportProgress()
        console.error('[SlidesAppsHub] Import error:', err)
        toast.error(t('toast-import-failed'))
      }
    },
    [
      handleNormalizedMediaProgress,
      importSlide,
      resetPowerPointImportProgress,
      t,
      updatePowerPointImportProgress,
      updateUrl
    ]
  )

  // Check if this is a cast receiver view (standalone page for external display)
  // localStorage flag survives authentication redirects. Use useState with lazy initializer
  // to avoid consuming the flag during React's double-mount in strict mode.
  const [isCastReceiver] = useState(() => {
    try {
      // Check localStorage first (survives auth redirects)
      const localStorageFlag = localStorage.getItem('slides-cast-receiver-mode')
      if (localStorageFlag === 'true') {
        // Immediately clear to prevent other windows from picking it up
        localStorage.removeItem('slides-cast-receiver-mode')
        return true
      }
      // Fallback: check hash and query param
      const hash = globalThis.window.location.hash
      if (hash === '#cast-receiver') {
        return true
      }
      const params = new URLSearchParams(globalThis.window.location.search)
      if (params.get('view') === 'cast-receiver') {
        return true
      }
      return false
    } catch {
      return false
    }
  })

  // Render cast receiver (standalone full-screen view for external displays)
  if (isCastReceiver) {
    return <CastReceiver data-testid={`${testId}-cast-receiver`} />
  }

  const shouldRenderEditorView = Boolean(
    selectedSlideId && currentSlide && (currentView === 'editor' || currentView === 'trash')
  )

  if (shouldRenderEditorView && selectedSlideId && currentSlide) {
    return (
      <>
        <SlideEditor
          slideId={selectedSlideId}
          slide={currentSlide}
          accessToken={accessToken}
          userInfo={userInfo}
          onBack={handleBack}
          isReadOnly={isTrashedSlide}
          isTrashedSlide={isTrashedSlide}
          initialTemplate={isTrashedSlide ? undefined : (pendingTemplateSlides ?? undefined)}
          onInitialTemplateApplied={handleInitialTemplateApplied}
          data-testid={`${testId}-editor`}
        />
        {isTrashedSlide ? (
          <TrashedSlideReadonlyDialog
            slideTitle={currentSlide.title}
            canRestore={canRestoreTrashedSlide}
            isRestoring={isRestoringTrashedSlide}
            onGoToSlidesHome={handleBack}
            onRestore={handleRestoreTrashedSlide}
            data-testid={`${testId}-trashed-slide-dialog`}
          />
        ) : null}
      </>
    )
  }

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
      <DropdownMenuContent align="end" className="gba:w-56">
        <DropdownMenuItem onClick={handleCreateNew}>
          <Presentation className="gba:w-4 gba:h-4 gba:mr-2 gba:text-orange-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-blank-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-blank-description')}</div>
          </div>
        </DropdownMenuItem>
        {/* TODO: Re-enable "Generate with AI" once the feature is stable
        <DropdownMenuItem onClick={() => setShowGenerateDialogChat(true)}>
          <Wand2 className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-ai-title') || 'Generate with AI'}</div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {t('menu-new-ai-description') || 'Create presentation using AI'}
            </div>
          </div>
        </DropdownMenuItem>
        */}
        <DropdownMenuItem onClick={() => setShowTemplateBrowserDialog(true)}>
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-template-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-template-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
          <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-import-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-import-description')}</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (currentView === 'trash' && selectedSlideId) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
        <SlidesHero
          activeSection={activeSection as SlideSection}
          onSectionChange={s => setActiveSection(s as SlideHubSidebarSection)}
          newButton={heroNewButton}
          t={t}
          data-testid={`${testId}-hero`}
        />
        <main className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:p-6">
          <Spinner data-testid={`${testId}-trashed-slide-loading`} />
        </main>
      </div>
    )
  }

  if (currentView === 'list' && activeSection === 'trash') {
    return (
      <>
        <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
          <SlidesHero
            activeSection={activeSection as SlideSection}
            onSectionChange={s => setActiveSection(s as SlideHubSidebarSection)}
            newButton={heroNewButton}
            t={t}
            data-testid={`${testId}-hero`}
          />
          <div className="gba:flex-1 gba:overflow-auto">
            <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5">
              <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
                <div className="gba:relative">
                  <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                  <Input
                    placeholder={t('slides-header-search-placeholder')}
                    value={trashSearchQuery}
                    onChange={event => setTrashSearchQuery(event.target.value)}
                    className="gba:pl-12 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm hover:gba:shadow-md hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200"
                    data-testid={`${testId}-trash-search`}
                  />
                </div>
                {selectedTrashIds.size > 0 ? (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTrashIds(new Set())}
                      data-testid={`${testId}-trash-bulk-clear`}
                    >
                      <X className="gba:w-4 gba:h-4 gba:mr-1" />
                      {t('header-selected-count', { count: selectedTrashIds.size })}
                    </Button>
                    <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void handleBulkRestoreTrash()
                      }}
                      disabled={isBulkRestoringTrash || isBulkDeletingTrash}
                      data-testid={`${testId}-trash-bulk-restore`}
                    >
                      <RotateCcw className="gba:w-4 gba:h-4 gba:mr-1" />
                      {isBulkRestoringTrash ? t('trash-bulk-restoring') : t('trash-bulk-restore')}
                    </Button>
                    <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:text-destructive"
                      onClick={() => setBulkDeleteTrashOpen(true)}
                      disabled={isBulkRestoringTrash || isBulkDeletingTrash}
                      data-testid={`${testId}-trash-bulk-delete`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                      {t('trash-bulk-delete-permanently')}
                    </Button>
                  </div>
                ) : (
                  <OfficeTrashListToolbar
                    listControls={{
                      refreshLabel: t('slh-refresh'),
                      sortNameLabel: t('sort-name'),
                      sortTrashedOnLabel: t('sort-trashed'),
                      trashedOnColumnLabel: t('table-trashed'),
                      defaultSortBy: 'trashedAt',
                      defaultSortOrder: 'desc',
                      deleteDialogTitle: t('trash-delete-dialog-title-single'),
                      deleteDialogDescriptionFn: name => t('trash-delete-dialog-description-single', { name }),
                      deleteDialogCancel: t('trash-delete-dialog-cancel'),
                      deleteDialogConfirm: t('trash-delete-dialog-confirm'),
                      deleteDialogDeleting: t('trash-delete-dialog-deleting')
                    }}
                    isLoading={trashList.isLoading}
                    sortBy={trashList.sortBy}
                    sortOrder={trashList.sortOrder}
                    onRefresh={() => {
                      void trashList.refresh()
                    }}
                    onSortChange={trashList.handleSortChange}
                    onToggleSortOrder={trashList.toggleSortOrder}
                    data-testid={`${testId}-trash-list`}
                  />
                )}
              </div>
              {trashList.isLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                  <Spinner size="lg" />
                </div>
              ) : trashList.sortedItems.length === 0 ? (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
                  <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-orange-500/20 gba:to-amber-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                    <Presentation className="gba:w-12 gba:h-12 gba:text-orange-500" />
                  </div>
                  <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                    {t('slides-empty-trash-title')}
                  </h3>
                  <p className="gba:text-muted-foreground gba:text-center gba:max-w-md">
                    {t('slides-empty-trash-description')}
                  </p>
                </div>
              ) : (
                <OfficeTrashListTable
                  items={trashList.sortedItems}
                  listControls={{
                    refreshLabel: t('slh-refresh'),
                    sortNameLabel: t('sort-name'),
                    sortTrashedOnLabel: t('sort-trashed'),
                    trashedOnColumnLabel: t('table-trashed'),
                    defaultSortBy: 'trashedAt',
                    defaultSortOrder: 'desc',
                    deleteDialogTitle: t('trash-delete-dialog-title-single'),
                    deleteDialogDescriptionFn: name => t('trash-delete-dialog-description-single', { name }),
                    deleteDialogCancel: t('trash-delete-dialog-cancel'),
                    deleteDialogConfirm: t('trash-delete-dialog-confirm'),
                    deleteDialogDeleting: t('trash-delete-dialog-deleting')
                  }}
                  sortBy={trashList.sortBy}
                  actionKey={trashList.actionKey}
                  deleteConfirmItem={trashList.deleteConfirmItem}
                  onOpenItem={item => handleOpenTrashedSlide(item.id)}
                  onSortChange={trashList.handleSortChange}
                  onRestoreItem={item => {
                    void trashList.handleRestore(item)
                  }}
                  onRequestDelete={trashList.requestDelete}
                  onDeleteConfirmOpenChange={trashList.handleDeleteConfirmOpenChange}
                  onConfirmDelete={() => {
                    void trashList.confirmDelete()
                  }}
                  selectedIds={selectedTrashIds}
                  onToggleSelect={handleToggleTrashSelect}
                  onSelectAll={handleSelectAllTrash}
                  renderIcon={() => (
                    <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-orange-500/10">
                      <Presentation className="gba:w-5 gba:h-5 gba:text-orange-600" />
                    </div>
                  )}
                  data-testid={`${testId}-trash-list`}
                />
              )}
            </div>
          </div>
        </div>
        <PermanentDeleteConfirmDialog
          open={bulkDeleteTrashOpen}
          itemNames={trashList.sortedItems.filter(item => selectedTrashIds.has(item.id)).map(item => item.name)}
          title={
            selectedTrashIds.size === 1
              ? t('trash-delete-dialog-title-single')
              : t('trash-delete-dialog-title-multiple', { count: selectedTrashIds.size })
          }
          description={
            selectedTrashIds.size === 1
              ? t('trash-delete-dialog-description-single', {
                  name: trashList.sortedItems.find(item => selectedTrashIds.has(item.id))?.name ?? ''
                })
              : t('trash-delete-dialog-description-multiple', { count: selectedTrashIds.size })
          }
          cancelLabel={t('trash-delete-dialog-cancel')}
          confirmLabel={t('trash-delete-dialog-confirm')}
          deletingLabel={t('trash-delete-dialog-deleting')}
          onOpenChange={open => {
            if (!isBulkDeletingTrash) setBulkDeleteTrashOpen(open)
          }}
          onConfirm={() => {
            void handleBulkDeleteTrash()
          }}
          isDeleting={isBulkDeletingTrash}
          data-testid={`${testId}-trash-bulk-delete-confirm`}
        />
      </>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <SlidesHero
        activeSection={activeSection as SlideSection}
        onSectionChange={s => setActiveSection(s as SlideHubSidebarSection)}
        newButton={heroNewButton}
        t={t}
        data-testid={`${testId}-hero`}
      />

      {/* Main Content */}
      <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden">
        {/* Content Area */}
        <div className="gba:flex-1 gba:overflow-auto">
          <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5">
            {/* Spotlight search bar */}
            <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
              <div className="gba:relative">
                <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                <Input
                  placeholder={t('slides-header-search-placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="gba:pl-12 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm hover:gba:shadow-md hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200"
                  data-testid={`${testId}-search-input`}
                />
              </div>

              {/* Actions row */}
              <div className="gba:flex gba:items-center gba:gap-2">
                {selectedSlides.size > 0 ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSlides(new Set())}>
                      <X className="gba:w-4 gba:h-4 gba:mr-1" />
                      {selectedSlides.size} selected
                    </Button>
                    <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:text-destructive"
                      onClick={() => {
                        const selectedIds = Array.from(selectedSlides)
                        const selectedNames = selectedIds.map(
                          id => slides.find(slide => slide.id === id)?.title || t('title-untitled-slide')
                        )
                        handleDeleteSlide(selectedIds, selectedNames)
                      }}
                    >
                      <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                      {t('menu-delete')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refreshSlides()}
                      className="gba:gap-1.5 gba:h-7 gba:text-xs"
                      data-testid={`${testId}-refresh`}
                    >
                      <RefreshCw className="gba:w-3.5 gba:h-3.5" />
                      {t('slh-refresh')}
                    </Button>

                    <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
                      {/* Sort controls */}
                      <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as SlideHubSortBy)}
                          className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
                          data-testid={`${testId}-sort-select`}
                        >
                          <option value="modified">{t('sort-modified')}</option>
                          <option value="name">{t('sort-name')}</option>
                          <option value="created">{t('sort-created')}</option>
                        </select>
                        <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                        <button
                          onClick={() => setSortOrder((prev: SlideHubSortOrder) => (prev === 'asc' ? 'desc' : 'asc'))}
                          className="gba:p-1 gba:rounded hover:gba:bg-accent gba:text-muted-foreground gba:transition-colors"
                          data-testid={`${testId}-sort-order`}
                        >
                          {sortOrder === 'asc' ? (
                            <SortAsc className="gba:w-3.5 gba:h-3.5" />
                          ) : (
                            <SortDesc className="gba:w-3.5 gba:h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* View mode toggle */}
                      <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
                        <button
                          onClick={() => setViewLayout('list')}
                          className={`gba:p-1 gba:rounded gba:transition-colors ${viewLayout === 'list' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                          data-testid={`${testId}-view-list`}
                        >
                          <List className="gba:w-3.5 gba:h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewLayout('grid')}
                          className={`gba:p-1 gba:rounded gba:transition-colors ${viewLayout === 'grid' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                          data-testid={`${testId}-view-grid`}
                        >
                          <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
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
                    ? t('slides-empty-favorites-title')
                    : activeSection === 'shared'
                      ? t('slides-empty-shared-title')
                      : t('slides-empty-default-title')}
                </h3>
                <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                  {activeSection === 'favorites'
                    ? t('slides-empty-favorites-description')
                    : activeSection === 'shared'
                      ? t('slides-empty-shared-description')
                      : t('slides-empty-default-description')}
                </p>
                {activeSection !== 'favorites' && activeSection !== 'shared' && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('empty-create-slide')}
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
                      {t('sort-name')} {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                    </div>
                    <div
                      className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                      onClick={() => {
                        setSortBy('modified')
                        setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                      }}
                    >
                      {t('sort-modified')} {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                    </div>
                    <div className="gba:w-40 gba:flex-shrink-0">{t('table-owner')}</div>
                    <div
                      className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                      onClick={() => {
                        setSortBy('created')
                        setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                      }}
                    >
                      {t('sort-created')} {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
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
                                {slide.title || t('title-untitled')}
                              </span>
                              {slide.isShared && !isOwner && (
                                <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                  {t('label-shared')}
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
                                      <p>{t('shared-with-count', { count: sharedWith.length })}</p>
                                      <p className="gba:text-xs gba:text-muted-foreground">
                                        {t('shared-click-manage')}
                                      </p>
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
                              {isOwner ? t('owner-you') : ownerInfo?.name || t('owner-unknown')}
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
                                {t('menu-open')}
                              </DropdownMenuItem>
                              {isOwner && (
                                <DropdownMenuItem onClick={() => handleShareClick(slide.id)}>
                                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  {t('menu-share')}
                                </DropdownMenuItem>
                              )}
                              {isOwner && sharedWith.length > 0 && (
                                <DropdownMenuItem onClick={() => handleManageSharesClick(slide.id)}>
                                  <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                  {t('menu-manage-sharing')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => copyLink(slide)}>
                                <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                {t('menu-copy-link')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateSlide(slide.id)}>
                                <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                {t('menu-duplicate')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleFavorite(slide.id)}>
                                <Star
                                  className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                                />
                                {isFavorite ? t('menu-remove-favorite') : t('menu-add-favorite')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isOwner && (
                                <DropdownMenuItem
                                  className="gba:text-destructive"
                                  onClick={() =>
                                    handleDeleteSlide(slide.id, [slide.title || t('title-untitled-slide')])
                                  }
                                >
                                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  {t('menu-delete')}
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
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
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
                            {t('label-shared')}
                          </Badge>
                        )}
                      </div>

                      {/* Info */}
                      <div className="gba:p-3">
                        <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                          {slide.title || t('title-untitled')}
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
        </div>

        {/* Pagination */}
        {!isLoading && filteredSlides.length > 0 && (
          <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
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
          slideTitle={slides.find(s => s.id === slideForShare)?.title || t('title-untitled-slide')}
          currentUserId={currentUserId}
          currentUserName={
            userInfo?.employeeDetails?.displayName ||
            `${userInfo?.givenName || ''} ${userInfo?.familyName || ''}`.trim()
          }
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
          slideTitle={slides.find(s => s.id === slideForManageShares)?.title || t('title-untitled-slide')}
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
      <Dialog open={showImportDialog} onOpenChange={handleImportDialogOpenChange}>
        <DialogContent className="gba:max-w-2xl">
          <PowerPointUploader
            onFileParsed={handlePowerPointImport}
            onCancel={() => handleImportDialogOpenChange(false)}
            onError={err => {
              console.error('[SlidesAppsHub] Import error:', err)
              toast.error(t('toast-import-failed'))
            }}
            importProgress={powerPointImportProgress}
            data-testid={`${testId}-import-uploader`}
          />
        </DialogContent>
      </Dialog>

      {/* Template Browser Dialog */}
      <TemplateBrowserDialog
        open={showTemplateBrowserDialog}
        onOpenChange={setShowTemplateBrowserDialog}
        onApplyTemplate={handleTemplateSelected}
        data-testid={`${testId}-template-browser`}
      />

      {/* Generate Presentation Dialog (Chat Version) */}
      <GeneratePresentationDialogChat
        open={showGenerateDialogChat}
        onOpenChange={setShowGenerateDialogChat}
        accessToken={accessToken || ''}
        data-testid={`${testId}-generate-dialog-chat`}
      />

      <DeleteConfirmDialog
        open={trashConfirmOpen}
        onOpenChange={handleTrashConfirmOpenChange}
        itemNames={pendingTrashSlides.map(slide => slide.name)}
        onConfirm={() => {
          void confirmMoveToTrash()
        }}
        isDeleting={isMovingToTrash}
        t={t}
        data-testid={`${testId}-trash-confirm`}
      />
    </div>
  )
}

export default SlidesAppsHub
