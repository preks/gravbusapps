import { useEffect, useState } from 'react'
import { SlidesApiService } from '../services'

const resolvedMediaCache = new Map<string, string>()
const inFlightRequests = new Map<string, Promise<string>>()

function canUseBlobMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType.startsWith('video/')
}

async function resolveProtectedMediaUrl(sourceUrl: string): Promise<string> {
  const cached = resolvedMediaCache.get(sourceUrl)
  if (cached) return cached

  const existingRequest = inFlightRequests.get(sourceUrl)
  if (existingRequest) return existingRequest

  const request = SlidesApiService.fetchProtectedMediaBlob(sourceUrl)
    .then(blob => {
      if (!blob || !canUseBlobMimeType(blob.type || '')) {
        return ''
      }

      const objectUrl = URL.createObjectURL(blob)
      resolvedMediaCache.set(sourceUrl, objectUrl)
      return objectUrl
    })
    .finally(() => {
      inFlightRequests.delete(sourceUrl)
    })

  inFlightRequests.set(sourceUrl, request)
  return request
}

export function useResolvedSlideMediaUrl(sourceUrl: string | undefined): string {
  const [resolvedUrl, setResolvedUrl] = useState(() => {
    if (!sourceUrl) return ''
    if (!SlidesApiService.isProtectedDriveMediaUrl(sourceUrl)) return sourceUrl
    return resolvedMediaCache.get(sourceUrl) ?? ''
  })

  useEffect(() => {
    if (!sourceUrl) {
      setResolvedUrl('')
      return
    }

    if (!SlidesApiService.isProtectedDriveMediaUrl(sourceUrl)) {
      setResolvedUrl(sourceUrl)
      return
    }

    const cached = resolvedMediaCache.get(sourceUrl)
    if (cached) {
      setResolvedUrl(cached)
      return
    }

    let cancelled = false
    resolveProtectedMediaUrl(sourceUrl)
      .then(url => {
        if (!cancelled) {
          setResolvedUrl(url)
        }
      })
      .catch(error => {
        console.warn('[useResolvedSlideMediaUrl] Failed to resolve protected media URL:', error)
        if (!cancelled) {
          setResolvedUrl('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [sourceUrl])

  return resolvedUrl
}

export function clearResolvedSlideMediaUrlCache(): void {
  for (const objectUrl of resolvedMediaCache.values()) {
    URL.revokeObjectURL(objectUrl)
  }
  resolvedMediaCache.clear()
  inFlightRequests.clear()
}
