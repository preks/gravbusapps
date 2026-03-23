import type { Node as PMNode } from 'prosemirror-model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  AddMarkStep,
  AttrStep,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep
} from '@tiptap/pm/transform'

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
  return (
    transaction.docChanged ||
    transaction.steps.some(step => step instanceof ReplaceStep) ||
    transaction.steps.some(step => step instanceof ReplaceAroundStep) ||
    transaction.steps.some(step => step instanceof AddMarkStep) ||
    transaction.steps.some(step => step instanceof RemoveMarkStep) ||
    transaction.steps.some(step => step instanceof RemoveNodeMarkStep) ||
    transaction.steps.some(step => step instanceof AttrStep)
  )
}
