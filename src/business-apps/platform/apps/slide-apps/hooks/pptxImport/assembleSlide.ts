// Assemble a single SlideData by walking <p:spTree> children in document
// order, which matches PowerPoint's visual stacking (later = on top).

import type JSZip from 'jszip'
import type { SlideData, AnySlideElement, ConnectorElement } from '../../components/slideElements'
import { refreshConnectorFromBindings } from '../../components/shapeOperations'
import type { OoxmlTheme, SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { extractPSpToSingleElement, type OoxmlShapeIdRegistry } from './extractShapes'
import { extractImageElements } from './extractImages'
import { extractTableElements } from './extractTables'
import { extractChartElements } from './extractCharts'
import { extractConnectorElements } from './extractConnectors'
import { extractBackgroundWithInheritance } from './extractBackground'
import { extractNotes } from './extractNotes'
import { extractTransition } from './extractTransitions'
import { flattenGroupedShapes } from './flattenGroups'
import { getChild, parseXML } from './ooxmlUtils'
import { resolveLayoutRelationships, resolveMasterRelationships } from './resolveRelationships'
import { collectPlaceholders, inheritPlaceholderFromLayout, type PlaceholderMap } from './resolvePlaceholders'
import {
  buildInheritedTextDefaultsResolver,
  extractMasterTextStylesAdvanced,
  extractPlaceholderStyles,
  type InheritedTextDefaultsResolver
} from './extractInheritedTextDefaults'

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
  slideIndex: number,
  inheritedResolver?: InheritedTextDefaultsResolver
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
      const el = extractPSpToSingleElement(doc, theme, rels, messages, slideIndex, inheritedResolver)
      if (el) result.push(el)
    } else if (child.tagName === 'p:pic') {
      const doc = wrapInFakeDoc(child)
      result.push(...extractImageElements(doc, rels, imageData, messages, slideIndex))
    } else if (child.tagName === 'p:grpSp') {
      const groupEls = flattenGroupedShapes(xml, theme, rels, imageData, messages, slideIndex, child)
      result.push(...groupEls)
    }
  }

  return result
}

interface InheritedContext {
  elements: AnySlideElement[]
  layoutPlaceholders?: PlaceholderMap
  masterPlaceholders?: PlaceholderMap
  textDefaultsResolver?: InheritedTextDefaultsResolver
}

async function extractInheritedElements(
  zip: JSZip,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  theme: OoxmlTheme | undefined,
  messages: ParserMessage[],
  slideIndex: number
): Promise<InheritedContext> {
  const inherited: AnySlideElement[] = []
  if (!relationships.layoutPath) return { elements: inherited }

  const layoutFile = zip.file(relationships.layoutPath)
  if (!layoutFile) return { elements: inherited }

  const layoutXml = parseXML(await layoutFile.async('text'))
  const layoutRels = await resolveLayoutRelationships(zip, relationships.layoutPath)

  const layoutRelationships: SlideRelationships = {
    images: layoutRels.images,
    hyperlinks: new Map(),
    chartPaths: new Map()
  }

  const layoutPlaceholders = collectPlaceholders(layoutXml)
  let masterPlaceholders: PlaceholderMap | undefined
  let textDefaultsResolver: InheritedTextDefaultsResolver | undefined

  const layoutStyles = extractPlaceholderStyles(layoutXml, theme)

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

      const masterStyles = extractPlaceholderStyles(masterXml, theme)
      const masterTxStyles = extractMasterTextStylesAdvanced(masterXml, theme)
      textDefaultsResolver = buildInheritedTextDefaultsResolver(layoutStyles, masterStyles, masterTxStyles)

      // Master first (rendered underneath), then layout, so z-order matches
      // PowerPoint's stack. We run these *after* building the resolver so
      // inherited text defaults already apply to the inherited elements too.
      const masterEls = extractNonPlaceholderElements(
        masterXml,
        masterRelationships,
        imageData,
        theme,
        messages,
        slideIndex,
        textDefaultsResolver
      )
      inherited.push(...masterEls)
      masterPlaceholders = collectPlaceholders(masterXml)
    }
  }

  if (!textDefaultsResolver) {
    textDefaultsResolver = buildInheritedTextDefaultsResolver(layoutStyles, undefined, undefined)
  }

  const layoutEls = extractNonPlaceholderElements(
    layoutXml,
    layoutRelationships,
    imageData,
    theme,
    messages,
    slideIndex,
    textDefaultsResolver
  )
  inherited.push(...layoutEls)

  return { elements: inherited, layoutPlaceholders, masterPlaceholders, textDefaultsResolver }
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

  const inheritedContext = await extractInheritedElements(zip, relationships, imageData, theme, messages, slideIndex)
  const inheritedElements = inheritedContext.elements

  const spTree = slideXml.getElementsByTagName('p:spTree')[0]
  const slideElements: AnySlideElement[] = []
  // OOXML shape ids are unique within a slide and referenced by connectors
  // via `<a:stCxn id="…">` / `<a:endCxn id="…">`. We build the registry
  // while walking the spTree so connectors processed later in the pass can
  // resolve binding targets without a second traversal.
  const shapeIdRegistry: OoxmlShapeIdRegistry = new Map()

  if (spTree) {
    for (let i = 0; i < spTree.childNodes.length; i++) {
      const child = spTree.childNodes[i] as Element
      if (!child.tagName) continue

      switch (child.tagName) {
        case 'p:sp': {
          // Resolve placeholder inheritance BEFORE extraction so slide-level
          // placeholders that omit transform/text get their layout defaults.
          if (isPlaceholder(child) && inheritedContext.layoutPlaceholders) {
            inheritPlaceholderFromLayout(
              child,
              inheritedContext.layoutPlaceholders,
              inheritedContext.masterPlaceholders
            )
          }
          const doc = wrapInFakeDoc(child)
          const el = extractPSpToSingleElement(
            doc,
            theme,
            relationships,
            messages,
            slideIndex,
            inheritedContext.textDefaultsResolver,
            shapeIdRegistry
          )
          if (el) slideElements.push(el)
          break
        }

        case 'p:pic': {
          const doc = wrapInFakeDoc(child)
          const images = extractImageElements(doc, relationships, imageData, messages, slideIndex)
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

        case 'p:cxnSp': {
          const doc = wrapInFakeDoc(child)
          const connectors = extractConnectorElements(doc, theme, shapeIdRegistry)
          slideElements.push(...connectors)
          break
        }
      }
    }
  }

  const allElements = [...inheritedElements, ...slideElements]

  // Once every shape is known, snap connector endpoints to their bindings.
  // This re-uses the same runtime helper that keeps connectors glued as
  // shapes are moved in the editor, so an imported deck starts in exactly
  // the same state it would reach after a no-op edit — ensuring deterministic
  // geometry even when the OOXML xfrm on the connector was a stale cache.
  const elementsById = new Map<string, AnySlideElement>(allElements.map(el => [el.id, el]))
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i]
    if (el.type !== 'connector') continue
    const refreshed = refreshConnectorFromBindings(el as ConnectorElement, elementsById)
    if (refreshed !== el) {
      allElements[i] = refreshed as AnySlideElement
      elementsById.set(refreshed.id, refreshed as AnySlideElement)
    }
  }

  allElements.forEach((el, idx) => {
    el.zIndex = idx + 1
  })

  const source: SlideData['source'] = { sourceFormat: 'pptx' }
  if (relationships.layoutPath) {
    source.layoutName = relationships.layoutPath.split('/').pop()?.replace('.xml', '')
  }

  return {
    id: `slide-${Date.now()}-${slideIndex}`,
    elements: allElements,
    background,
    notes: notes || undefined,
    transition,
    source
  }
}
