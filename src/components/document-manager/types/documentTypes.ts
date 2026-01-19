import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface Document {
  id: string
  version: number
  name?: string | null
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
  file?: string | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null
  format?: string | null
  parentDocument?: string | null
}

export interface DocumentFolder {
  name: string
  count: number
  documents: Document[]
  folderId?: string
  folderVersion?: number
  children?: DocumentFolder[]
}

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  disabled?: boolean
}

export interface FilterOption {
  id: string
  label: string
  selected: boolean
  value: any
}

export interface FilterGroup {
  id: string
  title: string
  filters: FilterOption[]
  searchTerm?: string
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any }
}

// Data Controller Interfaces
export interface DocumentFilterState {
  searchQuery: string
  documentType: string[]
  documentGroup: string[]
  fileType: string[]
  uploadedBy: string[]
}

export interface DocumentSortState {
  field: string
  direction: 'asc' | 'desc'
}

export interface DocumentPaginationState {
  currentPage: number
  pageSize: number
  total: number
}

export interface DocumentDataController {
  // Data
  documents: Document[]
  isLoading: boolean
  error: string | null

  // Filtering
  filters: DocumentFilterState
  onFilterChange: (filters: Partial<DocumentFilterState>) => void

  // Sorting
  sort: DocumentSortState
  onSortChange: (sort: DocumentSortState) => void

  // Pagination
  pagination: DocumentPaginationState
  onPaginationChange: (pagination: Partial<DocumentPaginationState>) => void

  // Column Management
  columns: ColumnConfig[]
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void

  // Available Filter Options
  availableFilters: {
    documentTypes: Array<{ id: string; value: string; code?: string }>
    documentGroups: Array<{ id: string; value: string; code?: string }>
    fileTypes: Array<{ id: string; value: string }>
    uploadedBy: Array<{ id: string; value: string }>
  }

  // Refresh
  onRefresh: () => void
}

export interface DocumentManagerProps {
  entityId: string
  entityType: 'account' | 'contact' | 'lead' | 'opportunity'
  context: {
    accessToken?: string
    flowContexts?: FlowContextName[]
  }
  onDocumentUpdate?: () => void
  className?: string

  // Data Controller
  dataController: DocumentDataController
}

export interface DocumentActionProps {
  document: Document
  entityId: string
  entityType: string
  context: { accessToken?: string }
  onActionComplete: () => void
}

export interface DocumentViewProps {
  documents: Document[]
  viewMode: 'icon' | 'list'
  onDocumentAction: (action: string, document: Document) => void
  selectedDocuments: string[]
  onSelectionChange: (documentIds: string[]) => void
  visibleColumns: string[]
}

export interface DocumentFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: 'icon' | 'list'
  onViewModeChange: (mode: 'icon' | 'list') => void

  // Filter Controls
  filters: DocumentFilterState
  onFilterChange: (filters: Partial<DocumentFilterState>) => void
  availableFilters: DocumentDataController['availableFilters']

  // Column Settings
  columns: ColumnConfig[]
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void
}

export interface DocumentDragDropProps {
  documents: Document[]
  onDocumentMove: (documentId: string, targetFolderId: string) => void
  onFolderReorder: (folderId: string, newIndex: number) => void
  children: React.ReactNode
}
