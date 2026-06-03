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

export function sanitizeNotificationHtml(html?: string): string {
  if (!html) {
    return ''
  }
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    ;['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove())
    })
    const walk = (el: Element) => {
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on') || name === 'srcdoc' || name === 'style') {
          el.removeAttribute(attr.name)
          return
        }
        if (name === 'href' || name === 'src') {
          const value = (attr.value || '').trim().toLowerCase()
          const isSafe = value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:')
          if (!isSafe) {
            el.removeAttribute(attr.name)
          }
        }
      })
      Array.from(el.children).forEach(child => walk(child))
    }
    Array.from(doc.body.children).forEach(child => walk(child))

    const allowedHosts = collectAllowedHosts()

    doc.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || ''
      let url: URL | null = null
      try {
        url = new URL(href, globalThis.window.location.origin)
      } catch {
        url = null
      }
      const isExternal = !url || !allowedHosts.has(url.hostname)
      if (isExternal) {
        a.setAttribute('rel', 'noopener noreferrer')
        if (!a.getAttribute('target')) {
          a.setAttribute('target', '_blank')
        }
      } else {
        a.removeAttribute('rel')
        if (a.getAttribute('target') === '_blank') {
          a.removeAttribute('target')
        }
      }
    })
    return doc.body.innerHTML
  } catch {
    return ''
  }
}
