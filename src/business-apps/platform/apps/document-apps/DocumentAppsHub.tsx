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
  AiButton,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Database,
  AlertCircle,
  LayoutTemplate,
  Users,
  Home,
  FolderClosed,
  Star,
  Clock,
  Trash2,
  MoreHorizontal,
  Share2,
  Link2,
  Copy,
  ArrowUpDown,
  Check,
  X,
  User,
  RefreshCw,
  List,
  LayoutGrid,
  Archive,
  Send,
  Sparkles,
  Wand2,
  ChevronLeft,
  FileType,
  PanelLeftClose,
  PanelLeft,
  ExternalLink
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { buildDocumentCreatePrompt } from '@/common/utils/buildDocumentCreatePrompt'
import { openEveryAI } from '@/common/utils/openEveryAI'

// Components
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
import { HubPaginationFooter } from '../shared/components/HubPaginationFooter'

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
type SidebarSection = 'home' | 'my-documents' | 'shared' | 'templates' | 'favorites' | 'recent' | 'archived'

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
 * Format relative time (requires t from useTranslation)
 */
function formatRelativeTime(dateString: string, t: (k: string, vars?: Record<string, number>) => string): string {
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
  return date.toLocaleDateString()
}

/**
 * Format date for table display (requires t from useTranslation)
 */
function formatDate(dateString: string, t: (k: string, vars?: Record<string, number>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-ago-count', { count: diffDays })
  return date.toLocaleDateString('en-US', {
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
  const { t } = useTranslation(translations)

  // View state
  const [currentView, setCurrentView] = useState<HubView>('list')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SidebarSection>('my-documents')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'created'>('modified')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('document-hub-sidebar-collapsed')
    return saved === 'true'
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { favorites, setFavorites } = useDocumentAppsHubFavorites()

  // Data state
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [parsedWordDocument, setParsedWordDocument] = useState<ParsedWordDocument | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [documentForApproval, setDocumentForApproval] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [documentForShare, setDocumentForShare] = useState<string | null>(null)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [documentForManageShares, setDocumentForManageShares] = useState<string | null>(null)
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false)
  const [templateBeingEdited, setTemplateBeingEdited] = useState<DocumentTemplate | null>(null)
  const [createWithAiDialogOpen, setCreateWithAiDialogOpen] = useState(false)
  const [createWithAiTitle, setCreateWithAiTitle] = useState('Untitled Document')
  const [createWithAiAbout, setCreateWithAiAbout] = useState('')
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
    storageMode,
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

  // Update URL whenever activeSection changes (when user clicks sidebar)
  useEffect(() => {
    if (currentView === 'list' && !selectedDocumentId) {
      updateUrl(null)
    }
  }, [activeSection, currentView, selectedDocumentId, updateUrl])

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('document-hub-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

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
    if (activeSection !== 'templates') {
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

  const sharedDocuments = useMemo(() => documents.filter(d => d.isShared === true), [documents])

  const hubLookupDocuments =
    currentView === 'list' && activeSection !== 'templates' && viewLayout === 'list' ? paginatedDocuments : []

  const { ownerInfoMap, sharedUsersMap, refreshSharedUsersForDocument } = useDocumentAppsHubUserLookup({
    accessToken,
    documents: hubLookupDocuments,
    loadSharedUsers: hubLookupDocuments.length > 0
  })

  /**
   * Handle Word file parsed from uploader
   */
  const handleWordFileParsed = useCallback(async (parsed: ParsedWordDocument) => {
    setParsedWordDocument(parsed)
    setCurrentView('editor')
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
      setSelectedDocumentId(newDoc.id)
      setCurrentView('editor')
      updateUrl(newDoc.id, 'editor')
    }
  }, [createDocument, currentUserId, updateUrl, t])

  const handleCreateWithAi = useCallback(() => {
    setCreateWithAiDialogOpen(true)
  }, [])

  const handleSubmitCreateWithAi = useCallback(() => {
    const instruction = createWithAiAbout.trim()
    if (!instruction) return

    const prompt = buildDocumentCreatePrompt({
      title: createWithAiTitle.trim() || undefined,
      userInstruction: instruction
    })
    setCreateWithAiDialogOpen(false)
    setCreateWithAiTitle('Untitled Document')
    setCreateWithAiAbout('')
    openEveryAI({ prompt })

    // Fallback: if this shell does not handle openEveryAI events, navigate directly.
    globalThis.setTimeout(() => {
      const everyAiMounted = Boolean(document.querySelector('[data-testid="every-ai-app"]'))
      if (!everyAiMounted) {
        navigateTo('/platform/every-ai')
      }
    }, 800)
  }, [createWithAiAbout, createWithAiTitle])

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

  /**
   * Handle delete document
   */
  const handleDeleteDocument = useCallback(
    async (id: string) => {
      if (confirm(t('confirm-delete'))) {
        const success = await deleteDocument(id)
        if (success && selectedDocumentId === id) {
          setSelectedDocumentId(null)
          setCurrentView('list')
          updateUrl(null)
        }
        setSelectedDocuments(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [deleteDocument, selectedDocumentId, updateUrl, t]
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
    clearCurrentDocument()
    resetLoadAttempt()
    setSelectedDocumentId(null)
    setParsedWordDocument(null)
    setCurrentView('list')
    updateUrl(null)
  }, [clearCurrentDocument, resetLoadAttempt, updateUrl])

  /**
   * Start upload flow (Word)
   */
  const handleStartUpload = useCallback(() => {
    setParsedWordDocument(null)
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
    setParsedWordDocument(null)
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

  // Get section title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'home':
        return t('sidebar-home')
      case 'my-documents':
        return t('sidebar-my-items')
      case 'shared':
        return t('sidebar-shared')
      case 'templates':
        return t('sidebar-templates')
      case 'favorites':
        return t('sidebar-favorites')
      case 'recent':
        return t('sidebar-recent')
      case 'archived':
        return t('sidebar-archived')
      default:
        return t('sidebar-brand-title')
    }
  }

  const getEmptyStateTitle = () => {
    if (activeSection === 'favorites') return t('empty-favorites-title')
    if (activeSection === 'shared') return t('empty-shared-title')
    if (activeSection === 'archived') return t('empty-archived-title')
    return t('empty-default-title')
  }

  const getEmptyStateDescription = () => {
    if (activeSection === 'favorites') return t('empty-favorites-description')
    if (activeSection === 'shared') return t('empty-shared-description')
    if (activeSection === 'archived') return t('empty-archived-description')
    return t('empty-default-description')
  }

  // Render editor view
  if (currentView === 'editor') {
    return (
      <DocumentAppsHubEditorView
        templateBeingEdited={templateBeingEdited}
        setTemplateBeingEdited={setTemplateBeingEdited}
        setSessionEntityContext={setSessionEntityContext}
        parsedWordDocument={parsedWordDocument}
        setParsedWordDocument={setParsedWordDocument}
        setSelectedDocumentId={setSelectedDocumentId}
        currentDocument={currentDocument}
        currentDocumentPermission={currentDocumentPermission ?? ''}
        createDocument={async opts => createDocument(opts as Parameters<typeof createDocument>[0])}
        loadDocument={loadDocument}
        updateDocument={updateDocument}
        updateTemplate={updateTemplate}
        updateUrl={(docId, view) => updateUrl(docId, view as HubView | undefined)}
        setCurrentView={v => setCurrentView(v as HubView)}
        setActiveSection={s => setActiveSection(s as SidebarSection)}
        handleBack={handleBack}
        handleSendForApprovalClick={handleSendForApprovalClick}
        currentUserId={currentUserId}
        accessToken={accessToken}
        userInfo={userInfo}
        templateEditorRef={templateEditorRef}
        effectiveEntityContext={effectiveEntityContext ?? ''}
        testId={testId}
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
                  <TooltipContent>{t('sidebar-back-to-desk')}</TooltipContent>
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
                <TooltipContent>{isSidebarCollapsed ? t('sidebar-expand') : t('sidebar-collapse')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Brand section */}
          {!isSidebarCollapsed && (
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:flex gba:items-center gba:justify-center">
                <FileText className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
              <div>
                <h1 className="gba:font-semibold gba:text-foreground">{t('sidebar-brand-title')}</h1>
                <p className="gba:text-xs gba:text-muted-foreground">{t('sidebar-brand-subtitle')}</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:flex gba:justify-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:flex gba:items-center gba:justify-center">
                <FileText className="gba:w-5 gba:h-5 gba:text-white" />
              </div>
            </div>
          )}
        </div>

        {/* New Button */}
        <div className={isSidebarCollapsed ? 'gba:p-2' : 'gba:p-3'}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={`gba:w-full gba:gap-2 gba:bg-gradient-to-r gba:from-blue-500 gba:to-indigo-600 gba:text-white hover:gba:from-blue-600 hover:gba:to-indigo-700 ${isSidebarCollapsed ? 'gba:justify-center gba:px-0' : 'gba:justify-start'}`}
              >
                <Plus className="gba:w-4 gba:h-4" />
                {!isSidebarCollapsed && t('sidebar-new')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
              <DropdownMenuItem onClick={handleCreateNew}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
                <div>
                  <div className="gba:font-medium">{t('menu-new-blank-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-blank-description')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Draft a new document with AI</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateNew}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
                <div>
                  <div className="gba:font-medium">Blank Document</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateWithAi}>
                <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-purple-500" />
                <div>
                  <div className="gba:font-medium">Create with AI</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Draft a new document with Flowbot</div>
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
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {t('menu-new-create-template-description')}
                  </div>
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
                    {!isSidebarCollapsed && t('sidebar-home')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-home')}</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('my-documents')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'my-documents'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <FolderClosed className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && t('sidebar-my-items')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-my-items')}</TooltipContent>}
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
                        {t('sidebar-shared')}
                        {sharedDocuments.length > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {sharedDocuments.length}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {t('sidebar-shared')} {sharedDocuments.length > 0 && `(${sharedDocuments.length})`}
                  </TooltipContent>
                )}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveSection('templates')}
                    className={`gba:w-full gba:flex gba:items-center gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${isSidebarCollapsed ? 'gba:justify-center' : 'gba:gap-3'} ${
                      activeSection === 'templates'
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
                    }`}
                  >
                    <LayoutTemplate className="gba:w-4 gba:h-4" />
                    {!isSidebarCollapsed && (
                      <>
                        {t('sidebar-templates')}
                        {templates.length > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {templates.length}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {t('sidebar-templates')} {templates.length > 0 && `(${templates.length})`}
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
                    {!isSidebarCollapsed && (
                      <>
                        {t('sidebar-favorites')}
                        {favorites.size > 0 && (
                          <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                            {favorites.size}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    {t('sidebar-favorites')} {favorites.size > 0 && `(${favorites.size})`}
                  </TooltipContent>
                )}
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
                    {!isSidebarCollapsed && t('sidebar-recent')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-recent')}</TooltipContent>}
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
                    {!isSidebarCollapsed && t('sidebar-archived')}
                  </button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right">{t('sidebar-archived')}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>

          {!isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t">
              <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('sidebar-storage')}
              </p>
              <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <Database
                    className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-blue-500' : 'gba:text-amber-500'}`}
                  />
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {storageMode === 'database' ? t('sidebar-storage-cloud') : t('sidebar-storage-local')}
                  </span>
                </div>
                <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                  <div
                    className="gba:h-full gba:bg-gradient-to-r gba:from-blue-500 gba:to-indigo-500 gba:rounded-full"
                    style={{ width: `${Math.min((documents.length / 50) * 100, 100)}%` }}
                  />
                </div>
                <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                  {t('sidebar-storage-documents', { count: documents.length })}
                </p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:flex gba:justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="gba:p-2">
                      <Database
                        className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-blue-500' : 'gba:text-amber-500'}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div>
                      <p className="gba:font-medium">
                        {storageMode === 'database' ? t('sidebar-storage-cloud') : t('sidebar-storage-local')}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('sidebar-storage-documents', { count: documents.length })}
                      </p>
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
                onFileParsed={handleWordFileParsed}
                onError={error => toast.error(error)}
                data-testid={`${testId}-odf-uploader`}
              />
            </div>
          </div>
        )}

        {/* Templates View */}
        {currentView === 'list' && activeSection === 'templates' && (
          <>
            <header className="gba:border-b gba:bg-card">
              <div className="gba:px-6 gba:py-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <h2 className="gba:text-xl gba:font-semibold">{t('templates-title')}</h2>
                </div>
              </div>
            </header>
            <div className="gba:flex-1 gba:overflow-auto gba:p-6">
              <TemplateGallery
                templates={templates}
                onSelectTemplate={handleSelectTemplate}
                onEditTemplate={handleEditTemplate}
                data-testid={`${testId}-templates`}
              />
            </div>
            <CreateTemplateDialog
              open={createTemplateDialogOpen}
              onOpenChange={setCreateTemplateDialogOpen}
              createTemplate={createTemplate}
              currentUserId={currentUserId}
              onCreated={(template, options) => {
                setSessionEntityContext(options?.entityContext ?? null)
                setTemplateBeingEdited(template)
                setCurrentView('editor')
              }}
              data-testid={`${testId}-create-template-dialog`}
            />
          </>
        )}

        {/* List View */}
        {currentView === 'list' && activeSection !== 'templates' && (
          <>
            {/* Header */}
            <header className="gba:border-b gba:bg-card">
              <div className="gba:px-6 gba:py-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <h2 className="gba:text-xl gba:font-semibold">{getSectionTitle()}</h2>
                    {filteredDocuments.length > 0 && (
                      <>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gba:gap-1">
                              <ArrowUpDown className="gba:w-4 gba:h-4" />
                              {t('header-sort')}
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
                              {t('sort-name')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortBy('modified')
                                setSortOrder('desc')
                              }}
                            >
                              {sortBy === 'modified' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                              {t('sort-modified')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortBy('created')
                                setSortOrder('desc')
                              }}
                            >
                              {sortBy === 'created' && <Check className="gba:w-4 gba:h-4 gba:mr-2" />}
                              {t('sort-created')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => refreshDocuments()}>
                          <RefreshCw className="gba:w-4 gba:h-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:relative">
                      <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      <Input
                        placeholder={t('header-search-placeholder')}
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
                  <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">{getEmptyStateTitle()}</h3>
                  <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                    {getEmptyStateDescription()}
                  </p>
                  {activeSection !== 'favorites' && activeSection !== 'shared' && activeSection !== 'archived' && (
                    <div className="gba:flex gba:gap-3">
                      <Button onClick={handleCreateNew}>
                        <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('empty-create-document')}
                      </Button>
                      <AiButton
                        showIcon
                        icon={<Wand2 className="gba:w-4 gba:h-4 gba:text-purple-500" />}
                        iconPosition="before"
                        onClick={handleCreateWithAi}
                      >
                        Create with AI
                      </AiButton>
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
                      const canSendForApproval =
                        isOwner && !['pending_approval', 'approved', 'rejected'].includes(doc.status)

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
                                {doc.status === 'pending_approval' && (
                                  <Badge variant="default" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                    {t('status-pending')}
                                  </Badge>
                                )}
                                {doc.status === 'approved' && (
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
                                <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{doc.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Modified */}
                          <div className="gba:w-36 gba:flex-shrink-0 gba:text-sm gba:text-muted-foreground">
                            {formatDate(doc.updatedAt, t)}
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
                            {formatDate(doc.createdAt, t)}
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
                                  onClick={() => handleDeleteDocument(doc.id)}
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
                <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
                  {paginatedDocuments.map(doc => {
                    const isOwner = doc.isOwner || doc.permission === 'owner'
                    const isSelected = selectedDocuments.has(doc.id)
                    const isFavorite = favorites.has(doc.id)

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
                          {doc.status === 'pending_approval' && (
                            <Badge variant="default" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                              {t('menu-send-for-approval')}
                            </Badge>
                          )}

                          {/* Shared badge */}
                          {doc.isShared && !isOwner && (
                            <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
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
                            <span>{formatRelativeTime(doc.updatedAt, t)}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoadingDocuments && filteredDocuments.length > 0 && (
              <HubPaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={goToPage}
                data-testid={`${testId}-pagination`}
              />
            )}
          </>
        )}
      </main>

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
          onApprovalSent={async (approverIds, approverWorkflows) => {
            if (documentForApproval) {
              const workflowIds = approverWorkflows?.map(aw => aw.workflowId) || []
              await updateDocument(documentForApproval, {
                status: 'pending_approval',
                approvalRequest: {
                  id: `approval_${Date.now()}`,
                  documentId: documentForApproval,
                  status: 'pending',
                  requestedBy: currentUserId,
                  requestedAt: new Date().toISOString(),
                  approvers: approverIds.map(id => {
                    const workflow = approverWorkflows?.find(aw => aw.userId === id)
                    return {
                      userId: id,
                      userName: workflow?.userName,
                      status: 'pending' as const,
                      workflowId: workflow?.workflowId
                    }
                  }),
                  workflowIds
                }
              })
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

      <Dialog open={createWithAiDialogOpen} onOpenChange={setCreateWithAiDialogOpen}>
        <DialogContent data-testid={`${testId}-create-with-ai-dialog`}>
          <DialogHeader>
            <DialogTitle>Create document with AI</DialogTitle>
            <DialogDescription>Provide a title and what this document should be about.</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4">
            <div className="gba:space-y-2">
              <Label htmlFor="create-with-ai-title">Title</Label>
              <Input
                id="create-with-ai-title"
                value={createWithAiTitle}
                onChange={e => setCreateWithAiTitle(e.target.value)}
                placeholder="e.g. CRM Account Summary"
                data-testid={`${testId}-create-with-ai-title`}
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="create-with-ai-about">What is it about?</Label>
              <Textarea
                id="create-with-ai-about"
                value={createWithAiAbout}
                onChange={e => setCreateWithAiAbout(e.target.value)}
                placeholder="Describe the content and goal of the document..."
                rows={4}
                className="gba:resize-none"
                data-testid={`${testId}-create-with-ai-about`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateWithAiDialogOpen(false)}>
              Cancel
            </Button>
            <AiButton
              showIcon
              icon={<Wand2 className="gba:w-4 gba:h-4 gba:text-purple-500" />}
              iconPosition="before"
              onClick={handleSubmitCreateWithAi}
              disabled={!createWithAiAbout.trim()}
              data-testid={`${testId}-create-with-ai-submit`}
            >
              Create with AI
            </AiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentAppsHub
