import type { Node as PMNode } from 'prosemirror-model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReplaceAroundStep, ReplaceStep } from '@tiptap/pm/transform'

export function createHardBreakDecorationElement() {
  const element = document.createElement('span')
  element.classList.add('rm-br-decoration')
  return element
}

export function buildHardBreakDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'hardBreak') return

    decorations.push(
      Decoration.widget(pos + 1, () => {
        return createHardBreakDecorationElement()
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

export function shouldRebuildHardBreakDecorations(transaction: { docChanged: boolean; steps: readonly unknown[] }) {
  if (!transaction.docChanged) {
    return false
  }

  return (
    transaction.steps.length === 0 ||
    transaction.steps.some(step => step instanceof ReplaceStep || step instanceof ReplaceAroundStep)
  )
}
