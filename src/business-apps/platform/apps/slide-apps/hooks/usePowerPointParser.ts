// Orchestrator hook for parsing PowerPoint (.pptx) files.
// Delegates to pure extraction functions in pptxImport/.

import { useState, useCallback } from 'react'
import JSZip from 'jszip'
import type { SlideData } from '../components/slideElements'
import { createTextElement } from '../components/slideElements'
import type { AnySlideElement } from '../components/slideElements'
import { parseXML, getChild, emuToPixels, extractTransform } from './pptxImport/ooxmlUtils'
import { extractTheme, mapThemeToSlideThemeId } from './pptxImport/extractTheme'
import {
  extractAllMedia,
  resolveSlideRelationships,
  resolveLayoutRelationships,
  resolveMasterRelationships
} from './pptxImport/resolveRelationships'
import { assembleSlide } from './pptxImport/assembleSlide'
import { extractTextElements } from './pptxImport/extractText'
import { extractShapeElements } from './pptxImport/extractShapes'
import { extractImageElements } from './pptxImport/extractImages'
import { flattenGroupedShapes } from './pptxImport/flattenGroups'
import type { OoxmlTheme, SlideRelationships } from './pptxImport/types'

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

const SP_TREE_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const FAKE_DOC = `<p:sld xmlns:p="${SP_TREE_NS}" xmlns:a="${DRAWING_NS}" xmlns:r="${RELS_NS}"><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>`

function wrapElement(element: Element): Document {
  const doc = new DOMParser().parseFromString(FAKE_DOC, 'text/xml')
  const spTree = doc.getElementsByTagName('p:spTree')[0]
  spTree.appendChild(doc.importNode(element, true))
  return doc
}

function isPlaceholder(el: Element): boolean {
  const nvSpPr = getChild(el, 'p:nvSpPr')
  if (!nvSpPr) return false
  const nvPr = getChild(nvSpPr, 'p:nvPr')
  if (!nvPr) return false
  return !!getChild(nvPr, 'p:ph')
}

function extractNonPlaceholderEls(
  xml: Document,
  rels: SlideRelationships,
  imageData: Map<string, string>,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number
): AnySlideElement[] {
  const result: AnySlideElement[] = []
  const spTree = xml.getElementsByTagName('p:spTree')[0]
  if (!spTree) return result

  for (let i = 0; i < spTree.childNodes.length; i++) {
    const child = spTree.childNodes[i] as Element
    if (!child.tagName) continue

    if (child.tagName === 'p:sp') {
      if (isPlaceholder(child)) continue
      const doc = wrapElement(child)
      const texts = extractTextElements(doc, theme, rels)
      if (texts.length > 0) {
        result.push(...texts)
      } else {
        const shapes = extractShapeElements(doc, theme, messages, slideIndex)
        result.push(...shapes)
      }
    } else if (child.tagName === 'p:pic') {
      const doc = wrapElement(child)
      result.push(...extractImageElements(doc, rels, imageData))
    } else if (child.tagName === 'p:grpSp') {
      const groupEls = flattenGroupedShapes(xml, theme, rels, imageData, messages, slideIndex, child)
      result.push(...groupEls)
    }
  }
  return result
}

async function getInheritedElements(
  zip: JSZip,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number
): Promise<AnySlideElement[]> {
  const inherited: AnySlideElement[] = []
  if (!relationships.layoutPath) return inherited

  const layoutFile = zip.file(relationships.layoutPath)
  if (!layoutFile) return inherited

  const layoutXml = parseXML(await layoutFile.async('text'))
  const layoutRels = await resolveLayoutRelationships(zip, relationships.layoutPath)
  const layoutRelationships: SlideRelationships = {
    images: layoutRels.images,
    hyperlinks: new Map(),
    chartPaths: new Map()
  }
  const layoutEls = extractNonPlaceholderEls(layoutXml, layoutRelationships, imageData, theme, messages, slideIndex)
  fixTextColorsFromStyle(layoutXml, layoutEls, theme)
  inherited.push(...layoutEls)

  if (layoutRels.masterPath) {
    const masterFile = zip.file(layoutRels.masterPath)
    if (masterFile) {
      const masterXml = parseXML(await masterFile.async('text'))
      const masterRels = await resolveMasterRelationships(zip, layoutRels.masterPath)
      const masterRelationships: SlideRelationships = {
        images: masterRels.images,
        hyperlinks: new Map(),
        chartPaths: new Map()
      }
      const masterEls = extractNonPlaceholderEls(masterXml, masterRelationships, imageData, theme, messages, slideIndex)
      fixTextColorsFromStyle(masterXml, masterEls, theme)
      inherited.push(...masterEls)
    }
  }
  return inherited
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

          const inherited = await getInheritedElements(zip, relationships, imageData, theme, messages, i)
          if (inherited.length > 0) {
            const combined = [...inherited, ...slideData.elements]
            combined.forEach((el, idx) => {
              el.zIndex = idx + 1
            })
            slideData.elements = combined
          }

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
