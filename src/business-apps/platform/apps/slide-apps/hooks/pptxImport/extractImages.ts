// Extract image elements from slide XML using relationships and media data.

import type { ImageElement } from '../../components/slideElements'
import { createImageElement } from '../../components/slideElements'
import type { SlideRelationships } from './types'
import { emuToPixels, rotationToAngle, extractTransform, getChild, isInsideGroup } from './ooxmlUtils'

export function extractImageElements(
  slideXml: Document,
  relationships: SlideRelationships,
  imageData: Map<string, string>
): ImageElement[] {
  const elements: ImageElement[] = []
  const pics = slideXml.getElementsByTagName('p:pic')

  for (let i = 0; i < pics.length; i++) {
    const pic = pics[i]

    if (isInsideGroup(pic)) continue

    const transform = extractTransform(pic)
    if (!transform) continue

    const blipFill = getChild(pic, 'p:blipFill')
    if (!blipFill) continue

    const blip = getChild(blipFill, 'a:blip')
    if (!blip) continue

    const relId =
      blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ||
      blip.getAttribute('r:embed')

    if (!relId) continue

    const imagePath = relationships.images.get(relId)
    if (!imagePath) continue

    const imageName = imagePath.split('/').pop()
    const imageBase64 = imageName ? imageData.get(imageName) : undefined
    if (!imageBase64) continue

    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)

    elements.push(
      createImageElement(imageBase64, {
        id: `image-import-${Date.now()}-${i}`,
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: { width: Math.max(20, width), height: Math.max(20, height) },
        rotation: rotationToAngle(transform.rotation)
      })
    )
  }

  return elements
}
