// Assemble a single SlideData by walking <p:spTree> children in document
// order, which matches PowerPoint's visual stacking (later = on top).

import type JSZip from 'jszip'
import type { SlideData, AnySlideElement } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { extractTextElements } from './extractText'
import { extractShapeElements } from './extractShapes'
import { extractImageElements } from './extractImages'
import { extractTableElements } from './extractTables'
import { extractChartElements } from './extractCharts'
import { extractBackgroundWithInheritance } from './extractBackground'
import { extractNotes } from './extractNotes'
import { extractTransition } from './extractTransitions'
import { flattenGroupedShapes } from './flattenGroups'
import { getChild, parseXML } from './ooxmlUtils'
import { resolveLayoutRelationships, resolveMasterRelationships } from './resolveRelationships'

const SP_TREE_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const FAKE_DOC_SHELL = `<p:sld xmlns:p="${SP_TREE_NS}" xmlns:a="${DRAWING_NS}" xmlns:r="${RELS_NS}"><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>`

function wrapInFakeDoc(element: Element): Document {
  const doc = new DOMParser().parseFromString(FAKE_DOC_SHELL, 'text/xml')
  const spTree = doc.getElementsByTagName('p:spTree')[0]
  spTree.appendChild(doc.importNode(element, true))
  return doc
}

function isPlaceholder(spEl: Element): boolean {
  const nvSpPr = getChild(spEl, 'p:nvSpPr')
  if (!nvSpPr) return false
  const nvPr = getChild(nvSpPr, 'p:nvPr')
  if (!nvPr) return false
  return !!getChild(nvPr, 'p:ph')
}

function extractNonPlaceholderElements(
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

      const doc = wrapInFakeDoc(child)
      const texts = extractTextElements(doc, theme, rels)
      if (texts.length > 0) {
        result.push(...texts)
      } else {
        const shapes = extractShapeElements(doc, theme, messages, slideIndex)
        result.push(...shapes)
      }
    } else if (child.tagName === 'p:pic') {
      const doc = wrapInFakeDoc(child)
      result.push(...extractImageElements(doc, rels, imageData))
    } else if (child.tagName === 'p:grpSp') {
      const groupEls = flattenGroupedShapes(xml, theme, rels, imageData, messages, slideIndex, child)
      result.push(...groupEls)
    }
  }

  return result
}

async function extractInheritedElements(
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

  const layoutEls = extractNonPlaceholderElements(
    layoutXml,
    layoutRelationships,
    imageData,
    theme,
    messages,
    slideIndex
  )
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
      const masterEls = extractNonPlaceholderElements(
        masterXml,
        masterRelationships,
        imageData,
        theme,
        messages,
        slideIndex
      )
      inherited.push(...masterEls)
    }
  }

  return inherited
}

export async function assembleSlide(
  slideXml: Document,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  theme: OoxmlTheme | undefined,
  zip: JSZip,
  slideIndex: number,
  messages: ParserMessage[]
): Promise<SlideData> {
  const background = await extractBackgroundWithInheritance(slideXml, theme, relationships, imageData, zip)
  const notes = await extractNotes(zip, relationships)
  const transition = extractTransition(slideXml, messages, slideIndex)

  const inheritedElements = await extractInheritedElements(zip, relationships, imageData, theme, messages, slideIndex)

  const spTree = slideXml.getElementsByTagName('p:spTree')[0]
  const slideElements: AnySlideElement[] = []

  if (spTree) {
    for (let i = 0; i < spTree.childNodes.length; i++) {
      const child = spTree.childNodes[i] as Element
      if (!child.tagName) continue

      switch (child.tagName) {
        case 'p:sp': {
          const doc = wrapInFakeDoc(child)
          const texts = extractTextElements(doc, theme, relationships)
          if (texts.length > 0) {
            slideElements.push(...texts)
          } else {
            const shapes = extractShapeElements(doc, theme, messages, slideIndex)
            slideElements.push(...shapes)
          }
          break
        }

        case 'p:pic': {
          const doc = wrapInFakeDoc(child)
          const images = extractImageElements(doc, relationships, imageData)
          slideElements.push(...images)
          break
        }

        case 'p:graphicFrame': {
          const graphic = getChild(child, 'a:graphic')
          const graphicData = graphic ? getChild(graphic, 'a:graphicData') : undefined
          const uri = graphicData?.getAttribute('uri') || ''

          const doc = wrapInFakeDoc(child)
          if (uri.includes('table')) {
            slideElements.push(...extractTableElements(doc, theme, messages, slideIndex))
          } else if (uri.includes('chart')) {
            slideElements.push(...(await extractChartElements(doc, relationships, zip, messages, slideIndex)))
          }
          break
        }

        case 'p:grpSp': {
          const groupEls = flattenGroupedShapes(slideXml, theme, relationships, imageData, messages, slideIndex, child)
          slideElements.push(...groupEls)
          break
        }
      }
    }
  }

  const allElements = [...inheritedElements, ...slideElements]
  allElements.forEach((el, idx) => {
    el.zIndex = idx + 1
  })

  return {
    id: `slide-${Date.now()}-${slideIndex}`,
    elements: allElements,
    background,
    notes: notes || undefined,
    transition
  }
}
