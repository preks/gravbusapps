import { useState, useCallback, useMemo } from 'react'
import {
  Document,
  DocumentFilterState,
  DocumentSortState,
  DocumentPaginationState,
  ColumnConfig
} from '../types/documentTypes'

export interface UseDocumentDataControllerProps {
  initialDocuments?: Document[]
  initialFilters?: Partial<DocumentFilterState>
  initialSort?: DocumentSortState
  initialPagination?: Partial<DocumentPaginationState>
}

export const useDocumentDataController = ({
  initialDocuments = [],
  initialFilters = {},
  initialSort = { field: 'createdAt', direction: 'desc' as const },
  initialPagination = { currentPage: 1, pageSize: 20, total: 0 }
}: UseDocumentDataControllerProps = {}) => {
  // Data state
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<DocumentFilterState>({
    searchQuery: '',
    documentType: [],
    documentGroup: [],
    fileType: [],
    uploadedBy: [],
    ...initialFilters
  })

  // Sort state
  const [sort, setSort] = useState<DocumentSortState>(initialSort)

  // Pagination state
  const [pagination, setPagination] = useState<DocumentPaginationState>({
    currentPage: 1,
    pageSize: 20,
    total: initialDocuments.length,
    ...initialPagination
  })

  // Column configuration
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'name', label: 'Name', visible: true, disabled: true },
    { id: 'group', label: 'Group', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'size', label: 'Size', visible: true },
    { id: 'uploadDate', label: 'Upload Date', visible: true },
    { id: 'expirationDate', label: 'Expiration Date', visible: false },
    { id: 'uploadedBy', label: 'Uploaded By', visible: true },
    { id: 'actions', label: 'Actions', visible: true, disabled: true }
  ])

  // Available filter options (mock data - replace with actual API calls)
  const availableFilters = useMemo(
    () => ({
      documentTypes: [
        { id: 'type-1', value: 'Investment Proposal', code: 'INV_PROP' },
        { id: 'type-2', value: 'Market Analysis', code: 'MKT_ANAL' },
        { id: 'type-3', value: 'Legal Document', code: 'LEGAL_DOC' },
        { id: 'type-4', value: 'Image', code: 'IMAGE' },
        { id: 'type-5', value: 'Financial Statement', code: 'FIN_STMT' }
      ],
      documentGroups: [
        { id: 'group-1', value: 'Financial Documents', code: 'FIN_DOCS' },
        { id: 'group-2', value: 'Research', code: 'RESEARCH' },
        { id: 'group-3', value: 'Legal', code: 'LEGAL' },
        { id: 'group-4', value: 'Marketing', code: 'MARKETING' }
      ],
      fileTypes: [
        { id: 'pdf', value: 'PDF' },
        { id: 'docx', value: 'Word Document' },
        { id: 'xlsx', value: 'Excel Spreadsheet' },
        { id: 'png', value: 'PNG Image' },
        { id: 'jpg', value: 'JPEG Image' }
      ],
      uploadedBy: [
        { id: 'user-1', value: 'John Smith' },
        { id: 'user-2', value: 'Sarah Johnson' },
        { id: 'user-3', value: 'Michael Brown' },
        { id: 'user-4', value: 'Lisa Davis' },
        { id: 'user-5', value: 'Robert Wilson' }
      ]
    }),
    []
  )

  // Filter change handler
  const onFilterChange = useCallback((newFilters: Partial<DocumentFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // Sort change handler
  const onSortChange = useCallback((newSort: DocumentSortState) => {
    setSort(newSort)
  }, [])

  // Pagination change handler
  const onPaginationChange = useCallback((newPagination: Partial<DocumentPaginationState>) => {
    setPagination(prev => ({ ...prev, ...newPagination }))
  }, [])

  // Column visibility change handler
  const onColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumns(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  // Refresh handler
  const onRefresh = useCallback(() => {
    setIsLoading(true)
    setError(null)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // In a real implementation, this would fetch fresh data
    }, 1000)
  }, [])

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents]

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(
        doc =>
          doc.name?.toLowerCase().includes(query) ||
          doc.documentType?.value.toLowerCase().includes(query) ||
          doc.documentGroup?.value.toLowerCase().includes(query) ||
          doc.createdBy?.toLowerCase().includes(query)
      )
    }

    // Apply document type filter
    if (filters.documentType.length > 0) {
      filtered = filtered.filter(doc => doc.documentType && filters.documentType.includes(doc.documentType.id))
    }

    // Apply document group filter
    if (filters.documentGroup.length > 0) {
      filtered = filtered.filter(doc => doc.documentGroup && filters.documentGroup.includes(doc.documentGroup.id))
    }

    // Apply file type filter
    if (filters.fileType.length > 0) {
      filtered = filtered.filter(doc => {
        if (!doc.mimeType) return false
        return filters.fileType.some(type => doc.mimeType?.includes(type))
      })
    }

    // Apply uploaded by filter
    if (filters.uploadedBy.length > 0) {
      filtered = filtered.filter(doc => doc.createdBy && filters.uploadedBy.includes(doc.createdBy))
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sort.field as keyof Document]
      const bValue = b[sort.field as keyof Document]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return filtered
  }, [documents, filters, sort])

  // Paginated documents
  const paginatedDocuments = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return filteredDocuments.slice(startIndex, endIndex)
  }, [filteredDocuments, pagination.currentPage, pagination.pageSize])

  // Update total count
  const totalCount = filteredDocuments.length

  return {
    // Data
    documents: paginatedDocuments,
    isLoading,
    error,

    // Filtering
    filters,
    onFilterChange,

    // Sorting
    sort,
    onSortChange,

    // Pagination
    pagination: { ...pagination, total: totalCount },
    onPaginationChange,

    // Column Management
    columns,
    onColumnVisibilityChange,

    // Available Filter Options
    availableFilters,

    // Refresh
    onRefresh
  }
}
