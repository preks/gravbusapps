// Converts base64 data URLs to Blob Object URLs for fast rendering.
// Object URLs are cached so the browser decodes the image once and
// reuses the decoded bitmap for all subsequent renders.

import { useRef, useCallback, useEffect } from 'react'

const globalCache = new Map<string, string>()

function dataUrlToObjectUrl(dataUrl: string): string {
  const existing = globalCache.get(dataUrl)
  if (existing) return existing

  try {
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx === -1) return dataUrl

    const header = dataUrl.slice(0, commaIdx)
    const base64 = dataUrl.slice(commaIdx + 1)
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png'

    const raw = atob(base64)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)

    const blob = new Blob([arr], { type: mime })
    const objectUrl = URL.createObjectURL(blob)
    globalCache.set(dataUrl, objectUrl)
    return objectUrl
  } catch {
    return dataUrl
  }
}

/**
 * Returns a fast, cached URL for any image source.
 * Base64 data URLs are converted to Blob Object URLs once.
 * Non-data URLs (http, blob, relative) pass through unchanged.
 */
export function getCachedImageUrl(src: string | undefined): string {
  if (!src) return ''
  if (!src.startsWith('data:')) return src
  return dataUrlToObjectUrl(src)
}

/**
 * Hook that provides the getCachedImageUrl function and revokes
 * all Object URLs created during this component's lifetime on unmount.
 */
export function useImageObjectUrls() {
  const localUrls = useRef(new Set<string>())

  const resolve = useCallback((src: string | undefined): string => {
    if (!src) return ''
    if (!src.startsWith('data:')) return src

    const objectUrl = dataUrlToObjectUrl(src)
    if (objectUrl !== src) {
      localUrls.current.add(objectUrl)
    }
    return objectUrl
  }, [])

  useEffect(() => {
    return () => {
      // On unmount, revoke Object URLs created by this instance
      // and remove them from the global cache
      for (const url of localUrls.current) {
        URL.revokeObjectURL(url)
        for (const [key, val] of globalCache) {
          if (val === url) globalCache.delete(key)
        }
      }
      localUrls.current.clear()
    }
  }, [])

  return resolve
}

/** Revoke all cached Object URLs (call when leaving the editor entirely). */
export function clearImageObjectUrlCache(): void {
  for (const url of globalCache.values()) {
    URL.revokeObjectURL(url)
  }
  globalCache.clear()
}
