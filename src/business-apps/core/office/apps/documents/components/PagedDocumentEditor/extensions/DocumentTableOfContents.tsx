/**
 * In-document table of contents block (Word-style). Syncs a JSON snapshot for HTML export / persistence.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { getHeadingsForDocumentTableOfContents } from '../../../utils/navigationPanelUtils'
import { DocumentTableOfContentsView } from '../components/DocumentTableOfContentsView'

const documentTocSnapshotKey = new PluginKey('documentTableOfContentsSnapshot')

export interface DocumentTableOfContentsOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentTableOfContents: {
      insertDocumentTableOfContents: () => ReturnType
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
    return [
      new Plugin({
        key: documentTocSnapshotKey,
        appendTransaction(trs, _oldState, newState) {
          if (!trs.some(tr => tr.docChanged)) {
            return null
          }
          let tr = newState.tr
          let modified = false
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== typeName) {
              return
            }
            const afterPos = pos + node.nodeSize
            const headings = getHeadingsForDocumentTableOfContents(newState.doc, afterPos)
            const nextJson = JSON.stringify(headings.map(h => ({ level: h.level, text: h.text, pos: h.pos })))
            if (nextJson !== node.attrs.snapshotJson) {
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, snapshotJson: nextJson })
              modified = true
            }
          })
          return modified ? tr : null
        }
      })
    ]
  },

  addCommands() {
    return {
      insertDocumentTableOfContents:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({ type: this.name, attrs: { snapshotJson: '[]' } })
            .run()
    }
  }
})
