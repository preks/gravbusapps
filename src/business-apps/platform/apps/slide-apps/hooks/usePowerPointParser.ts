/**
 * usePowerPointParser Hook
 *
 * Parses PowerPoint files (.pptx) using JSZip and XML parsing.
 * Extracts slides, text, images, shapes, and converts to our SlideData format.
 *
 * Note: .pptx files are ZIP archives containing XML files in OOXML format.
 */

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import type { SlideData } from '../components/slideElements'
import { createTextElement, createImageElement } from '../components/slideElements'

export interface ParsedPowerPointDocument {
  fileName: string
  fileSize: number
  slides: SlideData[]
  slideCount: number
  messages: ParserMessage[]
}

export interface ParserMessage {
  type: 'error' | 'warning' | 'info'
  /** i18n key or fallback string */
  message: string
  /** Optional variables for Fluent interpolation (e.g. { number: '1' }) */
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

/**
 * Parse XML string
 */
function parseXML(xmlString: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(xmlString, 'text/xml')
}

/**
 * Extract text from slide XML
 */
function extractTextFromSlideXml(
  slideXml: Document
): Array<{ text: string; x: number; y: number; width: number; height: number }> {
  const texts: Array<{ text: string; x: number; y: number; width: number; height: number }> = []

  // Find all text shapes (sp elements with txBody)
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i]

    // Get position and size
    const xfrm = shape.getElementsByTagName('a:xfrm')[0]
    const off = xfrm?.getElementsByTagName('a:off')[0]
    const ext = xfrm?.getElementsByTagName('a:ext')[0]

    const x = parseInt(off?.getAttribute('x') || '0') / 9525 // EMUs to pixels (96 DPI)
    const y = parseInt(off?.getAttribute('y') || '0') / 9525
    const width = parseInt(ext?.getAttribute('cx') || '0') / 9525
    const height = parseInt(ext?.getAttribute('cy') || '0') / 9525

    // Get text content
    const txBody = shape.getElementsByTagName('p:txBody')[0]
    if (!txBody) continue

    const paragraphs = txBody.getElementsByTagName('a:p')
    const textParts: string[] = []

    for (let j = 0; j < paragraphs.length; j++) {
      const runs = paragraphs[j].getElementsByTagName('a:t')
      for (let k = 0; k < runs.length; k++) {
        textParts.push(runs[k].textContent || '')
      }
    }

    const text = textParts.join(' ').trim()
    if (text) {
      texts.push({ text, x, y, width, height })
    }
  }

  return texts
}

/**
 * Extract images from slide relationships and media
 */
async function extractImagesFromPptx(zip: JSZip): Promise<Map<string, string>> {
  const images = new Map<string, string>()

  // Get all files in ppt/media/
  const mediaFolder = zip.folder('ppt/media')
  if (!mediaFolder) return images

  const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'))

  for (const fileName of mediaFiles) {
    const file = zip.files[fileName]
    if (file && !file.dir) {
      try {
        const blob = await file.async('blob')
        const base64 = await blobToBase64(blob)

        // Get image name (e.g., image1.png)
        const imageName = fileName.split('/').pop() || ''
        images.set(imageName, base64)
      } catch (err) {
        console.warn('[PowerPointParser] Failed to extract image:', fileName, err)
      }
    }
  }

  return images
}

/**
 * Convert Blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Get slide relationship mappings
 */
async function getSlideRelationships(zip: JSZip, slideNumber: number): Promise<Map<string, string>> {
  const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`
  const relsFile = zip.file(relsPath)

  if (!relsFile) return new Map()

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const relationships = new Map<string, string>()

  const rels = relsXml.getElementsByTagName('Relationship')
  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i]
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target')
    if (id && target) {
      relationships.set(id, target.replace('../', ''))
    }
  }

  return relationships
}

/**
 * Extract images from slide XML using relationships
 */
function extractImagesFromSlideXml(
  slideXml: Document,
  relationships: Map<string, string>,
  imageData: Map<string, string>
): Array<{ src: string; x: number; y: number; width: number; height: number }> {
  const images: Array<{ src: string; x: number; y: number; width: number; height: number }> = []

  // Find all picture shapes (pic elements)
  const pics = slideXml.getElementsByTagName('p:pic')

  for (let i = 0; i < pics.length; i++) {
    const pic = pics[i]

    // Get position and size
    const xfrm = pic.getElementsByTagName('a:xfrm')[0]
    const off = xfrm?.getElementsByTagName('a:off')[0]
    const ext = xfrm?.getElementsByTagName('a:ext')[0]

    const x = parseInt(off?.getAttribute('x') || '0') / 9525
    const y = parseInt(off?.getAttribute('y') || '0') / 9525
    const width = parseInt(ext?.getAttribute('cx') || '0') / 9525
    const height = parseInt(ext?.getAttribute('cy') || '0') / 9525

    // Get image reference
    const blip = pic.getElementsByTagName('a:blip')[0]
    const relId = blip?.getAttribute('r:embed')

    if (relId) {
      const imagePath = relationships.get(relId)
      if (imagePath) {
        const imageName = imagePath.split('/').pop()
        const imageBase64 = imageName ? imageData.get(imageName) : undefined

        if (imageBase64) {
          images.push({ src: imageBase64, x, y, width, height })
        }
      }
    }
  }

  return images
}

export interface UsePowerPointParserOptions {
  /** Translation function for user-facing strings (e.g. default slide title) */
  t?: (key: string) => string
}

/**
 * Hook for parsing PowerPoint documents
 */
export function usePowerPointParser(options?: UsePowerPointParserOptions): UsePowerPointParserResult {
  const t = options?.t
  const [state, setState] = useState<UsePowerPointParserState>({
    isLoading: false,
    progress: 0,
    error: null,
    parsedDocument: null
  })

  /**
   * Parse a PowerPoint file
   */
  const parseFile = useCallback(
    async (file: File): Promise<ParsedPowerPointDocument | null> => {
      const tFn = t
      // Validate file type
      const isValidType =
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.name.toLowerCase().endsWith('.pptx')

      if (!isValidType) {
        setState(prev => ({
          ...prev,
          error: 'parser-invalid-type'
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

        // Unzip the .pptx file
        setState(prev => ({ ...prev, progress: 30 }))
        const zip = await JSZip.loadAsync(arrayBuffer)

        // Get presentation.xml to find slide count
        const presentationFile = zip.file('ppt/presentation.xml')
        if (!presentationFile) {
          throw new Error('parser-invalid-file')
        }

        const presentationContent = await presentationFile.async('text')
        const presentationXml = parseXML(presentationContent)
        const slideIds = presentationXml.getElementsByTagName('p:sldId')
        const slideCount = slideIds.length

        setState(prev => ({ ...prev, progress: 40 }))

        // Extract all images first
        const imageData = await extractImagesFromPptx(zip)

        setState(prev => ({ ...prev, progress: 50 }))

        // Parse each slide
        const slides: SlideData[] = []
        const messages: ParserMessage[] = []

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

          // Get relationships for this slide
          const relationships = await getSlideRelationships(zip, slideNumber)

          // Extract text elements
          const textElements = extractTextFromSlideXml(slideXml)

          // Extract images
          const imageElements = extractImagesFromSlideXml(slideXml, relationships, imageData)

          // Create slide data
          const slideData: SlideData = {
            id: `slide-${Date.now()}-${i}`,
            elements: [],
            background: { type: 'solid', color: '#ffffff' },
            notes: ''
          }

          // Convert text to our format
          textElements.forEach((text, idx) => {
            slideData.elements.push(
              createTextElement({
                id: `text-${Date.now()}-${i}-${idx}`,
                content: text.text,
                position: { x: Math.max(0, text.x), y: Math.max(0, text.y) },
                size: { width: Math.max(100, text.width), height: Math.max(40, text.height) },
                fontSize: 32,
                color: '#1e293b'
              })
            )
          })

          // Convert images to our format
          imageElements.forEach((img, idx) => {
            slideData.elements.push(
              createImageElement(img.src, {
                id: `image-${Date.now()}-${i}-${idx}`,
                position: { x: Math.max(0, img.x), y: Math.max(0, img.y) },
                size: { width: Math.max(100, img.width), height: Math.max(100, img.height) }
              })
            )
          })

          slides.push(slideData)

          setState(prev => ({ ...prev, progress: 50 + ((i + 1) / slideCount) * 40 }))
        }

        if (slides.length === 0) {
          // Create one default slide if parsing resulted in empty
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

        const parsedDocument: ParsedPowerPointDocument = {
          fileName: file.name,
          fileSize: file.size,
          slides,
          slideCount: slides.length,
          messages
        }

        setState({
          isLoading: false,
          progress: 100,
          error: null,
          parsedDocument
        })

        return parsedDocument
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'parser-failed'
        console.error('[PowerPointParser] Parse error:', error)

        setState({
          isLoading: false,
          progress: 0,
          error: errorMessage,
          parsedDocument: null
        })

        return null
      }
    },
    [t]
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
