/**
 * DocumentAppsHub Component
 *
 * The main entry point for the Document Apps feature.
 * Modern OneDrive-inspired design with sidebar navigation.
 */

import React, { useState, useCallback, useRef } from 'react'
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
  ChevronLeft
} from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'

// Components
import { WordUploader } from './components/WordUploader'
import { PdfUploader } from './components/PdfUploader'
import { TemplateGallery } from './components/TemplateGallery'
import { CreateTemplateDialog } from './components/CreateTemplateDialog'
import { SendForApprovalDialog } from './components/SendForApprovalDialog'
import { ShareDocumentDialog } from './components/ShareDocumentDialog'
import { ManageSharesDialog } from './components/ManageSharesDialog'
import { PagedDocumentEditor } from './components/PagedDocumentEditor'
import { PdfDocumentViewer } from './components/PdfDocumentViewer'
import type { PagedDocumentEditorRef } from './components/PagedDocumentEditor'
import { TemplateFieldsPanel } from './components/TemplateFieldsPanel'

// Hooks
import { useDocumentApps } from './hooks/useDocumentApps'
import { useDocumentTemplates } from './hooks/useDocumentTemplates'

import { useDocumentAppsHubUserLookup } from './hooks/useDocumentAppsHubUserLookup'
import { useDocumentAppsHubFavorites } from './hooks/useDocumentAppsHubFavorites'
import { useDocumentAppsHubFiltering } from './hooks/useDocumentAppsHubFiltering'
import { useDocumentAppsHubUrlState } from './hooks/useDocumentAppsHubUrlState'

// Entities / context
import { getContextForCategory } from './entities'

// Types
import type { DocumentTemplate, ParsedWordDocument, DocumentSummary } from './types'

export interface DocumentAppsHubProps extends BusinessAppContextProps {
  'data-testid'?: string
}

type HubView = 'list' | 'upload' | 'upload-pdf' | 'editor' | 'templates'
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
 * DocumentAppsHub Component
 */
export const DocumentAppsHub: React.FC<DocumentAppsHubProps> = ({
  accessToken,
  userInfo,
  entityContext,
  'data-testid': testId = 'document-apps-hub'
}) => {
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
  const [parsedWordDocument, setParsedWordDocument] = useState<ParsedWordDocument | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [documentForApproval, setDocumentForApproval] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [documentForShare, setDocumentForShare] = useState<string | null>(null)
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false)
  const [documentForManageShares, setDocumentForManageShares] = useState<string | null>(null)
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false)
  const [templateBeingEdited, setTemplateBeingEdited] = useState<DocumentTemplate | null>(null)
  const templateEditorRef = useRef<PagedDocumentEditorRef>(null)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Entity context: prop > URL ?entityContext= > category-derived (when editing a template) > default
  const urlEntityContext =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('entityContext') ?? undefined)
      : undefined
  const effectiveEntityContext =
    entityContext ??
    urlEntityContext ??
    (templateBeingEdited ? getContextForCategory(templateBeingEdited.category) : undefined) ??
    'recruitManager'

  // Hooks
  const {
    documents,
    currentDocument,
    isLoading: isLoadingDocuments,
    error: documentsError,
    storageMode,
    currentDocumentPermission,
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
    setSelectedDocumentId
  })

  const { ownerInfoMap, sharedUsersMap, refreshSharedUsersForDocument } = useDocumentAppsHubUserLookup({
    accessToken,
    documents
  })

  const { sharedDocuments, filteredDocuments } = useDocumentAppsHubFiltering({
    documents,
    activeSection,
    favorites,
    searchQuery,
    sortBy,
    sortOrder
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
      title: 'Untitled Document',
      content: '<p></p>',
      status: 'draft',
      createdBy: currentUserId
    })

    if (newDoc) {
      setSelectedDocumentId(newDoc.id)
      setCurrentView('editor')
      updateUrl(newDoc.id, 'editor')
    }
  }, [createDocument, currentUserId, updateUrl])

  /**
   * Handle template selection
   */
  const handleSelectTemplate = useCallback(
    async (template: DocumentTemplate) => {
      const newDoc = await createDocumentFromTemplate(template.id, `New ${template.name}`)
      if (newDoc) {
        await loadDocument(newDoc.id)
        setSelectedDocumentId(newDoc.id)
        setCurrentView('editor')
        updateUrl(newDoc.id, 'editor')
      }
    },
    [createDocumentFromTemplate, loadDocument, updateUrl]
  )

  /**
   * Handle edit template: load full template and open in editor
   */
  const handleEditTemplate = useCallback(
    async (template: { id: string }) => {
      const full = await loadTemplate(template.id)
      if (full) {
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
      if (confirm('Are you sure you want to delete this document?')) {
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
    [deleteDocument, selectedDocumentId, updateUrl]
  )

  /**
   * Handle duplicate document
   */
  const handleDuplicateDocument = useCallback(
    async (id: string) => {
      await duplicateDocument(id)
      toast.success('Document duplicated')
    },
    [duplicateDocument]
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
   * Go back to list
   */
  const handleBack = useCallback(() => {
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
  const copyLink = useCallback((doc: DocumentSummary) => {
    const url = new URL(window.location.href)
    url.searchParams.set('docId', doc.id)
    url.searchParams.set('view', 'editor')
    navigator.clipboard.writeText(url.toString())
    toast.success('Link copied to clipboard')
  }, [])

  // Get section title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'home':
        return 'Home'
      case 'my-documents':
        return 'My Documents'
      case 'shared':
        return 'Shared with me'
      case 'templates':
        return 'Templates'
      case 'favorites':
        return 'Favorites'
      case 'recent':
        return 'Recent'
      case 'archived':
        return 'Archived'
      default:
        return 'Documents'
    }
  }

  // Render editor view
  if (currentView === 'editor') {
    const canEdit = currentDocumentPermission === 'owner' || currentDocumentPermission === 'edit'

    // If editing a template, show editor with template content, "Insert field" panel, and save to template
    if (templateBeingEdited) {
      return (
        <PagedDocumentEditor
          ref={templateEditorRef}
          key={`template-${templateBeingEdited.id}`}
          initialContent={templateBeingEdited.content}
          initialTitle={templateBeingEdited.name}
          leftPanel={
            <TemplateFieldsPanel
              onInsertField={placeholder => templateEditorRef.current?.insertAtCursor(placeholder)}
              accessToken={accessToken}
              context={effectiveEntityContext}
              templateContent={templateBeingEdited.content}
              data-testid={`${testId}-template-fields-panel`}
            />
          }
          onSave={async (title, content) => {
            const updated = await updateTemplate(templateBeingEdited.id, { name: title, content })
            if (updated) {
              setTemplateBeingEdited(updated)
              toast.success('Template saved')
            }
          }}
          onBack={() => {
            setTemplateBeingEdited(null)
            setCurrentView('list')
            setActiveSection('templates')
          }}
          onSendForApproval={() => {
            toast.info('Templates are edited here; use documents for approval workflow.')
          }}
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-template-editor`}
        />
      )
    }

    // If we have a parsed Word document (from upload), create a new document with that content
    if (parsedWordDocument && !currentDocument) {
      return (
        <PagedDocumentEditor
          initialContent={parsedWordDocument.html}
          initialTitle={parsedWordDocument.fileName.replace(/\.(docx?|doc)$/i, '')}
          onSave={async (title, content) => {
            const newDoc = await createDocument({
              title,
              content,
              status: 'draft',
              createdBy: currentUserId,
              sourceFile: {
                originalName: parsedWordDocument.fileName,
                fileSize: parsedWordDocument.fileSize,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                uploadedAt: new Date().toISOString()
              }
            })
            if (newDoc) {
              setParsedWordDocument(null)
              setSelectedDocumentId(newDoc.id)
              await loadDocument(newDoc.id)
              updateUrl(newDoc.id, 'editor')
            }
          }}
          onBack={handleBack}
          onSendForApproval={() => {
            toast.info('Please save the document first before sending for approval')
          }}
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-editor`}
        />
      )
    }

    // If we have a current document loaded
    if (currentDocument) {
      // Check if this is a PDF document - render read-only viewer
      const isPdfDocument = currentDocument.sourceFile?.mimeType === 'application/pdf'
      
      if (isPdfDocument) {
        return (
          <PdfDocumentViewer
            key={currentDocument.id}
            document={currentDocument}
            accessToken={accessToken}
            onBack={handleBack}
            data-testid={`${testId}-pdf-viewer`}
          />
        )
      }

      return (
        <PagedDocumentEditor
          key={currentDocument.id}
          document={currentDocument}
          onSave={async (title, content) => {
            await updateDocument(currentDocument.id, { title, content })
          }}
          onBack={handleBack}
          onSendForApproval={() => handleSendForApprovalClick(currentDocument.id)}
          isReadOnly={!canEdit}
          accessToken={accessToken}
          userInfo={userInfo}
          data-testid={`${testId}-editor`}
        />
      )
    }

    // Fallback - new document
    return (
      <PagedDocumentEditor
        onSave={async (title, content) => {
          const newDoc = await createDocument({
            title,
            content,
            status: 'draft',
            createdBy: currentUserId
          })
          if (newDoc) {
            setSelectedDocumentId(newDoc.id)
            await loadDocument(newDoc.id)
            updateUrl(newDoc.id, 'editor')
          }
        }}
        onBack={handleBack}
        onSendForApproval={() => {
          toast.info('Please save the document first before sending for approval')
        }}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateTo('/platform/every-office')}
                  data-testid={`${testId}-back-to-desk`}
                  className="gba:mb-2"
                >
                  <ChevronLeft className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Desk</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Existing brand section */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:flex gba:items-center gba:justify-center">
              <FileText className="gba:w-5 gba:h-5 gba:text-white" />
            </div>
            <div>
              <h1 className="gba:font-semibold gba:text-foreground">Documents</h1>
              <p className="gba:text-xs gba:text-muted-foreground">NEWWORK Apps</p>
            </div>
          </div>
        </div>

        {/* New Button */}
        <div className="gba:p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gba:w-full gba:justify-start gba:gap-2 gba:bg-gradient-to-r gba:from-blue-500 gba:to-indigo-600 gba:text-white hover:gba:from-blue-600 hover:gba:to-indigo-700">
                <Plus className="gba:w-4 gba:h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-56">
              <DropdownMenuItem onClick={handleCreateNew}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-blue-500" />
                <div>
                  <div className="gba:font-medium">Blank Document</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Start from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartUpload}>
                <Upload className="gba:w-4 gba:h-4 gba:mr-2 gba:text-indigo-500" />
                <div>
                  <div className="gba:font-medium">Upload Word</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Import .docx or .doc file</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartPdfUpload}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-red-500" />
                <div>
                  <div className="gba:font-medium">Upload PDF</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Import PDF for search & Q&A</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection('templates')}>
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
              onClick={() => setActiveSection('my-documents')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'my-documents'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <FolderClosed className="gba:w-4 gba:h-4" />
              My Documents
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
              {sharedDocuments.length > 0 && (
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {sharedDocuments.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveSection('templates')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'templates'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <LayoutTemplate className="gba:w-4 gba:h-4" />
              Templates
              {templates.length > 0 && (
                <Badge variant="secondary" className="gba:ml-auto gba:text-xs">
                  {templates.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveSection('favorites')}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors ${
                activeSection === 'favorites'
                  ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                  : 'gba:text-muted-foreground hover:gba:bg-muted/50 hover:gba:text-foreground'
              }`}
            >
              <Star className="gba:w-4 gba:h-4" />
              Favorites
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
            <p className="gba:px-3 gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Storage</p>
            <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/30">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <Database
                  className={`gba:w-4 gba:h-4 ${storageMode === 'database' ? 'gba:text-blue-500' : 'gba:text-amber-500'}`}
                />
                <span className="gba:text-xs gba:text-muted-foreground">
                  {storageMode === 'database' ? 'Cloud storage' : 'Local storage'}
                </span>
              </div>
              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                <div
                  className="gba:h-full gba:bg-gradient-to-r gba:from-blue-500 gba:to-indigo-500 gba:rounded-full"
                  style={{ width: `${Math.min((documents.length / 50) * 100, 100)}%` }}
                />
              </div>
              <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">{documents.length} documents</p>
            </div>
          </div>
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
                Cancel
              </Button>

              <div className="gba:text-center gba:mb-8">
                <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-blue-500 gba:to-indigo-600 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                  <Upload className="gba:w-8 gba:h-8 gba:text-white" />
                </div>
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">Upload Word Document</h2>
                <p className="gba:text-muted-foreground">Upload your Word document and we'll preserve the formatting</p>
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
                <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">Upload PDF Document</h2>
                <p className="gba:text-muted-foreground">
                  Upload a PDF to make it searchable and available for Q&A in Desk
                </p>
              </div>

              <PdfUploader
                accessToken={accessToken}
                onUploadComplete={async document => {
                  // Navigate to the document viewer
                  setSelectedDocumentId(document.id)
                  await loadDocument(document.id)
                  setCurrentView('editor')
                  updateUrl(document.id, 'editor')
                  toast.success('PDF uploaded successfully')
                }}
                onError={error => toast.error(error)}
                onCancel={handleBack}
                data-testid={`${testId}-pdf-uploader`}
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
                  <h2 className="gba:text-xl gba:font-semibold">Templates</h2>
                </div>
              </div>
            </header>
            <div className="gba:flex-1 gba:overflow-auto gba:p-6">
              <TemplateGallery
                templates={templates}
                onSelectTemplate={handleSelectTemplate}
                onCreateTemplate={() => setCreateTemplateDialogOpen(true)}
                onEditTemplate={handleEditTemplate}
                data-testid={`${testId}-templates`}
              />
            </div>
            <CreateTemplateDialog
              open={createTemplateDialogOpen}
              onOpenChange={setCreateTemplateDialogOpen}
              createTemplate={createTemplate}
              currentUserId={currentUserId}
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
                    {activeSection === 'favorites'
                      ? 'No favorites yet'
                      : activeSection === 'shared'
                        ? 'Nothing shared with you'
                        : activeSection === 'archived'
                          ? 'No archived documents'
                          : 'No documents yet'}
                  </h3>
                  <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
                    {activeSection === 'favorites'
                      ? 'Star your frequently used documents to see them here.'
                      : activeSection === 'shared'
                        ? 'When someone shares a document with you, it will appear here.'
                        : activeSection === 'archived'
                          ? 'Archived documents will appear here.'
                          : 'Create your first document to get started.'}
                  </p>
                  {activeSection !== 'favorites' && activeSection !== 'shared' && activeSection !== 'archived' && (
                    <div className="gba:flex gba:gap-3">
                      <Button onClick={handleCreateNew}>
                        <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                        Create Document
                      </Button>
                      <Button variant="outline" onClick={handleStartUpload}>
                        <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                        Upload Word
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
                          checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
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
                    {filteredDocuments.map(doc => {
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
                            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-blue-500/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                              <FileText className="gba:w-5 gba:h-5 gba:text-blue-600" />
                            </div>
                            <div className="gba:min-w-0">
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span className="gba:font-medium gba:text-foreground gba:truncate">
                                  {doc.title || 'Untitled'}
                                </span>
                                {doc.status === 'pending_approval' && (
                                  <Badge variant="default" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                    Pending
                                  </Badge>
                                )}
                                {doc.status === 'approved' && (
                                  <Badge
                                    variant="secondary"
                                    className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:bg-success/20 gba:text-success"
                                  >
                                    Approved
                                  </Badge>
                                )}
                                {doc.isShared && !isOwner && (
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
                                        <p>
                                          Shared with {sharedWith.length}{' '}
                                          {sharedWith.length === 1 ? 'person' : 'people'}
                                        </p>
                                        <p className="gba:text-xs gba:text-muted-foreground">Click to manage</p>
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
                            {formatDate(doc.updatedAt)}
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
                            {formatDate(doc.createdAt)}
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
                                  Open
                                </DropdownMenuItem>
                                {isOwner && (
                                  <DropdownMenuItem onClick={() => handleShareClick(doc.id)}>
                                    <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                )}
                                {isOwner && sharedWith.length > 0 && (
                                  <DropdownMenuItem onClick={() => handleManageSharesClick(doc.id)}>
                                    <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                                    Manage sharing
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => copyLink(doc)}>
                                  <Link2 className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateDocument(doc.id)}>
                                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canSendForApproval && (
                                  <DropdownMenuItem onClick={() => handleSendForApprovalClick(doc.id)}>
                                    <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                                    Send for Approval
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => toggleFavorite(doc.id)}>
                                  <Star
                                    className={`gba:w-4 gba:h-4 gba:mr-2 ${isFavorite ? 'gba:fill-current gba:text-amber-500' : ''}`}
                                  />
                                  {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gba:text-destructive"
                                  onClick={() => handleDeleteDocument(doc.id)}
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
              {!isLoadingDocuments && filteredDocuments.length > 0 && viewLayout === 'grid' && (
                <div className="gba:p-6 gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:xl:grid-cols-5 gba:gap-4">
                  {filteredDocuments.map(doc => {
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
                        <div className="gba:relative gba:aspect-[4/3] gba:bg-gradient-to-br gba:from-blue-500/10 gba:to-indigo-500/10 gba:flex gba:items-center gba:justify-center gba:rounded-t-lg">
                          <FileText className="gba:w-16 gba:h-16 gba:text-blue-500/50" />

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
                              Pending Approval
                            </Badge>
                          )}

                          {/* Shared badge */}
                          {doc.isShared && !isOwner && (
                            <Badge variant="secondary" className="gba:absolute gba:bottom-2 gba:left-2 gba:text-[10px]">
                              <Users className="gba:w-3 gba:h-3 gba:mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>

                        {/* Info */}
                        <div className="gba:p-3">
                          <h3 className="gba:font-medium gba:text-foreground gba:truncate gba:mb-1">
                            {doc.title || 'Untitled'}
                          </h3>
                          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
                            <span>{formatRelativeTime(doc.updatedAt)}</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
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
          documentTitle={documents.find(d => d.id === documentForApproval)?.title || 'Untitled Document'}
          currentUserId={currentUserId}
          currentUserName={userInfo?.displayName || userInfo?.employeeDetails?.displayName}
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
          documentTitle={documents.find(d => d.id === documentForShare)?.title || 'Untitled Document'}
          currentUserId={currentUserId}
          currentUserName={userInfo?.displayName || userInfo?.employeeDetails?.displayName}
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
          documentTitle={documents.find(d => d.id === documentForManageShares)?.title || 'Untitled Document'}
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
    </div>
  )
}

export default DocumentAppsHub
