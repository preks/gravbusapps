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
import { getChild } from './ooxmlUtils'

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

  slideElements.forEach((el, idx) => {
    el.zIndex = idx + 1
  })

  return {
    id: `slide-${Date.now()}-${slideIndex}`,
    elements: slideElements,
    background,
    notes: notes || undefined,
    transition
  }
}
