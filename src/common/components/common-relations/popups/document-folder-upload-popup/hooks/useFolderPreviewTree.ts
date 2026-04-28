import { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { FolderSelectionSummary, PreviewRow, PreviewTreeNode } from '../types'

const DEPTH_PADDING_CLASSES: readonly string[] = ['', 'gba:pl-4', 'gba:pl-8', 'gba:pl-12', 'gba:pl-16', 'gba:pl-20']

export function depthIndentClass(depth: number): string {
  const capped = Math.min(depth, DEPTH_PADDING_CLASSES.length - 1)
  return DEPTH_PADDING_CLASSES[capped]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Summarise a File[] into a root folder name, file count, and total size
 * for the in-popup selection preview.
 */
export function buildFolderSelectionSummary(files: readonly File[]): FolderSelectionSummary {
  let totalBytes = 0
  let rootName = ''

  for (const file of files) {
    totalBytes += file.size
    if (rootName) continue
    const relativePath = file.webkitRelativePath || file.name
    const firstSegment = relativePath.split('/')[0]
    rootName = firstSegment || file.name
  }

  return {
    fileCount: files.length,
    totalBytes,
    rootName: rootName || getTranslationFromI18nKeyAndLabel('folderUpload.popup.selection', 'Selection')
  }
}

function sortTreeInPlace(node: PreviewTreeNode): void {
  if (!node.isFolder) return
  node.children.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const child of node.children) sortTreeInPlace(child)
}

/**
 * Build an in-memory tree of the user's selection so the popup can render a
 * compact folder/file preview. The first path segment becomes the root
 * (folders come from `webkitRelativePath`, set earlier by the picker or
 * the drop handler).
 */
function buildPreviewTree(files: readonly File[]): PreviewTreeNode | null {
  if (files.length === 0) return null

  let rootName = ''
  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const first = path.split('/')[0]
    if (first) {
      rootName = first
      break
    }
  }
  if (!rootName) {
    rootName = getTranslationFromI18nKeyAndLabel('folderUpload.popup.selection', 'Selection')
  }

  const root: PreviewTreeNode = { name: rootName, isFolder: true, size: 0, children: [] }

  for (const file of files) {
    const path = file.webkitRelativePath || file.name
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) continue

    const startIdx = segments[0] === rootName ? 1 : 0
    let cursor = root

    for (let i = startIdx; i < segments.length; i++) {
      const name = segments[i]
      const isLast = i === segments.length - 1

      if (isLast) {
        cursor.children.push({ name, isFolder: false, size: file.size, children: [] })
        continue
      }

      let child = cursor.children.find(c => c.isFolder && c.name === name)
      if (!child) {
        child = { name, isFolder: true, size: 0, children: [] }
        cursor.children.push(child)
      }
      cursor = child
    }
  }

  sortTreeInPlace(root)
  return root
}

/**
 * Preorder-walk the tree, stopping as soon as we've collected `maxRows`
 * rows. Paths are accumulated so each row has a stable React key
 * (no array indexes). Stopping early means "Show more" clicks do not
 * re-traverse the whole tree for very large selections.
 */
function collectPreviewRows(root: PreviewTreeNode | null, maxRows: number): PreviewRow[] {
  if (!root || maxRows <= 0) return []

  const rows: PreviewRow[] = []

  const walk = (node: PreviewTreeNode, depth: number, parentPath: string): boolean => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name
    rows.push({ path, name: node.name, isFolder: node.isFolder, depth, size: node.size })
    if (rows.length >= maxRows) return true
    if (!node.isFolder) return false
    for (const child of node.children) {
      const reachedLimit = walk(child, depth + 1, path)
      if (reachedLimit) return true
    }
    return false
  }

  walk(root, 0, '')
  return rows
}

/**
 * Count all nodes (folders + files) in the tree so the "+N more" label is
 * accurate without re-walking on each Show-more click. Memoize the result
 * against the tree identity.
 */
function countPreviewNodes(root: PreviewTreeNode | null): number {
  if (!root) return 0
  let count = 1
  if (!root.isFolder) return count
  for (const child of root.children) count += countPreviewNodes(child)
  return count
}

export interface FolderPreviewState {
  readonly summary: FolderSelectionSummary
  readonly previewRows: readonly PreviewRow[]
  readonly totalNodes: number
  readonly hiddenPreviewCount: number
}

/**
 * Derive all preview data (summary + visible rows + totals) from the current
 * file selection and visible-row limit. Memoises tree construction so
 * "Show N more" clicks only re-run the cheap flattening step.
 */
export function useFolderPreviewTree(files: readonly File[], previewLimit: number): FolderPreviewState {
  const tree = useMemo(() => buildPreviewTree(files), [files])
  const totalNodes = useMemo(() => countPreviewNodes(tree), [tree])
  const previewRows = useMemo(() => collectPreviewRows(tree, previewLimit), [tree, previewLimit])
  const summary = useMemo(() => buildFolderSelectionSummary(files), [files])

  return {
    summary,
    previewRows,
    totalNodes,
    hiddenPreviewCount: Math.max(0, totalNodes - previewRows.length)
  }
}
