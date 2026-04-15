// Stored table-of-contents snapshot helpers shared by editor, import, and export.

import type { Node as PMNode } from '@tiptap/pm/model'
import type { DocumentLayoutPageSpan } from '../types'
import {
  getHeadingsForDocumentTableOfContents,
  resolvePageNumberForDocPosition,
  type HeadingItem
} from './navigationPanelUtils'

export type DocumentTocSnapshotUpdateMode = 'entire' | 'pageNumbers' | 'imported'

export interface DocumentTocSnapshotEntry {
  level: number
  text: string
  pos: number
  blockStart: number
  pageNumber: string | null
}

export interface DocumentTocSnapshot {
  version: 2
  entries: DocumentTocSnapshotEntry[]
  updatedAt: string | null
  updateMode: DocumentTocSnapshotUpdateMode
  layoutVersion: number | null
}

type LegacyDocumentTocSnapshotEntry = {
  level?: unknown
  text?: unknown
  pos?: unknown
  blockStart?: unknown
  pageNumber?: unknown
}

function normalizeHeadingLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(6, parsed))
}

function normalizeOptionalInteger(value: unknown, fallback = -1): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) ? parsed : fallback
}

function normalizePageNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeEntry(entry: LegacyDocumentTocSnapshotEntry): DocumentTocSnapshotEntry | null {
  const level = normalizeHeadingLevel(entry.level)
  const pos = normalizeOptionalInteger(entry.pos)
  const blockStartRaw = normalizeOptionalInteger(entry.blockStart)
  const blockStart = blockStartRaw >= 0 ? blockStartRaw : Math.max(pos - 1, 0)

  if (pos < 0 && blockStart < 0) {
    return null
  }

  return {
    level,
    text: typeof entry.text === 'string' ? entry.text : '',
    pos: pos >= 0 ? pos : blockStart + 1,
    blockStart,
    pageNumber: normalizePageNumber(entry.pageNumber)
  }
}

export function createDocumentTocSnapshot(
  entries: DocumentTocSnapshotEntry[],
  options: {
    updateMode: DocumentTocSnapshotUpdateMode
    layoutVersion?: number | null
    updatedAt?: string | null
  }
): DocumentTocSnapshot {
  return {
    version: 2,
    entries,
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    updateMode: options.updateMode,
    layoutVersion: options.layoutVersion ?? null
  }
}

export function parseDocumentTocSnapshot(snapshotJson: string): DocumentTocSnapshot {
  try {
    const parsed = JSON.parse(snapshotJson || '[]') as unknown

    if (Array.isArray(parsed)) {
      return createDocumentTocSnapshot(
        parsed
          .map(entry =>
            entry && typeof entry === 'object' ? normalizeEntry(entry as LegacyDocumentTocSnapshotEntry) : null
          )
          .filter((entry): entry is DocumentTocSnapshotEntry => entry !== null),
        {
          updateMode: 'entire',
          layoutVersion: null,
          updatedAt: null
        }
      )
    }

    if (!parsed || typeof parsed !== 'object') {
      return createDocumentTocSnapshot([], { updateMode: 'entire', layoutVersion: null, updatedAt: null })
    }

    const candidate = parsed as {
      version?: unknown
      entries?: unknown
      updatedAt?: unknown
      updateMode?: unknown
      layoutVersion?: unknown
    }

    const entries = Array.isArray(candidate.entries)
      ? candidate.entries
          .map(entry =>
            entry && typeof entry === 'object' ? normalizeEntry(entry as LegacyDocumentTocSnapshotEntry) : null
          )
          .filter((entry): entry is DocumentTocSnapshotEntry => entry !== null)
      : []

    const updateMode =
      candidate.updateMode === 'pageNumbers' || candidate.updateMode === 'imported' ? candidate.updateMode : 'entire'
    const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null
    const layoutVersion = Number.isInteger(candidate.layoutVersion) ? (candidate.layoutVersion as number) : null

    return {
      version: candidate.version === 2 ? 2 : 2,
      entries,
      updatedAt,
      updateMode,
      layoutVersion
    }
  } catch {
    return createDocumentTocSnapshot([], { updateMode: 'entire', layoutVersion: null, updatedAt: null })
  }
}

export function stringifyDocumentTocSnapshot(snapshot: DocumentTocSnapshot): string {
  return JSON.stringify(snapshot)
}

export function resolveFallbackPageNumber(doc: PMNode, pos: number): number {
  let pageNumber = 1
  doc.descendants((node, nodePos) => {
    if (nodePos >= pos) return false
    if (node.type.name === 'pageBreak') {
      pageNumber += 1
    }
    return true
  })
  return pageNumber
}

export function resolveStoredDocumentTocPageNumber(
  doc: PMNode,
  blockStart: number,
  spans: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>> | undefined
): string | null {
  const pageNumber = resolvePageNumberForDocPosition(blockStart, spans)
  if (pageNumber !== null) {
    return String(pageNumber)
  }

  if (blockStart < 0) {
    return null
  }

  return String(resolveFallbackPageNumber(doc, blockStart))
}

function createSnapshotEntry(
  heading: HeadingItem,
  doc: PMNode,
  spans: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>> | undefined
): DocumentTocSnapshotEntry {
  return {
    level: heading.level,
    text: heading.text,
    pos: heading.pos,
    blockStart: heading.blockStart,
    pageNumber: resolveStoredDocumentTocPageNumber(doc, heading.blockStart, spans)
  }
}

export function buildDocumentTocSnapshotFromDoc(options: {
  doc: PMNode
  afterPos: number
  maxHeadingLevel: number
  spans?: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>>
  layoutVersion?: number | null
  updateMode?: DocumentTocSnapshotUpdateMode
}): DocumentTocSnapshot {
  const entries = getHeadingsForDocumentTableOfContents(options.doc, options.afterPos)
    .filter(heading => heading.level <= options.maxHeadingLevel)
    .map(heading => createSnapshotEntry(heading, options.doc, options.spans))

  return createDocumentTocSnapshot(entries, {
    updateMode: options.updateMode ?? 'entire',
    layoutVersion: options.layoutVersion ?? null
  })
}

export function updateDocumentTocSnapshotPageNumbers(options: {
  snapshot: DocumentTocSnapshot
  doc: PMNode
  spans?: Array<Pick<DocumentLayoutPageSpan, 'pageNumber' | 'startPos' | 'endPos'>>
  layoutVersion?: number | null
}): DocumentTocSnapshot {
  const entries = options.snapshot.entries.map(entry => ({
    ...entry,
    pageNumber:
      entry.blockStart >= 0
        ? resolveStoredDocumentTocPageNumber(options.doc, entry.blockStart, options.spans)
        : entry.pageNumber
  }))

  return createDocumentTocSnapshot(entries, {
    updateMode: 'pageNumbers',
    layoutVersion: options.layoutVersion ?? null
  })
}

export function isDocumentTocStructurallyStale(options: {
  snapshot: DocumentTocSnapshot
  doc: PMNode
  afterPos: number
  maxHeadingLevel: number
}): boolean {
  const liveHeadings = getHeadingsForDocumentTableOfContents(options.doc, options.afterPos).filter(
    heading => heading.level <= options.maxHeadingLevel
  )

  if (liveHeadings.length !== options.snapshot.entries.length) {
    return true
  }

  return liveHeadings.some((heading, index) => {
    const entry = options.snapshot.entries[index]
    if (!entry) return true
    return entry.level !== heading.level || entry.text !== heading.text
  })
}
