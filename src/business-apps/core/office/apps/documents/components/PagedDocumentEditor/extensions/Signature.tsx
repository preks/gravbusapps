/**
 * Signature extension – immutable signature snapshot node with resize.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { SignatureView } from '../components/SignatureView'

export interface SignatureOptions {
  HTMLAttributes?: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    signature: {
      insertSignature: (attrs: {
        signatureId?: string
        kind: 'typed' | 'drawn' | 'uploaded'
        snapshotSvg: string
        name?: string
        pageNumber?: number
        x?: number
        y?: number
        width?: number
        height?: number
        lockAspectRatio?: boolean
        createdBy?: string
      }) => ReturnType
    }
  }
}

const DEFAULT_WIDTH = 200
const DEFAULT_HEIGHT = 80

export const Signature = Node.create<SignatureOptions>({
  name: 'signature',

  group: 'block',

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      signatureId: { default: null, parseHTML: el => (el as HTMLElement).getAttribute('data-signature-id') },
      kind: { default: 'typed', parseHTML: el => (el as HTMLElement).getAttribute('data-kind') || 'typed' },
      snapshotSvg: { default: '', parseHTML: el => (el as HTMLElement).getAttribute('data-snapshot-svg') || '' },
      name: { default: null, parseHTML: el => (el as HTMLElement).getAttribute('data-name') },
      pageNumber: {
        default: null,
        parseHTML: el => parseInt((el as HTMLElement).getAttribute('data-page-number') || '0', 10) || null
      },
      x: { default: null, parseHTML: el => parseFloat((el as HTMLElement).getAttribute('data-x') || '0') || null },
      y: { default: null, parseHTML: el => parseFloat((el as HTMLElement).getAttribute('data-y') || '0') || null },
      width: {
        default: DEFAULT_WIDTH,
        parseHTML: el => parseFloat((el as HTMLElement).getAttribute('data-width') || '0') || DEFAULT_WIDTH
      },
      height: {
        default: DEFAULT_HEIGHT,
        parseHTML: el => parseFloat((el as HTMLElement).getAttribute('data-height') || '0') || DEFAULT_HEIGHT
      },
      lockAspectRatio: {
        default: true,
        parseHTML: el => (el as HTMLElement).getAttribute('data-lock-aspect-ratio') !== 'false'
      },
      createdBy: { default: null, parseHTML: el => (el as HTMLElement).getAttribute('data-created-by') }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-signature-node]' }, { tag: 'img[data-signature-node]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-signature-node': '', ...this.options.HTMLAttributes }, HTMLAttributes, {
        'data-signature-id': node.attrs.signatureId,
        'data-kind': node.attrs.kind,
        'data-snapshot-svg': node.attrs.snapshotSvg,
        'data-name': node.attrs.name,
        'data-page-number': node.attrs.pageNumber,
        'data-x': node.attrs.x,
        'data-y': node.attrs.y,
        'data-width': String(node.attrs.width),
        'data-height': String(node.attrs.height),
        'data-lock-aspect-ratio': node.attrs.lockAspectRatio,
        'data-created-by': node.attrs.createdBy
      })
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureView)
  },

  addCommands() {
    return {
      insertSignature:
        attrs =>
        ({ chain }) => {
          const width = attrs.width ?? DEFAULT_WIDTH
          const height = attrs.height ?? DEFAULT_HEIGHT
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: {
                signatureId: attrs.signatureId ?? null,
                kind: attrs.kind,
                snapshotSvg: attrs.snapshotSvg,
                name: attrs.name ?? null,
                pageNumber: attrs.pageNumber ?? null,
                x: attrs.x ?? null,
                y: attrs.y ?? null,
                width,
                height,
                lockAspectRatio: attrs.lockAspectRatio ?? true,
                createdBy: attrs.createdBy ?? null
              }
            })
            .run()
        }
    }
  }
})
