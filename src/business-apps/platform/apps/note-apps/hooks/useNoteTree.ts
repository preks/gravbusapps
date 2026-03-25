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
  /** Optional i18n function for user-facing error messages */
  t?: (key: string) => string
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
  moveNodeOptimistic: (nodeId: string, targetParentId: string | null, position: number) => Promise<boolean>
  removeNodeOptimistic: (nodeId: string) => void
  updateNodeTitleOptimistic: (nodeId: string, title: string) => void
  bumpNodeTimestamp: (nodeId: string) => void
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
 * Remove a node from the tree (returns a new tree array).
 */
function removeFromTree(nodes: NoteTreeNode[], id: string): NoteTreeNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({
      ...n,
      children: removeFromTree(n.children, id)
    }))
}

/**
 * Apply an optimistic move: extract the node, then insert it at (targetParentId, position).
 */
function applyMoveOptimistic(
  tree: NoteTreeNode[],
  nodeId: string,
  targetParentId: string | null,
  position: number
): NoteTreeNode[] {
  const node = findNodeInTree(tree, nodeId)
  if (!node) return tree

  const movedNode: NoteTreeNode = { ...node, parentId: targetParentId ?? undefined }
  const treeWithout = removeFromTree(tree, nodeId)

  if (!targetParentId) {
    const updated = [...treeWithout]
    const insertAt = Math.min(position, updated.length)
    updated.splice(insertAt, 0, { ...movedNode, depth: 0, children: movedNode.children })
    return updated
  }

  const insertInto = (nodes: NoteTreeNode[], depth: number): NoteTreeNode[] =>
    nodes.map(n => {
      if (n.id === targetParentId) {
        const children = [...n.children]
        const insertAt = Math.min(position, children.length)
        children.splice(insertAt, 0, { ...movedNode, depth: depth + 1, children: movedNode.children })
        return { ...n, children }
      }
      return { ...n, children: insertInto(n.children, depth + 1) }
    })

  return insertInto(treeWithout, 0)
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
  const { autoLoad = true, defaultExpandedIds = [], t } = options

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
      const message = err instanceof Error ? err.message : t?.('note-tree-load-failed') || String(err)
      setError(message)
      console.error('[useNoteTree] Failed to load tree:', err)
    } finally {
      setIsLoading(false)
    }
  }, [t])

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
   * Move a node to new parent/position (waits for server before updating UI)
   */
  const moveNode = useCallback(
    async (nodeId: string, targetParentId: string | null, position: number): Promise<boolean> => {
      try {
        const move: MoveNoteInput = {
          parentId: targetParentId,
          position
        }

        const note = await NoteApiService.moveNote(nodeId, move)
        if (note) {
          await loadTree()
          return true
        }
        return false
      } catch (err) {
        console.error('[useNoteTree] Failed to move node:', err)
        return false
      }
    },
    [loadTree]
  )

  /**
   * Move a node optimistically: update the local tree first, then persist.
   * Rolls back on failure.
   */
  const moveNodeOptimistic = useCallback(
    async (nodeId: string, targetParentId: string | null, position: number): Promise<boolean> => {
      const snapshot = tree

      setTree(prev => applyMoveOptimistic(prev, nodeId, targetParentId, position))

      try {
        const move: MoveNoteInput = { parentId: targetParentId, position }
        const result = await NoteApiService.moveNote(nodeId, move)
        if (!result) {
          setTree(snapshot)
          return false
        }
        await loadTree()
        return true
      } catch (err) {
        console.error('[useNoteTree] Optimistic move failed, rolling back:', err)
        setTree(snapshot)
        return false
      }
    },
    [tree, loadTree]
  )

  /**
   * Remove a node from the local tree without server call (for delete flows).
   */
  const removeNodeOptimistic = useCallback((nodeId: string) => {
    setTree(prev => removeFromTree(prev, nodeId))
  }, [])

  const updateNodeTitleOptimistic = useCallback((nodeId: string, title: string) => {
    const now = new Date().toISOString()
    const updateTitle = (nodes: NoteTreeNode[]): NoteTreeNode[] =>
      nodes.map(n => {
        if (n.id === nodeId) return { ...n, title, updatedAt: now }
        if (n.children.length > 0) return { ...n, children: updateTitle(n.children) }
        return n
      })
    setTree(prev => updateTitle(prev))
  }, [])

  const bumpNodeTimestamp = useCallback((nodeId: string) => {
    const now = new Date().toISOString()
    const bump = (nodes: NoteTreeNode[]): NoteTreeNode[] =>
      nodes.map(n => {
        if (n.id === nodeId) return { ...n, updatedAt: now }
        if (n.children.length > 0) return { ...n, children: bump(n.children) }
        return n
      })
    setTree(prev => bump(prev))
  }, [])

  /**
   * Find node by ID
   */
  const findNode = useCallback(
    (id: string): NoteTreeNode | null => {
      return findNodeInTree(tree, id)
    },
    [tree]
  )

  /**
   * Get parent chain for breadcrumbs
   */
  const getParentChain = useCallback(
    (id: string): NoteTreeNode[] => {
      return getParentChainFromTree(tree, id)
    },
    [tree]
  )

  /**
   * Get direct children of a parent
   */
  const getChildren = useCallback(
    (parentId: string | null): NoteTreeNode[] => {
      if (parentId === null) {
        return tree
      }
      const parent = findNodeInTree(tree, parentId)
      return parent?.children || []
    },
    [tree]
  )

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
    moveNodeOptimistic,
    removeNodeOptimistic,
    updateNodeTitleOptimistic,
    bumpNodeTimestamp,
    findNode,
    getParentChain,
    getChildren
  }
}

export default useNoteTree
