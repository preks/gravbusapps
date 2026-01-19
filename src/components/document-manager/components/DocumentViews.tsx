import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Checkbox,
  Badge
} from '@newwork/nw-design-system'
import { Download, Eye, Pencil, Trash, File } from '@phosphor-icons/react'
import { DocumentViewProps } from '../types/documentTypes'
import { DocumentTreeView } from './DocumentTreeView'

export const DocumentViews: React.FC<DocumentViewProps> = ({
  documents,
  viewMode,
  onDocumentAction,
  selectedDocuments,
  onSelectionChange,
  visibleColumns
}) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(documents.map(doc => doc.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDocuments, documentId])
    } else {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId))
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const getFileIcon = (mimeType: string | null | undefined): React.ReactNode => {
    if (!mimeType) return <File className="gba:w-6 gba:h-6" />

    if (mimeType.startsWith('image/')) {
      return <File className="gba:w-6 gba:h-6 gba:text-green-600" />
    } else if (mimeType.includes('pdf')) {
      return <File className="gba:w-6 gba:h-6 gba:text-red-600" />
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <File className="gba:w-6 gba:h-6 gba:text-blue-600" />
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return <File className="gba:w-6 gba:h-6 gba:text-green-600" />
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <File className="gba:w-6 gba:h-6 gba:text-orange-600" />
    }

    return <File className="gba:w-6 gba:h-6" />
  }

  if (viewMode === 'icon') {
    // Replace previous tile grid with tree view
    return (
      <DocumentTreeView
        documents={documents}
        onDocumentAction={onDocumentAction}
        selectedDocuments={selectedDocuments}
        onSelectionChange={onSelectionChange}
        visibleColumns={visibleColumns}
      />
    )
  }

  // List view
  return (
    <div className="gba:border gba:border-gray-200 gba:rounded-lg" data-testid="document-list-view">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-12">
              <Checkbox
                data-testid="document-select-all"
                checked={selectedDocuments.length === documents.length && documents.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            {visibleColumns.includes('name') && <TableHead className="gba:w-64">Name</TableHead>}
            {visibleColumns.includes('group') && <TableHead className="gba:w-48">Group</TableHead>}
            {visibleColumns.includes('type') && <TableHead className="gba:w-48">Type</TableHead>}
            {visibleColumns.includes('size') && <TableHead className="gba:w-24">Size</TableHead>}
            {visibleColumns.includes('uploadDate') && <TableHead className="gba:w-32">Upload Date</TableHead>}
            {visibleColumns.includes('expirationDate') && <TableHead className="gba:w-32">Expiration Date</TableHead>}
            {visibleColumns.includes('uploadedBy') && <TableHead className="gba:w-32">Uploaded By</TableHead>}
            {visibleColumns.includes('actions') && <TableHead className="gba:w-32">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(document => (
            <TableRow key={document.id} data-testid={`document-row-${document.id}`}>
              <TableCell>
                <Checkbox
                  data-testid={`document-select-${document.id}`}
                  checked={selectedDocuments.includes(document.id)}
                  onCheckedChange={checked => handleSelectDocument(document.id, checked as boolean)}
                />
              </TableCell>

              {visibleColumns.includes('name') && (
                <TableCell className="gba:font-medium">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {getFileIcon(document.mimeType)}
                    <span className="gba:truncate" title={document.name || 'Untitled'}>
                      {document.name || 'Untitled'}
                    </span>
                  </div>
                </TableCell>
              )}

              {visibleColumns.includes('group') && (
                <TableCell>
                  {document.documentGroup ? (
                    <Badge variant="outline">{document.documentGroup.value}</Badge>
                  ) : (
                    <span className="gba:text-gray-400">-</span>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('type') && (
                <TableCell>
                  {document.documentType ? (
                    <Badge variant="secondary">{document.documentType.value}</Badge>
                  ) : (
                    <span className="gba:text-gray-400">-</span>
                  )}
                </TableCell>
              )}

              {visibleColumns.includes('size') && (
                <TableCell>{document.fileSize ? formatFileSize(document.fileSize) : '-'}</TableCell>
              )}

              {visibleColumns.includes('uploadDate') && (
                <TableCell>{document.createdAt ? formatDate(document.createdAt) : '-'}</TableCell>
              )}

              {visibleColumns.includes('expirationDate') && (
                <TableCell>{document.expirationDate ? formatDate(document.expirationDate) : '-'}</TableCell>
              )}

              {visibleColumns.includes('uploadedBy') && <TableCell>{document.createdBy || '-'}</TableCell>}

              {visibleColumns.includes('actions') && (
                <TableCell>
                  <div className="gba:flex gba:gap-1">
                    <Button
                      data-testid={`document-download-${document.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentAction('download', document)}
                      className="gba:p-1"
                    >
                      <Download className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      data-testid={`document-view-${document.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentAction('view', document)}
                      className="gba:p-1"
                    >
                      <Eye className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      data-testid={`document-edit-${document.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentAction('edit', document)}
                      className="gba:p-1"
                    >
                      <Pencil className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      data-testid={`document-delete-${document.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onDocumentAction('delete', document)}
                      className="gba:p-1 gba:text-red-600 hover:gba:bg-red-50"
                    >
                      <Trash className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
