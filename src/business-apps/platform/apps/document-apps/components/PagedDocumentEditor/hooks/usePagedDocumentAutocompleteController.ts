import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'

const AUTOCOMPLETE_DEBOUNCE_MS = 350

export interface UsePagedDocumentAutocompleteControllerParams {
  editorRef: MutableRefObject<TiptapEditor | null>
  documentId?: string
  title: string
  editorEditable: boolean
  autocompleteRolloutEnabled: boolean
  autocompleteToggleStorageKey: string
}

export interface PagedDocumentAutocompleteController {
  autocompleteSuggestion: string
  autocompleteCursorPos: number | null
  autocompleteSuggestionRef: MutableRefObject<string>
  autocompleteCursorPosRef: MutableRefObject<number | null>
  clearAutocompleteSuggestion: () => void
  scheduleAutocompleteRef: MutableRefObject<() => void>
}

export function usePagedDocumentAutocompleteController({
  editorRef,
  documentId,
  title,
  editorEditable,
  autocompleteRolloutEnabled,
  autocompleteToggleStorageKey
}: UsePagedDocumentAutocompleteControllerParams): PagedDocumentAutocompleteController {
  const [isAutocompleteToggleEnabled, setIsAutocompleteToggleEnabled] = useState(false)
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('')
  const [autocompleteCursorPos, setAutocompleteCursorPos] = useState<number | null>(null)
  const isAutocompleteLoadingRef = useRef(false)
  const autocompleteSuggestionRef = useRef('')
  const autocompleteCursorPosRef = useRef<number | null>(null)
  const autocompleteDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const autocompleteRequestControllerRef = useRef<AbortController | null>(null)
  const scheduleAutocompleteRef = useRef<() => void>(() => {})

  const isAutocompleteActive = useMemo(
    () => autocompleteRolloutEnabled && isAutocompleteToggleEnabled && editorEditable,
    [autocompleteRolloutEnabled, editorEditable, isAutocompleteToggleEnabled]
  )

  useEffect(() => {
    if (!autocompleteRolloutEnabled) {
      setIsAutocompleteToggleEnabled(false)
      return
    }

    try {
      const stored = globalThis.localStorage.getItem(autocompleteToggleStorageKey)
      if (stored === null) {
        setIsAutocompleteToggleEnabled(false)
      } else {
        setIsAutocompleteToggleEnabled(stored === 'true')
      }
    } catch {
      setIsAutocompleteToggleEnabled(false)
    }
  }, [autocompleteRolloutEnabled, autocompleteToggleStorageKey])

  useEffect(() => {
    if (!autocompleteRolloutEnabled) return

    try {
      globalThis.localStorage.setItem(autocompleteToggleStorageKey, String(isAutocompleteToggleEnabled))
    } catch {
      // ignore storage write issues
    }
  }, [autocompleteRolloutEnabled, autocompleteToggleStorageKey, isAutocompleteToggleEnabled])

  const clearAutocompleteSuggestion = useCallback(() => {
    setAutocompleteSuggestion('')
    setAutocompleteCursorPos(null)
    isAutocompleteLoadingRef.current = false
  }, [])

  const getAutocompleteContext = useCallback(() => {
    const editorInstance = editorRef.current
    if (!editorInstance) return null

    const selection = editorInstance.state.selection
    if (!selection.empty) return null

    const { $from } = selection
    const parentText = $from.parent.textContent || ''
    const prefixText = parentText.slice(0, $from.parentOffset)
    const suffixText = parentText.slice($from.parentOffset)
    if (prefixText.trim().length < 3) return null

    return {
      cursorPos: selection.from,
      prefixText: prefixText.slice(-600),
      suffixText: suffixText.slice(0, 250)
    }
  }, [editorRef])

  const requestAutocomplete = useCallback(
    async (context: { cursorPos: number; prefixText: string; suffixText: string }) => {
      if (!isAutocompleteActive) return

      autocompleteRequestControllerRef.current?.abort()
      const controller = new AbortController()
      autocompleteRequestControllerRef.current = controller
      isAutocompleteLoadingRef.current = true

      try {
        const response = await flowbotClient.getDocumentAutocomplete(
          {
            document_id: documentId,
            title,
            prefix_text: context.prefixText,
            suffix_text: context.suffixText,
            max_tokens: 80,
            llm_provider: 'openai'
          },
          { signal: controller.signal }
        )

        const editorInstance = editorRef.current
        if (!editorInstance) return
        if (!editorInstance.state.selection.empty || editorInstance.state.selection.from !== context.cursorPos) return

        const completion = (response.completion_text || '').trim()
        if (!completion) {
          clearAutocompleteSuggestion()
          return
        }

        setAutocompleteSuggestion(completion)
        setAutocompleteCursorPos(context.cursorPos)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        clearAutocompleteSuggestion()
      } finally {
        if (autocompleteRequestControllerRef.current === controller) {
          autocompleteRequestControllerRef.current = null
        }
        isAutocompleteLoadingRef.current = false
      }
    },
    [clearAutocompleteSuggestion, documentId, editorRef, isAutocompleteActive, title]
  )

  const scheduleAutocomplete = useCallback(() => {
    if (!isAutocompleteActive) {
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current)
      }
      autocompleteRequestControllerRef.current?.abort()
      clearAutocompleteSuggestion()
      return
    }

    if (autocompleteDebounceRef.current) {
      clearTimeout(autocompleteDebounceRef.current)
    }
    autocompleteRequestControllerRef.current?.abort()
    clearAutocompleteSuggestion()

    const context = getAutocompleteContext()
    if (!context) return

    autocompleteDebounceRef.current = setTimeout(() => {
      void requestAutocomplete(context)
    }, AUTOCOMPLETE_DEBOUNCE_MS)
  }, [clearAutocompleteSuggestion, getAutocompleteContext, isAutocompleteActive, requestAutocomplete])

  useEffect(() => {
    scheduleAutocompleteRef.current = scheduleAutocomplete
  }, [scheduleAutocomplete])

  useEffect(() => {
    autocompleteSuggestionRef.current = autocompleteSuggestion
    autocompleteCursorPosRef.current = autocompleteCursorPos
  }, [autocompleteSuggestion, autocompleteCursorPos])

  useEffect(() => {
    return () => {
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current)
      }
      autocompleteRequestControllerRef.current?.abort()
    }
  }, [])

  return {
    autocompleteSuggestion,
    autocompleteCursorPos,
    autocompleteSuggestionRef,
    autocompleteCursorPosRef,
    clearAutocompleteSuggestion,
    scheduleAutocompleteRef
  }
}
