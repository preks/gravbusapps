import { NOTIFICATION_API_URL } from '@/common/utils/serviceResolver'

function collectAllowedHosts(): Set<string> {
  const hosts = new Set<string>()
  try {
    hosts.add(globalThis.window.location.hostname)
  } catch {
    // ignore
  }
  try {
    const api = NOTIFICATION_API_URL
    if (api) {
      hosts.add(new URL(api).hostname)
    }
  } catch {
    // ignore
  }
  return hosts
}

export function extractFirstAllowedUrl(html?: string): string | null {
  if (!html) {
    return null
  }
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[]
    const allowedHosts = collectAllowedHosts()
    for (const anchor of anchors) {
      const href = (anchor.getAttribute('href') || '').trim()
      if (!href || href.includes('${')) {
        continue
      }
      try {
        const url = new URL(href, globalThis.window.location.origin)
        if ((url.protocol === 'http:' || url.protocol === 'https:') && allowedHosts.has(url.hostname)) {
          return url.href
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return null
}
