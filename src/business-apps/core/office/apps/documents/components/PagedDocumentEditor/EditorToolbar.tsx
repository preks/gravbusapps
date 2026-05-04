/**
 * Compact spreadsheet-inspired toolbar for the PagedDocumentEditor,
 * with voice input and visualizer.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { useTranslation } from '@newwork/nw-design-system'
import { VoiceVisualizer, useVoiceInput, normalizeDictationTranscript } from '@/business-apps/platform/apps/shared'
import translations from '../../_i18n'
import type { PageLayoutPaginationConfig } from '../../utils/pageLayoutUtils'
import { EditorToolbarRibbon } from './EditorToolbarRibbon'

interface EditorToolbarProps {
  editor: Editor | null
  paginationConfig?: PageLayoutPaginationConfig | null
  onInsertPageBreak?: () => void
  onOpenLinkDialog?: () => void
  onOpenInsertImageDialog?: () => void
  onOpenInsertSignatureDialog?: () => void
  onOpenInsertTableDialog?: () => void
  onOpenTableSidebar?: () => void
  onOpenPageNumbersDialog?: () => void
  onOpenFind?: () => void
  onOpenReplace?: () => void
  'data-testid'?: string
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  paginationConfig = null,
  onInsertPageBreak,
  onOpenLinkDialog,
  onOpenInsertImageDialog,
  onOpenInsertSignatureDialog,
  onOpenInsertTableDialog,
  onOpenTableSidebar,
  onOpenPageNumbersDialog,
  onOpenFind,
  onOpenReplace,
  'data-testid': testId = 'editor-toolbar'
}) => {
  const { t, locale } = useTranslation(translations)
  const editorRef = useRef(editor)
  editorRef.current = editor
  const dictationStartRef = useRef<number | null>(null)
  const dictationEndRef = useRef<number | null>(null)
  const dictationLanguage = locale ?? 'en-US'

  const applyDictationToEditor = useCallback((text: string) => {
    const ed = editorRef.current
    if (!ed || !text) return
    let start = dictationStartRef.current
    const end = dictationEndRef.current ?? start ?? ed.state.selection.from
    try {
      const content = { type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }
      if (start == null) {
        start = ed.state.selection.from
        ed.chain().focus().deleteSelection().insertContent(content).run()
        dictationStartRef.current = start
        dictationEndRef.current = ed.state.selection.from
        return
      }
      if (start === end) {
        ed.chain().focus().setTextSelection(start).insertContent(content).run()
      } else {
        ed.chain().focus().setTextSelection({ from: start, to: end }).deleteSelection().insertContent(content).run()
      }
      dictationEndRef.current = ed.state.selection.from
    } catch (err) {
      console.error('[EditorToolbar] dictate insert failed', err)
    }
  }, [])

  const voiceInput = useVoiceInput({
    language: dictationLanguage,
    continuous: true,
    interimResults: true,
    autoStopOnSilence: false,
    onTranscript: (transcript: string) => {
      const raw = transcript.trim()
      if (!raw) return
      const text = normalizeDictationTranscript(raw, dictationLanguage)
      requestAnimationFrame(() => applyDictationToEditor(text))
    },
    onEnd: () => {
      dictationStartRef.current = null
      dictationEndRef.current = null
    }
  })

  const handleStartListening = useCallback(() => {
    if (editor) {
      dictationStartRef.current = editor.state.selection.from
      dictationEndRef.current = editor.state.selection.from
    }
    voiceInput.startListening()
  }, [editor, voiceInput.startListening])

  useEffect(() => {
    if (!voiceInput.isListening) {
      dictationStartRef.current = null
      dictationEndRef.current = null
    }
  }, [voiceInput.isListening])

  useEffect(() => {
    if (!editor && voiceInput.isListening) {
      voiceInput.stopListening()
    }
  }, [editor, voiceInput.isListening, voiceInput.stopListening])

  if (!editor) {
    return null
  }

  const voiceProps = voiceInput.isSupported
    ? {
        isSupported: voiceInput.isSupported,
        isListening: voiceInput.isListening,
        volume: voiceInput.volume,
        error: voiceInput.error,
        errorCode: voiceInput.errorCode,
        onStartListening: handleStartListening,
        onStopListening: voiceInput.stopListening
      }
    : undefined

  return (
    <>
      <div data-testid={testId}>
        <EditorToolbarRibbon
          editor={editor}
          paginationConfig={paginationConfig}
          onInsertPageBreak={onInsertPageBreak}
          onOpenLinkDialog={onOpenLinkDialog}
          onOpenInsertImageDialog={onOpenInsertImageDialog}
          onOpenInsertSignatureDialog={onOpenInsertSignatureDialog}
          onOpenInsertTableDialog={onOpenInsertTableDialog}
          onOpenTableSidebar={onOpenTableSidebar}
          onOpenPageNumbersDialog={onOpenPageNumbersDialog}
          onOpenFind={onOpenFind}
          onOpenReplace={onOpenReplace}
          voiceProps={voiceProps}
          data-testid={testId}
        />
      </div>
      {voiceInput.isListening && (
        <div className="gba:px-2 gba:py-2 gba:border-b gba:bg-muted/20" data-testid={`${testId}-voice-visualizer`}>
          <VoiceVisualizer
            volume={voiceInput.volume}
            isListening={voiceInput.isListening}
            interimText={voiceInput.interimTranscript}
            listeningLabel={t('editor-dictate-listening')}
            data-testid="document-toolbar-voice-visualizer"
          />
        </div>
      )}
    </>
  )
}

export default EditorToolbar
