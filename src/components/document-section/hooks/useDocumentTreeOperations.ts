import { useMemo } from 'react'
import { DocumentItem, DocumentItemWithTreeInfo } from '../types'
import { MAX_FOLDER_DEPTH } from '../constants'

interface UseDocumentTreeOperationsProps {
  documents: DocumentItem[]
  viewMode: 'tree' | 'list'
  searchTerm: string
  expandedFolders: Set<string>
  setExpandedFolders: (folders: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  onSearchChange?: (term: string) => void
}

export function useDocumentTreeOperations({
  documents,
  viewMode,
  searchTerm,
  expandedFolders,
  setExpandedFolders,
  onSearchChange
}: UseDocumentTreeOperationsProps) {
  // Organize documents into tree structure
  const organizeDocumentsForTree = (docs: DocumentItem[]): DocumentItem[] => {
    if (viewMode === 'list') {
      return docs // Return flat list for list view
    }

    // For tree view, organize by parent-child relationships
    const rootDocuments: DocumentItem[] = []
    const documentMap = new Map<string, DocumentItemWithTreeInfo>()

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
          parent.children!.push(docWithChildren)
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
    const sortTreeLevel = (items: DocumentItemWithTreeInfo[]): void => {
      items.sort(sortFoldersFirst)
      items.forEach((item: DocumentItemWithTreeInfo) => {
        if (item.children && item.children.length > 0) {
          sortTreeLevel(item.children as DocumentItemWithTreeInfo[])
        }
      })
    }

    // Sort root level and all children
    sortTreeLevel(rootDocuments as DocumentItemWithTreeInfo[])

    return rootDocuments
  }

  // Flatten tree for rendering with indentation
  const flattenTreeForRendering = (
    docs: DocumentItem[],
    level = 0
  ): Array<DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }> => {
    const result: Array<DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }> = []

    docs.forEach(doc => {
      const docWithChildren = doc as DocumentItemWithTreeInfo
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

  // Check if targetId is a descendant of ancestorId (prevents circular references)
  const isFolderDescendant = (targetId: string, ancestorId: string): boolean => {
    if (targetId === ancestorId) return true

    let currentId: string | null = targetId
    const visited = new Set<string>() // Prevent infinite loops
    const maxDepth = MAX_FOLDER_DEPTH
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

  return {
    filteredDocuments,
    organizedDocuments,
    displayDocuments,
    availableFolders,
    getFolderChildrenCount,
    isFolderDescendant,
    toggleFolderExpansion,
    organizeDocumentsForTree,
    flattenTreeForRendering
  }
}
