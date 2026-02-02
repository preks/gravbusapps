import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  Button,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionMenu } from '@/components/app-action-menu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { FileInfo } from '@/common/types/FileTypes'
import {
  Eye,
  MoreHorizontal,
  File,
  Folder,
  Upload,
  ListTree,
  List,
  ChevronDown,
  ChevronRight,
  Search,
  Expand,
  Minimize,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Code,
  Download
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'

// Function to get appropriate icon based on file type
const getFileIcon = (document: DocumentItem) => {
  if (document.folder) {
    return <Folder className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-warning)' }} />
  }

  const fileName = document.name?.toLowerCase() || ''
  const mimeType = document.mimeType?.toLowerCase() || ''

  // PDF files
  if (fileName.endsWith('.pdf') || mimeType.includes('pdf')) {
    return <FileText className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-destructive)' }} />
  }

  // Word documents
  if (
    fileName.endsWith('.doc') ||
    fileName.endsWith('.docx') ||
    mimeType.includes('msword') ||
    mimeType.includes('wordprocessingml')
  ) {
    return <FileText className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-info)' }} />
  }

  // Excel files
  if (
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.csv') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheetml') ||
    mimeType.includes('csv')
  ) {
    return <FileSpreadsheet className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-success)' }} />
  }

  // PowerPoint files
  if (
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.pptx') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentationml')
  ) {
    return <FileText className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-warning)' }} />
  }

  // Image files
  if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/) || mimeType.startsWith('image/')) {
    return <FileImage className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-chart-5)' }} />
  }

  // Video files
  if (fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/) || mimeType.startsWith('video/')) {
    return <FileVideo className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-chart-7)' }} />
  }

  // Audio files
  if (fileName.match(/\.(mp3|wav|flac|aac|ogg|wma)$/) || mimeType.startsWith('audio/')) {
    return <FileAudio className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-chart-2)' }} />
  }

  // Archive files
  if (fileName.match(/\.(zip|rar|7z|tar|gz|bz2)$/) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return <Archive className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-muted-foreground)' }} />
  }

  // Code files
  if (
    fileName.match(/\.(js|ts|jsx|tsx|html|css|scss|json|xml|sql|py|java|cpp|c|php|rb|go|rs)$/) ||
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  ) {
    return <Code className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-chart-3)' }} />
  }

  // Text files
  if (fileName.endsWith('.txt') || mimeType.includes('text/plain')) {
    return <FileText className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-muted-foreground)' }} />
  }

  // Default file icon
  return <File className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-muted-foreground)' }} />
}

// Custom column interface for document table
export interface DocumentColumn {
  id: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (document: DocumentItem) => React.ReactNode
}

// Generic document interface for any entity type
export interface DocumentItem {
  id: string
  name?: string | null
  description?: string | null
  createdAt: string
  expirationDate?: string | null
  documentType?: {
    id: string
    value: string
    code?: string
  } | null
  documentGroup?: {
    id: string
    value: string
    code?: string
  } | null
  fileInfo?: FileInfo | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null
  parentDocument?: string | null
  folder?: boolean
  verified?: boolean
  verificationDate?: string | null
  authenticated?: boolean
  authenticationDate?: string | null
  mandatory?: boolean
  version?: number
}

export interface DocumentSectionProps extends BusinessAppContextProps {
  entityId: string
  documents: DocumentItem[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void

  // Dynamic API configuration for document operations
  apiConfig?: {
    baseEndpoint: string // e.g., '/investment-relations', '/crm'
    entityFieldName: string // e.g., 'opportunity', 'lead', 'account', 'contact', 'investment'
    documentFieldName: string // e.g., 'investmentDocument', 'crmDocument'

    // Required: Endpoint paths for document operations
    endpoints?: {
      create?: string // e.g., '/investment-relations/createInvestmentDocument', '/crm/createCrmDocument'
      update?: string // e.g., '/investment-relations/createInvestmentDocument' (with changeMode: UPDATE)
      delete?: string // e.g., '/investment-relations/deleteInvestmentDocument', '/crm/deleteCrmDocument'
    }
  }

  // Optional: Search control (parent handles search logic, this just provides UI)
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void

  // Custom menu actions configuration
  customActions?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    apiEndpoint?: string // e.g., '/your-service/deleteDocument'
    payload?: (documentId: string, document: DocumentItem, entityId: string) => any
    onClick?: (documentId: string, document: DocumentItem, entityId: string) => void | Promise<void>
    confirmMessage?: string // Optional confirmation dialog
  }>
  // Custom toolbar actions (upload, etc.)
  toolbarActions?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
    testId?: string
  }>
  uploadActionProps?: {
    contextsArray: FlowContextName[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  createFolderActionProps?: {
    contextsArray: FlowContextName[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  downloadActionProps?: {
    contextsArray: FlowContextName[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  'data-testid'?: string
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  entityId,
  documents = [],
  isLoading = false,
  error = null,
  onRefresh,
  apiConfig,
  searchTerm: externalSearchTerm,
  onSearchChange,
  customActions = [],
  toolbarActions = [],
  uploadActionProps,
  createFolderActionProps,
  downloadActionProps,
  accessToken,
  'data-testid': dataTestId = 'document-section'
}) => {
  // REST client for direct API calls
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // State for custom three dots menu
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMountEl, setMenuMountEl] = useState<HTMLElement | null>(null)

  // State for confirmation modal
  const [confirmationModal, setConfirmationModal] = useState<{
    open: boolean
    title: string
    message: string
    action: (() => Promise<void>) | null
    actionLabel: string
  }>({
    open: false,
    title: '',
    message: '',
    action: null,
    actionLabel: 'Confirm'
  })
  // Set up AppAction data hooks for programmatic triggering (upload only, create folder is handled directly)

  const uploadActionData = useAppActionData(
    uploadActionProps && accessToken
      ? {
          contextsArray: uploadActionProps.contextsArray,
          externalContextData: uploadActionProps.externalContextData,
          accessToken,
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: uploadActionProps.prefixDataTestId
        }
      : {
          contextsArray: [],
          accessToken: accessToken || '',
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: 'document-upload'
        },
    'Upload'
  )

  // Note: We use direct API calls for delete instead of AppAction data hooks

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Define custom columns for document table
  const columns: DocumentColumn[] = [
    {
      id: 'name',
      header: 'Name',
      align: 'left',
      render: document => {
        const docWithTreeInfo = document as DocumentItem & {
          level?: number
          hasChildren?: boolean
          isExpanded?: boolean
        }
        const level = docWithTreeInfo.level || 0
        const hasChildren = docWithTreeInfo.hasChildren || false
        const isExpanded = docWithTreeInfo.isExpanded || false

        return (
          <div className="gba:flex gba:items-center gba:gap-2" style={{ paddingLeft: `${level * 20}px` }}>
            {/* Tree expansion control - only show for folders with children */}
            {viewMode === 'tree' && document.folder && hasChildren ? (
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggleFolderExpansion(document.id)
                }}
                className="gba:p-0 gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:hover:bg-muted gba:rounded"
                data-testid={`${dataTestId}-expand-${document.id}`}
              >
                {isExpanded ? (
                  <ChevronDown className="gba:h-3 gba:w-3" />
                ) : (
                  <ChevronRight className="gba:h-3 gba:w-3" />
                )}
              </button>
            ) : viewMode === 'tree' ? (
              // Empty space to maintain alignment for items without expansion controls
              <div className="gba:w-4 gba:h-4" />
            ) : null}

            {/* File/Folder icon with proper type-based styling */}
            {getFileIcon(document)}

            {/* Document name */}
            <span
              className="gba:text-sm gba:font-medium gba:truncate"
              data-testid={`${dataTestId}-name-${document.id}`}
              title={document.name || 'Untitled Document'}
            >
              {document.name || 'Untitled Document'}
              {/* Show children count for folders */}
              {document.folder && viewMode === 'tree' && (
                <span className="gba:ml-2 gba:text-xs gba:text-muted-foreground">
                  ({getFolderChildrenCount(document.id)} items)
                </span>
              )}
            </span>
          </div>
        )
      }
    },
    {
      id: 'group',
      header: 'Group',
      width: '150px',
      align: 'left',
      render: document => (
        <span
          className="gba:text-xs gba:text-muted-foreground gba:truncate"
          data-testid={`${dataTestId}-group-${document.id}`}
          title={document.documentGroup?.value || '-'}
        >
          {document.documentGroup?.value || '-'}
        </span>
      )
    },
    {
      id: 'type',
      header: 'Type',
      width: '120px',
      align: 'left',
      render: document => (
        <Badge variant="secondary" className="gba:text-xs" data-testid={`${dataTestId}-type-${document.id}`}>
          {document.folder === true ? 'Folder' : document.documentType?.value || '-'}
        </Badge>
      )
    },
    {
      id: 'size',
      header: 'Size',
      width: '100px',
      align: 'left',
      render: document => (
        <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${dataTestId}-size-${document.id}`}>
          {!document.folder && document.fileSize ? formatFileSize(document.fileSize) : '-'}
        </span>
      )
    },
    {
      id: 'uploadDate',
      header: 'Upload Date',
      width: '140px',
      align: 'left',
      render: document => (
        <span
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-upload-date-${document.id}`}
        >
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      width: '80px',
      align: 'center',
      render: document => (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => handleActionsButtonClick(document, e)}
          data-testid={`${dataTestId}-actions-${document.id}`}
        >
          <MoreHorizontal className="gba:h-4 gba:w-4" />
        </Button>
      )
    }
  ]

  // State for selected document for actions menu
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)

  // State for view mode (tree vs list) - default to tree view
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')

  // State for expanded folders in tree view with localStorage persistence
  // Generate a unique storage key based on entity
  const storageKey = `documentSection_expandedFolders_${entityId}`

  // Initialize state from localStorage
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to load expanded folders from localStorage:', error)
    }
    return new Set()
  })

  // Persist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedFolders)))
    } catch (error) {
      console.warn('Failed to save expanded folders to localStorage:', error)
    }
  }, [expandedFolders, storageKey])

  // State for search - use external if provided, otherwise internal
  const [internalSearchTerm, setInternalSearchTerm] = useState('')
  const searchTerm = externalSearchTerm ?? internalSearchTerm

  // Handle search term changes
  const handleSearchChange = (term: string) => {
    if (onSearchChange) {
      onSearchChange(term) // Let parent handle search
    } else {
      setInternalSearchTerm(term) // Handle internally if no parent handler
    }
  }

  // State for selected items (for tree view context)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // State for new folder dialog
  const [newFolderDialog, setNewFolderDialog] = useState<{
    open: boolean
    parentId: string | null
    parentName?: string
  }>({
    open: false,
    parentId: null
  })

  const [newFolderName, setNewFolderName] = useState('')
  const [selectedParentFolder, setSelectedParentFolder] = useState<string>('')

  // State for drag and drop
  const [draggedDocument, setDraggedDocument] = useState<DocumentItem | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [isDroppingOnRoot, setIsDroppingOnRoot] = useState<boolean>(false)
  const [isOverDropZone, setIsOverDropZone] = useState<boolean>(false)

  // State for click vs drag detection
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Organize documents into tree structure
  const organizeDocumentsForTree = (docs: DocumentItem[]): DocumentItem[] => {
    if (viewMode === 'list') {
      return docs // Return flat list for list view
    }

    // For tree view, organize by parent-child relationships
    const rootDocuments: DocumentItem[] = []
    const documentMap = new Map<string, DocumentItem & { children: DocumentItem[] }>()

    // First pass: create map with children arrays
    docs.forEach(doc => {
      documentMap.set(doc.id, { ...doc, children: [] })
    })

    // Second pass: organize hierarchy based on parentDocument field
    docs.forEach(doc => {
      const docWithChildren = documentMap.get(doc.id)!

      // Check if this document has a parent (using parentDocument field from API)
      if (doc.parentDocument) {
        const parent = documentMap.get(doc.parentDocument)
        if (parent) {
          parent.children.push(docWithChildren)
        } else {
          // Parent not found in current filtered set, add to root
          rootDocuments.push(docWithChildren)
        }
      } else {
        // No parent, this is a root-level document
        rootDocuments.push(docWithChildren)
      }
    })

    // Sort function to put folders before documents
    const sortFoldersFirst = (a: DocumentItem, b: DocumentItem): number => {
      // If one is a folder and the other isn't, folder comes first
      if (a.folder && !b.folder) return -1
      if (!a.folder && b.folder) return 1
      // If both are the same type (both folders or both documents), sort by name
      return (a.name || '').localeCompare(b.name || '')
    }

    // Recursively sort all levels
    const sortTreeLevel = (items: any[]): void => {
      items.sort(sortFoldersFirst)
      items.forEach((item: any) => {
        if (item.children && item.children.length > 0) {
          sortTreeLevel(item.children)
        }
      })
    }

    // Sort root level and all children
    sortTreeLevel(rootDocuments)

    return rootDocuments
  }

  // Flatten tree for rendering with indentation
  const flattenTreeForRendering = (
    docs: DocumentItem[],
    level = 0
  ): Array<DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }> => {
    const result: Array<DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }> = []

    docs.forEach(doc => {
      const docWithChildren = doc as DocumentItem & { children?: DocumentItem[] }
      const hasChildren = docWithChildren.children && docWithChildren.children.length > 0
      const isExpanded = expandedFolders.has(doc.id)

      // Add the current document/folder
      result.push({
        ...doc,
        level,
        hasChildren: !!hasChildren,
        isExpanded
      })

      // Add children if this is a folder, has children, and is expanded
      if (doc.folder && hasChildren && isExpanded && docWithChildren.children) {
        result.push(...flattenTreeForRendering(docWithChildren.children, level + 1))
      }
    })

    return result
  }

  // Filter documents by search term (local only)
  // If parent provides onSearchChange, they handle filtering and pass filtered documents
  // Otherwise, we do simple local filtering
  const filteredDocuments = useMemo(() => {
    // If parent is handling search, just use documents as-is
    if (onSearchChange) {
      return documents
    }

    // Otherwise, do local filtering if search term exists
    if (!searchTerm.trim()) {
      return documents
    }

    return documents.filter(
      doc =>
        doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentType?.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentGroup?.value?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [documents, searchTerm, onSearchChange])

  const organizedDocuments = organizeDocumentsForTree(filteredDocuments)
  const displayDocuments =
    viewMode === 'tree'
      ? flattenTreeForRendering(organizedDocuments)
      : filteredDocuments
          .filter(doc => !doc.folder) // In list view, exclude folders - show only documents
          .map(doc => ({ ...doc, level: 0, hasChildren: false, isExpanded: false }))

  // Get available folders for parent selection
  const availableFolders = useMemo(() => {
    return filteredDocuments.filter(doc => doc.folder)
  }, [filteredDocuments])

  // Helper function to count children of a folder
  const getFolderChildrenCount = (folderId: string): number => {
    return documents.filter(doc => doc.parentDocument === folderId).length
  }

  // Check if targetId is a descendant of ancestorId (prevents circular references)
  const isFolderDescendant = (targetId: string, ancestorId: string): boolean => {
    if (targetId === ancestorId) return true

    let currentId: string | null = targetId
    const visited = new Set<string>() // Prevent infinite loops
    const maxDepth = 100 // Safety limit
    let depth = 0

    while (currentId && depth < maxDepth) {
      if (visited.has(currentId)) {
        // Circular reference detected in data
        console.warn('Circular reference detected in folder structure')
        return false
      }
      visited.add(currentId)

      if (currentId === ancestorId) {
        return true // Target is a descendant of ancestor
      }

      // Find parent of current folder
      const currentFolder = documents.find(doc => doc.id === currentId)
      currentId = currentFolder?.parentDocument || null
      depth++
    }

    return false // No circular reference found
  }

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Handle opening documents in new tab (for files, not folders)
  const handleOpenDocument = (document: DocumentItem) => {
    if (!document.fileInfo || document.folder) {
      return
    }

    try {
      const fileUrl = buildFileUrl(document.fileInfo)
      window.open(fileUrl, '_blank')
    } catch (error) {
      console.error('Error opening document:', error)
      toast.error('Failed to open document')
    }
  }

  // Handle row selection for tree view context
  const handleRowClick = (documentId: string, event: React.MouseEvent) => {
    // Don't do anything if we were dragging
    if (isDragging) {
      return
    }

    // Don't select if clicking on action buttons or expansion controls
    if ((event.target as HTMLElement).closest('button')) {
      return
    }

    // Find the document
    const document = filteredDocuments.find(doc => doc.id === documentId)
    if (!document) return

    // If it's a file (not a folder), open it in a new tab
    if (!document.folder) {
      handleOpenDocument(document)
      return
    }

    // For folders in tree view, toggle expansion AND select
    if (viewMode === 'tree' && document.folder) {
      toggleFolderExpansion(documentId)

      // Also handle selection for folder operations (upload/create subfolder)
      setSelectedItems(prev => {
        if (event.ctrlKey || event.metaKey) {
          // Multi-select with Ctrl/Cmd
          return prev.includes(documentId) ? prev.filter(id => id !== documentId) : [...prev, documentId]
        } else {
          // Single select
          return prev.includes(documentId) && prev.length === 1 ? [] : [documentId]
        }
      })
    }
  }

  // Get the target parent for new folder/upload operations
  const getTargetParentId = (): string | null => {
    if (viewMode !== 'tree' || selectedItems.length === 0) {
      return null // Root level
    }

    // If single folder is selected, use it as parent
    if (selectedItems.length === 1) {
      const selectedDoc = filteredDocuments.find(doc => doc.id === selectedItems[0])
      if (selectedDoc && selectedDoc.folder) {
        return selectedDoc.id
      }
    }

    return null // Default to root level
  }

  // Context-aware folder creation
  const handleCreateFolder = () => {
    const targetParentId = getTargetParentId()
    const parentDoc = targetParentId ? filteredDocuments.find(doc => doc.id === targetParentId) : null

    setNewFolderDialog({
      open: true,
      parentId: targetParentId,
      parentName: parentDoc?.name || undefined
    })
    setNewFolderName('')
    setSelectedParentFolder(targetParentId || 'root')
  }

  // Create new folder via API
  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !accessToken || !apiConfig) {
      toast.error('Folder name is required')
      return
    }

    if (!apiConfig.endpoints?.create) {
      toast.error('Create endpoint not configured')
      return
    }

    try {
      // Use selected parent folder instead of the initial context
      const finalParentId = selectedParentFolder === 'root' ? null : selectedParentFolder

      const payload = {
        [apiConfig.documentFieldName]: {
          name: newFolderName.trim(),
          folder: true, // This is the key field that must be set to true for folders
          [apiConfig.entityFieldName]: entityId,
          ...(finalParentId && { parentDocument: finalParentId }), // Use parentDocument field for hierarchy
          description: `Folder: ${newFolderName.trim()}`,
          recordState: 'active'
        }
      }

      await restClient.post(apiConfig.endpoints.create, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      toast.success('Folder created successfully')
      setNewFolderDialog({ open: false, parentId: null })
      setNewFolderName('')
      setSelectedParentFolder('')

      // Refresh the documents list
      if (onRefresh) {
        onRefresh()
      }
    } catch (e: any) {
      console.error('Error creating folder:', e)
      toast.error(e?.message || 'Failed to create folder')
    }
  }

  // Context-aware file upload
  const handleUpload = () => {
    const firstAction = uploadActionData.combinedData[0]

    if (firstAction) {
      // You could potentially modify the external context data here to include parent info
      firstAction.onClick?.()
    }
  }

  // Expand all folders in tree view
  const handleExpandAll = () => {
    const allFolderIds = filteredDocuments
      .filter(doc => doc.folder && getFolderChildrenCount(doc.id) > 0) // Only expand folders with children
      .map(doc => doc.id)
    setExpandedFolders(new Set(allFolderIds))
  }

  // Collapse all folders in tree view
  const handleCollapseAll = () => {
    setExpandedFolders(new Set())
  }

  // Mouse handlers for click vs drag detection
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY })
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseDownPos) {
      const distance = Math.sqrt(Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2))

      // If mouse moved more than 5 pixels, consider it a drag
      if (distance > 5) {
        setIsDragging(true)
      }
    }
  }

  const handleMouseUp = () => {
    setMouseDownPos(null)
    // Reset dragging state after a short delay to allow click to process
    setTimeout(() => setIsDragging(false), 100)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, document: DocumentItem) => {
    setDraggedDocument(document)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', document.id)
  }

  const handleDragOver = (e: React.DragEvent, targetDocument: DocumentItem) => {
    e.preventDefault()
    e.stopPropagation()

    // Only allow dropping on folders
    if (targetDocument.folder && draggedDocument && draggedDocument.id !== targetDocument.id) {
      // If dragging a folder, check for circular reference
      if (draggedDocument.folder) {
        // Check if target folder is a descendant of the dragged folder
        if (isFolderDescendant(targetDocument.id, draggedDocument.id)) {
          e.dataTransfer.dropEffect = 'none'
          return
        }
      }

      e.dataTransfer.dropEffect = 'move'
      setDropTarget(targetDocument.id)
    } else if (targetDocument.folder) {
      // Show that this is a valid drop zone even if no document is being dragged
      e.dataTransfer.dropEffect = 'move'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Capture references before setTimeout (React synthetic events are pooled)
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement

    // Use a timeout to allow for smooth transitions between drop zones
    setTimeout(() => {
      // Only clear if we're not moving to a child element or another drop zone
      if (!relatedTarget || !currentTarget || !currentTarget.contains(relatedTarget)) {
        setDropTarget(null)
      }
    }, 50)
  }

  const handleDrop = async (e: React.DragEvent, targetFolder: DocumentItem) => {
    e.preventDefault()
    e.stopPropagation()
    setDropTarget(null)

    if (!draggedDocument || !targetFolder.folder || draggedDocument.id === targetFolder.id) {
      return
    }

    // Prevent circular references when moving folders
    if (draggedDocument.folder && isFolderDescendant(targetFolder.id, draggedDocument.id)) {
      toast.error('Cannot move a folder into itself or its descendants')
      setDraggedDocument(null)
      return
    }

    // Move document/folder to target folder
    await moveDocumentToFolder(draggedDocument.id, targetFolder.id)
    setDraggedDocument(null)
  }

  const handleDragEnd = () => {
    setDraggedDocument(null)
    setDropTarget(null)
    setIsDroppingOnRoot(false)
    setIsOverDropZone(false)
    setIsDragging(false)
  }

  // Handlers for dedicated drop zone
  const handleDropZoneOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsOverDropZone(true)
  }

  const handleDropZoneLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    setTimeout(() => {
      if (!relatedTarget || !currentTarget || !currentTarget.contains(relatedTarget)) {
        setIsOverDropZone(false)
      }
    }, 50)
  }

  const handleDropZoneDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOverDropZone(false)
    if (!draggedDocument) return
    await moveDocumentToRoot(draggedDocument.id)
    setDraggedDocument(null)
  }

  // Handle drag over the root area (table container)
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (!draggedDocument) return

    // Check if we're over a folder row
    const target = e.target as HTMLElement
    const folderRow = target.closest('[data-folder="true"]')

    if (folderRow) {
      // We're over a folder row, let the row handler take care of it
      setIsDroppingOnRoot(false)
    } else {
      // We're over the root area
      setIsDroppingOnRoot(true)
      setDropTarget(null) // Clear folder drop target
    }
  }

  // Handle drag leave from root area
  const handleRootDragLeave = (e: React.DragEvent) => {
    e.preventDefault()

    // Capture references before setTimeout (React synthetic events are pooled)
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement

    // Use a timeout to allow for smooth transitions
    setTimeout(() => {
      // Only clear if we're not moving to a child element
      if (!relatedTarget || !currentTarget || !currentTarget.contains(relatedTarget)) {
        setIsDroppingOnRoot(false)
      }
    }, 50)
  }

  // Handle drop on root area
  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDroppingOnRoot(false)

    if (!draggedDocument) return

    // Check if we're not dropping on a folder
    const target = e.target as HTMLElement
    const isOverFolder = target.closest('[data-testid*="-row-"]')?.querySelector('[data-folder="true"]')

    if (!isOverFolder) {
      // Move document to root level
      await moveDocumentToRoot(draggedDocument.id)
      setDraggedDocument(null)
    }
  }

  // Move document to folder via API
  const moveDocumentToFolder = async (documentId: string, targetFolderId: string) => {
    if (!accessToken || !apiConfig) {
      toast.error('Cannot move document: missing configuration')
      return
    }

    if (!apiConfig.endpoints?.update) {
      toast.error('Update endpoint not configured')
      return
    }

    try {
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        toast.error('Document not found')
        return
      }

      // Use minimal payload with only required fields
      const documentPayload: any = {
        id: documentId,
        version: document.version,
        parentDocument: targetFolderId,
        folder: document.folder || false, // Preserve folder status
        [apiConfig.entityFieldName]: entityId
      }

      await restClient.post(
        apiConfig.endpoints.update,
        {
          changeMode: 'UPDATE',
          [apiConfig.documentFieldName]: documentPayload
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const itemType = document.folder ? 'Folder' : 'Document'
      toast.success(`${itemType} moved successfully`)

      // Refresh the documents list after a short delay
      // This ensures the UI updates even if useProcessCompletion doesn't trigger
      setTimeout(() => {
        if (onRefresh) {
          onRefresh()
        }
      }, 500)
    } catch (e: any) {
      console.error('Error moving document:', e)
      toast.error(e?.message || 'Failed to move document')
    }
  }

  // Move document to root level (remove from folder)
  const moveDocumentToRoot = async (documentId: string) => {
    if (!accessToken || !apiConfig) {
      toast.error('Cannot move document: missing configuration')
      return
    }

    if (!apiConfig.endpoints?.update) {
      toast.error('Update endpoint not configured')
      return
    }

    try {
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        toast.error('Document not found')
        return
      }

      // For root documents, use empty string ('')
      const documentPayload: any = {
        id: documentId,
        version: document.version,
        parentDocument: '', // Use empty string for root documents
        folder: document.folder || false, // Preserve folder status
        [apiConfig.entityFieldName]: entityId
      }

      await restClient.post(
        apiConfig.endpoints.update,
        {
          changeMode: 'UPDATE',
          [apiConfig.documentFieldName]: documentPayload
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      const itemType = document.folder ? 'Folder' : 'Document'
      toast.success(`${itemType} moved to root level`)

      // Refresh the documents list after a short delay
      // This ensures the UI updates even if useProcessCompletion doesn't trigger
      setTimeout(() => {
        if (onRefresh) {
          onRefresh()
        }
      }, 500)
    } catch (e: any) {
      console.error('Error moving document to root:', e)
      toast.error(e?.message || 'Failed to move document to root')
    }
  }

  // Confirmation modal handlers
  const showConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
    actionLabel: string = 'Confirm'
  ) => {
    setConfirmationModal({
      open: true,
      title,
      message,
      action,
      actionLabel
    })
  }

  const handleConfirmAction = async () => {
    if (confirmationModal.action) {
      await confirmationModal.action()
    }
    setConfirmationModal(prev => ({ ...prev, open: false }))
  }

  const handleCancelAction = () => {
    setConfirmationModal(prev => ({ ...prev, open: false }))
  }

  // Generic action handler for custom actions
  const handleCustomAction = async (action: any, documentId: string) => {
    if (!accessToken || !apiConfig) {
      console.error('Access token or API config not available')
      return
    }

    try {
      // Find the document
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        console.error('Document not found:', documentId)
        toast.error('Document not found')
        return
      }

      // Handle custom onClick function (this will handle update action)
      if (action.onClick) {
        await action.onClick(documentId, document, entityId)
        return
      }

      // Handle API call
      if (action.apiEndpoint) {
        let payload

        if (action.payload) {
          // Use custom payload function
          payload = action.payload(documentId, document, entityId)
        } else {
          // Default payload structure
          payload = {
            [apiConfig.documentFieldName]: {
              id: documentId,
              version: document.version,
              [apiConfig.entityFieldName]: entityId
            }
          }
        }

        await restClient.post(action.apiEndpoint, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        toast.success(`${action.label} completed successfully`)

        // Refresh the documents list
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (e: any) {
      console.error('Error executing action:', action.key, e)
      toast.error(e?.message || `Failed to ${action.label.toLowerCase()}`)
    }
  }

  // Handle document download
  const handleDownloadDocument = (document: DocumentItem) => {
    if (!document.fileInfo) {
      toast.warning('No file available to download')
      return
    }

    try {
      const fileUrl = buildFileUrl(document.fileInfo)
      const downloadFilename = document.name || 'document'

      // Use simple link download
      const link = window.document.createElement('a')
      link.href = fileUrl
      link.download = downloadFilename
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)

      toast.success(`Downloading ${downloadFilename}`)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  // Handle three-dots click to open custom menu
  const handleActionsButtonClick = (document: DocumentItem, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedDocument(document)

    // Create menu mount point relative to the clicked button
    try {
      const buttonElement = event.currentTarget as HTMLElement
      // cleanup previous mount
      if (menuMountEl && menuMountEl.parentElement) {
        menuMountEl.parentElement.removeChild(menuMountEl)
      }

      const mount = window.document.createElement('div')
      mount.style.position = 'absolute'
      mount.style.right = '0px'
      mount.style.top = 'calc(100% + 6px)'
      mount.style.zIndex = '10000'

      // Position relative to button
      buttonElement.style.position = 'relative'
      buttonElement.appendChild(mount)

      setMenuMountEl(mount)
      setMenuOpen(true)
    } catch (error) {
      console.error('Error creating menu mount:', error)
      setMenuOpen(true)
    }
  }

  // Custom menu actions for the three dots menu (fully dynamic)
  const customMenuActions = useMemo(() => {
    if (!selectedDocument) return []

    const actions = []

    // Add download action if available (only for files, not folders)
    if (downloadActionProps && selectedDocument.fileInfo && !selectedDocument.folder) {
      actions.push({
        key: 'download',
        label: 'Download',
        onClick: () => {
          // Trigger download action using AppActionMenu flow
          handleDownloadDocument(selectedDocument)
          setMenuOpen(false)
        },
        icon: <Download className="gba:h-4 gba:w-4" />
      })
    }

    // Add custom actions from configuration
    if (customActions && customActions.length > 0 && accessToken && apiConfig) {
      customActions.forEach(action => {
        actions.push({
          key: action.key,
          label: action.label,
          onClick: async () => {
            setMenuOpen(false)

            // Show confirmation modal if specified
            if (action.confirmMessage) {
              const actionToExecute = async () => {
                await handleCustomAction(action, selectedDocument.id)
              }

              showConfirmation(`Confirm ${action.label}`, action.confirmMessage, actionToExecute, action.label)
            } else {
              // Execute action directly if no confirmation needed
              await handleCustomAction(action, selectedDocument.id)
            }
          },
          icon: action.icon || <Eye className="gba:h-4 gba:w-4" />
        })
      })
    }

    return actions
  }, [selectedDocument, downloadActionProps, customActions, accessToken, apiConfig])

  // Note: Outside clicks and Escape handling are managed by ActionMenu via onOpenChange

  // Cleanup mount element when menu closes
  useEffect(() => {
    if (!menuOpen && menuMountEl) {
      // Clean up the mount element after a short delay to allow animations
      const cleanupTimer = setTimeout(() => {
        if (menuMountEl.parentElement) {
          menuMountEl.parentElement.removeChild(menuMountEl)
        }
        setMenuMountEl(null)
        setSelectedDocument(null)
      }, 150)

      return () => clearTimeout(cleanupTimer)
    }
  }, [menuOpen, menuMountEl])

  if (isLoading) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={dataTestId} className="gba:p-6">
        <Alert variant="destructive">
          <div>
            <div className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('document.error.loading.title', 'Error Loading Documents')}
            </div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gba:mt-2">
                {getTranslationFromI18nKeyAndLabel('document.action.retry', 'Retry')}
              </Button>
            )}
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full">
      <div className="gba:space-y-4">
        {/* Header with title and actions */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <h3 className="gba:text-lg gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('document.section.title', 'Document Management')}
          </h3>

          <div className="gba:flex gba:items-center gba:gap-2">
            {createFolderActionProps && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateFolder}
                data-testid={`${dataTestId}-create-folder-button`}
                title={
                  viewMode === 'tree' &&
                  selectedItems.length === 1 &&
                  filteredDocuments.find(doc => doc.id === selectedItems[0] && doc.folder)
                    ? `Create folder in "${filteredDocuments.find(doc => doc.id === selectedItems[0])?.name}"`
                    : 'Create folder at root level'
                }
              >
                <Folder className="gba:h-4 gba:w-4 gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel('document.folder.new', 'New Document Folder')}
              </Button>
            )}
            {uploadActionProps && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
                data-testid={`${dataTestId}-upload-button`}
                title={
                  viewMode === 'tree' &&
                  selectedItems.length === 1 &&
                  filteredDocuments.find(doc => doc.id === selectedItems[0] && doc.folder)
                    ? `Upload to "${filteredDocuments.find(doc => doc.id === selectedItems[0])?.name}"`
                    : 'Upload to root level'
                }
              >
                <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel('document.upload.files', 'Upload Documents')}
              </Button>
            )}
            {toolbarActions.map(action => (
              <Button
                key={action.key}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                data-testid={action.testId || `${dataTestId}-${action.key}-button`}
              >
                {action.icon && <span className="gba:mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Search and View Toggle Row */}
        <div className="gba:flex gba:items-center gba:justify-between">
          {/* Search Input */}
          <div className="gba:max-w-sm">
            <DebouncedInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={getTranslationFromI18nKeyAndLabel('document.search.placeholder', 'Search documents...')}
              icon={<Search className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
              data-testid={`${dataTestId}-search-input`}
              debounceDelay={300}
            />
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {/* Expand/Collapse buttons - only show in tree view */}
            {viewMode === 'tree' && (
              <div className="gba:flex gba:items-center gba:gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExpandAll}
                  data-testid={`${dataTestId}-expand-all-button`}
                  title={getTranslationFromI18nKeyAndLabel('document.tree.expand.all', 'Expand All')}
                >
                  <Expand className="gba:h-4 gba:w-4 gba:mr-1" />
                  {getTranslationFromI18nKeyAndLabel('document.tree.expand.all', 'Expand All')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCollapseAll}
                  data-testid={`${dataTestId}-collapse-all-button`}
                  title={getTranslationFromI18nKeyAndLabel('document.tree.collapse.all', 'Collapse All')}
                >
                  <Minimize className="gba:h-4 gba:w-4 gba:mr-1" />
                  {getTranslationFromI18nKeyAndLabel('document.tree.collapse.all', 'Collapse All')}
                </Button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="gba:flex gba:items-center gba:border gba:rounded-md">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('tree')
                  // Clear selection when switching to tree view
                  setSelectedItems([])
                }}
                className="gba:rounded-r-none gba:border-r"
                data-testid={`${dataTestId}-tree-view-button`}
              >
                <ListTree className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('document.view.tree', 'Tree View')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('list')
                  // Clear selection when switching to list view
                  setSelectedItems([])
                }}
                className="gba:rounded-l-none"
                data-testid={`${dataTestId}-list-view-button`}
              >
                <List className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('document.view.list', 'List View')}
              </Button>
            </div>
          </div>
        </div>

        {/* Root Drop Zone - Always visible in tree view */}
        {viewMode === 'tree' && (
          <div
            className={`gba:mb-4 gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-all gba:duration-200 ${
              isOverDropZone ? 'gba:border-primary gba:bg-primary/10' : 'gba:border-muted-foreground/30 gba:bg-muted/10'
            }`}
            onDragOver={handleDropZoneOver}
            onDragLeave={handleDropZoneLeave}
            onDrop={handleDropZoneDrop}
            data-testid={`${dataTestId}-root-drop-zone`}
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
              <Folder className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {isOverDropZone
                  ? getTranslationFromI18nKeyAndLabel('document.drop.root.active', 'Release to move to root level')
                  : getTranslationFromI18nKeyAndLabel('document.drop.root.prompt', 'Drop here to move to root level')}
              </span>
            </div>
          </div>
        )}

        {/* Documents Table */}
        <div
          className={`gba:border gba:rounded-lg ${isDroppingOnRoot ? 'gba:bg-primary/5 gba:border-primary' : ''}`}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead
                    key={column.id}
                    className={`gba:text-left ${column.width ? `gba:w-[${column.width}]` : ''}`}
                    style={{
                      textAlign: column.align || 'left',
                      width: column.width
                    }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="gba:text-center gba:py-12 gba:text-muted-foreground">
                    <div className="gba:space-y-2">
                      <File className="gba:h-12 gba:w-12 gba:mx-auto gba:text-muted-foreground" />
                      <div className="gba:text-lg gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel('document.empty.title', 'No documents found')}
                      </div>
                      <div className="gba:text-sm">
                        {getTranslationFromI18nKeyAndLabel(
                          'document.empty.description',
                          'Upload documents or create document folders to organize your files'
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayDocuments.map(document => {
                  const isSelected = selectedItems.includes(document.id)
                  const isDraggedOver = dropTarget === document.id
                  const isDragging = draggedDocument?.id === document.id

                  return (
                    <TableRow
                      key={document.id}
                      data-testid={`${dataTestId}-row-${document.id}`}
                      data-folder={document.folder ? 'true' : 'false'} // Add data attribute to identify folders
                      className={`
                         gba:cursor-pointer
                         ${isSelected && viewMode === 'tree' ? 'gba:bg-muted/50' : ''} 
                         ${viewMode === 'tree' ? 'hover:gba:bg-muted/30' : ''}
                         ${isDraggedOver ? 'gba:bg-primary/20 gba:border-2 gba:border-primary gba:border-dashed' : ''}
                         ${isDragging ? 'gba:opacity-50' : ''}
                         ${document.folder && draggedDocument ? 'gba:transition-all gba:duration-200 hover:gba:bg-primary/10' : ''}
                         ${document.folder ? 'gba:transition-all gba:duration-200' : ''}
                       `}
                      onClick={e => handleRowClick(document.id, e)}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      draggable={true} // Allow dragging both documents and folders
                      onDragStart={e => handleDragStart(e, document)}
                      onDragEnter={e => (document.folder ? handleDragOver(e, document) : undefined)}
                      onDragOver={e => (document.folder ? handleDragOver(e, document) : undefined)}
                      onDragLeave={document.folder ? handleDragLeave : undefined}
                      onDrop={e => (document.folder ? handleDrop(e, document) : undefined)}
                      onDragEnd={handleDragEnd}
                    >
                      {columns.map(column => (
                        <TableCell
                          key={column.id}
                          style={{
                            textAlign: column.align || 'left',
                            width: column.width
                          }}
                        >
                          {column.render(document)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Custom three dots menu portal */}
        {selectedDocument &&
          menuMountEl &&
          menuOpen &&
          createPortal(
            <AppActionMenu
              accessToken={accessToken}
              staticFlowData={customMenuActions as any}
              emptyStateBehavior="enable"
              open={menuOpen}
              onOpenChange={open => {
                setMenuOpen(open)
                if (!open) {
                  setSelectedDocument(null)
                }
              }}
              prefixDataTestId="document-section"
              data-testid="document-section-action-menu"
            >
              <button type="button" aria-label="open actions" />
            </AppActionMenu>,
            menuMountEl
          )}

        {/* Confirmation Modal */}
        <Dialog open={confirmationModal.open} onOpenChange={open => !open && handleCancelAction()}>
          <DialogContent data-testid="document-section-confirmation-modal">
            <DialogHeader>
              <DialogTitle>{confirmationModal.title}</DialogTitle>
              <DialogDescription>{confirmationModal.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelAction} data-testid="document-section-cancel-button">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmAction} data-testid="document-section-confirm-button">
                {confirmationModal.actionLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog */}
        <Dialog
          open={newFolderDialog.open}
          onOpenChange={open => {
            if (!open) {
              setNewFolderDialog({ open: false, parentId: null })
              setSelectedParentFolder('')
            }
          }}
        >
          <DialogContent data-testid="document-section-new-folder-modal">
            <DialogHeader>
              <DialogTitle>
                {getTranslationFromI18nKeyAndLabel('document.folder.create.title', 'Create New Folder')}
              </DialogTitle>
              <DialogDescription>
                {newFolderDialog.parentName
                  ? `Creating folder in "${newFolderDialog.parentName}"`
                  : 'Creating folder at root level'}
              </DialogDescription>
            </DialogHeader>
            <div className="gba:space-y-4 gba:py-4">
              <div className="gba:space-y-2">
                <label htmlFor="folder-name" className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('document.folder.name.label', 'Folder Name')}
                </label>
                <Input
                  id="folder-name"
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'document.folder.name.placeholder',
                    'Enter folder name...'
                  )}
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  data-testid="document-section-folder-name-input"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleCreateNewFolder()
                    }
                  }}
                />
              </div>

              <div className="gba:space-y-2">
                <label htmlFor="parent-folder" className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('document.folder.parent.label', 'Parent Folder')}
                </label>
                <Select value={selectedParentFolder} onValueChange={setSelectedParentFolder}>
                  <SelectTrigger data-testid="document-section-parent-folder-select">
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'document.folder.parent.placeholder',
                        'Select parent folder...'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root" data-testid="document-section-parent-root">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Folder className="gba:h-4 gba:w-4" />
                        {getTranslationFromI18nKeyAndLabel('document.folder.root', 'Root Level')}
                      </div>
                    </SelectItem>
                    {availableFolders.map(folder => (
                      <SelectItem
                        key={folder.id}
                        value={folder.id}
                        data-testid={`document-section-parent-${folder.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Folder className="gba:h-4 gba:w-4" />
                          {folder.name || 'Untitled Folder'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewFolderDialog({ open: false, parentId: null })
                  setSelectedParentFolder('')
                }}
                data-testid="document-section-folder-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim()}
                data-testid="document-section-folder-create-button"
              >
                {getTranslationFromI18nKeyAndLabel('document.folder.create.action', 'Create Folder')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default DocumentSection
