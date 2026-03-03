/**
 * Shared image src → data URL resolution for document editors (export/embed).
 * Split into small helpers to keep cognitive complexity low (Sonar S3776).
 */

export interface ImageDataUrlResolverContext {
  accessToken: string | null | undefined
  fileClient: { downloadFileByPath(path: string, token: string): Promise<Blob> }
  blobToDataUrl: (blob: Blob) => Promise<string>
}

async function resolveBlobUrl(s: string, blobToDataUrl: (blob: Blob) => Promise<string>): Promise<string | null> {
  if (!s.startsWith('blob:')) return null
  try {
    const res = await fetch(s)
    const blob = await res.blob()
    return blobToDataUrl(blob)
  } catch {
    return null
  }
}

async function resolveHttpImageUrl(
  s: string,
  accessToken: string,
  fileClient: ImageDataUrlResolverContext['fileClient'],
  blobToDataUrl: (blob: Blob) => Promise<string>
): Promise<string | null> {
  try {
    const u = new URL(s)
    const pathWithQuery = `${u.pathname}${u.search}`
    const isTenantDownload = u.pathname.includes('/tenant/downloads/') || u.pathname.includes('/tenant/Downloads/')
    const looksLikeApiV1 = u.pathname.startsWith('/api/v1/')
    if (isTenantDownload || looksLikeApiV1) {
      const blob = await fileClient.downloadFileByPath(pathWithQuery, accessToken)
      return blobToDataUrl(blob)
    }
    const res = await fetch(s, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'omit'
    })
    if (!res.ok) return null
    const blob = await res.blob()
    return blobToDataUrl(blob)
  } catch {
    return null
  }
}

async function resolveFileServiceImageUrl(
  rawPath: string,
  accessToken: string,
  fileClient: ImageDataUrlResolverContext['fileClient'],
  blobToDataUrl: (blob: Blob) => Promise<string>
): Promise<string | null> {
  try {
    const path = rawPath.replace(/^\/files(?=\/api\/v1\/)/, '')
    const blob = await fileClient.downloadFileByPath(path, accessToken)
    return blobToDataUrl(blob)
  } catch {
    return null
  }
}

/**
 * Resolves an image src (data:, blob:, http(s):, or file-service path) to a data URL.
 * Used by DocumentEditor and PagedDocumentEditor for export/embed.
 */
export async function resolveImageSrcToDataUrl(src: string, ctx: ImageDataUrlResolverContext): Promise<string | null> {
  if (!src) return null
  const s = src.trim()
  if (s.startsWith('data:')) return s

  const blobResult = await resolveBlobUrl(s, ctx.blobToDataUrl)
  if (blobResult != null) return blobResult

  if (ctx.accessToken && (s.startsWith('http://') || s.startsWith('https://'))) {
    return resolveHttpImageUrl(s, ctx.accessToken, ctx.fileClient, ctx.blobToDataUrl)
  }

  const rawPath = s.startsWith('/') ? s : `/${s}`
  const hasFileServicePath =
    rawPath.includes('/tenant/') || rawPath.startsWith('/files/') || rawPath.startsWith('/api/v1/')
  if (ctx.accessToken && hasFileServicePath) {
    return resolveFileServiceImageUrl(rawPath, ctx.accessToken, ctx.fileClient, ctx.blobToDataUrl)
  }

  return null
}
