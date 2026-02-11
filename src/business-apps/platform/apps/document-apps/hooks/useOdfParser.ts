/**
 * useOdfParser Hook
 *
 * Parses ODF documents (.odt) using jszip and a custom XML parser,
 * converting them to HTML for the TipTap editor.
 * Mirrors the useWordParser hook pattern.
 */

import { useState, useCallback } from 'react'
import { parseOdfToHtml } from '../utils/odfParserUtils'
import type { ParsedWordDocument, WordParserMessage, WordImage } from '../types'

interface UseOdfParserState {
  isLoading: boolean
  progress: number
  error: string | null
  parsedDocument: ParsedWordDocument | null
}

interface UseOdfParserResult extends UseOdfParserState {
  parseFile: (file: File) => Promise<ParsedWordDocument | null>
  reset: () => void
}

/** ODF MIME type for text documents */
const ODF_TEXT_MIME = 'application/vnd.oasis.opendocument.text'

/**
 * Hook for parsing ODF (Open Document Format) text files.
 * Returns the same ParsedWordDocument shape so it's interchangeable
 * with useWordParser in the editor pipeline.
 */
export function useOdfParser(): UseOdfParserResult {
  const [state, setState] = useState<UseOdfParserState>({
    isLoading: false,
    progress: 0,
    error: null,
    parsedDocument: null
  })

  /**
   * Parse an ODF text document file (.odt)
   */
  const parseFile = useCallback(async (file: File): Promise<ParsedWordDocument | null> => {
    // Validate file type
    const isValidType =
      file.type === ODF_TEXT_MIME ||
      file.type === 'application/vnd.oasis.opendocument.text-template' ||
      file.name.toLowerCase().endsWith('.odt') ||
      file.name.toLowerCase().endsWith('.ott')

    if (!isValidType) {
      setState(prev => ({
        ...prev,
        error: 'Invalid file type. Please upload an .odt file (OpenDocument Text).'
      }))
      return null
    }

    setState({
      isLoading: true,
      progress: 10,
      error: null,
      parsedDocument: null
    })

    try {
      // Read file as ArrayBuffer
      setState(prev => ({ ...prev, progress: 20 }))
      const arrayBuffer = await file.arrayBuffer()

      setState(prev => ({ ...prev, progress: 40 }))

      // Parse ODF content to HTML
      const result = await parseOdfToHtml(arrayBuffer)

      setState(prev => ({ ...prev, progress: 80 }))

      // Convert messages format
      const messages: WordParserMessage[] = result.messages.map(msg => ({
        type: msg.type,
        message: msg.message
      }))

      // Convert images format
      const images: WordImage[] = result.images.map(img => ({
        contentType: img.contentType,
        base64: img.base64,
        altText: ''
      }))

      setState(prev => ({ ...prev, progress: 90 }))

      const parsedDocument: ParsedWordDocument = {
        fileName: file.name,
        fileSize: file.size,
        html: result.html,
        plainText: result.plainText,
        messages,
        images
      }

      setState({
        isLoading: false,
        progress: 100,
        error: null,
        parsedDocument
      })

      return parsedDocument
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse ODF document'
      console.error('[OdfParser] Parse error:', error)

      setState({
        isLoading: false,
        progress: 0,
        error: errorMessage,
        parsedDocument: null
      })

      return null
    }
  }, [])

  /**
   * Reset parser state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      error: null,
      parsedDocument: null
    })
  }, [])

  return {
    ...state,
    parseFile,
    reset
  }
}
