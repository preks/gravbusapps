// Extract slide background, inheriting from layout/master if the slide
// doesn't define its own.

import type JSZip from 'jszip'
import type { SlideBackground, GradientConfig } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import { getChild, parseSolidFill, parseGradientFill, resolveColor, parseXML } from './ooxmlUtils'
import { resolveLayoutRelationships, resolveMasterRelationships, resolveMediaData } from './resolveRelationships'

function resolveBgRefFromTheme(
  themeXml: Document | undefined,
  idx: number,
  theme: OoxmlTheme | undefined
): SlideBackground | null {
  if (!themeXml || idx <= 0) return null

  const bgFillLst = themeXml.getElementsByTagName('a:bgFillStyleLst')[0]
  if (!bgFillLst) return null

  const fills: Element[] = []
  for (let i = 0; i < bgFillLst.childNodes.length; i++) {
    const child = bgFillLst.childNodes[i] as Element
    if (child.nodeType === 1) fills.push(child)
  }

  const fillIdx = idx >= 1001 ? idx - 1001 : idx - 1
  const fillEl = fills[fillIdx]
  if (!fillEl) return null

  if (fillEl.tagName === 'a:solidFill') {
    const color = parseSolidFill(fillEl, theme)
    return color ? { type: 'solid', color } : null
  }

  if (fillEl.tagName === 'a:gradFill') {
    const gradient = parseGradientFill(fillEl, theme)
    if (gradient) return { type: 'gradient', gradient: gradient as GradientConfig }
  }

  return null
}

function extractBgFromXml(
  doc: Document,
  theme: OoxmlTheme | undefined,
  imageRels: Map<string, string>,
  imageData: Map<string, string>,
  themeXml?: Document
): SlideBackground | null {
  const cSld = doc.getElementsByTagName('p:cSld')[0]
  if (!cSld) return null

  const bg = getChild(cSld, 'p:bg')
  if (!bg) return null

  const bgPr = getChild(bg, 'p:bgPr')
  if (bgPr) {
    const solidFill = getChild(bgPr, 'a:solidFill')
    if (solidFill) {
      const color = parseSolidFill(solidFill, theme)
      return { type: 'solid', color: color || '#ffffff' }
    }

    const gradFill = getChild(bgPr, 'a:gradFill')
    if (gradFill) {
      const gradient = parseGradientFill(gradFill, theme)
      if (gradient) {
        return { type: 'gradient', gradient: gradient as GradientConfig }
      }
    }

    const blipFill = getChild(bgPr, 'a:blipFill')
    if (blipFill) {
      const blip = getChild(blipFill, 'a:blip')
      if (blip) {
        const relId =
          blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ||
          blip.getAttribute('r:embed')

        if (relId) {
          const imagePath = imageRels.get(relId)
          if (imagePath) {
            const imageBase64 = resolveMediaData(imagePath, imageData)
            if (imageBase64) {
              return { type: 'image', imageUrl: imageBase64 }
            }
          }
        }
      }
    }
  }

  const bgRef = getChild(bg, 'p:bgRef')
  if (bgRef) {
    const idx = parseInt(bgRef.getAttribute('idx') || '0')
    if (themeXml && idx > 0) {
      const themeBg = resolveBgRefFromTheme(themeXml, idx, theme)
      if (themeBg) return themeBg
    }
    const color = resolveColor(bgRef, theme)
    if (color) return { type: 'solid', color }
  }

  return null
}

export function extractBackground(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  imageData: Map<string, string>
): SlideBackground {
  return extractBgFromXml(slideXml, theme, relationships.images, imageData) || { type: 'solid', color: '#ffffff' }
}

export async function extractBackgroundWithInheritance(
  slideXml: Document,
  theme: OoxmlTheme | undefined,
  relationships: SlideRelationships,
  imageData: Map<string, string>,
  zip: JSZip
): Promise<SlideBackground> {
  const themeFile = zip.file('ppt/theme/theme1.xml')
  const themeXml = themeFile ? parseXML(await themeFile.async('text')) : undefined

  const slideBg = extractBgFromXml(slideXml, theme, relationships.images, imageData, themeXml)
  if (slideBg) return slideBg

  if (relationships.layoutPath) {
    const layoutFile = zip.file(relationships.layoutPath)
    if (layoutFile) {
      const layoutContent = await layoutFile.async('text')
      const layoutXml = parseXML(layoutContent)
      const layoutRels = await resolveLayoutRelationships(zip, relationships.layoutPath)
      const layoutBg = extractBgFromXml(layoutXml, theme, layoutRels.images, imageData, themeXml)
      if (layoutBg) return layoutBg

      if (layoutRels.masterPath) {
        const masterFile = zip.file(layoutRels.masterPath)
        if (masterFile) {
          const masterContent = await masterFile.async('text')
          const masterXml = parseXML(masterContent)
          const masterRels = await resolveMasterRelationships(zip, layoutRels.masterPath)
          const masterBg = extractBgFromXml(masterXml, theme, masterRels.images, imageData, themeXml)
          if (masterBg) return masterBg
        }
      }
    }
  }

  return { type: 'solid', color: '#ffffff' }
}
