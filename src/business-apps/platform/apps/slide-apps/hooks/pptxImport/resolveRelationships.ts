// Resolve OOXML relationship files into typed maps.

import type JSZip from 'jszip'
import type { SlideRelationships } from './types'
import { parseXML } from './ooxmlUtils'

const REL_TYPE_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
const REL_TYPE_HYPERLINK = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'
const REL_TYPE_NOTES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide'
const REL_TYPE_CHART = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
const REL_TYPE_SLIDE_LAYOUT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout'
const REL_TYPE_SLIDE_MASTER = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster'

function normalizeRelTarget(target: string, baseDir: string): string {
  if (target.startsWith('../')) {
    const parts = baseDir.replace(/\/$/, '').split('/')
    parts.pop()
    return parts.join('/') + '/' + target.replace('../', '')
  }
  if (target.startsWith('ppt/')) return target
  return baseDir + target
}

export async function resolveSlideRelationships(zip: JSZip, slideNumber: number): Promise<SlideRelationships> {
  const result: SlideRelationships = {
    images: new Map(),
    hyperlinks: new Map(),
    chartPaths: new Map()
  }

  const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return result

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i]
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''

    if (!id) continue

    const normalizedTarget = normalizeRelTarget(target, 'ppt/slides/')

    switch (type) {
      case REL_TYPE_IMAGE:
        result.images.set(id, normalizedTarget)
        break
      case REL_TYPE_HYPERLINK:
        result.hyperlinks.set(id, target)
        break
      case REL_TYPE_NOTES:
        result.notesSlidePath = normalizedTarget
        break
      case REL_TYPE_CHART:
        result.chartPaths.set(id, normalizedTarget)
        break
      case REL_TYPE_SLIDE_LAYOUT:
        result.layoutPath = normalizedTarget
        break
    }
  }

  return result
}

export async function resolveLayoutRelationships(
  zip: JSZip,
  layoutPath: string
): Promise<{ images: Map<string, string>; masterPath?: string }> {
  const images = new Map<string, string>()
  let masterPath: string | undefined

  const fileName = layoutPath.split('/').pop() || ''
  const relsPath = `ppt/slideLayouts/_rels/${fileName}.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return { images }

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i]
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''
    if (!id) continue

    const normalizedTarget = normalizeRelTarget(target, 'ppt/slideLayouts/')

    if (type === REL_TYPE_IMAGE) {
      images.set(id, normalizedTarget)
    } else if (type === REL_TYPE_SLIDE_MASTER) {
      masterPath = normalizedTarget
    }
  }

  return { images, masterPath }
}

export async function resolveMasterRelationships(
  zip: JSZip,
  masterPath: string
): Promise<{ images: Map<string, string> }> {
  const images = new Map<string, string>()

  const fileName = masterPath.split('/').pop() || ''
  const relsPath = `ppt/slideMasters/_rels/${fileName}.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return { images }

  const relsContent = await relsFile.async('text')
  const relsXml = parseXML(relsContent)
  const rels = relsXml.getElementsByTagName('Relationship')

  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i]
    const id = rel.getAttribute('Id')
    const target = rel.getAttribute('Target') || ''
    const type = rel.getAttribute('Type') || ''
    if (!id) continue

    if (type === REL_TYPE_IMAGE) {
      images.set(id, normalizeRelTarget(target, 'ppt/slideMasters/'))
    }
  }

  return { images }
}

const EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf'
}

export async function extractAllMedia(zip: JSZip): Promise<Map<string, string>> {
  const images = new Map<string, string>()
  const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'))

  for (const fileName of mediaFiles) {
    const file = zip.files[fileName]
    if (file && !file.dir) {
      try {
        const imageName = fileName.split('/').pop() || ''
        const ext = imageName.split('.').pop()?.toLowerCase() || ''
        const mime = EXTENSION_MIME[ext] || 'application/octet-stream'

        const arrayBuf = await file.async('arraybuffer')
        const typedBlob = new Blob([arrayBuf], { type: mime })
        const base64 = await blobToBase64(typedBlob)
        images.set(imageName, base64)
      } catch {
        // Skip unreadable media files
      }
    }
  }

  return images
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
