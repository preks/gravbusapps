/**
 * useAiEdit Hook
 *
 * Manages AI edit state: selection capture, API calls, preview, and apply/undo.
 * Auto-detects editor selection on mount and highlights it with ProseMirror decorations.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { Editor } from '@tiptap/react'
import translations from '../../_i18n'
import { DOMSerializer } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { DocumentApiService } from '../../services/DocumentApiService'
import type { LlmProvider } from './useAiEditProvider'

export interface CapturedSelection {
  from: number
  to: number
  plainText: string
  html: string
}

export type AiEditMode = 'document' | 'selection'

const AI_SELECTION_PLUGIN_KEY = new PluginKey('aiSelectionHighlight')

export interface UseAiEditOptions {
  editor: Editor | null
  documentId: string
  documentTitle: string
  llmProvider: LlmProvider
}

export function useAiEdit({ editor, documentId, documentTitle, llmProvider }: UseAiEditOptions) {
  const { t } = useTranslation(translations)
  const [instruction, setInstruction] = useState('')
  const [mode, setModeState] = useState<AiEditMode>('document')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preview state
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [changeSummary, setChangeSummary] = useState<string | null>(null)
  const [isApplied, setIsApplied] = useState(false)

  // Captured selection (frozen when entering selection mode)
  const [capturedSelection, setCapturedSelection] = useState<CapturedSelection | null>(null)
  const hasInitialized = useRef(false)

  /** Capture current editor selection as rich HTML */
  const captureSelection = useCallback((): CapturedSelection | null => {
    if (!editor) return null
    const { from, to } = editor.state.selection
    if (from === to) return null

    const plainText = editor.state.doc.textBetween(from, to)
    const slice = editor.state.doc.slice(from, to)
    const div = globalThis.document.createElement('div')
    const serializer = DOMSerializer.fromSchema(editor.schema)
    const domFragment = serializer.serializeFragment(slice.content)
    div.appendChild(domFragment)
    const html = div.innerHTML

    return { from, to, plainText, html }
  }, [editor])

  /** Add ProseMirror decoration to highlight the captured selection */
  const addSelectionHighlight = useCallback(
    (from: number, to: number) => {
      if (!editor) return
      // Remove any existing highlight first
      const existing = AI_SELECTION_PLUGIN_KEY.get(editor.state)
      if (existing) {
        editor.unregisterPlugin(AI_SELECTION_PLUGIN_KEY)
      }
      const plugin = new Plugin({
        key: AI_SELECTION_PLUGIN_KEY,
        props: {
          decorations(state) {
            const clampedTo = Math.min(to, state.doc.content.size)
            const clampedFrom = Math.min(from, clampedTo)
            return DecorationSet.create(state.doc, [
              Decoration.inline(clampedFrom, clampedTo, {
                class: 'ai-selection-highlight'
              })
            ])
          }
        }
      })
      editor.registerPlugin(plugin)
    },
    [editor]
  )

  /** Remove ProseMirror decoration highlight */
  const removeSelectionHighlight = useCallback(() => {
    if (!editor) return
    const existing = AI_SELECTION_PLUGIN_KEY.get(editor.state)
    if (existing) {
      editor.unregisterPlugin(AI_SELECTION_PLUGIN_KEY)
    }
  }, [editor])

  /** Auto-detect selection on mount */
  useEffect(() => {
    if (hasInitialized.current || !editor) return
    hasInitialized.current = true

    const sel = captureSelection()
    if (sel) {
      setCapturedSelection(sel)
      setModeState('selection')
      addSelectionHighlight(sel.from, sel.to)
    }
  }, [editor, captureSelection, addSelectionHighlight])

  /** Cleanup decorations on unmount */
  useEffect(() => {
    return () => {
      removeSelectionHighlight()
    }
  }, [removeSelectionHighlight])

  /** Clear selection and switch to document mode */
  const clearSelection = useCallback(() => {
    setCapturedSelection(null)
    setModeState('document')
    removeSelectionHighlight()
    // Reset preview when changing mode
    setPreviewHtml(null)
    setChangeSummary(null)
    setIsApplied(false)
    setError(null)
  }, [removeSelectionHighlight])

  /** Call backend to generate AI edit preview */
  const generate = useCallback(async () => {
    if (!editor || !instruction.trim()) return

    setIsProcessing(true)
    setError(null)
    setPreviewHtml(null)
    setChangeSummary(null)
    setIsApplied(false)

    try {
      const documentHtml = editor.getHTML()
      const documentPlainText = editor.getText()

      const payload: Parameters<typeof DocumentApiService.aiEdit>[1] = {
        instruction: instruction.trim(),
        llmProvider,
        documentHtml,
        documentPlainText,
        mode,
        title: documentTitle
      }

      if (mode === 'selection' && capturedSelection) {
        payload.selection = {
          start: capturedSelection.from,
          end: capturedSelection.to,
          selectedPlainText: capturedSelection.plainText,
          selectionHtml: capturedSelection.html
        }
      }

      const result = await DocumentApiService.aiEdit(documentId, payload)

      if (result.mode === 'document' && result.updatedHtml) {
        setPreviewHtml(result.updatedHtml)
      } else if (result.mode === 'selection' && result.replacementHtml) {
        setPreviewHtml(result.replacementHtml)
      }
      setChangeSummary(result.changeSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai-edit-error-generate'))
    } finally {
      setIsProcessing(false)
    }
  }, [editor, instruction, llmProvider, mode, documentId, documentTitle, capturedSelection, t])

  /** Apply the preview to the TipTap editor */
  const apply = useCallback(() => {
    if (!editor || !previewHtml) return

    if (mode === 'document') {
      editor.commands.setContent(previewHtml)
    } else if (mode === 'selection' && capturedSelection) {
      // Remove highlight before applying
      removeSelectionHighlight()
      editor
        .chain()
        .focus()
        .insertContentAt({ from: capturedSelection.from, to: capturedSelection.to }, previewHtml)
        .run()
    }

    setIsApplied(true)
  }, [editor, previewHtml, mode, capturedSelection, removeSelectionHighlight])

  /** Undo the last applied edit */
  const undo = useCallback(() => {
    if (!editor) return
    editor.commands.undo()
    setIsApplied(false)
    // Re-add highlight if we had a selection
    if (capturedSelection) {
      addSelectionHighlight(capturedSelection.from, capturedSelection.to)
    }
  }, [editor, capturedSelection, addSelectionHighlight])

  /** Reset all state for a new instruction */
  const reset = useCallback(() => {
    setPreviewHtml(null)
    setChangeSummary(null)
    setIsApplied(false)
    setError(null)
    setInstruction('')
    setCapturedSelection(null)
    setModeState('document')
    removeSelectionHighlight()
  }, [removeSelectionHighlight])

  return {
    // State
    instruction,
    setInstruction,
    mode,
    isProcessing,
    error,
    previewHtml,
    changeSummary,
    isApplied,
    capturedSelection,
    // Actions
    generate,
    apply,
    undo,
    reset,
    clearSelection
  }
}
