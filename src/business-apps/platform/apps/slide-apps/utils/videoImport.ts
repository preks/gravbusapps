import { SlidesApiService } from '../services/SlidesApiService'
import { captureVideoPreviewFromFile, captureVideoPreviewImage } from './videoPreview'

export function sanitizeUploadFileName(fileName: string, fallbackStem: string): string {
  const trimmed = fileName.trim()
  if (!trimmed) return fallbackStem
  return trimmed.replace(/[^A-Za-z0-9._-]+/g, '-')
}

export function replaceFileExtension(fileName: string, nextExtension: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '')
  return `${base}.${nextExtension}`
}

export function looksLikeDirectVideoUrl(url: string): boolean {
  if (url.startsWith('blob:') || url.startsWith('data:video/')) return true
  return /\.(mp4|webm|mov|m4v|ogg|ogv|avi|mpg|mpeg|wmv)([?#].*)?$/i.test(url)
}

export async function uploadPreviewImage(dataUrl: string | null, fileName: string): Promise<string | undefined> {
  if (!dataUrl) return undefined

  try {
    return await SlidesApiService.uploadImageFromBase64(dataUrl, fileName)
  } catch (error) {
    console.warn('[videoImport] Failed to upload media preview:', error)
    return undefined
  }
}

export async function createVideoPreviewUrl(source: File | string, fileName: string): Promise<string | undefined> {
  const previewDataUrl =
    typeof source === 'string' ? await captureVideoPreviewImage(source) : await captureVideoPreviewFromFile(source)

  return uploadPreviewImage(previewDataUrl, fileName)
}
