import type { Editor as TiptapEditor } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  getTablePaginationChainId,
  getTablePaginationSplitId,
  getTableRuntimeChainKey
} from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationIdentity'
import { getTableRowCount } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationUtils'
import { incrementPaginationInstrumentationCounter } from '@/components/tiptap-extensions/tiptap-custom-pagination/paginationInstrumentation'
import type {
  DocumentLayoutAnchorCollection,
  DocumentLayoutAnchorRect,
  DocumentLayoutAnchorSnapshot,
  DocumentLayoutInvalidationScope,
  DocumentLayoutPageBodyBounds,
  DocumentLayoutPageRange,
  DocumentLayoutPageSpan,
  DocumentLayoutSnapshot,
  DocumentLayoutSource,
  DocumentLayoutTableFragmentSnapshot
} from '../../types'

type DocumentLayoutPositionRange = {
  pageNumber: number
  startPos: number
  endPos: number
}

type CommentRangeGroup = {
  commentId: string
  ranges: Array<{ from: number; to: number }>
}

const documentLayoutAnchorCache = new WeakMap<ProseMirrorNode, Map<string, DocumentLayoutAnchorCollection>>()
const documentLayoutTableFragmentCache = new WeakMap<
  ProseMirrorNode,
  Map<string, DocumentLayoutTableFragmentSnapshot[]>
>()

function createEmptyAnchorCollection(): DocumentLayoutAnchorCollection {
  return {
    comments: [],
    images: [],
    links: [],
    tables: []
  }
}

function clampPageRange(startPage: number, endPage: number): DocumentLayoutPageRange {
  return {
    startPage: Math.max(1, Math.min(startPage, endPage)),
    endPage: Math.max(1, Math.max(startPage, endPage))
  }
}

function mergeRanges(ranges: Array<{ from: number; to: number }>): Array<{ from: number; to: number }> {
  if (ranges.length === 0) {
    return []
  }

  const sorted = [...ranges].sort((left, right) => left.from - right.from)
  const merged: Array<{ from: number; to: number }> = []

  sorted.forEach(range => {
    const previous = merged[merged.length - 1]
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to)
      return
    }

    merged.push({ ...range })
  })

  return merged
}

function createPageSpanKey(pageSpan: { pageNumber: number }) {
  return pageSpan.pageNumber
}

function toPageSpan(
  range: DocumentLayoutPositionRange,
  source: DocumentLayoutPageSpan['source']
): DocumentLayoutPageSpan {
  return {
    ...range,
    source
  }
}

function mergeRetainedPageSpan(
  previousPageSpan: DocumentLayoutPageSpan | undefined,
  nextRange: DocumentLayoutPositionRange
): DocumentLayoutPageSpan {
  if (!previousPageSpan) {
    return toPageSpan(nextRange, 'retained')
  }

  return {
    pageNumber: nextRange.pageNumber,
    startPos: Math.min(previousPageSpan.startPos, nextRange.startPos),
    endPos: Math.max(previousPageSpan.endPos, nextRange.endPos),
    source: 'retained'
  }
}

function resolvePageNumbersForRange(
  pageSpans: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>>,
  from: number,
  to: number
): number[] {
  const safeStart = Math.max(0, Math.min(from, to))
  const safeEnd = Math.max(safeStart, Math.max(from, to))

  return pageSpans
    .filter(pageSpan => safeStart <= pageSpan.endPos && safeEnd >= pageSpan.startPos)
    .map(pageSpan => pageSpan.pageNumber)
}

function resolveAnchorPageRange(pageNumbers: number[]): DocumentLayoutPageRange | null {
  if (pageNumbers.length === 0) {
    return null
  }

  return clampPageRange(pageNumbers[0] ?? 1, pageNumbers[pageNumbers.length - 1] ?? 1)
}

function unionAnchorRect(bounds: DocumentLayoutPageBodyBounds[]): DocumentLayoutAnchorRect | null {
  if (bounds.length === 0) {
    return null
  }

  return bounds.reduce<DocumentLayoutAnchorRect>(
    (current, bound) => ({
      top: Math.min(current.top, bound.top),
      bottom: Math.max(current.bottom, bound.bottom),
      left: Math.min(current.left, bound.left),
      right: Math.max(current.right, bound.right)
    }),
    {
      top: bounds[0]?.top ?? 0,
      bottom: bounds[0]?.bottom ?? 0,
      left: bounds[0]?.left ?? 0,
      right: bounds[0]?.right ?? 0
    }
  )
}

function resolveAnchorRect(
  pageBounds: DocumentLayoutPageBodyBounds[],
  pageNumbers: number[]
): DocumentLayoutAnchorRect | null {
  if (pageNumbers.length === 0) {
    return null
  }

  return unionAnchorRect(pageBounds.filter(bounds => pageNumbers.includes(bounds.pageNumber)))
}

function createPageSpansCacheKey(pageSpans: DocumentLayoutPageSpan[]): string {
  return pageSpans
    .map(pageSpan => `${pageSpan.pageNumber}:${pageSpan.startPos}:${pageSpan.endPos}:${pageSpan.source}`)
    .join('|')
}

function createPageBoundsCacheKey(pageBounds: DocumentLayoutPageBodyBounds[]): string {
  return pageBounds
    .map(pageBound =>
      [
        pageBound.pageNumber,
        pageBound.left.toFixed(1),
        pageBound.right.toFixed(1),
        pageBound.top.toFixed(1),
        pageBound.bottom.toFixed(1)
      ].join(':')
    )
    .join('|')
}

function resolveCachedDocumentLayoutValue<T>(
  cache: WeakMap<ProseMirrorNode, Map<string, T>>,
  doc: ProseMirrorNode,
  key: string
): T | null {
  return cache.get(doc)?.get(key) ?? null
}

function storeCachedDocumentLayoutValue<T>(
  cache: WeakMap<ProseMirrorNode, Map<string, T>>,
  doc: ProseMirrorNode,
  key: string,
  value: T
): T {
  const existingCache = cache.get(doc)
  if (existingCache) {
    existingCache.set(key, value)
  } else {
    cache.set(doc, new Map([[key, value]]))
  }

  return value
}

function createAnchorSnapshot(options: {
  id: string
  kind: DocumentLayoutAnchorSnapshot['kind']
  from: number
  to: number
  pageSpans: DocumentLayoutPageSpan[]
  pageBounds: DocumentLayoutPageBodyBounds[]
  metadata: DocumentLayoutAnchorSnapshot['metadata']
}): DocumentLayoutAnchorSnapshot {
  const pageNumbers = resolvePageNumbersForRange(options.pageSpans, options.from, options.to)
  const pageRange = resolveAnchorPageRange(pageNumbers)

  return {
    id: options.id,
    kind: options.kind,
    from: options.from,
    to: options.to,
    pageNumber: pageNumbers[0] ?? null,
    pageRange,
    rect: resolveAnchorRect(options.pageBounds, pageNumbers),
    metadata: options.metadata
  }
}

function collectCommentRanges(doc: ProseMirrorNode): Map<string, CommentRangeGroup> {
  const groupedCommentRanges = new Map<string, CommentRangeGroup>()

  doc.descendants((node, pos) => {
    if (!node.isText) {
      return
    }

    for (const mark of node.marks ?? []) {
      if (mark?.type?.name !== 'inlineComment') {
        continue
      }

      const commentId = typeof mark.attrs?.commentId === 'string' ? mark.attrs.commentId : null
      if (!commentId) {
        continue
      }

      const existing = groupedCommentRanges.get(commentId) ?? {
        commentId,
        ranges: []
      }
      existing.ranges.push({
        from: pos,
        to: pos + node.nodeSize
      })
      groupedCommentRanges.set(commentId, existing)
    }
  })

  return groupedCommentRanges
}

export function createDocumentLayoutPageSpans(
  ranges: DocumentLayoutPositionRange[],
  source: Extract<DocumentLayoutPageSpan['source'], 'mounted' | 'placeholder' | 'spacer'>
): DocumentLayoutPageSpan[] {
  return ranges.map(range => toPageSpan(range, source)).sort((left, right) => left.pageNumber - right.pageNumber)
}

export function mergeMeasuredDocumentLayoutPageSpans(options: {
  mountedRanges: DocumentLayoutPositionRange[]
  placeholderRanges: DocumentLayoutPositionRange[]
  spacerRanges: DocumentLayoutPositionRange[]
  pageCount: number
}): DocumentLayoutPageSpan[] {
  const merged = new Map<number, DocumentLayoutPageSpan>()
  const safePageCount = Math.max(1, options.pageCount)

  createDocumentLayoutPageSpans(options.spacerRanges, 'spacer').forEach(pageSpan => {
    if (pageSpan.pageNumber >= 1 && pageSpan.pageNumber <= safePageCount) {
      merged.set(pageSpan.pageNumber, pageSpan)
    }
  })

  createDocumentLayoutPageSpans(options.placeholderRanges, 'placeholder').forEach(pageSpan => {
    if (pageSpan.pageNumber >= 1 && pageSpan.pageNumber <= safePageCount) {
      merged.set(pageSpan.pageNumber, pageSpan)
    }
  })

  createDocumentLayoutPageSpans(options.mountedRanges, 'mounted').forEach(pageSpan => {
    if (pageSpan.pageNumber >= 1 && pageSpan.pageNumber <= safePageCount) {
      merged.set(pageSpan.pageNumber, pageSpan)
    }
  })

  return Array.from(merged.values()).sort((left, right) => left.pageNumber - right.pageNumber)
}

export function mergeRetainedDocumentLayoutPageSpans(
  previousPageSpans: DocumentLayoutPageSpan[],
  nextPageSpans: DocumentLayoutPageSpan[],
  pageCount: number,
  retainPrevious = true
): DocumentLayoutPageSpan[] {
  const safePageCount = Math.max(1, pageCount)
  const merged = new Map<number, DocumentLayoutPageSpan>()

  if (retainPrevious) {
    previousPageSpans.forEach(pageSpan => {
      if (pageSpan.pageNumber < 1 || pageSpan.pageNumber > safePageCount) {
        return
      }

      merged.set(pageSpan.pageNumber, {
        ...pageSpan,
        source: 'retained'
      })
    })
  }

  nextPageSpans.forEach(pageSpan => {
    if (pageSpan.pageNumber < 1 || pageSpan.pageNumber > safePageCount) {
      return
    }

    const previous = merged.get(createPageSpanKey(pageSpan))
    merged.set(pageSpan.pageNumber, mergeRetainedPageSpan(previous, pageSpan))
  })

  return Array.from(merged.values()).sort((left, right) => left.pageNumber - right.pageNumber)
}

export function resolveNextDocumentLayoutVersion(options: {
  previousSnapshot: DocumentLayoutSnapshot
  scope: DocumentLayoutInvalidationScope
  docChanged: boolean
}): number {
  if (options.docChanged || options.scope !== 'viewport') {
    return options.previousSnapshot.documentVersion + 1
  }

  return options.previousSnapshot.documentVersion
}

export function collectDocumentLayoutAnchors(
  editor: TiptapEditor | null,
  pageSpans: DocumentLayoutPageSpan[],
  pageBounds: DocumentLayoutPageBodyBounds[]
): DocumentLayoutAnchorCollection {
  if (!editor || editor.isDestroyed) {
    return createEmptyAnchorCollection()
  }

  try {
    const doc = editor.state.doc
    const cacheKey = `${createPageSpansCacheKey(pageSpans)}::${createPageBoundsCacheKey(pageBounds)}`
    const cachedAnchors = resolveCachedDocumentLayoutValue(documentLayoutAnchorCache, doc, cacheKey)
    if (cachedAnchors) {
      incrementPaginationInstrumentationCounter('layout-anchor-collection-cache-hit')
      return cachedAnchors
    }
    const comments = Array.from(collectCommentRanges(doc).values())
      .flatMap(commentRangeGroup => {
        const mergedRanges = mergeRanges(commentRangeGroup.ranges)
        return mergedRanges.map((range, index) =>
          createAnchorSnapshot({
            id: `${commentRangeGroup.commentId}:${index}`,
            kind: 'comment',
            from: range.from,
            to: range.to,
            pageSpans,
            pageBounds,
            metadata: {
              commentId: commentRangeGroup.commentId
            }
          })
        )
      })
      .sort((left, right) => left.from - right.from)

    const images: DocumentLayoutAnchorSnapshot[] = []
    const links: DocumentLayoutAnchorSnapshot[] = []
    const tables: DocumentLayoutAnchorSnapshot[] = []

    doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        images.push(
          createAnchorSnapshot({
            id: `image:${pos}`,
            kind: 'image',
            from: pos,
            to: pos + node.nodeSize,
            pageSpans,
            pageBounds,
            metadata: {
              src: typeof node.attrs.src === 'string' ? node.attrs.src : null,
              wrapMode: typeof node.attrs.wrapMode === 'string' ? node.attrs.wrapMode : null,
              anchorMode: typeof node.attrs.anchorMode === 'string' ? node.attrs.anchorMode : null,
              align: typeof node.attrs.align === 'string' ? node.attrs.align : null
            }
          })
        )
      }

      if (node.isText) {
        node.marks?.forEach((mark, index) => {
          if (mark?.type?.name !== 'link') {
            return
          }

          links.push(
            createAnchorSnapshot({
              id: `link:${pos}:${index}`,
              kind: 'link',
              from: pos,
              to: pos + node.nodeSize,
              pageSpans,
              pageBounds,
              metadata: {
                href: typeof mark.attrs?.href === 'string' ? mark.attrs.href : null,
                target: typeof mark.attrs?.target === 'string' ? mark.attrs.target : null
              }
            })
          )
        })
      }

      if (node.type.name === 'table') {
        tables.push(
          createAnchorSnapshot({
            id: `table:${pos}`,
            kind: 'table',
            from: pos,
            to: pos + node.nodeSize,
            pageSpans,
            pageBounds,
            metadata: {
              rowCount: getTableRowCount(node)
            }
          })
        )
      }
    })

    return storeCachedDocumentLayoutValue(documentLayoutAnchorCache, doc, cacheKey, {
      comments,
      images,
      links,
      tables
    })
  } catch {
    return createEmptyAnchorCollection()
  }
}

export function collectDocumentLayoutTableFragments(
  editor: TiptapEditor | null,
  pageSpans: DocumentLayoutPageSpan[]
): DocumentLayoutTableFragmentSnapshot[] {
  if (!editor || editor.isDestroyed) {
    return []
  }

  try {
    const doc = editor.state.doc
    const cacheKey = createPageSpansCacheKey(pageSpans)
    const cachedFragments = resolveCachedDocumentLayoutValue(documentLayoutTableFragmentCache, doc, cacheKey)
    if (cachedFragments) {
      incrementPaginationInstrumentationCounter('layout-table-fragment-cache-hit')
      return cachedFragments
    }

    const fragments: DocumentLayoutTableFragmentSnapshot[] = []
    const fragmentIndexesByKey = new Map<string, number>()
    const fragmentCountsByKey = new Map<string, number>()

    doc.descendants((node, pos) => {
      if (node.type.name !== 'table') {
        return
      }

      const from = pos
      const to = pos + node.nodeSize
      const pageNumbers = resolvePageNumbersForRange(pageSpans, from, to)
      const paginationChainKey = getTableRuntimeChainKey(node, pos)
      const fragmentCount = (fragmentCountsByKey.get(paginationChainKey) ?? 0) + 1
      fragmentCountsByKey.set(paginationChainKey, fragmentCount)

      const nextFragmentIndex = fragmentIndexesByKey.get(paginationChainKey) ?? 0
      fragmentIndexesByKey.set(paginationChainKey, nextFragmentIndex + 1)

      fragments.push({
        id: `table-fragment:${pos}`,
        tablePos: pos,
        from,
        to,
        pageNumbers,
        pageRange: resolveAnchorPageRange(pageNumbers),
        rowCount: getTableRowCount(node),
        paginationChainKey,
        paginationChainId: getTablePaginationChainId(node),
        paginationSplitId: getTablePaginationSplitId(node),
        fragmentIndex: nextFragmentIndex,
        fragmentCount
      })
    })

    const groupedFragments = new Map<string, number>()
    fragments.forEach(fragment => {
      groupedFragments.set(fragment.paginationChainKey, (groupedFragments.get(fragment.paginationChainKey) ?? 0) + 1)
    })

    return storeCachedDocumentLayoutValue(
      documentLayoutTableFragmentCache,
      doc,
      cacheKey,
      fragments.map(fragment => ({
        ...fragment,
        fragmentCount: groupedFragments.get(fragment.paginationChainKey) ?? fragment.fragmentCount
      }))
    )
  } catch {
    return []
  }
}

export function createEmptyDocumentLayoutSnapshot(source: DocumentLayoutSource): DocumentLayoutSnapshot {
  return {
    documentVersion: 0,
    layoutVersion: 0,
    source,
    pageCount: 1,
    pages: [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }],
    flow: [],
    mountedRange: null,
    pageBounds: [],
    mountedPageBodyBounds: [],
    pageSpans: [],
    retainedPageSpans: [],
    pagePositionRanges: [],
    pageChromeMetrics: [],
    anchors: createEmptyAnchorCollection(),
    tableFragments: [],
    activeRange: null,
    activePages: [{ pageNumber: 1, flowIndex: null, mountedIndex: null, isMounted: false }]
  }
}
