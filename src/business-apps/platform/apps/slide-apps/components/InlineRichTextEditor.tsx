import React, { useCallback, useLayoutEffect, useRef } from 'react'
import type { RichTextParagraph, RichTextRun, TextElement } from './slideElements'
import { textTransformToCss } from './slideElements'
import { resolveFontStack } from './fontStack'
import { normalizeRichTextParagraphs, type RichTextSelectionRange } from '../utils/richTextEditing'

export interface InlineRichTextEditorProps {
  element: TextElement
  onTextChange: (value: string) => void
  onSelectionChange: (range: RichTextSelectionRange | null) => void
  onFinishEditing: () => void
  rehydrateToken?: number
  'data-testid'?: string
}

function runStyle(run: RichTextRun, element: TextElement): React.CSSProperties {
  return {
    fontFamily: resolveFontStack(run.fontFamily || element.fontFamily),
    fontSize: run.fontSize || element.fontSize,
    fontWeight: run.fontWeight || element.fontWeight,
    fontStyle: run.fontStyle || element.fontStyle,
    textDecoration: run.textDecoration || element.textDecoration,
    color: run.color || element.color,
    backgroundColor: run.backgroundColor,
    ...textTransformToCss(run.textTransform ?? element.textTransform)
  }
}

function alignmentToTextAlign(alignment: RichTextParagraph['alignment'], fallback: TextElement['textAlign']) {
  if (alignment === 'justify') return 'justify'
  return alignment ?? fallback
}

function normalizeEditorText(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n')
}

function selectionOffsetFromBoundary(container: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange()
  range.selectNodeContents(container)
  range.setEnd(node, offset)
  return normalizeEditorText(range.toString()).length
}

function runBoundsFromElement(element: HTMLElement): { start: number; end: number } | null {
  const start = Number(element.dataset.runStart)
  const end = Number(element.dataset.runEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}

function liveContentLength(container: HTMLElement): number {
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
  let cursor = 0

  paragraphs.forEach(paragraph => {
    const paragraphStart = cursor
    const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
    cursor += paragraphLength + 1
    let runCursor = paragraphStart

    const paragraphElement = document.createElement('div')
    paragraphElement.setAttribute(
      'style',
      styleObjectToCssText({
        minHeight: element.fontSize * element.lineHeight,
        textAlign: alignmentToTextAlign(paragraph.alignment, element.textAlign),
        lineHeight: paragraph.lineHeight ?? element.lineHeight,
        marginTop: paragraph.spaceBefore,
        marginBottom: paragraph.spaceAfter
      })
    )

    paragraph.runs.forEach(run => {
      const start = runCursor
      const end = start + run.text.length
      runCursor = end

      const runElement = document.createElement('span')
      runElement.dataset.runStart = String(start)
      runElement.dataset.runEnd = String(end)
      runElement.setAttribute('style', styleObjectToCssText(runStyle(run, element)))
      runElement.textContent = run.text
      paragraphElement.append(runElement)
    })

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
    const start = selectionOffsetFromBoundary(editor, range.startContainer, range.startOffset)
    const end = selectionOffsetFromBoundary(editor, range.endContainer, range.endOffset)
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
    restoreSelection(range)
  }, [element.id, rehydrateToken, restoreSelection])

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
        const value = normalizeEditorText(target.innerText ?? target.textContent)
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
        width: '100%',
        height: '100%',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflow: 'auto',
        cursor: 'text'
      }}
    />
  )
}

export default InlineRichTextEditor
