import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { RichTextParagraph, RichTextRun, TextElement } from './slideElements'
import { textTransformToCss } from './slideElements'
import { resolveFontStack } from './fontStack'
import { getRichTextContent, normalizeRichTextParagraphs, type RichTextSelectionRange } from '../utils/richTextEditing'

export interface InlineRichTextEditorProps {
  element: TextElement
  onTextChange: (value: string) => void
  onSelectionChange: (range: RichTextSelectionRange | null) => void
  onFinishEditing: () => void
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

function normalizeEditorText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n')
}

function runBoundsFromElement(element: HTMLElement): { start: number; end: number } | null {
  const start = Number(element.dataset.runStart)
  const end = Number(element.dataset.runEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { start, end }
}

function textOffsetFromNode(container: HTMLElement, node: Node, offset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const runElement = node.parentElement?.closest<HTMLElement>('[data-run-start]')
    const bounds = runElement ? runBoundsFromElement(runElement) : null
    return bounds ? bounds.start + Math.min(offset, bounds.end - bounds.start) : 0
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement
  const runElement = element?.closest<HTMLElement>('[data-run-start]')
  const bounds = runElement ? runBoundsFromElement(runElement) : null
  if (bounds) return Math.min(bounds.start + offset, bounds.end)

  const runs = Array.from(container.querySelectorAll<HTMLElement>('[data-run-start]'))
  if (runs.length === 0) return 0

  const child = node.childNodes[Math.min(offset, node.childNodes.length - 1)]
  if (child) {
    const childElement =
      child.nodeType === Node.ELEMENT_NODE ? (child as HTMLElement) : child.parentElement?.closest<HTMLElement>('*')
    const childRun = childElement?.querySelector<HTMLElement>('[data-run-start]') ?? childElement
    const childBounds = childRun ? runBoundsFromElement(childRun) : null
    if (childBounds) return childBounds.start
  }

  const lastBounds = runBoundsFromElement(runs[runs.length - 1])
  return lastBounds?.end ?? 0
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

function paragraphKey(paragraphStart: number, paragraphLength: number, runCount: number): string {
  return `paragraph-${paragraphStart}-${paragraphLength}-${runCount}`
}

function runKey(start: number, end: number, text: string): string {
  return `run-${start}-${end}-${text}`
}

export const InlineRichTextEditor: React.FC<InlineRichTextEditorProps> = ({
  element,
  onTextChange,
  onSelectionChange,
  onFinishEditing,
  'data-testid': testId = 'inline-rich-text-editor'
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastSelectionRef = useRef<RichTextSelectionRange | null>(null)
  const paragraphs = useMemo(() => normalizeRichTextParagraphs(element), [element])
  const contentLength = useMemo(() => getRichTextContent(paragraphs).length, [paragraphs])

  const readSelection = useCallback((): RichTextSelectionRange | null => {
    const editor = editorRef.current
    const selection = globalThis.getSelection?.() ?? null
    if (!editor || !selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null

    const start = textOffsetFromNode(editor, range.startContainer, range.startOffset)
    const end = textOffsetFromNode(editor, range.endContainer, range.endOffset)
    return { start: Math.max(0, Math.min(start, contentLength)), end: Math.max(0, Math.min(end, contentLength)) }
  }, [contentLength])

  const emitSelection = useCallback(() => {
    const range = readSelection()
    lastSelectionRef.current = range
    onSelectionChange(range)
  }, [onSelectionChange, readSelection])

  const restoreSelection = useCallback(
    (range: RichTextSelectionRange | null) => {
      const editor = editorRef.current
      if (!editor || !range || document.activeElement !== editor) return
      const selection = globalThis.getSelection?.() ?? null
      if (!selection) return
      const start = findTextNodeAtOffset(editor, Math.max(0, Math.min(range.start, contentLength)))
      const end = findTextNodeAtOffset(editor, Math.max(0, Math.min(range.end, contentLength)))
      const domRange = document.createRange()
      domRange.setStart(start.node, start.offset)
      domRange.setEnd(end.node, end.offset)
      selection.removeAllRanges()
      selection.addRange(domRange)
    },
    [contentLength]
  )

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const range = lastSelectionRef.current ?? { start: contentLength, end: contentLength }
    restoreSelection(range)
  }, [contentLength, restoreSelection])

  let cursor = 0

  return (
    <div
      ref={editorRef}
      contentEditable
      tabIndex={0}
      suppressContentEditableWarning
      spellCheck
      data-testid={testId}
      onInput={event => {
        const value = normalizeEditorText((event.currentTarget as HTMLElement).innerText)
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
    >
      {paragraphs.map(paragraph => {
        const paragraphStart = cursor
        const paragraphLength = paragraph.runs.reduce((sum, run) => sum + run.text.length, 0)
        cursor += paragraphLength + 1
        let runCursor = paragraphStart
        const key = paragraphKey(paragraphStart, paragraphLength, paragraph.runs.length)

        return (
          <div
            key={key}
            style={{
              minHeight: element.fontSize * element.lineHeight,
              textAlign: alignmentToTextAlign(paragraph.alignment, element.textAlign),
              lineHeight: paragraph.lineHeight ?? element.lineHeight,
              marginTop: paragraph.spaceBefore,
              marginBottom: paragraph.spaceAfter
            }}
          >
            {paragraph.runs.map(run => {
              const start = runCursor
              const end = start + run.text.length
              runCursor = end
              return (
                <span
                  key={runKey(start, end, run.text)}
                  data-run-start={start}
                  data-run-end={end}
                  style={runStyle(run, element)}
                >
                  {run.text}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default InlineRichTextEditor
