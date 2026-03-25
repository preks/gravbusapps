import { useCallback } from 'react'
import { resolveImageSrcToDataUrl } from '../utils/imageDataUrlResolver'

export type GetImageDataUrlForExport = (src: string) => Promise<string | null>

/**
 * Returns a stable callback that resolves image src to data URL for export/embed.
 * Used by DocumentEditor and PagedDocumentEditor to keep getImageDataUrl complexity low.
 */
export function useImageDataUrlResolver(accessToken: string | null | undefined): GetImageDataUrlForExport {
  return useCallback((src: string) => resolveImageSrcToDataUrl(src), [accessToken])
}
