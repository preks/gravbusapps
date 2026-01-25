/**
 * useNoteTree Hook
 *
 * Manages hierarchical note tree structure for folder navigation.
 * Handles expansion state, drag-and-drop, and tree operations.
 */

import { useState, useCallback, useEffect } from 'react'
import { NoteApiService } from '../services/NoteApiService'
import type { NoteTreeNode, MoveNoteInput } from '../types'

export interface UseNoteTreeOptions {
  autoLoad?: boolean
  defaultExpandedIds?: string[]
}

export interface UseNoteTreeReturn {
  // Data
  tree: NoteTreeNode[]
  flatNodes: NoteTreeNode[]

  // State
  isLoading: boolean
  error: string | null
  expandedIds: Set<string>
  selectedId: string | null

  // Actions
  loadTree: () => Promise<void>
  toggleExpand: (id: string) => void
  expandAll: () => void
  collapseAll: () => void
  setSelectedId: (id: string | null) => void

  // Tree Operations
  moveNode: (nodeId: string, targetParentId: string | null, position: number) => Promise<boolean>
  findNode: (id: string) => NoteTreeNode | null
  getParentChain: (id: string) => NoteTreeNode[]
  getChildren: (parentId: string | null) => NoteTreeNode[]
}

/**
 * Flatten tree for easy iteration
 */
function flattenTree(nodes: NoteTreeNode[], result: NoteTreeNode[] = []): NoteTreeNode[] {
  for (const node of nodes) {
    result.push(node)
    if (node.children.length > 0) {
      flattenTree(node.children, result)
    }
  }
  return result
}

/**
 * Find node by ID in tree
 */
function findNodeInTree(nodes: NoteTreeNode[], id: string): NoteTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Get parent chain from root to node
 */
function getParentChainFromTree(nodes: NoteTreeNode[], targetId: string, chain: NoteTreeNode[] = []): NoteTreeNode[] {
  for (const node of nodes) {
    if (node.id === targetId) {
      return chain
    }
    if (node.children.length > 0) {
      const result = getParentChainFromTree(node.children, targetId, [...chain, node])
      if (result.length > chain.length) {
        return result
      }
    }
  }
  return chain
}

export function useNoteTree(options: UseNoteTreeOptions = {}): UseNoteTreeReturn {
  const { autoLoad = true, defaultExpandedIds = [] } = options

  // State
  const [tree, setTree] = useState<NoteTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpandedIds))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Computed flat list
  const flatNodes = flattenTree(tree)

  /**
   * Load the note tree
   */
  const loadTree = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const treeData = await NoteApiService.getNoteTree()
      setTree(treeData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load note tree'
      setError(message)
      console.error('[useNoteTree] Failed to load tree:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Toggle node expansion
   */
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * Expand all nodes
   */
  const expandAll = useCallback(() => {
    const allIds = flatNodes.filter(n => n.children.length > 0).map(n => n.id)
    setExpandedIds(new Set(allIds))
  }, [flatNodes])

  /**
   * Collapse all nodes
   */
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  /**
   * Move a node to new parent/position
   */
  const moveNode = useCallback(async (nodeId: string, targetParentId: string | null, position: number): Promise<boolean> => {
    try {
      const move: MoveNoteInput = {
        parentId: targetParentId,
        position
      }

      const note = await NoteApiService.moveNote(nodeId, move)
      if (note) {
        // Reload tree to reflect changes
        await loadTree()
        return true
      }
      return false
    } catch (err) {
      console.error('[useNoteTree] Failed to move node:', err)
      return false
    }
  }, [loadTree])

  /**
   * Find node by ID
   */
  const findNode = useCallback((id: string): NoteTreeNode | null => {
    return findNodeInTree(tree, id)
  }, [tree])

  /**
   * Get parent chain for breadcrumbs
   */
  const getParentChain = useCallback((id: string): NoteTreeNode[] => {
    return getParentChainFromTree(tree, id)
  }, [tree])

  /**
   * Get direct children of a parent
   */
  const getChildren = useCallback((parentId: string | null): NoteTreeNode[] => {
    if (parentId === null) {
      return tree
    }
    const parent = findNodeInTree(tree, parentId)
    return parent?.children || []
  }, [tree])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadTree()
    }
  }, [autoLoad, loadTree])

  return {
    // Data
    tree,
    flatNodes,

    // State
    isLoading,
    error,
    expandedIds,
    selectedId,

    // Actions
    loadTree,
    toggleExpand,
    expandAll,
    collapseAll,
    setSelectedId,

    // Tree Operations
    moveNode,
    findNode,
    getParentChain,
    getChildren
  }
}

export default useNoteTree
