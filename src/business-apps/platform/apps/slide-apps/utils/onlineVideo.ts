export type SupportedOnlineVideoProvider = 'youtube'

export interface ParsedOnlineVideo {
  provider: SupportedOnlineVideoProvider
  sourceUrl: string
  embedUrl: string
  previewImageUrl: string
  videoId: string
}

const YOUTUBE_HOSTS = new Set([
  'youtu.be',
  'www.youtu.be',
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com'
])

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

function normalizeYouTubeId(candidate: string | undefined): string | null {
  if (!candidate) return null
  const trimmed = candidate.trim()
  if (!YOUTUBE_ID_PATTERN.test(trimmed)) return null
  return trimmed
}

function parseYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host)) return null

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return normalizeYouTubeId(url.pathname.split('/').filter(Boolean)[0])
  }

  const pathParts = url.pathname.split('/').filter(Boolean)
  if (pathParts[0] === 'watch') {
    return normalizeYouTubeId(url.searchParams.get('v') ?? undefined)
  }

  if (pathParts[0] === 'embed' || pathParts[0] === 'shorts' || pathParts[0] === 'live') {
    return normalizeYouTubeId(pathParts[1])
  }

  if (pathParts.length === 1) {
    return normalizeYouTubeId(url.searchParams.get('v') ?? undefined)
  }

  return null
}

export function buildYouTubePreviewImageUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`
}

export function parseOnlineVideoUrl(input: string | undefined): ParsedOnlineVideo | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const videoId = parseYouTubeVideoId(url)
  if (!videoId) return null

  return {
    provider: 'youtube',
    sourceUrl: trimmed,
    embedUrl: buildYouTubeEmbedUrl(videoId),
    previewImageUrl: buildYouTubePreviewImageUrl(videoId),
    videoId
  }
}

export function sanitizeOnlineVideoEmbedUrl(url: string | undefined): string {
  if (!url) return ''
  const parsed = parseOnlineVideoUrl(url)
  if (parsed) return parsed.embedUrl

  try {
    const candidate = new URL(url)
    const videoId = parseYouTubeVideoId(candidate)
    if (!videoId) return ''
    return buildYouTubeEmbedUrl(videoId)
  } catch {
    return ''
  }
}
