import React from 'react'
import { toast } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DocumentItem, RestClient, ApiConfig } from '../types'
import { DRAG_TRANSITION_DELAY_MS } from '../constants'
import { updateDocumentLocation } from '../utils/documentApi'
import { useMouseDragDetection } from './useMouseDragDetection'

interface UseDocumentDragDropProps {
  documents: DocumentItem[]
  entityId: string
  apiConfig?: ApiConfig
  accessToken?: string
  restClient: RestClient
  onRefresh?: () => void
  // State setters
  draggedDocument: DocumentItem | null
  setDraggedDocument: (doc: DocumentItem | null) => void
  setDropTarget: (target: string | null) => void
  setIsDroppingOnRoot: (dropping: boolean) => void
  setIsOverDropZone: (over: boolean) => void
  mouseDownPos: { x: number; y: number } | null
  setMouseDownPos: (pos: { x: number; y: number } | null) => void
  setIsDragging: (dragging: boolean) => void
  isFolderDescendant: (targetId: string, ancestorId: string) => boolean
  /**
   * Optional company data for MDM move operations
   * Required when using MDM domain to provide structureId and code
   */
  companyData?: { structureId: string; code: string }
}

export function useDocumentDragDrop({
  documents,
  entityId,
  apiConfig,
  accessToken,
  restClient,
  onRefresh,
  draggedDocument,
  setDraggedDocument,
  setDropTarget,
  setIsDroppingOnRoot,
  setIsOverDropZone,
  mouseDownPos,
  setMouseDownPos,
  setIsDragging,
  isFolderDescendant,
  companyData
}: UseDocumentDragDropProps) {
  // Use mouse drag detection hook
  const mouseDrag = useMouseDragDetection({
    mouseDownPos,
    setMouseDownPos,
    setIsDragging
  })

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
      if (!currentTarget?.contains(relatedTarget)) {
        setDropTarget(null)
      }
    }, DRAG_TRANSITION_DELAY_MS)
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
      toast.error(
        getTranslationFromI18nKeyAndLabel(
          'document.toast.error.moveToSelfOrDescendant',
          'Cannot move a folder into itself or its descendants'
        )
      )
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
      if (!currentTarget?.contains(relatedTarget)) {
        setIsOverDropZone(false)
      }
    }, DRAG_TRANSITION_DELAY_MS)
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
      if (!currentTarget?.contains(relatedTarget)) {
        setIsDroppingOnRoot(false)
      }
    }, DRAG_TRANSITION_DELAY_MS)
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
      toast.error(
        getTranslationFromI18nKeyAndLabel(
          'document.toast.error.moveConfigMissing',
          'Cannot move document: missing configuration'
        )
      )
      return
    }

    const document = documents.find(doc => doc.id === documentId)
    if (!document) {
      toast.error(getTranslationFromI18nKeyAndLabel('document.toast.error.documentNotFound', 'Document not found'))
      return
    }

    try {
      await updateDocumentLocation({
        documentId,
        document,
        parentDocument: targetFolderId,
        entityId,
        apiConfig,
        accessToken,
        restClient,
        onRefresh,
        companyData // Pass company data for MDM operations
      })

      const itemType = document.folder ? 'Folder' : 'Document'
      const successMessage = getTranslationFromI18nKeyAndLabel(
        'document.toast.documentMoved',
        '{ $itemType } moved successfully'
      ).replace('{ $itemType }', itemType)
      toast.success(successMessage)
    } catch (e: any) {
      console.error('Error moving document:', e)
      toast.error(
        e?.message || getTranslationFromI18nKeyAndLabel('document.toast.error.moveFailed', 'Failed to move document')
      )
    }
  }

  // Move document to root level (remove from folder)
  const moveDocumentToRoot = async (documentId: string) => {
    if (!accessToken || !apiConfig) {
      toast.error(
        getTranslationFromI18nKeyAndLabel(
          'document.toast.error.moveConfigMissing',
          'Cannot move document: missing configuration'
        )
      )
      return
    }

    const document = documents.find(doc => doc.id === documentId)
    if (!document) {
      toast.error(getTranslationFromI18nKeyAndLabel('document.toast.error.documentNotFound', 'Document not found'))
      return
    }

    try {
      await updateDocumentLocation({
        documentId,
        document,
        parentDocument: null, // null for root documents
        entityId,
        apiConfig,
        accessToken,
        restClient,
        onRefresh,
        companyData // Pass company data for MDM operations
      })

      const itemType = document.folder ? 'Folder' : 'Document'
      const successMessage = getTranslationFromI18nKeyAndLabel(
        'document.toast.documentMovedToRoot',
        '{ $itemType } moved to root level'
      ).replace('{ $itemType }', itemType)
      toast.success(successMessage)
    } catch (e: any) {
      console.error('Error moving document to root:', e)
      toast.error(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('document.toast.error.moveToRootFailed', 'Failed to move document to root')
      )
    }
  }

  return {
    // Mouse handlers from useMouseDragDetection
    handleMouseDown: mouseDrag.handleMouseDown,
    handleMouseMove: mouseDrag.handleMouseMove,
    handleMouseUp: mouseDrag.handleMouseUp,
    // Drag handlers
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    // Drop zone handlers
    handleDropZoneOver,
    handleDropZoneLeave,
    handleDropZoneDrop,
    // Root drop handlers
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    // API handlers
    moveDocumentToFolder,
    moveDocumentToRoot
  }
}
