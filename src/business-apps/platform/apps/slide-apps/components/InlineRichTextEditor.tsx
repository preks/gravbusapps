import React, { useCallback, useLayoutEffect, useRef } from 'react'
import type { TextElement } from './slideElements'
import { normalizeRichTextParagraphs, type RichTextSelectionRange } from '../utils/richTextEditing'
import {
  getRichTextBoxStyle,
  getRichTextParagraphMarker,
  getRichTextParagraphStyle,
  getRichTextRunStyle
} from './richTextStyles'

export interface InlineRichTextEditorProps {
  element: TextElement
  onTextChange: (value: string) => void
  onSelectionChange: (range: RichTextSelectionRange | null) => void
  onFinishEditing: () => void
  rehydrateToken?: number
  'data-testid'?: string
}

function normalizeEditorText(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n')
}

function sortSelectionRange(range: RichTextSelectionRange): RichTextSelectionRange {
  return {
    start: Math.min(range.start, range.end),
    end: Math.max(range.start, range.end)
  }
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeEditorText(node.textContent)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as HTMLElement
  if (element.dataset.editorBullet === 'true') return ''
  if (element.dataset.editorPlaceholder === 'true') return ''
  if (element.tagName === 'BR') return '\n'

  return Array.from(element.childNodes)
    .map(child => serializeEditorNode(child))
    .join('')
}

function serializeEditorText(container: HTMLElement): string {
  const topLevelNodes = Array.from(container.childNodes).filter(node => {
    if (node.nodeType !== Node.TEXT_NODE) return true
    return normalizeEditorText(node.textContent).length > 0
  })

  if (topLevelNodes.length === 0) {
    return normalizeEditorText(container.innerText ?? container.textContent)
  }

  return topLevelNodes.map(node => normalizeEditorText(serializeEditorNode(node))).join('\n')
}

function runBoundsFromElement(element: HTMLElement): { start: number; end: number } | null {
  const start = Number(element.dataset.runStart)
  const end = Number(element.dataset.runEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}

function paragraphBoundsFromElement(element: HTMLElement): { start: number; end: number } | null {
  const start = Number(element.dataset.paragraphStart)
  const end = Number(element.dataset.paragraphEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}

function textLengthWithinEditorNode(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeEditorText(node.textContent).length
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return 0

  const element = node as HTMLElement
  if (element.dataset.editorBullet === 'true') return 0
  if (element.dataset.editorPlaceholder === 'true') return 0
  if (element.tagName === 'BR') return 0

  return Array.from(element.childNodes).reduce((total, child) => total + textLengthWithinEditorNode(child), 0)
}

function textOffsetWithinParagraph(
  paragraphElement: HTMLElement,
  targetNode: Node,
  targetOffset: number
): { found: boolean; offset: number } {
  if (paragraphElement === targetNode) {
    return {
      found: true,
      offset: Array.from(paragraphElement.childNodes)
        .slice(0, Math.min(targetOffset, paragraphElement.childNodes.length))
        .reduce((total, child) => total + textLengthWithinEditorNode(child), 0)
    }
  }

  let accumulatedOffset = 0

  for (const child of Array.from(paragraphElement.childNodes)) {
    if (child === targetNode) {
      if (child.nodeType === Node.TEXT_NODE) {
        return {
          found: true,
          offset: accumulatedOffset + Math.min(targetOffset, normalizeEditorText(child.textContent).length)
        }
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        if (element.dataset.editorBullet === 'true') {
          return { found: true, offset: accumulatedOffset }
        }
        if (element.dataset.editorPlaceholder === 'true' || element.tagName === 'BR') {
          return { found: true, offset: accumulatedOffset }
        }
        return {
          found: true,
          offset:
            accumulatedOffset +
            Array.from(element.childNodes)
              .slice(0, Math.min(targetOffset, element.childNodes.length))
              .reduce((total, nestedChild) => total + textLengthWithinEditorNode(nestedChild), 0)
        }
      }
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      const nestedResult = textOffsetWithinParagraph(child as HTMLElement, targetNode, targetOffset)
      if (nestedResult.found) {
        return { found: true, offset: accumulatedOffset + nestedResult.offset }
      }
    }

    accumulatedOffset += textLengthWithinEditorNode(child)
  }

  return { found: false, offset: accumulatedOffset }
}

function nodeStartOffset(node: Node | null): number | null {
  if (!node) return null
  if (node.nodeType === Node.TEXT_NODE) {
    return nodeStartOffset(node.parentElement?.closest<HTMLElement>('[data-run-start]') ?? null)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const element = node as HTMLElement
  const runBounds = runBoundsFromElement(element)
  if (runBounds) return runBounds.start

  const paragraphBounds = paragraphBoundsFromElement(element)
  if (paragraphBounds) return paragraphBounds.start

  const firstDescendant =
    element.querySelector<HTMLElement>('[data-run-start]') ??
    element.querySelector<HTMLElement>('[data-paragraph-start]')

  if (!firstDescendant) return null
  return nodeStartOffset(firstDescendant)
}

function nodeEndOffset(node: Node | null): number | null {
  if (!node) return null
  if (node.nodeType === Node.TEXT_NODE) {
    return nodeEndOffset(node.parentElement?.closest<HTMLElement>('[data-run-start]') ?? null)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const element = node as HTMLElement
  const runBounds = runBoundsFromElement(element)
  if (runBounds) return runBounds.end

  const paragraphBounds = paragraphBoundsFromElement(element)
  if (paragraphBounds) return paragraphBounds.end

  const descendants = Array.from(element.querySelectorAll<HTMLElement>('[data-run-start], [data-paragraph-start]'))
  const lastDescendant = descendants[descendants.length - 1]
  if (!lastDescendant) return null

  return nodeEndOffset(lastDescendant)
}

function textOffsetFromBoundary(container: HTMLElement, node: Node, offset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const paragraphElement = node.parentElement?.closest<HTMLElement>('[data-paragraph-start]')
    const paragraphBounds = paragraphElement ? paragraphBoundsFromElement(paragraphElement) : null
    if (paragraphElement && paragraphBounds) {
      const localOffset = textOffsetWithinParagraph(paragraphElement, node, offset)
      if (localOffset.found) {
        return paragraphBounds.start + localOffset.offset
      }
    }

    const runElement = node.parentElement?.closest<HTMLElement>('[data-run-start]')
    const bounds = runElement ? runBoundsFromElement(runElement) : null
    if (bounds) {
      const liveTextLength = normalizeEditorText(node.textContent).length
      return bounds.start + Math.min(offset, Math.max(bounds.end - bounds.start, liveTextLength))
    }

    return 0
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return 0
  const element = node as HTMLElement
  const runBounds = runBoundsFromElement(element)
  if (runBounds) {
    return offset <= 0 ? runBounds.start : runBounds.end
  }

  const paragraphBounds = paragraphBoundsFromElement(element)
  if (paragraphBounds) {
    const localOffset = textOffsetWithinParagraph(element, element, offset)
    if (localOffset.found) {
      return paragraphBounds.start + localOffset.offset
    }

    return offset <= 0 ? paragraphBounds.start : paragraphBounds.end
  }

  const parentParagraph = element.closest<HTMLElement>('[data-paragraph-start]')
  const parentParagraphBounds = parentParagraph ? paragraphBoundsFromElement(parentParagraph) : null
  if (parentParagraph && parentParagraphBounds) {
    const localOffset = textOffsetWithinParagraph(parentParagraph, element, offset)
    if (localOffset.found) {
      return parentParagraphBounds.start + localOffset.offset
    }
  }

  if (element === container) {
    if (offset <= 0) return 0
    if (offset >= element.childNodes.length) {
      const lastChild = element.childNodes[element.childNodes.length - 1]
      return nodeEndOffset(lastChild) ?? 0
    }
    const child = element.childNodes[Math.min(offset, element.childNodes.length - 1)]
    const childStart = nodeStartOffset(child)
    if (childStart !== null) return childStart
    const lastChild = element.childNodes[element.childNodes.length - 1]
    return nodeEndOffset(lastChild) ?? 0
  }

  if (offset >= element.childNodes.length) {
    return nodeEndOffset(element) ?? 0
  }
  const child = element.childNodes[Math.min(offset, element.childNodes.length - 1)]
  const childStart = nodeStartOffset(child)
  if (childStart !== null) return childStart

  return nodeEndOffset(element) ?? 0
}

function liveContentLength(container: HTMLElement): number {
  const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('[data-paragraph-end]'))
  const lastParagraph = paragraphs[paragraphs.length - 1]
  const paragraphBounds = lastParagraph ? paragraphBoundsFromElement(lastParagraph) : null
  if (paragraphBounds) return paragraphBounds.end

  const runs = Array.from(container.querySelectorAll<HTMLElement>('[data-run-end]'))
  const lastRun = runs[runs.length - 1]
  const runBounds = lastRun ? runBoundsFromElement(lastRun) : null
  if (runBounds) return runBounds.end

  return normalizeEditorText(container.innerText ?? container.textContent).length
}

function findTextNodeAtOffset(container: HTMLElement, offset: number): { node: Node; offset: number } {
  const runs = Array.from(container.querySelectorAll<HTMLElement>('[data-run-start]'))
  for (const runElement of runs) {
    const bounds = runBoundsFromElement(runElement)
    if (!bounds) continue
    if (offset >= bounds.start && offset <= bounds.end) {
      const textNode = runElement.firstChild ?? runElement
      return { node: textNode, offset: Math.min(Math.max(0, offset - bounds.start), bounds.end - bounds.start) }
    }
  }

  const lastRun = runs[runs.length - 1]
  const lastBounds = lastRun ? runBoundsFromElement(lastRun) : null
  if (lastRun && lastBounds) {
    return { node: lastRun.firstChild ?? lastRun, offset: lastBounds.end - lastBounds.start }
  }

  const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('[data-paragraph-start]'))
  for (const paragraphElement of paragraphs) {
    const bounds = paragraphBoundsFromElement(paragraphElement)
    if (!bounds) continue
    if (offset >= bounds.start && offset <= bounds.end) {
      return {
        node: paragraphElement,
        offset: paragraphElement.childNodes.length > 0 ? paragraphElement.childNodes.length : 0
      }
    }
  }

  return { node: container, offset: 0 }
}

const UNITLESS_STYLE_KEYS = new Set(['lineHeight', 'fontWeight', 'opacity', 'zIndex', 'flexGrow', 'flexShrink'])

function styleObjectToCssText(style: React.CSSProperties): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const cssName = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
      const cssValue = typeof value === 'number' && !UNITLESS_STYLE_KEYS.has(key) ? `${value}px` : String(value)
      return `${cssName}: ${cssValue};`
    })
    .join(' ')
}

function buildEditorMarkup(editor: HTMLDivElement, element: TextElement) {
  const paragraphs = normalizeRichTextParagraphs(element)
  const fragment = document.createDocumentFragment()
  const numberedCounters = new Map<number, number>()
  let cursor = 0

  paragraphs.forEach(paragraph => {
    const paragraphStart = cursor
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    cursor += paragraphLength + 1
    let runCursor = paragraphStart

    const paragraphElement = document.createElement('div')
    paragraphElement.dataset.paragraphStart = String(paragraphStart)
    paragraphElement.dataset.paragraphEnd = String(paragraphStart + paragraphLength)
    const marker = getRichTextParagraphMarker(paragraph, numberedCounters)
    paragraphElement.setAttribute('style', styleObjectToCssText(getRichTextParagraphStyle(paragraph, element, marker)))

    let runParent: HTMLElement = paragraphElement
    if (marker) {
      const bulletElement = document.createElement('span')
      bulletElement.dataset.editorBullet = 'true'
      bulletElement.setAttribute('contenteditable', 'false')
      bulletElement.setAttribute(
        'style',
        styleObjectToCssText({
          color: element.color,
          flexShrink: 0,
          width: marker.width,
          display: 'inline-flex',
          justifyContent: 'flex-end',
          userSelect: 'none'
        })
      )
      bulletElement.textContent = marker.label
      paragraphElement.append(bulletElement)

      const contentElement = document.createElement('span')
      contentElement.setAttribute(
        'style',
        styleObjectToCssText({
          flex: 1
        })
      )
      paragraphElement.append(contentElement)
      runParent = contentElement
    }

    paragraph.runs.forEach(run => {
      const start = runCursor
      const end = start + run.text.length
      runCursor = end

      const runElement = document.createElement('span')
      runElement.dataset.runStart = String(start)
      runElement.dataset.runEnd = String(end)
      runElement.setAttribute('style', styleObjectToCssText(getRichTextRunStyle(run, element)))
      runElement.textContent = run.text
      runParent.append(runElement)
    })

    const hasTextContent = paragraph.runs.some(run => run.text.length > 0)
    if (!hasTextContent) {
      const placeholder = document.createElement('br')
      placeholder.dataset.editorPlaceholder = 'true'
      runParent.append(placeholder)
    }

    fragment.append(paragraphElement)
  })

  editor.replaceChildren(fragment)
}

export const InlineRichTextEditor: React.FC<InlineRichTextEditorProps> = ({
  element,
  onTextChange,
  onSelectionChange,
  onFinishEditing,
  rehydrateToken = 0,
  'data-testid': testId = 'inline-rich-text-editor'
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSelectionRef = useRef<RichTextSelectionRange | null>(null)
  const latestElementRef = useRef(element)
  latestElementRef.current = element

  const readSelection = useCallback((): RichTextSelectionRange | null => {
    const editor = editorRef.current
    const selection = globalThis.getSelection?.() ?? null
    if (!editor || !selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null

    const contentLength = liveContentLength(editor)
    const start = textOffsetFromBoundary(editor, range.startContainer, range.startOffset)
    const end = textOffsetFromBoundary(editor, range.endContainer, range.endOffset)
    return { start: Math.max(0, Math.min(start, contentLength)), end: Math.max(0, Math.min(end, contentLength)) }
  }, [])

  const emitSelection = useCallback(() => {
    const range = readSelection()
    lastSelectionRef.current = range
    onSelectionChange(range)
  }, [onSelectionChange, readSelection])

  const restoreSelection = useCallback((range: RichTextSelectionRange | null) => {
    const editor = editorRef.current
    if (!editor || !range || document.activeElement !== editor) return
    const selection = globalThis.getSelection?.() ?? null
    if (!selection) return
    const contentLength = liveContentLength(editor)
    const start = findTextNodeAtOffset(editor, Math.max(0, Math.min(range.start, contentLength)))
    const end = findTextNodeAtOffset(editor, Math.max(0, Math.min(range.end, contentLength)))
    const domRange = document.createRange()
    domRange.setStart(start.node, start.offset)
    domRange.setEnd(end.node, end.offset)
    selection.removeAllRanges()
    selection.addRange(domRange)
  }, [])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    buildEditorMarkup(editor, latestElementRef.current)
    editor.focus()
    const contentLength = liveContentLength(editor)
    const range = lastSelectionRef.current ?? { start: contentLength, end: contentLength }
    lastSelectionRef.current = range
    restoreSelection(range)
    onSelectionChange(range)
  }, [element.id, onSelectionChange, rehydrateToken, restoreSelection])

  return (
    <div
      ref={editorRef}
      contentEditable
      tabIndex={0}
      suppressContentEditableWarning
      spellCheck
      data-testid={testId}
      onInput={event => {
        const target = event.currentTarget as HTMLElement
        const value = serializeEditorText(target)
        const range = readSelection()
        lastSelectionRef.current = range
        onTextChange(value)
        onSelectionChange(range)
      }}
      onKeyDown={event => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          event.preventDefault()
          onFinishEditing()
          return
        }

        if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault()

          const editor = editorRef.current
          const contentLength = editor ? liveContentLength(editor) : latestElementRef.current.content.length
          const rawRange = readSelection() ??
            lastSelectionRef.current ?? {
              start: contentLength,
              end: contentLength
            }
          const range = sortSelectionRange(rawRange)
          const currentValue = latestElementRef.current.content
          const nextValue = `${currentValue.slice(0, range.start)}\n${currentValue.slice(range.end)}`
          const nextCaret = range.start + 1
          const nextRange = { start: nextCaret, end: nextCaret }

          lastSelectionRef.current = nextRange
          onTextChange(nextValue)
          onSelectionChange(nextRange)
        }
      }}
      onKeyUp={emitSelection}
      onMouseUp={emitSelection}
      onSelect={emitSelection}
      onClick={event => {
        event.stopPropagation()
        emitSelection()
      }}
      onMouseDown={event => event.stopPropagation()}
      style={{
        ...getRichTextBoxStyle(element),
        width: '100%',
        height: '100%',
        outline: 'none',
        overflow: 'auto',
        cursor: 'text'
      }}
    />
  )
}

export default InlineRichTextEditor
