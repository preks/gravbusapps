// Orchestrator hook for parsing PowerPoint (.pptx) files.
// Delegates to pure extraction functions in pptxImport/.

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import type { SlideData, SlideCanvasSize } from '../components/slideElements'
import { createTextElement, DEFAULT_SLIDE_CANVAS_SIZE } from '../components/slideElements'
import type { AnySlideElement } from '../components/slideElements'
import { parseXML, getChild, emuToPixels, extractTransform } from './pptxImport/ooxmlUtils'
import { extractTheme, mapThemeToSlideThemeId } from './pptxImport/extractTheme'
import {
  extractAllMedia,
  resolveSlideRelationships,
  resolveLayoutRelationships
} from './pptxImport/resolveRelationships'
import { assembleSlide } from './pptxImport/assembleSlide'
import { extractSlideSize, type ParsedSlideSize } from './pptxImport/extractSlideSize'
import type { OoxmlTheme } from './pptxImport/types'

export interface ParsedPowerPointDocument {
  fileName: string
  fileSize: number
  slides: SlideData[]
  slideCount: number
  themeId: string
  messages: ParserMessage[]
  /**
   * Canvas dimensions and preset derived from the deck's <p:sldSz>. Falls
   * back to the 16:9 default when the file omits a size.
   */
  canvasSize: SlideCanvasSize
  slideSizePreset?: ParsedSlideSize['preset']
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

function getPlaceholderType(sp: Element): string | null {
  const nvSpPr = getChild(sp, 'p:nvSpPr')
  if (!nvSpPr) return null
  const nvPr = getChild(nvSpPr, 'p:nvPr')
  if (!nvPr) return null
  const ph = getChild(nvPr, 'p:ph')
  if (!ph) return null
  return ph.getAttribute('type') || 'body'
}

const SCHEME_ALIAS_MAP: Record<string, string> = {
  tx1: 'dk1',
  bg1: 'lt1',
  tx2: 'dk2',
  bg2: 'lt2'
}

function resolveSchemeColor(el: Element, theme: OoxmlTheme | undefined): string | undefined {
  const srgb = getChild(el, 'a:srgbClr')
  if (srgb) return `#${srgb.getAttribute('val') || '000000'}`

  const scheme = getChild(el, 'a:schemeClr')
  if (scheme && theme) {
    const val = scheme.getAttribute('val')
    if (!val) return undefined
    const mapped = SCHEME_ALIAS_MAP[val] || val
    const resolved = theme.colors.get(mapped)
    if (resolved) return resolved.startsWith('#') ? resolved : `#${resolved}`
  }
  return undefined
}

interface MasterTextStyles {
  title?: string
  body?: string
  other?: string
}

function extractMasterTextStyles(masterXml: Document, theme: OoxmlTheme | undefined): MasterTextStyles {
  const result: MasterTextStyles = {}
  const txStyles = masterXml.getElementsByTagName('p:txStyles')[0]
  if (!txStyles) return result

  for (let i = 0; i < txStyles.childNodes.length; i++) {
    const node = txStyles.childNodes[i] as Element
    if (!node.tagName) continue

    let key: keyof MasterTextStyles | undefined
    if (node.tagName === 'p:titleStyle') key = 'title'
    else if (node.tagName === 'p:bodyStyle') key = 'body'
    else if (node.tagName === 'p:otherStyle') key = 'other'
    if (!key) continue

    const lvl1 = getChild(node, 'a:lvl1pPr')
    if (!lvl1) continue
    const defRPr = getChild(lvl1, 'a:defRPr')
    if (!defRPr) continue
    const solidFill = getChild(defRPr, 'a:solidFill')
    if (!solidFill) continue

    const color = resolveSchemeColor(solidFill, theme)
    if (color) result[key] = color
  }

  return result
}

function buildLayoutStyleMap(layoutXml: Document, theme: OoxmlTheme | undefined): Map<string, string> {
  const styleMap = new Map<string, string>()
  const shapes = layoutXml.getElementsByTagName('p:sp')
  for (let i = 0; i < shapes.length; i++) {
    const sp = shapes[i]
    const phType = getPlaceholderType(sp)
    if (!phType) continue

    const style = getChild(sp, 'p:style')
    if (!style) continue

    const fontRef = getChild(style, 'a:fontRef')
    if (!fontRef) continue

    const color = resolveSchemeColor(fontRef, theme)
    if (color) styleMap.set(phType, color)
  }
  return styleMap
}

const TITLE_PH_TYPES = new Set(['title', 'ctrTitle', 'subTitle'])
const BODY_PH_TYPES = new Set(['body', 'obj', 'dt', 'ftr', 'sldNum'])

function fixTextColorsFromStyle(
  slideXml: Document,
  elements: AnySlideElement[],
  theme: OoxmlTheme | undefined,
  layoutStyleMap?: Map<string, string>,
  masterTextStyles?: MasterTextStyles
) {
  const defaultDark = theme?.colors.get('dk1') || '#000000'
  const shapes = slideXml.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const sp = shapes[i]
    let fontColor: string | undefined

    const style = getChild(sp, 'p:style')
    if (style) {
      const fontRef = getChild(style, 'a:fontRef')
      if (fontRef) fontColor = resolveSchemeColor(fontRef, theme)
    }

    const phType = getPlaceholderType(sp)

    if (!fontColor && layoutStyleMap && phType) {
      fontColor = layoutStyleMap.get(phType)
    }

    if (!fontColor && masterTextStyles && phType) {
      if (TITLE_PH_TYPES.has(phType)) {
        fontColor = masterTextStyles.title
      } else if (BODY_PH_TYPES.has(phType)) {
        fontColor = masterTextStyles.body
      } else {
        fontColor = masterTextStyles.other || masterTextStyles.body
      }
    }

    if (!fontColor) continue

    const transform = extractTransform(sp)
    if (!transform) continue
    const sx = Math.round(emuToPixels(transform.x))
    const sy = Math.round(emuToPixels(transform.y))

    for (const el of elements) {
      if (el.type !== 'text') continue
      const te = el as AnySlideElement & { color?: string }
      const ex = Math.round(el.position.x)
      const ey = Math.round(el.position.y)

      if (Math.abs(ex - sx) < 5 && Math.abs(ey - sy) < 5) {
        if (!te.color || te.color === defaultDark || te.color === '#1e293b') {
          te.color = fontColor
        }
        break
      }
    }
  }
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

        const parsedSize = extractSlideSize(presentationXml)
        const canvasSize: SlideCanvasSize = parsedSize
          ? { width: parsedSize.width, height: parsedSize.height }
          : DEFAULT_SLIDE_CANVAS_SIZE

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
          slideData.canvasSize = canvasSize

          let layoutStyleMap: Map<string, string> | undefined
          let masterTextStyles: MasterTextStyles | undefined
          if (relationships.layoutPath) {
            const lf = zip.file(relationships.layoutPath)
            if (lf) {
              const lXml = parseXML(await lf.async('text'))
              layoutStyleMap = buildLayoutStyleMap(lXml, theme)

              const layoutRels = await resolveLayoutRelationships(zip, relationships.layoutPath)
              if (layoutRels.masterPath) {
                const mf = zip.file(layoutRels.masterPath)
                if (mf) {
                  const mXml = parseXML(await mf.async('text'))
                  masterTextStyles = extractMasterTextStyles(mXml, theme)
                }
              }
            }
          }
          fixTextColorsFromStyle(slideXml, slideData.elements, theme, layoutStyleMap, masterTextStyles)

          // Inherited (layout/master) elements are already merged inside
          // `assembleSlide`. Avoid re-merging here to prevent duplication.
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
            background: { type: 'solid', color: '#ffffff' },
            canvasSize
          })

          messages.push({
            type: 'warning',
            message: 'parser-no-slides-parsed'
          })
        }

        if (parsedSize) {
          messages.push({
            type: 'info',
            message: 'parser-slide-size-detected',
            params: {
              width: String(parsedSize.width),
              height: String(parsedSize.height),
              preset: parsedSize.preset
            }
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
          messages,
          canvasSize,
          slideSizePreset: parsedSize?.preset
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
