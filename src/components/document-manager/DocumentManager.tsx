import React, { useState, useCallback } from 'react'
import { Spinner, Alert, Button, Badge } from '@newwork/nw-design-system'
import { Plus, FolderPlus } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { startProcess } from '@/common/utils/start-process'
import { DocumentManagerProps, Document } from './types/documentTypes'
import { DocumentFilters } from './components/DocumentFilters'
import { DocumentViews } from './components/DocumentViews'
import { DocumentDragDrop } from './components/DocumentDragDrop'

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  entityId,
  entityType,
  context,
  onDocumentUpdate,
  className = '',
  dataController
}) => {
  // Local state for view mode and selection
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  // Event handlers
  const handleSearchChange = useCallback(
    (query: string) => {
      dataController.onFilterChange({ searchQuery: query })
    },
    [dataController]
  )

  const handleViewModeChange = useCallback((mode: 'icon' | 'list') => {
    setViewMode(mode)
  }, [])

  const handleDocumentAction = useCallback(
    (action: string, document: Document) => {
      switch (action) {
        case 'download':
          if (document.file) {
            const link = window.document.createElement('a')
            link.href = document.file
            link.download = document.name || 'document'
            window.document.body.appendChild(link)
            link.click()
            window.document.body.removeChild(link)
            console.log('Download started')
          }
          break
        case 'view':
          if (document.file) {
            window.open(document.file, '_blank')
          }
          break
        case 'edit':
          // Handle edit action - start process for document editing
          startProcess({
            domain: 'investments',
            processName: 'createInvestmentDocument',
            payload: {
              [`${entityType}Id`]: entityId,
              investmentDocument: {
                id: document.id,
                version: document.version,
                name: document.name,
                documentGroupRef: document.documentGroup?.id,
                documentTypeRef: document.documentType?.id,
                parentDocument: document.parentDocument || undefined
              }
            },
            builderType: 'NATIVE_SCREEN'
          })
          break
        case 'delete':
          // Handle delete action - could show confirmation dialog
          console.log('Delete document:', document.id)
          break
        default:
          break
      }
    },
    [entityId, entityType]
  )

  const handleSelectionChange = useCallback((documentIds: string[]) => {
    setSelectedDocuments(documentIds)
  }, [])

  const handleDocumentMove = useCallback((documentId: string, targetFolderId: string) => {
    // Handle document move to folder
    console.log(`Moving document ${documentId} to folder ${targetFolderId}`)
    // Implement actual move logic here
  }, [])

  const handleFolderReorder = useCallback((folderId: string, newIndex: number) => {
    // Handle folder reordering
    console.log(`Reordering folder ${folderId} to index ${newIndex}`)
    // Implement actual reorder logic here
  }, [])

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Document statistics
  const totalDocuments = dataController.documents.filter(doc => doc.format?.toUpperCase() === 'FILE').length
  const totalSize = dataController.documents
    .filter(doc => doc.format?.toUpperCase() === 'FILE')
    .reduce((sum, doc) => sum + (doc.fileSize || 0), 0)

  if (dataController.isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (dataController.error) {
    return (
      <Alert variant="destructive" title="Error Loading Documents">
        <p className="gba:mb-4">{dataController.error}</p>
        <Button size="sm" onClick={dataController.onRefresh}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div className={`gba:space-y-4 ${className}`} data-testid="document-manager">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <h3 className="gba:text-lg gba:font-medium">Documents</h3>
        <div className="gba:flex gba:gap-2">
          <AppAction
            data-testid="document-upload-button"
            contextsArray={context.flowContexts || []}
            externalContextData={{ entityId, entityType }}
            prefixDataTestId="document-upload"
            accessToken={context.accessToken}
            emptyStateBehavior="disable"
          >
            <Button size="default">
              <Plus className="gba:mr-2" />
              Upload Document
            </Button>
          </AppAction>
          <AppAction
            data-testid="document-create-folder-button"
            contextsArray={context.flowContexts || []}
            externalContextData={{ entityId, entityType }}
            prefixDataTestId="document-create-folder"
            accessToken={context.accessToken}
            emptyStateBehavior="disable"
          >
            <Button variant="outline" size="default">
              <FolderPlus className="gba:mr-2" />
              Create Folder
            </Button>
          </AppAction>
        </div>
      </div>

      {/* Search, Filters, and View Controls */}
      <DocumentFilters
        searchQuery={dataController.filters.searchQuery}
        onSearchChange={handleSearchChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        filters={dataController.filters}
        onFilterChange={dataController.onFilterChange}
        availableFilters={dataController.availableFilters}
        columns={dataController.columns}
        onColumnVisibilityChange={dataController.onColumnVisibilityChange}
      />

      {/* Document Statistics */}
      <div className="gba:flex gba:items-center gba:justify-end gba:gap-4 gba:text-sm gba:text-gray-600">
        <Badge variant="secondary" className="gba:bg-blue-50 gba:text-blue-700">
          {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
        </Badge>
        <span>{formatFileSize(totalSize)} total</span>
      </div>

      {/* Document Content */}
      <DocumentDragDrop
        documents={dataController.documents}
        onDocumentMove={handleDocumentMove}
        onFolderReorder={handleFolderReorder}
      >
        {dataController.documents.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <p>No documents found</p>
            <p className="gba:text-sm">Try adjusting your search or upload a document</p>
          </div>
        ) : (
          <DocumentViews
            documents={dataController.documents}
            viewMode={viewMode}
            onDocumentAction={handleDocumentAction}
            selectedDocuments={selectedDocuments}
            onSelectionChange={handleSelectionChange}
            visibleColumns={dataController.columns.filter(col => col.visible).map(col => col.id)}
          />
        )}
      </DocumentDragDrop>

      {/* Bulk Actions */}
      {selectedDocuments.length > 0 && (
        <div className="gba:flex gba:gap-2 gba:justify-end gba:border-t gba:border-gray-200 gba:pt-4">
          <span className="gba:text-sm gba:text-gray-600 gba:mr-2">
            {selectedDocuments.length} document(s) selected
          </span>
          <Button data-testid="document-bulk-download-button" variant="outline" size="sm">
            Download Selected
          </Button>
          <Button data-testid="document-bulk-delete-button" variant="outline" size="sm">
            Delete Selected
          </Button>
        </div>
      )}
    </div>
  )
}
