import React, { useMemo, useState, useCallback } from 'react'
import { Button, Checkbox } from '@newwork/nw-design-system'
import { CaretRight, Folder as FolderIcon, File as FileIcon, Download, Eye, Pencil, Trash } from '@phosphor-icons/react'
import { DocumentViewProps, Document } from '../types/documentTypes'

interface FolderNode {
  id: string
  name: string
  documents: Document[]
  children: FolderNode[]
  parentId: string | null
}

export const DocumentTreeView: React.FC<Omit<DocumentViewProps, 'viewMode'>> = ({
  documents,
  onDocumentAction,
  selectedDocuments,
  onSelectionChange,
  visibleColumns
}) => {
  const isFolder = (doc: Document) => (doc.format || '').toUpperCase() === 'FOLDER'

  const { rootFolders, rootFiles } = useMemo(() => {
    const folderById = new Map<string, FolderNode>()
    const rootFoldersLocal: FolderNode[] = []
    const rootFilesLocal: Document[] = []

    // Initialize folder nodes
    documents.forEach(doc => {
      if (isFolder(doc)) {
        folderById.set(doc.id, {
          id: doc.id,
          name: doc.name || 'Untitled Folder',
          documents: [],
          children: [],
          parentId: doc.parentDocument || null
        })
      }
    })

    // Link folder hierarchy and collect root folders
    folderById.forEach(folder => {
      if (folder.parentId && folderById.has(folder.parentId)) {
        folderById.get(folder.parentId)!.children.push(folder)
      } else {
        rootFoldersLocal.push(folder)
      }
    })

    // Assign files to folders or root
    documents.forEach(doc => {
      if (isFolder(doc)) return
      const parentId = doc.parentDocument || null
      if (parentId && folderById.has(parentId)) {
        folderById.get(parentId)!.documents.push(doc)
      } else {
        rootFilesLocal.push(doc)
      }
    })

    return { rootFolders: rootFoldersLocal, rootFiles: rootFilesLocal }
  }, [documents])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDocuments, documentId])
    } else {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId))
    }
  }

  const formatFileSize = (bytes: number | undefined | null): string => {
    const value = bytes || 0
    if (value === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(value) / Math.log(k))
    return parseFloat((value / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string | undefined | null): string => {
    return dateString ? new Date(dateString).toLocaleDateString() : '-'
  }

  const renderDocumentRow = (doc: Document, depth: number) => (
    <div
      key={doc.id}
      className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
      style={{ paddingLeft: `${16 * depth + 32}px` }}
      data-testid={`document-tree-${doc.id}`}
      onClick={() => onDocumentAction('view', doc)}
    >
      <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
        <div className="gba:w-6"></div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
          <div>
            <FileIcon className="gba:w-4 gba:h-4" />
          </div>
          <Checkbox
            data-testid={`document-select-${doc.id}`}
            checked={selectedDocuments.includes(doc.id)}
            onCheckedChange={checked => handleSelectDocument(doc.id, checked as boolean)}
          />
          <span className="gba:text-sm gba:text-gray-900 gba:truncate" title={doc.name || 'Untitled'}>
            {doc.name || 'Untitled'}
          </span>
        </div>
      </div>
      {visibleColumns.includes('uploadDate') && (
        <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
          {formatDate(doc.createdAt)}
        </div>
      )}
      {visibleColumns.includes('size') && (
        <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
          {formatFileSize(doc.fileSize)}
        </div>
      )}
      {visibleColumns.includes('type') && (
        <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
          {doc.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
        </div>
      )}
      {visibleColumns.includes('actions') && (
        <div className="gba:w-28 gba:flex gba:items-center gba:justify-end gba:gap-1">
          <Button
            data-testid={`document-download-${doc.id}`}
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDocumentAction('download', doc)
            }}
            className="gba:p-1"
          >
            <Download className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            data-testid={`document-view-${doc.id}`}
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDocumentAction('view', doc)
            }}
            className="gba:p-1"
          >
            <Eye className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            data-testid={`document-edit-${doc.id}`}
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDocumentAction('edit', doc)
            }}
            className="gba:p-1"
          >
            <Pencil className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            data-testid={`document-delete-${doc.id}`}
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDocumentAction('delete', doc)
            }}
            className="gba:p-1"
          >
            <Trash className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      )}
    </div>
  )

  const renderFolder = (folder: FolderNode, depth: number) => {
    const isExpanded = expandedFolders.has(folder.id)
    return (
      <React.Fragment key={folder.id}>
        <div
          className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-gray-50 gba:cursor-pointer gba:border-b gba:border-gray-100"
          onClick={() => toggleFolder(folder.id)}
          data-testid={`folder-tree-${folder.id}`}
          style={{ paddingLeft: `${16 * depth}px` }}
        >
          <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
            <div className="gba:w-6 gba:flex gba:items-center gba:justify-center">
              <CaretRight className={`gba:w-3 gba:h-3 gba:text-gray-400 ${isExpanded ? 'gba:rotate-90' : ''}`} />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              <FolderIcon className="gba:w-4 gba:h-4" />
              <span className="gba:text-sm gba:text-gray-900 gba:truncate">{folder.name}</span>
            </div>
          </div>
          {visibleColumns.includes('uploadDate') && (
            <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">-</div>
          )}
          {visibleColumns.includes('size') && (
            <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">-</div>
          )}
          {visibleColumns.includes('type') && (
            <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">Folder</div>
          )}
          {visibleColumns.includes('actions') && <div className="gba:w-28"></div>}
        </div>
        {isExpanded && (
          <>
            {folder.children.map(child => renderFolder(child, depth + 1))}
            {folder.documents.map(doc => renderDocumentRow(doc, depth + 1))}
          </>
        )}
      </React.Fragment>
    )
  }

  return (
    <div className="gba:w-full" data-testid="document-tree-view">
      <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
        <div className="gba:flex gba:items-center gba:py-3 gba:px-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
          <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
            <div className="gba:w-6"></div>
            <div className="gba:flex-1 gba:min-w-0">Name</div>
          </div>
          {visibleColumns.includes('uploadDate') && <div className="gba:w-44 gba:text-right gba:mr-4">Modified</div>}
          {visibleColumns.includes('size') && <div className="gba:w-20 gba:text-right gba:mr-4">Size</div>}
          {visibleColumns.includes('type') && <div className="gba:w-16 gba:text-right gba:mr-4">Type</div>}
          {visibleColumns.includes('actions') && <div className="gba:w-16"></div>}
        </div>

        {/* Root-level drop zone spacer */}
        <div className="gba:h-2" />

        {/* Root-level files */}
        {rootFiles.map(doc => renderDocumentRow(doc, 0))}

        {/* Folders */}
        {rootFolders.map(folder => renderFolder(folder, 0))}
      </div>
    </div>
  )
}

export default DocumentTreeView
