/**
 * Line and paragraph spacing for TipTap.
 * Adds lineHeight, marginBefore, marginAfter to paragraph and heading nodes.
 */

import { Extension } from '@tiptap/core'

const SPACING_TYPES = ['paragraph', 'heading'] as const

export interface LineAndParagraphSpacingOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineAndParagraphSpacing: {
      setLineHeight: (value: number | string | null) => ReturnType
      setMarginBefore: (value: string | null) => ReturnType
      setMarginAfter: (value: string | null) => ReturnType
      unsetLineHeight: () => ReturnType
      unsetMarginBefore: () => ReturnType
      unsetMarginAfter: () => ReturnType
    }
  }
}

function parseLineHeight(element: HTMLElement): number | null {
  const v = element.style?.lineHeight || element.dataset.lineHeight
  if (v == null || v === '') return null
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function parseMargin(value: string | null | undefined): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export const LineAndParagraphSpacing = Extension.create<LineAndParagraphSpacingOptions>({
  name: 'lineAndParagraphSpacing',

  addOptions() {
    return {
      types: [...SPACING_TYPES]
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            rendered: true,
            parseHTML: element => parseLineHeight(element as HTMLElement),
            renderHTML: attributes => {
              if (attributes.lineHeight == null) return {}
              return { style: `line-height: ${attributes.lineHeight}` }
            }
          },
          marginBefore: {
            default: null,
            rendered: true,
            parseHTML: element => {
              const el = element as HTMLElement
              return parseMargin(el.style?.marginTop ?? el.dataset.marginBefore)
            },
            renderHTML: attributes => {
              if (attributes.marginBefore == null) return {}
              return { style: `margin-top: ${attributes.marginBefore}` }
            }
          },
          marginAfter: {
            default: null,
            rendered: true,
            parseHTML: element => {
              const el = element as HTMLElement
              return parseMargin(el.style?.marginBottom ?? el.dataset.marginAfter)
            },
            renderHTML: attributes => {
              if (attributes.marginAfter == null) return {}
              return { style: `margin-bottom: ${attributes.marginAfter}` }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (value: number | string | null) =>
        ({ commands }) => {
          let num: number | null = null
          if (value != null) {
            if (typeof value === 'string') {
              const parsed = Number.parseFloat(value)
              num = Number.isFinite(parsed) ? parsed : null
            } else {
              num = value
            }
          }
          const attrs = num == null ? {} : { lineHeight: num }
          return this.options.types
            .map(type =>
              num == null ? commands.resetAttributes(type, 'lineHeight') : commands.updateAttributes(type, attrs)
            )
            .some(Boolean)
        },
      setMarginBefore:
        (value: string | null) =>
        ({ commands }) => {
          return this.options.types
            .map(type =>
              value == null
                ? commands.resetAttributes(type, 'marginBefore')
                : commands.updateAttributes(type, { marginBefore: value })
            )
            .some(Boolean)
        },
      setMarginAfter:
        (value: string | null) =>
        ({ commands }) => {
          return this.options.types
            .map(type =>
              value == null
                ? commands.resetAttributes(type, 'marginAfter')
                : commands.updateAttributes(type, { marginAfter: value })
            )
            .some(Boolean)
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.map(type => commands.resetAttributes(type, 'lineHeight')).some(Boolean)
        },
      unsetMarginBefore:
        () =>
        ({ commands }) => {
          return this.options.types.map(type => commands.resetAttributes(type, 'marginBefore')).some(Boolean)
        },
      unsetMarginAfter:
        () =>
        ({ commands }) => {
          return this.options.types.map(type => commands.resetAttributes(type, 'marginAfter')).some(Boolean)
        }
    }
  }
})

const SPACING_NODE_NAMES = new Set(['paragraph', 'heading'])

type SpacingAttrs = {
  lineHeight?: number | null
  marginBefore?: string | null
  marginAfter?: string | null
}

/**
 * Read current block's line/paragraph spacing for toolbar state.
 * Resolves the nearest paragraph or heading so the checkmark matches the block at the cursor.
 */
export function getCurrentSpacing(editor: {
  state: {
    selection: {
      $from: { depth: number; node: (d: number) => { type: { name: string }; attrs: Record<string, unknown> } }
    }
  }
}) {
  const $from = editor.state.selection.$from
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (SPACING_NODE_NAMES.has(node.type.name)) {
      const attrs = node.attrs as SpacingAttrs
      return {
        lineHeight: attrs.lineHeight ?? null,
        marginBefore: attrs.marginBefore ?? null,
        marginAfter: attrs.marginAfter ?? null
      }
    }
  }
  return { lineHeight: null, marginBefore: null, marginAfter: null }
}

export default LineAndParagraphSpacing
