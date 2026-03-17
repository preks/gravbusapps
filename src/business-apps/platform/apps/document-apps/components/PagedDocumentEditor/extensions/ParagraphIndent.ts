/**
 * Left/right paragraph indent in cm (Word-style layout ribbon).
 */

import { Extension } from '@tiptap/core'

const TYPES = ['paragraph', 'heading'] as const

function parseCm(styleVal: string | undefined): number | null {
  if (!styleVal) return null
  const m = String(styleVal)
    .trim()
    .match(/^([\d.]+)\s*cm$/i)
  if (m) return Math.round(Number.parseFloat(m[1]) * 100) / 100
  const px = String(styleVal)
    .trim()
    .match(/^([\d.]+)\s*px$/i)
  if (px) return Math.round((Number.parseFloat(px[1]) / (96 / 2.54)) * 100) / 100
  return null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIndent: {
      setIndentLeftCm: (cm: number | null) => ReturnType
      setIndentRightCm: (cm: number | null) => ReturnType
    }
  }
}

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: [...TYPES],
        attributes: {
          indentLeftCm: {
            default: null,
            parseHTML: element => parseCm(element.style?.paddingLeft),
            renderHTML: attributes => {
              const v = attributes.indentLeftCm as number | null | undefined
              if (v == null || v === 0) return {}
              return { style: `padding-left: ${v}cm` }
            }
          },
          indentRightCm: {
            default: null,
            parseHTML: element => parseCm(element.style?.paddingRight),
            renderHTML: attributes => {
              const v = attributes.indentRightCm as number | null | undefined
              if (v == null || v === 0) return {}
              return { style: `padding-right: ${v}cm` }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      setIndentLeftCm:
        (cm: number | null) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name
            if (name === 'paragraph' || name === 'heading') {
              const v = cm != null && cm > 0 ? Math.min(55, cm) : null
              return v == null
                ? commands.resetAttributes(name as 'paragraph', 'indentLeftCm')
                : commands.updateAttributes(name as 'paragraph', { indentLeftCm: v })
            }
          }
          return false
        },
      setIndentRightCm:
        (cm: number | null) =>
        ({ state, commands }) => {
          const { $from } = state.selection
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name
            if (name === 'paragraph' || name === 'heading') {
              const v = cm != null && cm > 0 ? Math.min(55, cm) : null
              return v == null
                ? commands.resetAttributes(name as 'paragraph', 'indentRightCm')
                : commands.updateAttributes(name as 'paragraph', { indentRightCm: v })
            }
          }
          return false
        }
    }
  }
})

export function getCurrentParagraphIndent(editor: {
  state: {
    selection: {
      $from: { depth: number; node: (d: number) => { type: { name: string }; attrs: Record<string, unknown> } }
    }
  }
}): { leftCm: number; rightCm: number } {
  const $from = editor.state.selection.$from
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const left = node.attrs.indentLeftCm as number | null | undefined
      const right = node.attrs.indentRightCm as number | null | undefined
      return {
        leftCm: left != null && left > 0 ? left : 0,
        rightCm: right != null && right > 0 ? right : 0
      }
    }
  }
  return { leftCm: 0, rightCm: 0 }
}
