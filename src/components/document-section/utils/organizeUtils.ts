import type { TemplateTreeNode } from '@/common/network/flowbot/FlowbotClient'
import type { DocumentItem } from '../types'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'

export function folderNodesToTemplateTree(nodes: FolderNode[], parentPath = ''): TemplateTreeNode[] {
  return nodes.map(node => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name
    return {
      name: node.name,
      path,
      children: folderNodesToTemplateTree(node.folders, path)
    }
  })
}

export function buildFolderPathMap(documents: DocumentItem[]): Map<string, string> {
  const folders = documents.filter(d => d.folder)
  const idToDoc = new Map(folders.map(f => [f.id, f]))
  const pathMap = new Map<string, string>()

  for (const folder of folders) {
    const segments: string[] = []
    let current: DocumentItem | undefined = folder
    while (current) {
      if (current.name) segments.unshift(current.name)
      current = current.parentDocument ? idToDoc.get(current.parentDocument) : undefined
    }
    pathMap.set(segments.join('/'), folder.id)
  }
  return pathMap
}

export function collectAllPaths(templateNodes: TemplateTreeNode[]): string[] {
  const paths: string[] = []
  function walk(nodes: TemplateTreeNode[]) {
    for (const node of nodes) {
      paths.push(node.path)
      if (node.children.length > 0) walk(node.children)
    }
  }
  walk(templateNodes)
  return paths
}

export const MANAGED_FOLDER_MARKER = 'flowbot-managed'

/**
 * Find AI-managed folders (created by Organize with AI).
 * Returns them sorted deepest-first so callers can delete children before parents.
 */
export function findManagedFolders(documents: DocumentItem[]): DocumentItem[] {
  const managed = documents.filter(d => d.folder && d.description === MANAGED_FOLDER_MARKER)

  const idToDoc = new Map(documents.filter(d => d.folder).map(d => [d.id, d]))
  const depthOf = (doc: DocumentItem): number => {
    let depth = 0
    let current = doc.parentDocument ? idToDoc.get(doc.parentDocument) : undefined
    while (current) {
      depth++
      current = current.parentDocument ? idToDoc.get(current.parentDocument) : undefined
    }
    return depth
  }

  return managed.sort((a, b) => depthOf(b) - depthOf(a))
}

/**
 * Determine which folders to clean up before a new Apply.
 * Only marker-managed folders are eligible for cleanup.
 */
export function findFoldersForCleanup(documents: DocumentItem[]): DocumentItem[] {
  return findManagedFolders(documents)
}

/**
 * Find files that live inside any of the given folder IDs (direct children only).
 */
export function findFilesInFolders(documents: DocumentItem[], folderIds: Set<string>): DocumentItem[] {
  return documents.filter(d => !d.folder && d.parentDocument && folderIds.has(d.parentDocument))
}

/**
 * Collect folder IDs for full subtree (root folders + all nested descendant folders).
 */
export function collectFolderSubtreeIds(documents: DocumentItem[], rootFolderIds: Set<string>): Set<string> {
  const childrenByParent = new Map<string, string[]>()

  for (const folder of documents.filter(d => d.folder)) {
    if (!folder.parentDocument) continue
    const children = childrenByParent.get(folder.parentDocument) ?? []
    children.push(folder.id)
    childrenByParent.set(folder.parentDocument, children)
  }

  const subtreeIds = new Set<string>(rootFolderIds)
  const stack = [...rootFolderIds]

  while (stack.length > 0) {
    const currentId = stack.pop()
    if (!currentId) continue

    const children = childrenByParent.get(currentId) ?? []
    for (const childId of children) {
      if (subtreeIds.has(childId)) continue
      subtreeIds.add(childId)
      stack.push(childId)
    }
  }

  return subtreeIds
}

/**
 * Find files that belong to one or more folder subtrees.
 */
export function findFilesInFolderSubtrees(documents: DocumentItem[], rootFolderIds: Set<string>): DocumentItem[] {
  const subtreeFolderIds = collectFolderSubtreeIds(documents, rootFolderIds)
  return documents.filter(d => !d.folder && d.parentDocument && subtreeFolderIds.has(d.parentDocument))
}

export interface ManagedFolderDeletePlan {
  deletableFolderIds: Set<string>
  preservedFolderIds: Set<string>
}

/**
 * Decide which managed folders can be deleted safely for a given selection.
 * Managed folders containing unselected files are preserved.
 */
export function planManagedFolderDeletion(
  documents: DocumentItem[],
  managedFolders: DocumentItem[],
  selectedDocumentIds: Set<string>
): ManagedFolderDeletePlan {
  const deletableFolderIds = new Set<string>()
  const preservedFolderIds = new Set<string>()

  for (const folder of managedFolders) {
    const filesInSubtree = findFilesInFolderSubtrees(documents, new Set([folder.id]))
    const hasUnselectedFiles = filesInSubtree.some(file => !selectedDocumentIds.has(file.id))

    if (hasUnselectedFiles) {
      preservedFolderIds.add(folder.id)
      continue
    }

    deletableFolderIds.add(folder.id)
  }

  return { deletableFolderIds, preservedFolderIds }
}
