import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { FileInfo } from '@/common/types/FileTypes'

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
  fileSize?: number | null
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
  apiConfig?: ApiConfig

  // REST client for document operations
  // Each consumer should pass the appropriate restClient with correct base URL
  restClient: RestClient

  // Optional company data for MDM move operations
  // Required when using MDM domain to provide structureId and code
  companyData?: { structureId: string; code: string }

  // Optional: Search control (parent handles search logic, this just provides UI)
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void

  // Custom menu actions configuration
  /**
   * @deprecated Use updateActionProps and deleteActionProps instead
   */
  customActions?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    apiEndpoint?: string // e.g., '/your-service/deleteDocument'
    payload?: (documentId: string, document: DocumentItem, entityId: string) => any
    onClick?: (
      documentId: string,
      document: DocumentItem,
      entityId: string,
      accessToken?: string
    ) => void | Promise<void>
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
  updateActionProps?: {
    contextsArray: FlowContextName[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  deleteActionProps?: {
    contextsArray: FlowContextName[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  'data-testid'?: string
}

// Extended document item with tree metadata
export interface DocumentItemWithTreeInfo extends DocumentItem {
  level?: number
  hasChildren?: boolean
  isExpanded?: boolean
  children?: DocumentItem[]
}

// Confirmation modal state
export interface ConfirmationModalState {
  open: boolean
  title: string
  message: string
  action: (() => Promise<void>) | null
  actionLabel: string
}

// New folder dialog state
export interface NewFolderDialogState {
  open: boolean
  parentId: string | null
  parentName?: string
}

// REST Client interface
export interface RestClient {
  post: <T = any>(url: string, data?: any, config?: any) => Promise<T>
  put: <T = any>(url: string, data?: any, config?: any) => Promise<T>
  delete: <T = any>(url: string, config?: any) => Promise<T>
  get: <T = any>(url: string, config?: any) => Promise<T>
}

// AppActionData interface
export interface AppActionData {
  combinedData: Array<{
    onClick?: () => void
    label?: React.ReactNode
    icon?: React.ReactNode
  }>
  handleDeferredFetch?: () => void
}

// API Configuration interface
export interface ApiConfig {
  baseEndpoint: string
  entityFieldName: string
  documentFieldName: string
  endpoints?: {
    create?: string
    update?: string
    delete?: string
  }
}
