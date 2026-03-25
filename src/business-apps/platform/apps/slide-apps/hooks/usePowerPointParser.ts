// Orchestrator hook for parsing PowerPoint (.pptx) files.
// Delegates to pure extraction functions in pptxImport/.

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import type { SlideData } from '../components/slideElements'
import { createTextElement } from '../components/slideElements'
import { parseXML } from './pptxImport/ooxmlUtils'
import { extractTheme, mapThemeToSlideThemeId } from './pptxImport/extractTheme'
import { extractAllMedia, resolveSlideRelationships } from './pptxImport/resolveRelationships'
import { assembleSlide } from './pptxImport/assembleSlide'

export interface ParsedPowerPointDocument {
  fileName: string
  fileSize: number
  slides: SlideData[]
  slideCount: number
  themeId: string
  messages: ParserMessage[]
}

export interface ParserMessage {
  type: 'error' | 'warning' | 'info'
  message: string
  params?: Record<string, string>
}

interface UsePowerPointParserState {
  isLoading: boolean
  progress: number
  error: string | null
  parsedDocument: ParsedPowerPointDocument | null
}

interface UsePowerPointParserResult extends UsePowerPointParserState {
  parseFile: (file: File) => Promise<ParsedPowerPointDocument | null>
  reset: () => void
}

export interface UsePowerPointParserOptions {
  t?: (key: string) => string
}

export function usePowerPointParser(options?: UsePowerPointParserOptions): UsePowerPointParserResult {
  const t = options?.t
  const [state, setState] = useState<UsePowerPointParserState>({
    isLoading: false,
    progress: 0,
    error: null,
    parsedDocument: null
  })

  const parseFile = useCallback(
    async (file: File): Promise<ParsedPowerPointDocument | null> => {
      const tFn = t

      const isValidType =
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.name.toLowerCase().endsWith('.pptx')

      if (!isValidType) {
        setState(prev => ({ ...prev, error: 'parser-invalid-type' }))
        return null
      }

      setState({ isLoading: true, progress: 10, error: null, parsedDocument: null })

      try {
        setState(prev => ({ ...prev, progress: 15 }))
        const arrayBuffer = await file.arrayBuffer()

        setState(prev => ({ ...prev, progress: 20 }))
        const zip = await JSZip.loadAsync(arrayBuffer)

        const presentationFile = zip.file('ppt/presentation.xml')
        if (!presentationFile) {
          throw new Error('parser-invalid-file')
        }

        const presentationContent = await presentationFile.async('text')
        const presentationXml = parseXML(presentationContent)
        const slideIds = presentationXml.getElementsByTagName('p:sldId')
        const slideCount = slideIds.length

        setState(prev => ({ ...prev, progress: 30 }))

        const theme = await extractTheme(zip)
        const themeId = mapThemeToSlideThemeId(theme)

        setState(prev => ({ ...prev, progress: 40 }))

        const imageData = await extractAllMedia(zip)

        setState(prev => ({ ...prev, progress: 50 }))

        const slides: SlideData[] = []
        const messages: ParserMessage[] = []

        messages.push({
          type: 'info',
          message: 'parser-theme-mapped',
          params: { theme: themeId }
        })

        for (let i = 0; i < slideCount; i++) {
          const slideNumber = i + 1
          const slidePath = `ppt/slides/slide${slideNumber}.xml`
          const slideFile = zip.file(slidePath)

          if (!slideFile) {
            messages.push({
              type: 'warning',
              message: 'parser-slide-not-found',
              params: { number: String(slideNumber) }
            })
            continue
          }

          const slideContent = await slideFile.async('text')
          const slideXml = parseXML(slideContent)

          const relationships = await resolveSlideRelationships(zip, slideNumber)

          const slideData = await assembleSlide(slideXml, relationships, imageData, theme, zip, i, messages)

          slides.push(slideData)

          setState(prev => ({ ...prev, progress: 50 + ((i + 1) / slideCount) * 40 }))
        }

        if (slides.length === 0) {
          slides.push({
            id: `slide-${Date.now()}`,
            elements: [
              createTextElement({
                id: `title-${Date.now()}`,
                content: tFn ? tFn('parser-imported-slide') : 'Imported Slide',
                position: { x: 80, y: 280 },
                size: { width: 1120, height: 100 },
                fontSize: 64,
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#1e293b'
              })
            ],
            background: { type: 'solid', color: '#ffffff' }
          })

          messages.push({
            type: 'warning',
            message: 'parser-no-slides-parsed'
          })
        }

        const notesCount = slides.filter(s => s.notes).length
        if (notesCount > 0) {
          messages.push({
            type: 'info',
            message: 'parser-notes-imported',
            params: { count: String(notesCount) }
          })
        }

        const parsedDocument: ParsedPowerPointDocument = {
          fileName: file.name,
          fileSize: file.size,
          slides,
          slideCount: slides.length,
          themeId,
          messages
        }

        setState({ isLoading: false, progress: 100, error: null, parsedDocument })
        return parsedDocument
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'parser-failed'
        console.error('[PowerPointParser] Parse error:', error)
        setState({ isLoading: false, progress: 0, error: errorMessage, parsedDocument: null })
        return null
      }
    },
    [t]
  )

  const reset = useCallback(() => {
    setState({ isLoading: false, progress: 0, error: null, parsedDocument: null })
  }, [])

  return { ...state, parseFile, reset }
}
