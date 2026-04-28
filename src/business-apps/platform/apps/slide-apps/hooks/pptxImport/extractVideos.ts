import type { VideoElement } from '../../components/slideElements'
import { createVideoElement } from '../../components/slideElements'
import type { SlideRelationships } from './types'
import type { ParserMessage } from '../usePowerPointParser'
import { emuToPixels, rotationToAngle, extractTransform, getChild, isInsideGroup, nextImportUid } from './ooxmlUtils'
import { resolveImportedImageUrl, resolveImportedVideoUrl } from './resolveRelationships'
import { parseOnlineVideoUrl } from '../../utils/onlineVideo'
import { looksLikeDirectVideoUrl } from '../../utils/videoImport'

const RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const P14_NS = 'http://schemas.microsoft.com/office/powerpoint/2010/main'

function findEmbeddedMediaRelId(pic: Element): string | undefined {
  const nvPicPr = getChild(pic, 'p:nvPicPr')
  const nvPr = nvPicPr ? getChild(nvPicPr, 'p:nvPr') : undefined
  if (!nvPr) return undefined

  const stack = Array.from(nvPr.childNodes)
  while (stack.length > 0) {
    const node = stack.shift() as Element | undefined
    if (!node || node.nodeType !== 1) continue

    const localName = (node.localName || node.nodeName.split(':').pop() || '').toLowerCase()
    const namespace = node.namespaceURI || ''
    if (localName === 'media' && (namespace === P14_NS || namespace === '' || !namespace)) {
      const embed = node.getAttributeNS(RELS_NS, 'embed') || node.getAttribute('r:embed')
      if (embed) return embed
    }

    stack.push(...Array.from(node.childNodes))
  }

  return undefined
}

function getLinkedVideoInfo(pic: Element): { relId?: string; contentType?: string } {
  const nvPicPr = getChild(pic, 'p:nvPicPr')
  const nvPr = nvPicPr ? getChild(nvPicPr, 'p:nvPr') : undefined
  const videoFile = nvPr ? getChild(nvPr, 'a:videoFile') : undefined
  if (!videoFile) return {}

  return {
    relId:
      videoFile.getAttributeNS(RELS_NS, 'link') ||
      videoFile.getAttribute('r:link') ||
      videoFile.getAttributeNS(RELS_NS, 'embed') ||
      videoFile.getAttribute('r:embed') ||
      undefined,
    contentType: videoFile.getAttribute('contentType') || undefined
  }
}

function getPreviewImageUrl(
  pic: Element,
  relationships: SlideRelationships,
  mediaData: Map<string, string>
): string | undefined {
  const blipFill = getChild(pic, 'p:blipFill')
  const blip = blipFill ? getChild(blipFill, 'a:blip') : undefined
  if (!blip) return undefined

  const previewRelId =
    blip.getAttributeNS(RELS_NS, 'embed') ||
    blip.getAttribute('r:embed') ||
    blip.getAttributeNS(RELS_NS, 'link') ||
    blip.getAttribute('r:link')

  if (!previewRelId) return undefined

  return resolveImportedImageUrl(relationships.images.get(previewRelId), mediaData)
}

function isLikelyLinkedVideoSource(url: string, contentType?: string): boolean {
  if (parseOnlineVideoUrl(url)) return true
  if (looksLikeDirectVideoUrl(url)) return true
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('video/')
}

export function extractVideoElements(
  slideXml: Document,
  relationships: SlideRelationships,
  mediaData: Map<string, string>,
  messages?: ParserMessage[],
  slideIndex?: number
): VideoElement[] {
  const elements: VideoElement[] = []
  const pics = slideXml.getElementsByTagName('p:pic')
  const slideNumber = typeof slideIndex === 'number' ? String(slideIndex + 1) : undefined
  const videoRelationships = relationships.videos ?? new Map<string, string>()

  for (const pic of Array.from(pics)) {
    if (isInsideGroup(pic)) continue

    const transform = extractTransform(pic)
    if (!transform) continue

    const embeddedRelId = findEmbeddedMediaRelId(pic)
    const linkedVideo = getLinkedVideoInfo(pic)
    const videoRelId = embeddedRelId || linkedVideo.relId
    if (!videoRelId) continue

    const rawSource = videoRelationships.get(videoRelId)
    if (!rawSource) {
      if (messages && slideNumber) {
        messages.push({
          type: 'warning',
          message: 'parser-video-missing',
          params: { slide: slideNumber }
        })
      }
      continue
    }

    const previewImageUrl = getPreviewImageUrl(pic, relationships, mediaData)
    const x = emuToPixels(transform.x)
    const y = emuToPixels(transform.y)
    const width = emuToPixels(transform.cx)
    const height = emuToPixels(transform.cy)
    const basePartial = {
      id: nextImportUid('video-import'),
      position: { x: Math.max(0, x), y: Math.max(0, y) },
      size: { width: Math.max(50, width), height: Math.max(30, height) },
      rotation: rotationToAngle(transform.rotation),
      previewImageUrl,
      autoplay: false,
      muted: true
    } satisfies Partial<VideoElement>

    if (embeddedRelId) {
      const embeddedUrl = resolveImportedVideoUrl(rawSource, mediaData)
      if (!embeddedUrl) {
        if (messages && slideNumber) {
          messages.push({
            type: 'warning',
            message: 'parser-video-missing',
            params: { slide: slideNumber }
          })
        }
        continue
      }

      elements.push(
        createVideoElement(embeddedUrl, {
          ...basePartial,
          src: embeddedUrl,
          sourceUrl: rawSource,
          videoKind: 'file',
          loop: true
        })
      )
      continue
    }

    const externalUrl = resolveImportedVideoUrl(rawSource, mediaData)
    if (!externalUrl || !isLikelyLinkedVideoSource(externalUrl, linkedVideo.contentType)) {
      if (messages && slideNumber) {
        messages.push({
          type: 'warning',
          message: 'parser-video-linked-unsupported',
          params: { slide: slideNumber }
        })
      }
      continue
    }

    const parsedOnlineVideo = parseOnlineVideoUrl(externalUrl)
    if (parsedOnlineVideo) {
      elements.push(
        createVideoElement(parsedOnlineVideo.embedUrl, {
          ...basePartial,
          src: parsedOnlineVideo.embedUrl,
          sourceUrl: parsedOnlineVideo.sourceUrl,
          embedUrl: parsedOnlineVideo.embedUrl,
          previewImageUrl: previewImageUrl || parsedOnlineVideo.previewImageUrl,
          provider: parsedOnlineVideo.provider,
          videoKind: 'embed',
          loop: false
        })
      )
      continue
    }

    const normalizedSourceUrl = externalUrl.startsWith('data:video/') ? rawSource : externalUrl
    elements.push(
      createVideoElement(externalUrl, {
        ...basePartial,
        src: externalUrl,
        sourceUrl: normalizedSourceUrl,
        videoKind: 'file',
        loop: true
      })
    )
  }

  return elements
}
