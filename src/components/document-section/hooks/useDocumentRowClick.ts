import React from 'react'
import { DocumentItem } from '../types'

interface UseDocumentRowClickProps {
  isDragging: boolean
  filteredDocuments: DocumentItem[]
  handleDownloadDocument: (document: DocumentItem) => Promise<void>
  toggleFolderExpansion: (folderId: string) => void
  viewMode: 'tree' | 'list'
  setSelectedItems: (updater: (prev: string[]) => string[]) => void
}

/**
 * Hook to handle row click behavior
 * - Files: Trigger download
 * - Folders (tree view): Toggle expansion and handle selection
 */
export function useDocumentRowClick({
  isDragging,
  filteredDocuments,
  handleDownloadDocument,
  toggleFolderExpansion,
  viewMode,
  setSelectedItems
}: UseDocumentRowClickProps) {
  return (documentId: string, event: React.MouseEvent) => {
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

    // If it's a file (not a folder), trigger download (browser decides preview vs download)
    if (!document.folder) {
      handleDownloadDocument(document)
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
}
