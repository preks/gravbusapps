import type { Node as PMNode, ResolvedPos } from 'prosemirror-model'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { resolveWordLikeImageLayout } from '../tiptap-custom-image/wrapLayoutEngine'
import type { CustomImageAttributes } from '../tiptap-custom-image/types'

interface SquareWrapDecorationSpec {
  paragraphStart: number
  imagePos: number
  attrs: CustomImageAttributes
  widgetKey: string
}

function resolveOwningTextblockStart($pos: ResolvedPos): number | null {
  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    const node = $pos.node(depth)
    if (node.isTextblock && node.inlineContent) {
      return $pos.start(depth)
    }
  }

  return null
}

function resolveSquareWrapDecorationSpecs(doc: PMNode): SquareWrapDecorationSpec[] {
  const specs: SquareWrapDecorationSpec[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'image') {
      return
    }

    const attrs = node.attrs as CustomImageAttributes
    const layout = resolveWordLikeImageLayout(attrs)
    if (layout.wrapMode !== 'square' || layout.anchorMode === 'fixed' || layout.exclusionMode !== 'square') {
      return
    }

    const paragraphStart = resolveOwningTextblockStart(doc.resolve(pos))
    if (paragraphStart === null) {
      return
    }

    specs.push({
      paragraphStart,
      imagePos: pos,
      attrs,
      widgetKey: [
        'rm-square-wrap',
        pos,
        layout.floatingSide ?? 'left',
        layout.wrapTextSide ?? 'none',
        layout.layoutWidth,
        layout.layoutHeight,
        layout.figureLeft,
        layout.figureTop
      ].join(':')
    })
  })

  return specs
}

export function createSquareWrapDecorationElement(options: {
  view: EditorView
  attrs: CustomImageAttributes
  imagePos: number
}): HTMLElement {
  const layout = resolveWordLikeImageLayout(options.attrs, {
    containerWidth: options.view.dom.clientWidth || null,
    containerHeight: null
  })
  const element = document.createElement('span')

  element.className = 'rm-square-wrap-decoration'
  element.dataset.rmSquareWrapDecoration = 'true'
  element.dataset.imageNodePos = String(options.imagePos)
  element.dataset.imageExclusionMode = 'square'
  element.dataset.imageFlowMode = 'float'
  element.dataset.imageWrapMode = 'square'
  element.dataset.imageWrapTextSide = layout.wrapTextSide ?? 'none'
  element.contentEditable = 'false'
  element.setAttribute('aria-hidden', 'true')
  element.style.display = 'block'
  element.style.float = layout.floatingSide ?? 'left'
  element.style.width = `${layout.layoutWidth}px`
  element.style.height = `${layout.layoutHeight}px`
  element.style.margin = '0'
  element.style.padding = '0'
  element.style.overflow = 'hidden'
  element.style.pointerEvents = 'none'
  element.style.userSelect = 'none'
  element.style.visibility = 'hidden'
  element.style.lineHeight = '0'
  element.style.fontSize = '0'

  return element
}

export function buildSquareWrapDecorations(doc: PMNode): DecorationSet {
  const decorations = resolveSquareWrapDecorationSpecs(doc).map(spec =>
    Decoration.widget(
      spec.paragraphStart,
      view =>
        createSquareWrapDecorationElement({
          view,
          attrs: spec.attrs,
          imagePos: spec.imagePos
        }),
      {
        side: -1,
        key: spec.widgetKey
      }
    )
  )

  return DecorationSet.create(doc, decorations)
}
