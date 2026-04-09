/**
 * In-document table of contents block (Word-style). Syncs a JSON snapshot for HTML export / persistence.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ySyncPluginKey } from '@tiptap/y-tiptap'
import { getHeadingsForDocumentTableOfContents } from '../../../utils/navigationPanelUtils'
import { DocumentTableOfContentsView } from '../components/DocumentTableOfContentsView'

const documentTocSnapshotKey = new PluginKey('documentTableOfContentsSnapshot')
const REMOTE_DOCUMENT_TOC_REFRESH_DELAY_MS = 800

export interface DocumentTableOfContentsOptions {
  HTMLAttributes: Record<string, unknown>
}

export type DocumentTocTabLeader = 'dot' | 'none'

export interface DocumentTableOfContentsAttrs {
  snapshotJson: string
  showPageNumbers: boolean
  rightAlignPageNumbers: boolean
  tabLeader: DocumentTocTabLeader
  headingLinks: boolean
  maxHeadingLevel: number
}

const DEFAULT_DOCUMENT_TOC_ATTRS: DocumentTableOfContentsAttrs = {
  snapshotJson: '[]',
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
      updateDocumentTableOfContents: (pos?: number) => ReturnType
      removeDocumentTableOfContents: (pos?: number) => ReturnType
      setDocumentTableOfContentsOptions: (
        attrs: Partial<Omit<DocumentTableOfContentsAttrs, 'snapshotJson'>>,
        pos?: number
      ) => ReturnType
    }
  }
}

function parseSnapshotLines(snapshotJson: string): { level: number; text: string }[] {
  try {
    const parsed = JSON.parse(snapshotJson || '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is { level: number; text: string } =>
          Boolean(e) && typeof e === 'object' && typeof (e as { level?: unknown }).level === 'number'
      )
      .map(e => ({
        level: e.level,
        text: typeof e.text === 'string' ? e.text : ''
      }))
  } catch {
    return []
  }
}

function hasTocOrHeadingChange(trs: readonly Transaction[], newState: EditorState, typeName: string) {
  return trs.some(tr => {
    let found = false
    tr.steps.forEach((_step, i) => {
      if (found) return
      const map = tr.mapping.maps[i]
      map.forEach((_from, _to, newFrom, newTo) => {
        if (found) return
        newState.doc.nodesBetween(newFrom, Math.min(newTo, newState.doc.content.size), node => {
          if (node.type.name === typeName || node.type.name === 'heading') {
            found = true
            return false
          }
        })
      })
    })
    return found
  })
}

function buildDocumentTocSnapshotTransaction(state: EditorState, typeName: string) {
  let tr = state.tr
  let modified = false

  state.doc.descendants((node, pos) => {
    if (node.type.name !== typeName) {
      return
    }
    const afterPos = pos + node.nodeSize
    const maxLevel = normalizeMaxHeadingLevel(node.attrs.maxHeadingLevel)
    const headings = getHeadingsForDocumentTableOfContents(state.doc, afterPos).filter(h => h.level <= maxLevel)
    const nextJson = JSON.stringify(headings.map(h => ({ level: h.level, text: h.text, pos: h.pos })))
    if (nextJson !== node.attrs.snapshotJson) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, snapshotJson: nextJson })
      modified = true
    }
  })

  return modified ? tr : null
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
    const lines = parseSnapshotLines(node.attrs.snapshotJson as string)
    const lineNodes = lines.map((e, i) => [
      'div',
      { class: `document-toc-export-line document-toc-level-${e.level}`, 'data-toc-line': String(i) },
      ['span', { class: 'document-toc-export-text' }, e.text]
    ])

    return [
      'div',
      mergeAttributes(
        {
          'data-document-toc': '',
          class: 'document-table-of-contents',
          'data-toc-snapshot': node.attrs.snapshotJson
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

  addProseMirrorPlugins() {
    const typeName = this.name
    const editor = this.editor
    let remoteRefreshTimer: ReturnType<typeof setTimeout> | null = null

    const clearRemoteRefreshTimer = () => {
      if (remoteRefreshTimer !== null) {
        clearTimeout(remoteRefreshTimer)
        remoteRefreshTimer = null
      }
    }

    const scheduleRemoteSnapshotRefresh = () => {
      clearRemoteRefreshTimer()
      remoteRefreshTimer = setTimeout(() => {
        remoteRefreshTimer = null
        if ((editor as typeof editor & { isDestroyed?: boolean }).isDestroyed) {
          return
        }
        const view = editor.view
        if (!view) {
          return
        }
        const tr = buildDocumentTocSnapshotTransaction(view.state, typeName)
        if (tr) {
          view.dispatch(tr)
        }
      }, REMOTE_DOCUMENT_TOC_REFRESH_DELAY_MS)
    }

    return [
      new Plugin({
        key: documentTocSnapshotKey,
        appendTransaction(trs, _oldState, newState) {
          if (!trs.some(tr => tr.docChanged)) {
            return null
          }
          if (!hasTocOrHeadingChange(trs, newState, typeName)) {
            return null
          }

          if (trs.some(tr => tr.getMeta(ySyncPluginKey))) {
            scheduleRemoteSnapshotRefresh()
            return null
          }

          return buildDocumentTocSnapshotTransaction(newState, typeName)
        },
        view: () => ({
          destroy: () => {
            clearRemoteRefreshTimer()
          }
        })
      })
    ]
  },

  addCommands() {
    return {
      insertDocumentTableOfContents:
        () =>
        ({ chain }) =>
          chain().focus().insertContent({ type: this.name, attrs: DEFAULT_DOCUMENT_TOC_ATTRS }).run(),
      updateDocumentTableOfContents:
        (pos?: number) =>
        ({ state, dispatch }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false
          const afterPos = tocPos + node.nodeSize
          const maxLevel = normalizeMaxHeadingLevel(node.attrs.maxHeadingLevel)
          const headings = getHeadingsForDocumentTableOfContents(state.doc, afterPos).filter(h => h.level <= maxLevel)
          const nextJson = JSON.stringify(headings.map(h => ({ level: h.level, text: h.text, pos: h.pos })))
          dispatch?.(state.tr.setNodeMarkup(tocPos, undefined, { ...node.attrs, snapshotJson: nextJson }))
          return true
        },
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
        ({ state, dispatch, editor }) => {
          const tocPos = resolveDocumentTocPos(state, pos)
          if (tocPos === null) return false
          const node = state.doc.nodeAt(tocPos)
          if (!node || node.type.name !== this.name) return false

          const nextAttrs = {
            ...node.attrs,
            ...attrs,
            tabLeader: normalizeTabLeader(attrs.tabLeader ?? node.attrs.tabLeader),
            maxHeadingLevel: normalizeMaxHeadingLevel(attrs.maxHeadingLevel ?? node.attrs.maxHeadingLevel)
          }
          dispatch?.(state.tr.setNodeMarkup(tocPos, undefined, nextAttrs))
          editor.commands.updateDocumentTableOfContents(tocPos)
          return true
        }
    }
  }
})
