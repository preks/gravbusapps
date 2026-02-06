import { useState, useEffect } from 'react'
import { DocumentItem, ConfirmationModalState, NewFolderDialogState } from '../types'

interface UseDocumentStateProps {
  entityId: string
  externalSearchTerm?: string
  onSearchChange?: (term: string) => void
}

export function useDocumentState({ entityId, externalSearchTerm, onSearchChange }: UseDocumentStateProps) {
  // State for custom three dots menu
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMountEl, setMenuMountEl] = useState<HTMLElement | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)

  // State for confirmation modal
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({
    open: false,
    title: '',
    message: '',
    action: null,
    actionLabel: 'Confirm'
  })

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
  const [newFolderDialog, setNewFolderDialog] = useState<NewFolderDialogState>({
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

  return {
    // Menu state
    menuOpen,
    setMenuOpen,
    menuMountEl,
    setMenuMountEl,
    selectedDocument,
    setSelectedDocument,

    // Confirmation modal
    confirmationModal,
    setConfirmationModal,

    // View mode
    viewMode,
    setViewMode,

    // Expanded folders
    expandedFolders,
    setExpandedFolders,

    // Search
    searchTerm,
    handleSearchChange,

    // Selected items
    selectedItems,
    setSelectedItems,

    // New folder dialog
    newFolderDialog,
    setNewFolderDialog,
    newFolderName,
    setNewFolderName,
    selectedParentFolder,
    setSelectedParentFolder,

    // Drag and drop
    draggedDocument,
    setDraggedDocument,
    dropTarget,
    setDropTarget,
    isDroppingOnRoot,
    setIsDroppingOnRoot,
    isOverDropZone,
    setIsOverDropZone,

    // Click vs drag
    mouseDownPos,
    setMouseDownPos,
    isDragging,
    setIsDragging
  }
}
