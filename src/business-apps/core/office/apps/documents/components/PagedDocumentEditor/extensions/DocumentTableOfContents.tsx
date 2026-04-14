/**
 * In-document table of contents block (Word-style). Stores explicit field results.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import {
  buildDocumentTocSnapshotFromDoc,
  parseDocumentTocSnapshot,
  stringifyDocumentTocSnapshot,
  updateDocumentTocSnapshotPageNumbers
} from '../../../utils/documentTocSnapshot'
import {
  DEFAULT_DOCUMENT_TOC_STYLES,
  parseDocumentTocStyles,
  stringifyDocumentTocStyles
} from '../../../utils/documentTocStyleUtils'
import { getDocumentTocLayoutHints } from '../../../utils/tocLayoutBridge'
import { DocumentTableOfContentsView } from '../components/DocumentTableOfContentsView'

export interface DocumentTableOfContentsOptions {
  HTMLAttributes: Record<string, unknown>
}

export type DocumentTocTabLeader = 'dot' | 'none'

export interface DocumentTableOfContentsAttrs {
  snapshotJson: string
  stylesJson: string
  showPageNumbers: boolean
  rightAlignPageNumbers: boolean
  tabLeader: DocumentTocTabLeader
  headingLinks: boolean
  maxHeadingLevel: number
}

const DEFAULT_DOCUMENT_TOC_ATTRS: DocumentTableOfContentsAttrs = {
  snapshotJson: '[]',
  stylesJson: stringifyDocumentTocStyles(DEFAULT_DOCUMENT_TOC_STYLES),
  showPageNumbers: true,
  rightAlignPageNumbers: true,
  tabLeader: 'dot',
  headingLinks: true,
  maxHeadingLevel: 3
}

function normalizeMaxHeadingLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(6, parsed))
}

function normalizeTabLeader(value: unknown): DocumentTocTabLeader {
  return value === 'none' ? 'none' : 'dot'
}

function resolveDocumentTocPos(state: EditorState, explicitPos?: number): number | null {
  if (typeof explicitPos === 'number') {
    const nodeAtPos = state.doc.nodeAt(explicitPos)
    if (nodeAtPos?.type.name === 'documentTableOfContents') {
      return explicitPos
    }
  }

  const { $from } = state.selection
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'documentTableOfContents') {
      return $from.before(depth)
    }
  }

  return null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentTableOfContents: {
      insertDocumentTableOfContents: () => ReturnType
      updateDocumentTableOfContentsEntireTable: (pos?: number) => ReturnType
      updateDocumentTableOfContentsPageNumbers: (pos?: number) => ReturnType
      updateDocumentTableOfContents: (pos?: number) => ReturnType
      removeDocumentTableOfContents: (pos?: number) => ReturnType
      setDocumentTableOfContentsOptions: (
        attrs: Partial<Omit<DocumentTableOfContentsAttrs, 'snapshotJson'>>,
        pos?: number
      ) => ReturnType
    }
  }
}

function resolveSpansForSnapshot() {
  const hints = getDocumentTocLayoutHints()
  if (!hints) return undefined
  if (hints.pageSpans && hints.pageSpans.length > 0) {
    return hints.pageSpans
  }
  if (hints.retainedPageSpans && hints.retainedPageSpans.length > 0) {
    return hints.retainedPageSpans
  }
  return hints.pagePositionRanges
}

function buildStoredSnapshotJson(state: EditorState, tocPos: number, maxHeadingLevel: number) {
  const node = state.doc.nodeAt(tocPos)
  if (!node) return null
  const hints = getDocumentTocLayoutHints()
  const snapshot = buildDocumentTocSnapshotFromDoc({
    doc: state.doc,
    afterPos: tocPos + node.nodeSize,
    maxHeadingLevel,
    spans: resolveSpansForSnapshot(),
    layoutVersion: hints?.layoutVersion ?? null
  })
  return stringifyDocumentTocSnapshot(snapshot)
}

function buildUpdatedPageNumbersSnapshotJson(state: EditorState, snapshotJson: string) {
  const hints = getDocumentTocLayoutHints()
  const snapshot = parseDocumentTocSnapshot(snapshotJson)
  const withUpdatedPageNumbers = updateDocumentTocSnapshotPageNumbers({
    snapshot,
    doc: state.doc,
    spans: resolveSpansForSnapshot(),
    layoutVersion: hints?.layoutVersion ?? null
  })
  return stringifyDocumentTocSnapshot(withUpdatedPageNumbers)
}

export const DocumentTableOfContents = Node.create<DocumentTableOfContentsOptions>({
  name: 'documentTableOfContents',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      snapshotJson: {
        default: '[]',
        parseHTML: element => element.getAttribute('data-toc-snapshot') ?? '[]',
        renderHTML: attributes => {
          const raw = attributes.snapshotJson as string
          if (!raw || raw === '[]') {
            return {}
          }
          return { 'data-toc-snapshot': raw }
        }
      },
      stylesJson: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.stylesJson,
        parseHTML: element =>
          stringifyDocumentTocStyles(parseDocumentTocStyles(element.getAttribute('data-toc-styles'))),
        renderHTML: attributes => ({
          'data-toc-styles': stringifyDocumentTocStyles(parseDocumentTocStyles(String(attributes.stylesJson ?? '')))
        })
      },
      showPageNumbers: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.showPageNumbers,
        parseHTML: element => element.getAttribute('data-toc-show-page-numbers') !== 'false',
        renderHTML: attributes => ({
          'data-toc-show-page-numbers': String(attributes.showPageNumbers !== false)
        })
      },
      rightAlignPageNumbers: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.rightAlignPageNumbers,
        parseHTML: element => element.getAttribute('data-toc-right-align-page-numbers') !== 'false',
        renderHTML: attributes => ({
          'data-toc-right-align-page-numbers': String(attributes.rightAlignPageNumbers !== false)
        })
      },
      tabLeader: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.tabLeader,
        parseHTML: element => normalizeTabLeader(element.getAttribute('data-toc-tab-leader')),
        renderHTML: attributes => ({
          'data-toc-tab-leader': normalizeTabLeader(attributes.tabLeader)
        })
      },
      headingLinks: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.headingLinks,
        parseHTML: element => element.getAttribute('data-toc-heading-links') !== 'false',
        renderHTML: attributes => ({
          'data-toc-heading-links': String(attributes.headingLinks !== false)
        })
      },
      maxHeadingLevel: {
        default: DEFAULT_DOCUMENT_TOC_ATTRS.maxHeadingLevel,
        parseHTML: element => normalizeMaxHeadingLevel(element.getAttribute('data-toc-max-heading-level')),
        renderHTML: attributes => ({
          'data-toc-max-heading-level': String(normalizeMaxHeadingLevel(attributes.maxHeadingLevel))
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-document-toc]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const lines = parseDocumentTocSnapshot(node.attrs.snapshotJson as string).entries
    const lineNodes = lines.map((e, i) => [
      'div',
      { class: `document-toc-export-line document-toc-level-${e.level}`, 'data-toc-line': String(i) },
      ['span', { class: 'document-toc-export-text' }, e.text],
      ...(e.pageNumber
        ? [['span', { class: 'document-toc-export-page-number', 'data-toc-page-number': e.pageNumber }, e.pageNumber]]
        : [])
    ])

    return [
      'div',
      mergeAttributes(
        {
          'data-document-toc': '',
          class: 'document-table-of-contents',
          'data-toc-snapshot': node.attrs.snapshotJson,
          'data-toc-styles': stringifyDocumentTocStyles(parseDocumentTocStyles(String(node.attrs.stylesJson ?? '')))
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ...lineNodes
    ] as [string, ...unknown[]]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentTableOfContentsView)
  },

  addCommands() {
    return {
      insertDocumentTableOfContents:
        () =>
        ({ state, dispatch, editor }) => {
          const nodeType = state.schema.nodes[this.name]
          if (!nodeType) return false
          const insertPos = state.selection.from
          dispatch?.(state.tr.insert(insertPos, nodeType.create(DEFAULT_DOCUMENT_TOC_ATTRS)))
          return editor.commands.updateDocumentTableOfContentsEntireTable(insertPos)
        },
      updateDocumentTableOfContentsEntireTable:
        (pos?: number) =>
        ({ state, dispatch }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false

          const nextJson = buildStoredSnapshotJson(state, tocPos, normalizeMaxHeadingLevel(node.attrs.maxHeadingLevel))
          if (!nextJson) return false

          dispatch?.(state.tr.setNodeMarkup(tocPos, undefined, { ...node.attrs, snapshotJson: nextJson }))
          return true
        },
      updateDocumentTableOfContentsPageNumbers:
        (pos?: number) =>
        ({ state, dispatch, editor }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false

          const snapshot = parseDocumentTocSnapshot(node.attrs.snapshotJson as string)
          if (snapshot.entries.length === 0) {
            return editor.commands.updateDocumentTableOfContentsEntireTable(tocPos)
          }

          const nextJson = buildUpdatedPageNumbersSnapshotJson(state, node.attrs.snapshotJson as string)
          dispatch?.(state.tr.setNodeMarkup(tocPos, undefined, { ...node.attrs, snapshotJson: nextJson }))
          return true
        },
      updateDocumentTableOfContents:
        (pos?: number) =>
        ({ editor }) =>
          editor.commands.updateDocumentTableOfContentsEntireTable(pos),
      removeDocumentTableOfContents:
        (pos?: number) =>
        ({ state, dispatch }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false
          dispatch?.(state.tr.delete(tocPos, tocPos + node.nodeSize))
          return true
        },
      setDocumentTableOfContentsOptions:
        (attrs, pos?: number) =>
        ({ state, dispatch }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false

          const nextAttrs = {
            ...node.attrs,
            ...attrs,
            stylesJson: stringifyDocumentTocStyles(
              parseDocumentTocStyles(String(attrs.stylesJson ?? node.attrs.stylesJson))
            ),
            tabLeader: normalizeTabLeader(attrs.tabLeader ?? node.attrs.tabLeader),
            maxHeadingLevel: normalizeMaxHeadingLevel(attrs.maxHeadingLevel ?? node.attrs.maxHeadingLevel)
          }
          dispatch?.(state.tr.setNodeMarkup(tocPos, undefined, nextAttrs))
          return true
        }
    }
  }
})
