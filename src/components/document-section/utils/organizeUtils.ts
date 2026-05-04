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
 * Sort folders deepest-first for safe bottom-up deletion.
 */
function sortDeepestFirst(folders: DocumentItem[], allDocuments: DocumentItem[]): DocumentItem[] {
  const idToDoc = new Map(allDocuments.filter(d => d.folder).map(d => [d.id, d]))
  const depthOf = (doc: DocumentItem): number => {
    let depth = 0
    let current = doc.parentDocument ? idToDoc.get(doc.parentDocument) : undefined
    while (current) {
      depth++
      current = current.parentDocument ? idToDoc.get(current.parentDocument) : undefined
    }
    return depth
  }
  return [...folders].sort((a, b) => depthOf(b) - depthOf(a))
}

/**
 * Return ALL existing folders as cleanup candidates, sorted deepest-first.
 * Selection protection (keeping folders that contain unselected files)
 * is handled by planManagedFolderDeletion, not here.
 */
export function findFoldersForCleanup(documents: DocumentItem[]): DocumentItem[] {
  const allFolders = documents.filter(d => d.folder)
  if (allFolders.length === 0) return []

  return sortDeepestFirst(allFolders, documents)
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
 * Find real files (with mimeType or fileInfo) that belong to one or more folder subtrees.
 * Ghost records (folder=false but no mimeType/fileInfo) are excluded.
 */
export function findFilesInFolderSubtrees(documents: DocumentItem[], rootFolderIds: Set<string>): DocumentItem[] {
  const subtreeFolderIds = collectFolderSubtreeIds(documents, rootFolderIds)
  return documents.filter(
    d => !d.folder && d.parentDocument && subtreeFolderIds.has(d.parentDocument) && (d.mimeType || d.fileInfo)
  )
}

/**
 * Group folders by depth level for level-by-level processing.
 * Returns a Map from depth number to folder list at that depth.
 */
export function groupFoldersByDepth(
  folders: DocumentItem[],
  allDocuments: DocumentItem[]
): Map<number, DocumentItem[]> {
  const idToDoc = new Map(allDocuments.filter(d => d.folder).map(d => [d.id, d]))
  const depthOf = (doc: DocumentItem): number => {
    let depth = 0
    let current = doc.parentDocument ? idToDoc.get(doc.parentDocument) : undefined
    while (current) {
      depth++
      current = current.parentDocument ? idToDoc.get(current.parentDocument) : undefined
    }
    return depth
  }

  const groups = new Map<number, DocumentItem[]>()
  for (const folder of folders) {
    const depth = depthOf(folder)
    const list = groups.get(depth) ?? []
    list.push(folder)
    groups.set(depth, list)
  }
  return groups
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
