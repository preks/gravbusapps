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
  onProgress?: (progress: NormalizeImportedMediaProgress) => void
}

export interface NormalizeImportedMediaProgress {
  phase: 'uploading-images' | 'processing-videos'
  current: number
  total: number
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

interface NormalizeImportedMediaCaches {
  uploadedVideos: Map<string, Promise<string>>
  uploadedPreviews: Map<string, Promise<string>>
  generatedPreviewDataUrls: Map<string, Promise<string | undefined>>
}

function getOrCreateCachedResult<T>(cache: Map<string, Promise<T>>, key: string, create: () => Promise<T>): Promise<T> {
  const existing = cache.get(key)
  if (existing) return existing

  const result = create()
  cache.set(key, result)
  return result
}

async function uploadPreviewDataUrl(
  previewDataUrl: string,
  previewFileName: string,
  retryCount: number,
  caches: NormalizeImportedMediaCaches
): Promise<string> {
  return getOrCreateCachedResult(caches.uploadedPreviews, previewDataUrl, () =>
    retryMediaUpload(() => SlidesApiService.uploadImageFromBase64(previewDataUrl, previewFileName), retryCount)
  )
}

async function getGeneratedPreviewDataUrl(
  sourceUrl: string,
  caches: NormalizeImportedMediaCaches
): Promise<string | undefined> {
  return getOrCreateCachedResult(caches.generatedPreviewDataUrls, sourceUrl, async () => {
    const previewDataUrl = await captureVideoPreviewImage(sourceUrl)
    return previewDataUrl ?? undefined
  })
}

async function normalizeVideoElement(
  element: VideoElement,
  slideIndex: number,
  elementIndex: number,
  retryCount: number,
  warnings: NormalizeImportedMediaWarnings,
  caches: NormalizeImportedMediaCaches
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

  const embeddedVideoSource = isEmbeddedVideo(next.src) ? next.src : undefined
  let generatedPreviewDataUrl: string | undefined
  if (!next.previewImageUrl && embeddedVideoSource) {
    generatedPreviewDataUrl = await getGeneratedPreviewDataUrl(embeddedVideoSource, caches)
    if (!generatedPreviewDataUrl) warnings.videoPreviewFailures++
  }

  if (embeddedVideoSource) {
    try {
      const uploadedUrl = await getOrCreateCachedResult(caches.uploadedVideos, embeddedVideoSource, () =>
        retryMediaUpload(
          () => SlidesApiService.uploadDataUrl(embeddedVideoSource, mediaFileName, 'video/mp4'),
          retryCount
        )
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
    try {
      next.previewImageUrl = await uploadPreviewDataUrl(next.previewImageUrl, previewFileName, retryCount, caches)
    } catch (error) {
      warnings.videoPreviewUploadFailures++
      console.warn('[normalizeImportedSlideMedia] Failed to upload embedded video preview:', error)
      next.previewImageUrl = undefined
    }
  } else if (generatedPreviewDataUrl) {
    previewUploadAttempted = true
    try {
      next.previewImageUrl = await uploadPreviewDataUrl(generatedPreviewDataUrl, previewFileName, retryCount, caches)
    } catch (error) {
      warnings.videoPreviewUploadFailures++
      console.warn('[normalizeImportedSlideMedia] Failed to upload embedded video preview:', error)
      next.previewImageUrl = undefined
    }
  }

  if (!next.previewImageUrl && !previewUploadAttempted) {
    const previewDataUrl = await getGeneratedPreviewDataUrl(next.sourceUrl || next.src, caches)
    if (!previewDataUrl) {
      warnings.videoPreviewFailures++
    } else {
      try {
        next.previewImageUrl = await uploadPreviewDataUrl(previewDataUrl, previewFileName, retryCount, caches)
      } catch (error) {
        warnings.videoPreviewUploadFailures++
        console.warn('[normalizeImportedSlideMedia] Failed to upload embedded video preview:', error)
      }
    }
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
  const onProgress = options.onProgress
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
  const caches: NormalizeImportedMediaCaches = {
    uploadedVideos: new Map(),
    uploadedPreviews: new Map(),
    generatedPreviewDataUrls: new Map()
  }

  const uploadedImages = await uploadSlideImages(slides, {
    failurePlaceholderDataUrl: imageFailurePlaceholderDataUrl,
    onProgress: progress => {
      onProgress?.({
        phase: 'uploading-images',
        current: progress.uploaded,
        total: progress.total
      })
    },
    retryCount
  })
  warnings.imageUploadFailures = uploadedImages.failedUploads

  const normalizedSlides: SlideData[] = []
  const totalVideos = uploadedImages.slides.reduce(
    (count, slide) => count + slide.elements.filter(element => element.type === 'video').length,
    0
  )
  let processedVideos = 0

  if (totalVideos > 0) {
    onProgress?.({
      phase: 'processing-videos',
      current: 0,
      total: totalVideos
    })
  }

  for (let slideIndex = 0; slideIndex < uploadedImages.slides.length; slideIndex++) {
    const slide = uploadedImages.slides[slideIndex]
    const nextElements = [] as typeof slide.elements

    for (let elementIndex = 0; elementIndex < slide.elements.length; elementIndex++) {
      const element = slide.elements[elementIndex]
      if (element.type !== 'video') {
        nextElements.push(element)
        continue
      }

      const normalizedVideo = await normalizeVideoElement(
        element,
        slideIndex,
        elementIndex,
        retryCount,
        warnings,
        caches
      )
      if (normalizedVideo) nextElements.push(normalizedVideo)
      processedVideos++
      onProgress?.({
        phase: 'processing-videos',
        current: processedVideos,
        total: totalVideos
      })
    }

    normalizedSlides.push({ ...slide, elements: nextElements })
  }

  return { slides: normalizedSlides, warnings }
}
