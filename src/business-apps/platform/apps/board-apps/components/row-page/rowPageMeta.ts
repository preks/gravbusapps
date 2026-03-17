/**
 * Encodes/decodes page-level metadata (icon, coverImage) into the HTML
 * content string. The backend only stores { title, content } so we embed
 * metadata as a hidden <div> at the start of the HTML.
 */

const META_OPEN = '<div data-row-page-meta="'
const META_CLOSE = '" style="display:none"></div>'
const META_REGEX = /^<div data-row-page-meta="([^"]*)" style="display:none"><\/div>/

export interface RowPageMeta {
  icon?: string | null
  coverImage?: string | null
}

export function encodeMetaIntoHtml(html: string, meta: RowPageMeta): string {
  const stripped = stripMetaFromHtml(html)
  const hasData = meta.icon || meta.coverImage
  if (!hasData) return stripped

  const payload: Record<string, string> = {}
  if (meta.icon) payload.icon = meta.icon
  if (meta.coverImage) payload.coverImage = meta.coverImage

  const encoded = encodeURIComponent(JSON.stringify(payload))
  return `${META_OPEN}${encoded}${META_CLOSE}${stripped}`
}

export function decodeMetaFromHtml(html: string): { meta: RowPageMeta; html: string } {
  const match = html.match(META_REGEX)
  if (!match) return { meta: {}, html }

  try {
    const payload = JSON.parse(decodeURIComponent(match[1])) as RowPageMeta
    return { meta: payload, html: html.slice(match[0].length) }
  } catch {
    return { meta: {}, html: html.slice(match[0].length) }
  }
}

function stripMetaFromHtml(html: string): string {
  return html.replace(META_REGEX, '')
}
