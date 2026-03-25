// Extract slide background, inheriting from layout/master if the slide
// doesn't define its own.

import type JSZip from 'jszip'
import type { SlideBackground, GradientConfig } from '../../components/slideElements'
import type { OoxmlTheme, SlideRelationships } from './types'
import { getChild, parseSolidFill, parseGradientFill, resolveColor, parseXML } from './ooxmlUtils'
import { resolveLayoutRelationships, resolveMasterRelationships } from './resolveRelationships'

function extractBgFromXml(
  doc: Document,
  theme: OoxmlTheme | undefined,
  imageRels: Map<string, string>,
  imageData: Map<string, string>
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
            const imageName = imagePath.split('/').pop()
            const imageBase64 = imageName ? imageData.get(imageName) : undefined
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
  const slideBg = extractBgFromXml(slideXml, theme, relationships.images, imageData)
  if (slideBg) return slideBg

  // Try slide layout
  if (relationships.layoutPath) {
    const layoutFile = zip.file(relationships.layoutPath)
    if (layoutFile) {
      const layoutContent = await layoutFile.async('text')
      const layoutXml = parseXML(layoutContent)
      const layoutRels = await resolveLayoutRelationships(zip, relationships.layoutPath)
      const layoutBg = extractBgFromXml(layoutXml, theme, layoutRels.images, imageData)
      if (layoutBg) return layoutBg

      // Try slide master
      if (layoutRels.masterPath) {
        const masterFile = zip.file(layoutRels.masterPath)
        if (masterFile) {
          const masterContent = await masterFile.async('text')
          const masterXml = parseXML(masterContent)
          const masterRels = await resolveMasterRelationships(zip, layoutRels.masterPath)
          const masterBg = extractBgFromXml(masterXml, theme, masterRels.images, imageData)
          if (masterBg) return masterBg
        }
      }
    }
  }

  return { type: 'solid', color: '#ffffff' }
}
