import type { SlideData, VideoElement } from '../../components/slideElements'
import { SlidesApiService } from '../../services/SlidesApiService'
import { parseOnlineVideoUrl } from '../../utils/onlineVideo'
import { replaceFileExtension, sanitizeUploadFileName } from '../../utils/videoImport'
import { captureVideoPreviewImage } from '../../utils/videoPreview'
import {
  createMediaFailurePlaceholderDataUrl,
  DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT,
  retryMediaUpload
} from './mediaHosting'
import { uploadSlideImages } from './uploadSlideImages'

const EMBEDDED_IMAGE_PREFIX = 'data:image/'
const EMBEDDED_VIDEO_PREFIX = 'data:video/'

export interface NormalizeImportedMediaWarnings {
  imageUploadFailures: number
  embeddedVideoUploadFailures: number
  videoPreviewFailures: number
  videoPreviewUploadFailures: number
}

export interface NormalizeImportedMediaOptions {
  imageFailurePlaceholderDataUrl?: string
  uploadRetryCount?: number
}

function buildImportedMediaFileName(
  source: string | undefined,
  fallbackStem: string,
  fallbackExtension: string
): string {
  const candidate = source?.trim()
  if (!candidate) return `${fallbackStem}.${fallbackExtension}`

  const withoutQuery = candidate.split(/[?#]/, 1)[0] || candidate
  const baseName = withoutQuery.split('/').pop() || withoutQuery
  const sanitized = sanitizeUploadFileName(baseName, `${fallbackStem}.${fallbackExtension}`)
  return /\.[A-Za-z0-9]+$/.test(sanitized) ? sanitized : `${sanitized}.${fallbackExtension}`
}

function isEmbeddedImage(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith(EMBEDDED_IMAGE_PREFIX)
}

function isEmbeddedVideo(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith(EMBEDDED_VIDEO_PREFIX)
}

async function uploadPreviewDataUrl(
  previewDataUrl: string,
  previewFileName: string,
  retryCount: number,
  warnings: NormalizeImportedMediaWarnings
): Promise<string | undefined> {
  try {
    return await retryMediaUpload(
      () => SlidesApiService.uploadImageFromBase64(previewDataUrl, previewFileName),
      retryCount
    )
  } catch (error) {
    warnings.videoPreviewUploadFailures++
    console.warn('[normalizeImportedSlideMedia] Failed to upload embedded video preview:', error)
    return undefined
  }
}

async function generateAndUploadPreview(
  sourceUrl: string,
  previewFileName: string,
  retryCount: number,
  warnings: NormalizeImportedMediaWarnings
): Promise<string | undefined> {
  const previewDataUrl = await captureVideoPreviewImage(sourceUrl)
  if (!previewDataUrl) {
    warnings.videoPreviewFailures++
    return undefined
  }

  return uploadPreviewDataUrl(previewDataUrl, previewFileName, retryCount, warnings)
}

async function normalizeVideoElement(
  element: VideoElement,
  slideIndex: number,
  elementIndex: number,
  retryCount: number,
  warnings: NormalizeImportedMediaWarnings
): Promise<VideoElement | null> {
  const next: VideoElement = { ...element }
  const mediaFileName = buildImportedMediaFileName(
    next.sourceUrl,
    `slide-${slideIndex + 1}-video-${elementIndex + 1}`,
    'mp4'
  )
  const previewFileName = replaceFileExtension(mediaFileName, 'jpg')

  if (next.videoKind === 'embed') {
    if (!next.previewImageUrl) {
      const parsedOnlineVideo = parseOnlineVideoUrl(next.sourceUrl || next.src)
      if (parsedOnlineVideo) next.previewImageUrl = parsedOnlineVideo.previewImageUrl
    }
    return next
  }

  let generatedPreviewDataUrl: string | undefined
  if (!next.previewImageUrl && isEmbeddedVideo(next.src)) {
    const previewDataUrl = await captureVideoPreviewImage(next.src)
    if (previewDataUrl) generatedPreviewDataUrl = previewDataUrl
    else warnings.videoPreviewFailures++
  }

  if (isEmbeddedVideo(next.src)) {
    try {
      const uploadedUrl = await retryMediaUpload(
        () => SlidesApiService.uploadDataUrl(next.src, mediaFileName, 'video/mp4'),
        retryCount
      )
      next.src = uploadedUrl
      next.sourceUrl = uploadedUrl
    } catch (error) {
      warnings.embeddedVideoUploadFailures++
      console.warn('[normalizeImportedSlideMedia] Failed to upload embedded video:', error)
      return null
    }
  }

  let previewUploadAttempted = false
  if (isEmbeddedImage(next.previewImageUrl)) {
    previewUploadAttempted = true
    next.previewImageUrl = await uploadPreviewDataUrl(next.previewImageUrl, previewFileName, retryCount, warnings)
  } else if (generatedPreviewDataUrl) {
    previewUploadAttempted = true
    next.previewImageUrl = await uploadPreviewDataUrl(generatedPreviewDataUrl, previewFileName, retryCount, warnings)
  }

  if (!next.previewImageUrl && !previewUploadAttempted) {
    next.previewImageUrl = await generateAndUploadPreview(
      next.sourceUrl || next.src,
      previewFileName,
      retryCount,
      warnings
    )
  }

  return next
}

export async function normalizeImportedSlideMedia(
  slides: SlideData[],
  options: NormalizeImportedMediaOptions = {}
): Promise<{
  slides: SlideData[]
  warnings: NormalizeImportedMediaWarnings
}> {
  const retryCount = options.uploadRetryCount ?? DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT
  const imageFailurePlaceholderDataUrl =
    options.imageFailurePlaceholderDataUrl ??
    createMediaFailurePlaceholderDataUrl({
      title: 'Image import failed',
      subtitle: 'Upload unavailable'
    })
  const warnings: NormalizeImportedMediaWarnings = {
    imageUploadFailures: 0,
    embeddedVideoUploadFailures: 0,
    videoPreviewFailures: 0,
    videoPreviewUploadFailures: 0
  }

  const uploadedImages = await uploadSlideImages(slides, {
    failurePlaceholderDataUrl: imageFailurePlaceholderDataUrl,
    retryCount
  })
  warnings.imageUploadFailures = uploadedImages.failedUploads

  const normalizedSlides: SlideData[] = []

  for (let slideIndex = 0; slideIndex < uploadedImages.slides.length; slideIndex++) {
    const slide = uploadedImages.slides[slideIndex]
    const nextElements = [] as typeof slide.elements

    for (let elementIndex = 0; elementIndex < slide.elements.length; elementIndex++) {
      const element = slide.elements[elementIndex]
      if (element.type !== 'video') {
        nextElements.push(element)
        continue
      }

      const normalizedVideo = await normalizeVideoElement(element, slideIndex, elementIndex, retryCount, warnings)
      if (normalizedVideo) nextElements.push(normalizedVideo)
    }

    normalizedSlides.push({ ...slide, elements: nextElements })
  }

  return { slides: normalizedSlides, warnings }
}
