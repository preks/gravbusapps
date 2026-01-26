/**
 * useWordParser Hook
 *
 * Parses Word documents (.docx) using mammoth.js and extracts
 * formatted HTML content while preserving styles.
 */

import { useState, useCallback } from 'react'
import mammoth from 'mammoth'
import type { ParsedWordDocument, WordParserMessage, WordImage } from '../types'

interface UseWordParserState {
  isLoading: boolean
  progress: number
  error: string | null
  parsedDocument: ParsedWordDocument | null
}

interface UseWordParserResult extends UseWordParserState {
  parseFile: (file: File) => Promise<ParsedWordDocument | null>
  reset: () => void
}

/**
 * Custom style map for better HTML output
 * Maps Word styles to HTML elements with CSS classes
 */
const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1.document-title:fresh",
  "p[style-name='Subtitle'] => p.document-subtitle:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  "p[style-name='List Paragraph'] => li:fresh"
].join('\n')

/**
 * Hook for parsing Word documents
 */
export function useWordParser(): UseWordParserResult {
  const [state, setState] = useState<UseWordParserState>({
    isLoading: false,
    progress: 0,
    error: null,
    parsedDocument: null
  })

  /**
   * Convert mammoth messages to our format
   */
  const convertMessages = useCallback((messages: mammoth.Message[]): WordParserMessage[] => {
    return messages.map(msg => ({
      type: msg.type as 'error' | 'warning' | 'info',
      message: msg.message
    }))
  }, [])

  /**
   * Extract images from the document (reserved for future use)
   * Mammoth handles image extraction via convertImage option during main conversion
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _extractImages = useCallback(async (_arrayBuffer: ArrayBuffer): Promise<WordImage[]> => {
    return []
  }, [])

  /**
   * Parse a Word document file
   * Note: Only .docx files are supported (Office Open XML format)
   * The older .doc format (binary) is not supported by mammoth.js
   */
  const parseFile = useCallback(
    async (file: File): Promise<ParsedWordDocument | null> => {
      // Check if it's an old .doc file (not supported)
      const isOldDocFormat =
        file.type === 'application/msword' ||
        (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx'))

      if (isOldDocFormat) {
        setState(prev => ({
          ...prev,
          error:
            'The older .doc format is not supported. Please save your document as .docx (Word 2007 or later) and try again.'
        }))
        return null
      }

      // Validate file type - only .docx is supported
      const isValidType =
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')

      if (!isValidType) {
        setState(prev => ({
          ...prev,
          error: 'Invalid file type. Please upload a .docx file (Word 2007 or later).'
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

        // Collect embedded images
        const collectedImages: WordImage[] = []

        // Convert to HTML with mammoth
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: STYLE_MAP,
            convertImage: mammoth.images.imgElement(async image => {
              try {
                const imageBuffer = await image.read('base64')
                const contentType = image.contentType || 'image/png'

                collectedImages.push({
                  contentType,
                  base64: imageBuffer,
                  altText: ''
                })

                // Return inline base64 image
                return {
                  src: `data:${contentType};base64,${imageBuffer}`
                }
              } catch (err) {
                console.warn('[WordParser] Error converting image:', err)
                return { src: '' }
              }
            })
          }
        )

        setState(prev => ({ ...prev, progress: 70 }))

        // Convert to plain text for search/word count
        const textResult = await mammoth.extractRawText({ arrayBuffer })

        setState(prev => ({ ...prev, progress: 90 }))

        // Clean up HTML
        let html = result.value
        // Add basic styling classes for better rendering
        html = html
          .replace(/<table>/g, '<table class="document-table">')
          .replace(/<ul>/g, '<ul class="document-list">')
          .replace(/<ol>/g, '<ol class="document-list">')

        const parsedDocument: ParsedWordDocument = {
          fileName: file.name,
          fileSize: file.size,
          html,
          plainText: textResult.value,
          messages: convertMessages(result.messages),
          images: collectedImages
        }

        setState({
          isLoading: false,
          progress: 100,
          error: null,
          parsedDocument
        })

        return parsedDocument
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse document'
        console.error('[WordParser] Parse error:', error)

        setState({
          isLoading: false,
          progress: 0,
          error: errorMessage,
          parsedDocument: null
        })

        return null
      }
    },
    [convertMessages]
  )

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
