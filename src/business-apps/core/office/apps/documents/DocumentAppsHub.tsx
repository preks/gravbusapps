/**
 * DocumentAppsHub Component
 *
 * The main entry point for the Document Apps feature.
 * Modern OneDrive-inspired design with sidebar navigation.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  useTranslation
} from '@newwork/nw-design-system'
import {
  FileText,
  Plus,
  Search,
  Upload,
  AlertCircle,
  LayoutTemplate,
  Users,
  Star,
  Trash2,
  MoreHorizontal,
  Share2,
  Link2,
  Copy,
  ArrowUpDown,
  X,
  User,
  RefreshCw,
  List,
  LayoutGrid,
  SortAsc,
  SortDesc,
  Send,
  Sparkles,
  FileType,
  ExternalLink,
  RotateCcw
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { sanitizeSameOriginReturnUrl } from '@/common/utils/safeUrlUtils'

// Components
import { DocumentHero } from './components/DocumentHero'
import type { DocumentSection } from './components/DocumentHero'
import { WordUploader } from './components/WordUploader'
import { PdfUploader } from './components/PdfUploader'
import { OdfUploader } from './components/OdfUploader'
import { TemplateGallery } from './components/TemplateGallery'
import { CreateTemplateDialog } from './components/CreateTemplateDialog'
import { SendForApprovalDialog } from './components/SendForApprovalDialog'
import { ShareDocumentDialog } from './components/ShareDocumentDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import type { PagedDocumentEditorRef } from './components/PagedDocumentEditor'
import { DocumentAppsHubEditorView } from './components/DocumentAppsHubEditorView'

// Hooks
import { useDocumentApps } from './hooks/useDocumentApps'
import { useDocumentTemplates } from './hooks/useDocumentTemplates'

import { useDocumentAppsHubUserLookup } from './hooks/useDocumentAppsHubUserLookup'
import { useDocumentAppsHubFavorites } from './hooks/useDocumentAppsHubFavorites'
import { useDocumentAppsHubUrlState } from './hooks/useDocumentAppsHubUrlState'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'
import {
  OfficeTrashListTable,
  OfficeTrashListToolbar,
  useOfficeTrashList
} from '@/business-apps/platform/apps/shared/components/OfficeTrashList'
import { PermanentDeleteConfirmDialog } from '@/business-apps/platform/apps/shared/components/PermanentDeleteConfirmDialog'
import { DeleteConfirmDialog } from '@/business-apps/core/office/apps/drive/components/DeleteConfirmDialog'
import { DriveApiService } from '@/business-apps/core/office/apps/drive/services/DriveApiService'

// Entities / context
import { getContextForCategory, getContextForEntityKeys } from './entities'
import { extractEntityKeysFromContent } from './utils/templatePlaceholders'

// Types
import type { DocumentTemplate, ParsedWordDocument, DocumentSummary } from './types'
import translations from './_i18n'

export interface DocumentAppsHubProps extends BusinessAppContextProps {
  entityContext?: string
  'data-testid'?: string
}

type HubView = Parameters<typeof useDocumentAppsHubUrlState>[0]['currentView']
type SidebarSection = DocumentSection

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
 * Format relative time (requires t from useTranslation).
 *
 * `locale` is the BCP 47 tag used to format the absolute-date fallback shown
 * for timestamps older than 7 days (e.g. `de-DE` → `16.3.2026`).
 */
function formatRelativeTime(
  dateString: string,
  t: (k: string, vars?: Record<string, number>) => string,
  locale?: string
): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays < 7) return t('time-days-ago', { count: diffDays })
  return date.toLocaleDateString(locale || undefined)
}

/**
 * Format date for table display (requires t from useTranslation).
 *
 * Uses the current UI locale so German users see `15:44` / `16. März` instead
 * of `3:44 PM` / `Mar 16`.
 */
function formatDate(
  dateString: string,
  t: (k: string, vars?: Record<string, number>) => string,
  locale?: string
): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const effectiveLocale = locale || undefined

  if (diffMins < 1) return t('time-just-now')
  if (diffMins < 60) return t('time-minutes-ago', { count: diffMins })
  if (diffHours < 24) return t('time-hours-ago', { count: diffHours })
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago-count', { count: diffDays })
  return date.toLocaleDateString(effectiveLocale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * DocumentAppsHub Component
 */
export const DocumentAppsHub: React.FC<DocumentAppsHubProps> = ({
  accessToken,
  userInfo,
  entityContext,
  'data-testid': testId = 'document-apps-hub'
}) => {
  const { t, locale } = useTranslation(translations)

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-documents')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { favorites, setFavorites } = useDocumentAppsHubFavorites()

  // Data state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [isSavingImportDraft, setIsSavingImportDraft] = useState(false)
  const [savedImportDocumentId, setSavedImportDocumentId] = useState<string | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [documentForApproval, setDocumentForApproval] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [documentForShare, setDocumentForShare] = useState<string | null>(null)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [documentForManageShares, setDocumentForManageShares] = useState<string | null>(null)
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false)
  const [templateBeingEdited, setTemplateBeingEdited] = useState<DocumentTemplate | null>(null)
  const [trashSearchQuery, setTrashSearchQuery] = useState('')
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [pendingTrashDocuments, setPendingTrashDocuments] = useState<Array<{ id: string; name: string }>>([])
  const [isMovingToTrash, setIsMovingToTrash] = useState(false)
  const [isRestoringTrashedDocument, setIsRestoringTrashedDocument] = useState(false)
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set())
  const [bulkDeleteTrashOpen, setBulkDeleteTrashOpen] = useState(false)
  const [isBulkDeletingTrash, setIsBulkDeletingTrash] = useState(false)
  const [isBulkRestoringTrash, setIsBulkRestoringTrash] = useState(false)
  /** Context chosen in create modal; used only to pick entities in the editor (not sent to API). */
  const [sessionEntityContext, setSessionEntityContext] = useState<string | null>(null)
  const templateEditorRef = useRef<PagedDocumentEditorRef>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''
  const currentUserName =
    [userInfo?.givenName, userInfo?.familyName].filter(Boolean).join(' ') ||
    userInfo?.userName ||
    [userInfo?.employeeDetails?.firstName, userInfo?.employeeDetails?.lastName].filter(Boolean).join(' ') ||
    ''

  // Clear space return URL if not opened from a space
  useEffect(() => {
    try {
      const params = new URLSearchParams(globalThis.window.location.search)
      const spaceId = params.get('spaceId')
      if (!spaceId) {
        // Document opened from hub, not from a space - clear any stale return URL
        sessionStorage.removeItem('space_return_url')
      }
    } catch (e) {
      console.warn('Failed to check/clear space_return_url:', e)
    }
  }, [])

  // Entity context: prop > URL ?entityContext= > category-derived (when editing a template) > default
  const urlEntityContext = useMemo(() => {
    if (typeof globalThis.window === 'undefined') return undefined
    const params = new URLSearchParams(globalThis.window.location.search)
    return params.get('entityContext') ?? undefined
  }, [typeof globalThis.window === 'undefined' ? '' : globalThis.window.location.search])
  const effectiveEntityContext =
    entityContext ??
    urlEntityContext ??
    (templateBeingEdited
      ? (templateBeingEdited.context ??
        sessionEntityContext ??
        getContextForEntityKeys(extractEntityKeysFromContent(templateBeingEdited.content)) ??
        getContextForCategory(templateBeingEdited.category))
      : undefined) ??
    'candidate'

  // Hooks
  const {
    documents,
    currentDocument,
    isLoading: isLoadingDocuments,
    error: documentsError,
    currentDocumentPermission,
    pageMeta,
    loadDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,
    shareDocument,
    clearCurrentDocument,
    refreshDocuments
  } = useDocumentApps(accessToken, currentUserId)

  const { templates, createTemplate, updateTemplate, loadTemplate, createDocumentFromTemplate } = useDocumentTemplates(
    accessToken,
    currentUserId
  )
  const { updateUrl, resetLoadAttempt } = useDocumentAppsHubUrlState({
    currentView,
    currentDocumentId: currentDocument?.id || null,
    isLoadingDocument: isLoadingDocuments,
    loadDocumentById: loadDocument,
    setCurrentView,
    setSelectedDocumentId,
    activeSection,
    setActiveSection
  })
  const handleTrashItemsChanged = useCallback(() => {
    void refreshDocuments()
  }, [refreshDocuments])
  const trashList = useOfficeTrashList({
    accessToken,
    entityType: 'document',
    searchQuery: trashSearchQuery,
    enabled: currentView === 'list' && activeSection === 'trash',
    defaultSortBy: 'trashedAt',
    defaultSortOrder: 'desc',
    onItemsChanged: handleTrashItemsChanged
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
      void refreshDocuments()
    } catch (error) {
      console.error('[DocumentAppsHub] Failed to bulk delete trash items:', error)
      toast.error('Failed to delete some items permanently')
    } finally {
      setIsBulkDeletingTrash(false)
      setBulkDeleteTrashOpen(false)
    }
  }, [accessToken, refreshDocuments, selectedTrashIds, trashList])

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
      void refreshDocuments()
    } catch (error) {
      console.error('[DocumentAppsHub] Failed to bulk restore trash items:', error)
      toast.error('Failed to restore some items')
    } finally {
      setIsBulkRestoringTrash(false)
    }
  }, [accessToken, refreshDocuments, selectedTrashIds, trashList])

  // Update URL whenever activeSection changes (when user clicks sidebar)
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const hasDeepLinkedDocument = Boolean(urlParams.get('docId'))

    if (currentView === 'list' && !selectedDocumentId && !hasDeepLinkedDocument) {
      updateUrl(null)
    }
  }, [activeSection, currentView, selectedDocumentId, updateUrl])

  // Map frontend sort names to backend field names
  const sortByMap: Record<string, 'createdAt' | 'updatedAt' | 'title'> = {
    created: 'createdAt',
    modified: 'updatedAt',
    name: 'title'
  }

  // Drive server-side queries when section, search, sort, or page changes
  const serverPageRef = useRef(1)
  const PAGE_SIZE = 20

  const fetchPage = useCallback(
    (page: number) => {
      if (activeSection === 'trash') {
        return
      }
      serverPageRef.current = page
      refreshDocuments({
        section: activeSection === 'templates' ? undefined : activeSection,
        favoriteIds: activeSection === 'favorites' ? [...favorites].join(',') : undefined,
        search: searchQuery || undefined,
        page,
        limit: PAGE_SIZE,
        sortBy: sortByMap[sortBy] ?? 'updatedAt',
        sortOrder: sortOrder === 'asc' ? 'ASC' : 'DESC'
      })
    },
    [activeSection, favorites, searchQuery, sortBy, sortOrder, refreshDocuments]
  )

  useEffect(() => {
    if (activeSection !== 'templates' && activeSection !== 'trash') {
      fetchPage(1)
    }
  }, [activeSection, searchQuery, sortBy, sortOrder, favorites, fetchPage])

  const goToPage = useCallback((page: number) => fetchPage(page), [fetchPage])

  // Server-driven pagination values
  const paginatedDocuments = documents
  const filteredDocuments = documents
  const currentPage = pageMeta.page
  const totalPages = pageMeta.totalPages
  const totalItems = pageMeta.total
  const pageSize = pageMeta.limit

  const hubLookupDocuments =
    currentView === 'list' && activeSection !== 'templates' && viewLayout === 'list' ? paginatedDocuments : []

  const { ownerInfoMap, sharedUsersMap, refreshSharedUsersForDocument } = useDocumentAppsHubUserLookup({
    accessToken,
    documents: hubLookupDocuments,
    loadSharedUsers: hubLookupDocuments.length > 0
  })

  /**
   * Handle a parsed import (Word/ODF) by auto-creating a draft in the
   * background while the user stays on the upload screen.
   *
   * The user then gets an explicit "Open document" action on the upload
   * success card that navigates to the persisted editor. This way imports
   * never require a manual save click, but the user retains control over
   * when to leave the upload screen.
   */
  const handleImportFileParsed = useCallback(
    async (parsed: ParsedWordDocument, mimeType: string) => {
      if (isSavingImportDraft) return
      setIsSavingImportDraft(true)
      setSavedImportDocumentId(null)
      try {
        const newDoc = await createDocument({
          title: parsed.fileName.replace(/\.(docx?|odt|ott|doc)$/i, ''),
          content: parsed.html,
          formatting: parsed.formatting,
          status: 'draft',
          createdBy: currentUserId,
          sourceFile: {
            originalName: parsed.fileName,
            fileSize: parsed.fileSize,
            mimeType,
            uploadedAt: new Date().toISOString()
          }
        })
        if (newDoc) {
          setSavedImportDocumentId(newDoc.id)
        }
      } finally {
        setIsSavingImportDraft(false)
      }
    },
    [createDocument, currentUserId, isSavingImportDraft]
  )

  const handleWordFileParsed = useCallback(
    (parsed: ParsedWordDocument) =>
      handleImportFileParsed(parsed, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    [handleImportFileParsed]
  )

  const handleOdfFileParsed = useCallback(
    (parsed: ParsedWordDocument) => handleImportFileParsed(parsed, 'application/vnd.oasis.opendocument.text'),
    [handleImportFileParsed]
  )

  const handleOpenSavedImport = useCallback(async () => {
    if (!savedImportDocumentId) return
    const doc = await loadDocument(savedImportDocumentId)
    if (!doc) return
    setSelectedDocumentId(savedImportDocumentId)
    setCurrentView('editor')
    updateUrl(savedImportDocumentId, 'editor')
    setSavedImportDocumentId(null)
  }, [loadDocument, savedImportDocumentId, updateUrl])

  const handleResetImportDraft = useCallback(() => {
    setSavedImportDocumentId(null)
  }, [])

  /**
   * Create new blank document
   */
  const handleCreateNew = useCallback(async () => {
    const newDoc = await createDocument({
      title: t('title-untitled-document'),
      content: '<p></p>',
      status: 'draft',
      createdBy: currentUserId
    })

    if (newDoc) {
      const loadedDoc = await loadDocument(newDoc.id)
      if (!loadedDoc) return
      setSelectedDocumentId(newDoc.id)
      setCurrentView('editor')
      updateUrl(newDoc.id, 'editor')
    }
  }, [createDocument, currentUserId, loadDocument, updateUrl, t])

  /**
   * Handle template selection
   */
  const handleSelectTemplate = useCallback(
    async (template: DocumentTemplate) => {
      const newDoc = await createDocumentFromTemplate(template.id, t('template-new-prefix', { name: template.name }))
      if (newDoc) {
        await loadDocument(newDoc.id)
        setSelectedDocumentId(newDoc.id)
        setCurrentView('editor')
        updateUrl(newDoc.id, 'editor')
      }
    },
    [createDocumentFromTemplate, loadDocument, updateUrl, t]
  )

  /**
   * Handle edit template: load full template and open in editor
   */
  const handleEditTemplate = useCallback(
    async (template: { id: string }) => {
      const full = await loadTemplate(template.id)
      if (full) {
        setSessionEntityContext(null)
        setTemplateBeingEdited(full)
        setCurrentView('editor')
      }
    },
    [loadTemplate]
  )

  /**
   * Open a document
   */
  const handleOpenDocument = useCallback(
    async (id: string) => {
      const doc = await loadDocument(id)
      if (doc) {
        setSelectedDocumentId(id)
        setCurrentView('editor')
        updateUrl(id, 'editor')
      }
    },
    [loadDocument, updateUrl]
  )

  const handleOpenTrashedDocument = useCallback(
    async (id: string) => {
      const doc = await loadDocument(id)
      if (!doc) {
        return
      }
      setSelectedDocumentId(id)
      setCurrentView(doc.trashedAt ? 'trash' : 'editor')
      updateUrl(id, doc.trashedAt ? 'trash' : 'editor')
    },
    [loadDocument, updateUrl]
  )

  /**
   * Handle delete document
   */
  const handleDeleteDocument = useCallback(
    (ids: string | string[], names?: string[]) => {
      const idList = Array.isArray(ids) ? ids : [ids]
      const documentNames = new Map(documents.map(doc => [doc.id, doc.title || t('title-untitled-document')]))

      setPendingTrashDocuments(
        idList.map((id, index) => ({
          id,
          name: names?.[index] || documentNames.get(id) || t('title-untitled-document')
        }))
      )
      setTrashConfirmOpen(true)
    },
    [documents, t]
  )

  const handleBulkDeleteDocuments = useCallback(() => {
    const selectedIds = Array.from(selectedDocuments)
    if (selectedIds.length === 0) {
      return
    }

    const selectedNames = selectedIds.map(
      id => documents.find(doc => doc.id === id)?.title || t('title-untitled-document')
    )

    handleDeleteDocument(selectedIds, selectedNames)
  }, [documents, handleDeleteDocument, selectedDocuments, t])

  const confirmMoveToTrash = useCallback(async () => {
    if (pendingTrashDocuments.length === 0) return

    setIsMovingToTrash(true)
    const deletedDocumentIds: string[] = []
    try {
      for (const pendingTrashDocument of pendingTrashDocuments) {
        const success = await deleteDocument(pendingTrashDocument.id)

        if (!success) {
          continue
        }

        deletedDocumentIds.push(pendingTrashDocument.id)

        if (selectedDocumentId === pendingTrashDocument.id) {
          setSelectedDocumentId(null)
          setCurrentView('list')
          updateUrl(null)
        }
      }

      if (deletedDocumentIds.length > 0) {
        setSelectedDocuments(prev => {
          const next = new Set(prev)
          deletedDocumentIds.forEach(id => next.delete(id))
          return next
        })
      }
    } finally {
      setIsMovingToTrash(false)
      setPendingTrashDocuments([])
    }
  }, [deleteDocument, pendingTrashDocuments, selectedDocumentId, updateUrl])

  const handleTrashConfirmOpenChange = useCallback(
    (open: boolean) => {
      setTrashConfirmOpen(open)
      if (!open && !isMovingToTrash) {
        setPendingTrashDocuments([])
      }
    },
    [isMovingToTrash]
  )

  /**
   * Handle duplicate document
   */
  const handleDuplicateDocument = useCallback(
    async (id: string) => {
      await duplicateDocument(id)
      toast.success(t('toast-duplicated'))
    },
    [duplicateDocument, t]
  )

  /**
   * Handle send for approval click
   */
  const handleSendForApprovalClick = useCallback((id: string) => {
    setDocumentForApproval(id)
    setApprovalDialogOpen(true)
  }, [])

  const handleNavigateToDocumentReview = useCallback(
    (versionNumber: number) => {
      if (!currentDocument?.id) {
        return
      }

      updateUrl(currentDocument.id, 'review', undefined, String(versionNumber))
      setCurrentView('review')
    },
    [currentDocument?.id, updateUrl]
  )

  /**
   * Handle share document click
   */
  const handleShareClick = useCallback((id: string) => {
    setDocumentForShare(id)
    setShareDialogOpen(true)
  }, [])

  /**
   * Handle manage shares click
   */
  const handleManageSharesClick = useCallback((id: string) => {
    setDocumentForManageShares(id)
    setManageSharesDialogOpen(true)
  }, [])

  /**
   * Go back to list or return URL
   */
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
    clearCurrentDocument()
    resetLoadAttempt()
    setSelectedDocumentId(null)
    setSavedImportDocumentId(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentDocument, resetLoadAttempt, updateUrl])

  const handleGoToDocsHome = useCallback(() => {
    clearCurrentDocument()
    resetLoadAttempt()
    setSelectedDocumentId(null)
    setSavedImportDocumentId(null)
    setCurrentView('list')
    setActiveSection('my-documents')
    updateUrl(null, undefined, 'my-documents')
  }, [clearCurrentDocument, resetLoadAttempt, updateUrl])

  const isTrashedDocument = Boolean(currentDocument?.trashedAt)
  const canManageTrashedDocument = Boolean(
    isTrashedDocument && currentDocumentPermission === 'owner' && !currentDocument?.spaceId
  )

  const handleRestoreTrashedDocument = useCallback(async () => {
    if (!currentDocument?.id || !canManageTrashedDocument) {
      return
    }

    setIsRestoringTrashedDocument(true)
    try {
      DriveApiService.setAccessToken(accessToken)
      await DriveApiService.restoreItems([{ entityType: 'document', entityId: currentDocument.id }])
      const restoredDocument = await loadDocument(currentDocument.id)
      if (!restoredDocument) {
        return
      }
      setSelectedDocumentId(currentDocument.id)
      setActiveSection('my-documents')
      setCurrentView('editor')
      updateUrl(currentDocument.id, 'editor', 'my-documents')
      toast.success(t('toast-restored'))
      await refreshDocuments()
    } catch (error) {
      console.error('[DocumentAppsHub] Failed to restore trashed document:', error)
      toast.error(t('toast-restore-failed'))
    } finally {
      setIsRestoringTrashedDocument(false)
    }
  }, [
    accessToken,
    canManageTrashedDocument,
    currentDocument?.id,
    currentDocumentPermission,
    loadDocument,
    refreshDocuments,
    t,
    updateUrl
  ])

  /**
   * Start upload flow (Word)
   */
  const handleStartUpload = useCallback(() => {
    setSavedImportDocumentId(null)
    setCurrentView('upload')
  }, [])

  /**
   * Start PDF upload flow
   */
  const handleStartPdfUpload = useCallback(() => {
    setCurrentView('upload-pdf')
  }, [])

  /**
   * Start ODF upload flow
   */
  const handleStartOdfUpload = useCallback(() => {
    setSavedImportDocumentId(null)
    setCurrentView('upload-odf')
  }, [])

  /**
   * Toggle favorite
   */
  const toggleFavorite = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          toast.success(t('toast-removed-favorites'))
        } else {
          next.add(id)
          toast.success(t('toast-added-favorites'))
        }
        return next
      })
    },
    [t]
  )

  /**
   * Toggle select document
   */
  const toggleSelectDocument = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedDocuments(prev => {
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
   * Select all documents
   */
  const selectAllDocuments = useCallback(() => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)))
    }
  }, [selectedDocuments.size, filteredDocuments])

  /**
   * Copy link
   */
  const copyLink = useCallback(
    (doc: DocumentSummary) => {
      const url = new URL(window.location.href)
      url.searchParams.set('docId', doc.id)
      url.searchParams.set('view', 'editor')
      navigator.clipboard.writeText(url.toString())
      toast.success(t('toast-link-copied'))
    },
    [t]
  )

  const getEmptyStateTitle = () => {
    if (activeSection === 'favorites') return t('documents-empty-favorites-title')
    if (activeSection === 'shared') return t('documents-empty-shared-title')
    if (activeSection === 'trash') return t('documents-empty-trash-title')
    return t('documents-empty-default-title')
  }

  const getEmptyStateDescription = () => {
    if (activeSection === 'favorites') return t('documents-empty-favorites-description')
    if (activeSection === 'shared') return t('documents-empty-shared-description')
    if (activeSection === 'trash') return t('documents-empty-trash-description')
    return t('documents-empty-default-description')
  }

  const shouldRenderEditorView =
    currentView === 'editor' || (currentView === 'trash' && Boolean(currentDocument)) || currentView === 'review'

  const sharedDocumentDialogs = (
    <>
      {/* Send for Approval Dialog */}
      {documentForApproval && (
        <SendForApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={open => {
            setApprovalDialogOpen(open)
            if (!open) setDocumentForApproval(null)
          }}
          documentId={documentForApproval}
          documentTitle={documents.find(d => d.id === documentForApproval)?.title || t('title-untitled-document')}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          accessToken={accessToken}
          shareDocument={shareDocument}
          onApprovalSent={async () => {
            if (documentForApproval) {
              await refreshDocuments()
              if (currentDocument?.id === documentForApproval) {
                await loadDocument(documentForApproval)
              }
            }
            setDocumentForApproval(null)
          }}
          data-testid={`${testId}-approval-dialog`}
        />
      )}

      {/* Share Document Dialog */}
      {documentForShare && (
        <ShareDocumentDialog
          open={shareDialogOpen}
          onOpenChange={open => {
            setShareDialogOpen(open)
            if (!open) setDocumentForShare(null)
          }}
          documentId={documentForShare}
          documentTitle={documents.find(d => d.id === documentForShare)?.title || t('title-untitled-document')}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          accessToken={accessToken}
          shareDocument={shareDocument}
          onShareComplete={async () => {
            refreshDocuments()
            await refreshSharedUsersForDocument(documentForShare)
          }}
          data-testid={`${testId}-share-dialog`}
        />
      )}

      {/* Manage Shares Dialog */}
      {documentForManageShares && (
        <ManageSharesDialog
          open={manageSharesDialogOpen}
          onOpenChange={open => {
            setManageSharesDialogOpen(open)
            if (!open) setDocumentForManageShares(null)
          }}
          documentId={documentForManageShares}
          documentTitle={documents.find(d => d.id === documentForManageShares)?.title || t('title-untitled-document')}
          accessToken={accessToken}
          onSharesChanged={async () => {
            refreshDocuments()
            await refreshSharedUsersForDocument(documentForManageShares)
          }}
          onAddMoreUsers={() => {
            setManageSharesDialogOpen(false)
            setDocumentForShare(documentForManageShares)
            setShareDialogOpen(true)
          }}
          data-testid={`${testId}-manage-shares-dialog`}
        />
      )}
    </>
  )

  if (shouldRenderEditorView) {
    return (
      <>
        <DocumentAppsHubEditorView
          currentView={currentView}
          templateBeingEdited={templateBeingEdited}
          setTemplateBeingEdited={setTemplateBeingEdited}
          setSessionEntityContext={setSessionEntityContext}
          setSelectedDocumentId={setSelectedDocumentId}
          currentDocument={currentDocument}
          currentDocumentPermission={currentDocumentPermission ?? ''}
          createDocument={async opts => createDocument(opts as Parameters<typeof createDocument>[0])}
          loadDocument={loadDocument}
          updateDocument={updateDocument}
          updateTemplate={updateTemplate}
          updateUrl={(docId, view) => updateUrl(docId, view as HubView | undefined)}
          onNavigateToDocumentReview={handleNavigateToDocumentReview}
          setCurrentView={v => setCurrentView(v as HubView)}
          setActiveSection={s => setActiveSection(s as SidebarSection)}
          handleBack={handleBack}
          handleSendForApprovalClick={handleSendForApprovalClick}
          currentUserId={currentUserId}
          accessToken={accessToken}
          userInfo={userInfo}
          templateEditorRef={templateEditorRef}
          effectiveEntityContext={effectiveEntityContext ?? ''}
          isTrashedDocument={isTrashedDocument}
          canRestoreTrashedDocument={canManageTrashedDocument}
          isRestoringTrashedDocument={isRestoringTrashedDocument}
          onGoToDocsHome={handleGoToDocsHome}
          onRestoreTrashedDocument={handleRestoreTrashedDocument}
          onApprovalResolved={async () => {
            await refreshDocuments()
            if (currentDocument?.id) {
              await loadDocument(currentDocument.id)
            }
          }}
          testId={testId}
        />
        {sharedDocumentDialogs}
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
          <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-blank-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-blank-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStartUpload}>
          <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-indigo-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-upload-word-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-upload-word-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStartPdfUpload}>
          <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-red-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-upload-pdf-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-upload-pdf-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStartOdfUpload}>
          <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-teal-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-upload-odf-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-upload-odf-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setActiveSection('templates')}>
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-from-template-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-from-template-description')}</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setCreateTemplateDialogOpen(true)}
          data-testid="document-apps-hub-new-create-template"
        >
          <LayoutTemplate className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
          <div>
            <div className="gba:font-medium">{t('menu-new-create-template-title')}</div>
            <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-create-template-description')}</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <DocumentHero
        activeSection={activeSection}
        onSectionChange={s => setActiveSection(s as SidebarSection)}
        newButton={heroNewButton}
        t={t}
        data-testid={`${testId}-hero`}
      />

      {/* Main Content */}
      <main className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden">
        {/* Upload View (Word) */}
        {currentView === 'upload' && (
          <div className="gba:flex-1 gba:overflow-auto gba:p-8">
            <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
              <Button variant="ghost" onClick={handleBack} className="gba:mb-4">
                <X className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('common-cancel')}
              </Button>

              <div className="gba:text-center gba:mb-8">
                <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Upload className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">{t('upload-word-title')}</h2>
                <p className="gba:text-muted-foreground">{t('upload-word-description')}</p>
              </div>

              <WordUploader
                onFileParsed={handleWordFileParsed}
                onError={error => toast.error(error)}
                isSavingDraft={isSavingImportDraft}
                hasSavedDraft={!!savedImportDocumentId}
                onOpenSavedDraft={handleOpenSavedImport}
                onClearSavedDraft={handleResetImportDraft}
                data-testid={`${testId}-uploader`}
              />
            </div>
          </div>
        )}

        {/* Upload PDF View */}
        {currentView === 'upload-pdf' && (
          <div className="gba:flex-1 gba:overflow-auto gba:p-8">
            <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
              <div className="gba:text-center gba:mb-8">
                <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-red-500 gba:to-red-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <FileText className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">{t('upload-pdf-title')}</h2>
                <p className="gba:text-muted-foreground">{t('upload-pdf-description')}</p>
              </div>

              <PdfUploader
                accessToken={accessToken}
                onUploadComplete={async document => {
                  // Navigate to the document viewer
                  setSelectedDocumentId(document.id)
                  await loadDocument(document.id)
                  setCurrentView('editor')
                  updateUrl(document.id, 'editor')
                  toast.success(t('toast-pdf-uploaded'))
                }}
                onError={error => toast.error(error)}
                onCancel={handleBack}
                data-testid={`${testId}-pdf-uploader`}
              />
            </div>
          </div>
        )}

        {/* Upload ODF View */}
        {currentView === 'upload-odf' && (
          <div className="gba:flex-1 gba:overflow-auto gba:p-8">
            <div className="gba:max-w-2xl gba:mx-auto gba:space-y-6">
              <Button variant="ghost" onClick={handleBack} className="gba:mb-4">
                <X className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('common-cancel')}
              </Button>

              <div className="gba:text-center gba:mb-8">
                <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-teal-500 gba:to-teal-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Upload className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">{t('upload-odf-title')}</h2>
                <p className="gba:text-muted-foreground">{t('upload-odf-description')}</p>
              </div>

              <OdfUploader
                onFileParsed={handleOdfFileParsed}
                onError={error => toast.error(error)}
                isSavingDraft={isSavingImportDraft}
                hasSavedDraft={!!savedImportDocumentId}
                onOpenSavedDraft={handleOpenSavedImport}
                onClearSavedDraft={handleResetImportDraft}
                data-testid={`${testId}-odf-uploader`}
              />
            </div>
          </div>
        )}

        {/* Templates View */}
        {currentView === 'list' && activeSection === 'templates' && (
          <>
            <div className="gba:flex-1 gba:overflow-auto gba:p-6">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
                <TemplateGallery
                  templates={templates}
                  onSelectTemplate={handleSelectTemplate}
                  onEditTemplate={handleEditTemplate}
                  data-testid={`${testId}-templates`}
                />
              </div>
            </div>
          </>
        )}

        {currentView === 'list' && activeSection === 'trash' && (
          <>
            <div className="gba:flex-1 gba:overflow-auto">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5">
                <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
                  <div className="gba:relative">
                    <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                    <Input
                      placeholder={t('documents-header-search-placeholder')}
                      value={trashSearchQuery}
                      onChange={e => setTrashSearchQuery(e.target.value)}
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
                        refreshLabel: t('header-refresh'),
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
              </div>
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full">
                {trashList.isLoading ? (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                    <Spinner size="lg" />
                  </div>
                ) : trashList.sortedItems.length === 0 ? (
                  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
                    <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-blue-500/20 gba:to-indigo-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                      <FileText className="gba:w-12 gba:h-12 gba:text-blue-500" />
                    </div>
                    <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                      {t('documents-empty-trash-title')}
                    </h3>
                    <p className="gba:text-muted-foreground gba:text-center gba:max-w-md">
                      {t('documents-empty-trash-description')}
                    </p>
                  </div>
                ) : (
                  <OfficeTrashListTable
                    items={trashList.sortedItems}
                    listControls={{
                      refreshLabel: t('header-refresh'),
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
                    onOpenItem={item => handleOpenTrashedDocument(item.id)}
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
                      <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:bg-blue-500/10">
                        <FileText className="gba:w-5 gba:h-5 gba:text-blue-600" />
                      </div>
                    )}
                    data-testid={`${testId}-trash-list`}
                  />
                )}
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
        )}

        {/* List View */}
        {currentView === 'list' && activeSection !== 'templates' && activeSection !== 'trash' && (
          <>
            {/* Content Area */}
            <div className="gba:flex-1 gba:overflow-auto">
              <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5">
                {/* Spotlight search bar */}
                <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
                  <div className="gba:relative">
                    <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
                    <Input
                      placeholder={t('documents-header-search-placeholder')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="gba:pl-12 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm hover:gba:shadow-md hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200"
                      data-testid={`${testId}-search-input`}
                    />
                  </div>

                  {/* Actions row */}
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {selectedDocuments.size > 0 ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocuments(new Set())}
                          data-testid={`${testId}-bulk-clear`}
                        >
                          <X className="gba:w-4 gba:h-4 gba:mr-1" />
                          {t('header-selected-count', { count: selectedDocuments.size })}
                        </Button>
                        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:text-destructive"
                          onClick={handleBulkDeleteDocuments}
                          data-testid={`${testId}-bulk-delete`}
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
                          onClick={() => refreshDocuments()}
                          className="gba:gap-1.5 gba:h-7 gba:text-xs"
                          data-testid={`${testId}-refresh`}
                        >
                          <RefreshCw className="gba:w-3.5 gba:h-3.5" />
                          {t('header-refresh')}
                        </Button>

                        <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
                          {/* Sort controls */}
                          <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
                            <select
                              value={sortBy}
                              onChange={e => setSortBy(e.target.value as 'name' | 'modified' | 'created')}
                              className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
                              data-testid={`${testId}-sort-select`}
                            >
                              <option value="modified">{t('sort-modified')}</option>
                              <option value="name">{t('sort-name')}</option>
                              <option value="created">{t('sort-created')}</option>
                            </select>
                            <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                            <button
                              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
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
                {isLoadingDocuments && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                    <Spinner size="lg" />
                  </div>
                )}

                {/* Error state */}
                {documentsError && (
                  <div className="gba:p-6">
                    <Card className="gba:p-6 gba:text-center">
                      <AlertCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
                      <p className="gba:text-destructive">{documentsError}</p>
                    </Card>
                  </div>
                )}

                {/* Empty state */}
                {!isLoadingDocuments && !documentsError && filteredDocuments.length === 0 && (
                  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-20 gba:px-4">
                    <div className="gba:w-24 gba:h-24 gba:rounded-3xl gba:bg-gradient-to-br gba:from-blue-500/20 gba:to-indigo-500/20 gba:flex gba:items-center gba:justify-center gba:mb-6">
                      <FileText className="gba:w-12 gba:h-12 gba:text-blue-500" />
                    </div>
                    <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
                      {getEmptyStateTitle()}
                    </h3>
                    <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                      {getEmptyStateDescription()}
                    </p>
                    {activeSection !== 'favorites' && activeSection !== 'shared' && (
                      <div className="gba:flex gba:gap-3">
                        <Button onClick={handleCreateNew}>
                          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('empty-create-document')}
                        </Button>
                        <Button variant="outline" onClick={handleStartUpload}>
                          <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                          {t('empty-upload-word')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* List View */}
                {!isLoadingDocuments && filteredDocuments.length > 0 && viewLayout === 'list' && (
                  <div className="gba:w-full">
                    {/* Table Header */}
                    <div className="gba:sticky gba:top-0 gba:bg-muted/50 gba:border-b gba:z-10">
                      <div className="gba:flex gba:items-center gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
                        <div className="gba:w-8 gba:flex-shrink-0">
                          <Checkbox
                            checked={
                              selectedDocuments.size === paginatedDocuments.length && paginatedDocuments.length > 0
                            }
                            onCheckedChange={selectAllDocuments}
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
                          {t('table-name')}
                          {sortBy === 'name' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                        </div>
                        <div
                          className="gba:w-36 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                          onClick={() => {
                            setSortBy('modified')
                            setSortOrder(sortBy === 'modified' && sortOrder === 'desc' ? 'asc' : 'desc')
                          }}
                        >
                          {t('table-modified')}
                          {sortBy === 'modified' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                        </div>
                        <div className="gba:w-40 gba:flex-shrink-0">{t('table-owner')}</div>
                        <div
                          className="gba:w-32 gba:flex-shrink-0 gba:cursor-pointer hover:gba:text-foreground gba:flex gba:items-center gba:gap-1"
                          onClick={() => {
                            setSortBy('created')
                            setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc')
                          }}
                        >
                          {t('table-created')}
                          {sortBy === 'created' && <ArrowUpDown className="gba:w-3 gba:h-3" />}
                        </div>
                        <div className="gba:w-10 gba:flex-shrink-0" />
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="gba:divide-y gba:divide-border">
                      {paginatedDocuments.map(doc => {
                        const isOwner = doc.isOwner || doc.permission === 'owner'
                        const isSelected = selectedDocuments.has(doc.id)
                        const isFavorite = favorites.has(doc.id)
                        const ownerInfo = doc.createdBy ? ownerInfoMap.get(doc.createdBy) : undefined
                        const sharedWith = sharedUsersMap[doc.id] || []
                        const approvalMetadata = doc.settings?.approvalMetadata
                        const canSendForApproval = isOwner && !approvalMetadata?.hasOpenApproval

                        return (
                          <div
                            key={doc.id}
                            className={`gba:flex gba:items-center gba:px-4 gba:py-3 gba:transition-colors gba:cursor-pointer ${
                              isSelected ? 'gba:bg-primary/5' : 'hover:gba:bg-muted/30'
                            }`}
                            onClick={() => handleOpenDocument(doc.id)}
                          >
                            {/* Checkbox */}
                            <div className="gba:w-8 gba:flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectDocument(doc.id)} />
                            </div>

                            {/* Star */}
                            <div className="gba:w-8 gba:flex-shrink-0">
                              <button
                                onClick={e => toggleFavorite(doc.id, e)}
                                className={`gba:p-1 gba:rounded hover:gba:bg-muted ${isFavorite ? 'gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
                              >
                                <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                              </button>
                            </div>

                            {/* Name & Icon */}
                            <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center gba:gap-3">
                              <div
                                className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
                                  doc.settings?.external
                                    ? 'gba:bg-info-secondary'
                                    : doc.isPdf
                                      ? 'gba:bg-red-500/10'
                                      : 'gba:bg-blue-500/10'
                                }`}
                              >
                                {doc.settings?.external ? (
                                  <ExternalLink className="gba:w-5 gba:h-5 gba:text-info" />
                                ) : doc.isPdf ? (
                                  <FileType className="gba:w-5 gba:h-5 gba:text-red-600" />
                                ) : (
                                  <FileText className="gba:w-5 gba:h-5 gba:text-blue-600" />
                                )}
                              </div>
                              <div className="gba:min-w-0">
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <span className="gba:font-medium gba:text-foreground gba:truncate">
                                    {doc.title || t('title-untitled')}
                                  </span>
                                  {doc.approvalStatus === 'pending' && (
                                    <Badge variant="default" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                      {t('status-pending')}
                                    </Badge>
                                  )}
                                  {approvalMetadata?.currentApprovedVersion && (
                                    <Badge
                                      variant="secondary"
                                      className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:bg-success/20 gba:text-success"
                                    >
                                      {t('status-approved')}
                                    </Badge>
                                  )}
                                  {doc.isShared && !isOwner && (
                                    <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                      {t('status-shared')}
                                    </Badge>
                                  )}
                                  {doc.settings?.external && (
                                    <Badge
                                      variant="secondary"
                                      className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:gap-0.5"
                                    >
                                      <ExternalLink className="gba:w-2.5 gba:h-2.5" />
                                      {doc.settings.external.connectorName}
                                    </Badge>
                                  )}
                                  {isOwner && sharedWith.length > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation()
                                              handleManageSharesClick(doc.id)
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
                                          <p>{t('shared-with-count', { count: sharedWith.length })}</p>
                                          <p className="gba:text-xs gba:text-muted-foreground">
                                            {t('shared-click-manage')}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {doc.description && (
                                  <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Modified */}
                            <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                              {formatDate(doc.updatedAt, t, locale)}
                            </div>

                            {/* Owner */}
                            <div className="gba:w-40 gba:flex-shrink-0">
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Avatar className="gba:w-6 gba:h-6">
                                  {ownerInfo?.avatar && <AvatarImage src={ownerInfo.avatar} />}
                                  <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                                    {ownerInfo?.name ? (
                                      getInitials(ownerInfo.name)
                                    ) : (
                                      <User className="gba:w-3 gba:h-3" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="gba:text-sm gba:text-muted-foreground gba:truncate">
                                  {isOwner ? t('owner-you') : ownerInfo?.name || t('owner-unknown')}
                                </span>
                              </div>
                            </div>

                            {/* Created */}
                            <div className="gba:w-32 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                              {formatDate(doc.createdAt, t, locale)}
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
                                  <DropdownMenuItem onClick={() => handleOpenDocument(doc.id)}>
                                    <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                                    {t('menu-open')}
                                  </DropdownMenuItem>
                                  {isOwner && (
                                    <DropdownMenuItem onClick={() => handleShareClick(doc.id)}>
                                      <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('menu-share')}
                                    </DropdownMenuItem>
                                  )}
                                  {isOwner && sharedWith.length > 0 && (
                                    <DropdownMenuItem onClick={() => handleManageSharesClick(doc.id)}>
                                      <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('menu-manage-sharing')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => copyLink(doc)}>
                                    <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                    {t('menu-copy-link')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateDocument(doc.id)}>
                                    <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                    {t('menu-duplicate')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {canSendForApproval && (
                                    <DropdownMenuItem onClick={() => handleSendForApprovalClick(doc.id)}>
                                      <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                                      {t('menu-send-for-approval')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => toggleFavorite(doc.id)}>
                                    <Star
                                      className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                                    />
                                    {isFavorite ? t('menu-remove-favorite') : t('menu-add-favorite')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gba:text-destructive"
                                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                  >
                                    <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                    {t('menu-delete')}
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
                {!isLoadingDocuments && filteredDocuments.length > 0 && viewLayout === 'grid' && (
                  <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4">
                    {paginatedDocuments.map(doc => {
                      const isOwner = doc.isOwner || doc.permission === 'owner'
                      const isSelected = selectedDocuments.has(doc.id)
                      const isFavorite = favorites.has(doc.id)
                      const approvalMetadata = doc.settings?.approvalMetadata

                      return (
                        <Card
                          key={doc.id}
                          className={`gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg ${
                            isSelected ? 'gba:ring-2 gba:ring-primary' : ''
                          }`}
                          onClick={() => handleOpenDocument(doc.id)}
                        >
                          {/* Preview area */}
                          <div
                            className={`gba:relative gba:aspect-[4/3] gba:bg-gradient-to-br gba:flex gba:items-center gba:justify-center gba:rounded-t-lg ${
                              doc.settings?.external
                                ? 'gba:from-info-secondary gba:to-info-secondary'
                                : doc.isPdf
                                  ? 'gba:from-red-500/10 gba:to-red-600/10'
                                  : 'gba:from-blue-500/10 gba:to-indigo-500/10'
                            }`}
                          >
                            {doc.settings?.external ? (
                              <ExternalLink className="gba:w-16 gba:h-16 gba:text-info/50" />
                            ) : doc.isPdf ? (
                              <FileType className="gba:w-16 gba:h-16 gba:text-red-500/50" />
                            ) : (
                              <FileText className="gba:w-16 gba:h-16 gba:text-blue-500/50" />
                            )}

                            {/* Hover overlay */}
                            <div className="gba:absolute gba:inset-0 gba:bg-black/0 group-hover:gba:bg-black/5 gba:transition-colors gba:rounded-t-lg" />

                            {/* Selection checkbox */}
                            <div
                              className={`gba:absolute gba:top-2 gba:left-2 gba:opacity-0 group-hover:gba:opacity-100 ${isSelected ? 'gba:opacity-100' : ''} gba:transition-opacity`}
                              onClick={e => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectDocument(doc.id)}
                                className="gba:bg-background"
                              />
                            </div>

                            {/* Favorite star */}
                            <button
                              className={`gba:absolute gba:top-2 gba:right-2 gba:p-1.5 gba:rounded-full gba:bg-background/80 gba:backdrop-blur-sm gba:opacity-0 group-hover:gba:opacity-100 ${isFavorite ? 'gba:opacity-100 gba:text-amber-500' : 'gba:text-muted-foreground hover:gba:text-foreground'} gba:transition-all`}
                              onClick={e => toggleFavorite(doc.id, e)}
                            >
                              <Star className={`gba:w-4 gba:h-4 ${isFavorite ? 'gba:fill-current' : ''}`} />
                            </button>

                            {/* Status badge */}
                            {doc.approvalStatus === 'pending' && (
                              <Badge variant="default" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                                {t('menu-send-for-approval')}
                              </Badge>
                            )}

                            {doc.approvalStatus !== 'pending' && approvalMetadata?.currentApprovedVersion && (
                              <Badge
                                variant="secondary"
                                className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px] gba:bg-success/20 gba:text-success"
                              >
                                {t('status-approved')}
                              </Badge>
                            )}

                            {/* Shared badge */}
                            {doc.isShared && !isOwner && (
                              <Badge
                                variant="secondary"
                                className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]"
                              >
                                <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                                {t('status-shared')}
                              </Badge>
                            )}

                            {/* External source badge */}
                            {doc.settings?.external && (
                              <Badge
                                variant="secondary"
                                className="gba:absolute gba:bottom-2 gba:right-2 gba:text-[10px] gba:gap-0.5"
                              >
                                <ExternalLink className="gba:w-2.5 gba:h-2.5" />
                                {doc.settings.external.connectorName}
                              </Badge>
                            )}
                          </div>

                          {/* Info */}
                          <div className="gba:p-3">
                            <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                              {doc.title || t('title-untitled')}
                            </h3>
                            <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                              <span>{formatRelativeTime(doc.updatedAt, t, locale)}</span>
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
            {!isLoadingDocuments && filteredDocuments.length > 0 && (
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
          </>
        )}

        <CreateTemplateDialog
          open={createTemplateDialogOpen}
          onOpenChange={setCreateTemplateDialogOpen}
          createTemplate={createTemplate}
          onCreated={(template, options) => {
            setSessionEntityContext(options?.entityContext ?? null)
            setTemplateBeingEdited(template)
            setCurrentView('editor')
          }}
          data-testid={`${testId}-create-template-dialog`}
        />
      </main>

      <DeleteConfirmDialog
        open={trashConfirmOpen}
        onOpenChange={handleTrashConfirmOpenChange}
        itemNames={pendingTrashDocuments.map(document => document.name)}
        onConfirm={() => {
          void confirmMoveToTrash()
        }}
        isDeleting={isMovingToTrash}
        t={t}
        data-testid={`${testId}-trash-confirm`}
      />

      {sharedDocumentDialogs}
    </div>
  )
}

export default DocumentAppsHub
