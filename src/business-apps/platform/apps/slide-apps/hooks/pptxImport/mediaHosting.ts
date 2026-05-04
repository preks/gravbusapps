export const DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT = 1

interface MediaFailurePlaceholderText {
  title: string
  subtitle: string
}

export async function retryMediaUpload<T>(
  operation: () => Promise<T>,
  retryCount = DEFAULT_PPTX_MEDIA_UPLOAD_RETRY_COUNT
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export function createMediaFailurePlaceholderDataUrl({ title, subtitle }: MediaFailurePlaceholderText): string {
  const svgMarkup = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">',
    '<rect width="160" height="100" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>',
    '<g fill="#64748b" font-family="system-ui,sans-serif" font-size="10" text-anchor="middle">',
    `<text x="80" y="45">${escapeSvgText(title)}</text>`,
    `<text x="80" y="61">${escapeSvgText(subtitle)}</text>`,
    '</g>',
    '</svg>'
  ].join('')

  const utf8 = encodeURIComponent(svgMarkup).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  )

  return `data:image/svg+xml;base64,${btoa(utf8)}`
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
