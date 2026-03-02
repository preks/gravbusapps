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
  const v = element.style?.lineHeight || element.getAttribute('data-line-height')
  if (v == null || v === '') return null
  const n = parseFloat(String(v))
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
              return parseMargin(el.style?.marginTop ?? el.getAttribute('data-margin-before'))
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
              return parseMargin(el.style?.marginBottom ?? el.getAttribute('data-margin-after'))
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
          const num =
            value == null
              ? null
              : typeof value === 'string'
                ? Number.isFinite(parseFloat(value))
                  ? parseFloat(value)
                  : null
                : value
          const attrs = num != null ? { lineHeight: num } : {}
          return this.options.types
            .map(type =>
              num != null ? commands.updateAttributes(type, attrs) : commands.resetAttributes(type, 'lineHeight')
            )
            .some(Boolean)
        },
      setMarginBefore:
        (value: string | null) =>
        ({ commands }) => {
          return this.options.types
            .map(type =>
              value != null
                ? commands.updateAttributes(type, { marginBefore: value })
                : commands.resetAttributes(type, 'marginBefore')
            )
            .some(Boolean)
        },
      setMarginAfter:
        (value: string | null) =>
        ({ commands }) => {
          return this.options.types
            .map(type =>
              value != null
                ? commands.updateAttributes(type, { marginAfter: value })
                : commands.resetAttributes(type, 'marginAfter')
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

/**
 * Read current block's line/paragraph spacing for toolbar state.
 */
export function getCurrentSpacing(editor: {
  state: { selection: { $from: { parent: { attrs: Record<string, unknown> } } } }
}) {
  const node = editor.state.selection.$from.parent
  const attrs = node.attrs as { lineHeight?: number | null; marginBefore?: string | null; marginAfter?: string | null }
  return {
    lineHeight: attrs.lineHeight ?? null,
    marginBefore: attrs.marginBefore ?? null,
    marginAfter: attrs.marginAfter ?? null
  }
}

export default LineAndParagraphSpacing
