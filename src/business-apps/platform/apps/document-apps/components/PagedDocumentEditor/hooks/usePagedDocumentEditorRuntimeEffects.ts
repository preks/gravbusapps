import { useEffect, useState, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { Plugin, PluginKey, type Transaction as ProseMirrorTransaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Awareness } from 'y-protocols/awareness'
import { emitDocumentActivity, emitDocumentActivityEnd } from '../../../../spaces/hooks/useSpaceDocumentActivity'
import type { PagedDocumentAutocompleteController } from './usePagedDocumentAutocompleteController'

const AUTOCOMPLETE_PLUGIN_KEY = new PluginKey('documentAutocompleteGhost')
const CURRENT_SELECTION_PLUGIN_KEY = new PluginKey('documentCurrentSelectionHighlight')

function getSpaceIdFromWindow(): string | null {
  if (globalThis.window === undefined) return null
  return new URLSearchParams(globalThis.window.location.search).get('spaceId')
}

export function mapSelectionRangeThroughTransaction(
  selectionRange: { from: number; to: number } | null,
  transaction: Pick<ProseMirrorTransaction, 'mapping'>,
  docSize: number
): { from: number; to: number } | null {
  if (!selectionRange) {
    return null
  }

  const mappedFrom = transaction.mapping.mapResult(selectionRange.from)
  const mappedTo = transaction.mapping.mapResult(selectionRange.to)
  if (mappedFrom.deleted && mappedTo.deleted) {
    return null
  }

  const from = Math.max(0, Math.min(mappedFrom.pos, docSize))
  const to = Math.max(from, Math.min(mappedTo.pos, docSize))
  return to > from ? { from, to } : null
}

function useCollaborationCursorStyles(): void {
  useEffect(() => {
    if (globalThis.window === undefined) return
    const styleId = 'collaboration-cursor-styles'
    const doc = globalThis.window.document
    if (doc.getElementById(styleId)) return
    const styleEl = doc.createElement('style')
    styleEl.id = styleId
    styleEl.textContent = `
      @keyframes cursor-fade-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .collaboration-cursor__caret {
        border-left-width: 2px;
        border-left-style: solid;
        margin-left: -1px;
        margin-right: -1px;
        pointer-events: none;
        position: relative;
        word-break: normal;
      }

      .collaboration-cursor__label {
        animation: cursor-fade-in 120ms ease-out;
        border-radius: 6px 6px 6px 0;
        color: white;
        font-size: 12px;
        font-style: normal;
        font-weight: 600;
        left: -1px;
        line-height: 1;
        padding: 0.25rem 0.5rem;
        pointer-events: none;
        position: absolute;
        top: -1.4em;
        user-select: none;
        white-space: nowrap;
      }
    `
    doc.head.appendChild(styleEl)
  }, [])
}

interface CollaborationParticipant {
  userId?: string | null
  userColor?: string | null
}

export interface UsePagedDocumentEditorRuntimeEffectsParams {
  editor: TiptapEditor | null
  editorRef: MutableRefObject<TiptapEditor | null>
  autocomplete: PagedDocumentAutocompleteController
  awareness: Awareness
  participants: CollaborationParticipant[]
  documentId?: string
  documentTitle?: string
  currentUserId: string | null
  currentUserName: string | null
  currentUserAvatar: string | null
  isYjsSynced: boolean
  isReadOnly: boolean
  editorEditable: boolean
  translate: (key: string) => string
}

export function usePagedDocumentEditorRuntimeEffects({
  editor,
  editorRef,
  autocomplete,
  awareness,
  participants,
  documentId,
  documentTitle,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isYjsSynced,
  isReadOnly,
  editorEditable,
  translate
}: UsePagedDocumentEditorRuntimeEffectsParams): void {
  const [currentSelectionRange, setCurrentSelectionRange] = useState<{ from: number; to: number } | null>(null)

  useCollaborationCursorStyles()

  useEffect(() => {
    editorRef.current = editor
  }, [editor, editorRef])

  useEffect(() => {
    if (!documentId) return
    if (!currentUserId) return
    if (!isYjsSynced) return

    const userState = {
      id: currentUserId,
      userId: currentUserId,
      name: currentUserName || translate('editor-user-fallback'),
      color: participants.find(participant => participant.userId === currentUserId)?.userColor || '#4ECDC4',
      avatar: currentUserAvatar
    }

    let cancelled = false
    const deadline = Date.now() + 5000
    const applyWhenViewReady = () => {
      if (cancelled) return

      try {
        const currentEditor = editorRef.current as { view?: unknown } | null
        if (currentEditor?.view) {
          awareness.setLocalStateField('user', userState)
          return
        }
      } catch {
        // view getter may throw when not mounted
      }

      if (Date.now() > deadline) return
      setTimeout(applyWhenViewReady, 50)
    }

    setTimeout(applyWhenViewReady, 0)
    return () => {
      cancelled = true
    }
  }, [
    documentId,
    awareness,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    participants,
    isYjsSynced,
    translate,
    editorRef
  ])

  useEffect(() => {
    if (!documentId || !currentUserId) return

    const activityType = isReadOnly ? 'viewing' : 'editing'
    const resolvedTitle = documentTitle || translate('title-untitled-document')
    const urlSpaceId = getSpaceIdFromWindow()

    emitDocumentActivity({
      userId: currentUserId,
      userName: currentUserName || translate('editor-user-fallback'),
      userAvatar: currentUserAvatar || undefined,
      documentId,
      documentTitle: resolvedTitle,
      documentType: 'document',
      activityType,
      spaceId: urlSpaceId || undefined
    })

    const keepAliveInterval = setInterval(() => {
      emitDocumentActivity({
        userId: currentUserId,
        userName: currentUserName || translate('editor-user-fallback'),
        userAvatar: currentUserAvatar || undefined,
        documentId,
        documentTitle: resolvedTitle,
        documentType: 'document',
        activityType,
        spaceId: urlSpaceId || undefined
      })
    }, 30000)

    return () => {
      clearInterval(keepAliveInterval)
      emitDocumentActivityEnd(currentUserId, documentId)
    }
  }, [documentId, documentTitle, currentUserId, currentUserName, currentUserAvatar, isReadOnly, translate])

  useEffect(() => {
    if (!editor) return

    const existing = AUTOCOMPLETE_PLUGIN_KEY.get(editor.state)
    if (existing) editor.unregisterPlugin(AUTOCOMPLETE_PLUGIN_KEY)

    if (
      !autocomplete.autocompleteSuggestion ||
      autocomplete.autocompleteCursorPos === null ||
      !editor.state.selection.empty ||
      editor.state.selection.from !== autocomplete.autocompleteCursorPos
    ) {
      return
    }

    const plugin = new Plugin({
      key: AUTOCOMPLETE_PLUGIN_KEY,
      props: {
        decorations(state) {
          const position = Math.min(Math.max(autocomplete.autocompleteCursorPos ?? 0, 0), state.doc.content.size)
          const ghost = globalThis.document.createElement('span')
          ghost.className = 'document-autocomplete-ghost-text'
          ghost.textContent = autocomplete.autocompleteSuggestion
          return DecorationSet.create(state.doc, [
            Decoration.widget(position, ghost, {
              side: 1,
              ignoreSelection: true
            })
          ])
        }
      }
    })

    editor.registerPlugin(plugin)
    return () => {
      const activePlugin = AUTOCOMPLETE_PLUGIN_KEY.get(editor.state)
      if (activePlugin) editor.unregisterPlugin(AUTOCOMPLETE_PLUGIN_KEY)
    }
  }, [editor, autocomplete.autocompleteCursorPos, autocomplete.autocompleteSuggestion])

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      autocomplete.clearAutocompleteSuggestion()
      const { from, to, empty } = editor.state.selection
      setCurrentSelectionRange(empty ? null : { from, to })
    }
    const handleTransaction = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
      if (transaction.selectionSet) {
        handleSelectionUpdate()
        return
      }

      if (!transaction.docChanged) {
        return
      }

      setCurrentSelectionRange(previous =>
        mapSelectionRangeThroughTransaction(previous, transaction, editor.state.doc.content.size)
      )
    }

    const { from, to, empty } = editor.state.selection
    setCurrentSelectionRange(empty ? null : { from, to })
    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('transaction', handleTransaction)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('transaction', handleTransaction)
    }
  }, [editor, autocomplete])

  useEffect(() => {
    if (!editor) return

    const existing = CURRENT_SELECTION_PLUGIN_KEY.get(editor.state)
    if (existing) {
      editor.unregisterPlugin(CURRENT_SELECTION_PLUGIN_KEY)
    }

    if (!currentSelectionRange) return

    const plugin = new Plugin({
      key: CURRENT_SELECTION_PLUGIN_KEY,
      props: {
        decorations(state) {
          const from = Math.max(0, Math.min(currentSelectionRange.from, state.doc.content.size))
          const to = Math.max(from, Math.min(currentSelectionRange.to, state.doc.content.size))
          if (from === to) return DecorationSet.empty
          return DecorationSet.create(state.doc, [
            Decoration.inline(from, to, {
              class: 'current-selection-highlight'
            })
          ])
        }
      }
    })

    editor.registerPlugin(plugin)
    return () => {
      const active = CURRENT_SELECTION_PLUGIN_KEY.get(editor.state)
      if (active) {
        editor.unregisterPlugin(CURRENT_SELECTION_PLUGIN_KEY)
      }
    }
  }, [editor, currentSelectionRange])

  useEffect(() => {
    if (!editor) return

    if (editor.isEditable !== editorEditable) {
      editor.setEditable(editorEditable)
    }
  }, [editor, editorEditable])
}
