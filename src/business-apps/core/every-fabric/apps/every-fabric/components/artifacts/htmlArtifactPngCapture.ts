import DOMPurify from 'dompurify'
import html2canvas from 'html2canvas-pro'

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/

/** Strip unsafe path characters from artifact names before download. */
export function sanitizeArtifactPngFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.html?$/i, '')
  const safe = withoutExt.replace(/[/\\<>:"|?*\x00-\x1f]/g, '_').trim() || 'artifact'
  return `${safe.slice(0, 200)}.png`
}

/** Accept only PNG data URLs generated locally or from a validated capture response. */
export function blobFromValidatedPngDataUrl(dataUrl: string): Blob | null {
  if (typeof dataUrl !== 'string' || !PNG_DATA_URL_PATTERN.test(dataUrl)) {
    return null
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.codePointAt(i) ?? 0
    }
    return new Blob([bytes], { type: 'image/png' })
  } catch {
    return null
  }
}

function extractHtmlBodyFragment(html: string): string {
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const bodyHtml = parsed.body?.innerHTML?.trim()
    if (bodyHtml) return bodyHtml
  } catch {
    // fall through to raw fragment
  }
  return html
}

function buildCaptureDocumentHtml(sanitizedBody: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${sanitizedBody}</body></html>`
}

/**
 * CWE-79: sanitize remote artifact HTML before srcdoc / appendChild in the capture iframe.
 * Fragment-only sanitization (WHOLE_DOCUMENT: false) with no style/link/meta tags from source.
 */
export function sanitizeArtifactHtmlForCapture(html: string): string {
  const fragment = extractHtmlBodyFragment(html)
  const sanitizedBody = DOMPurify.sanitize(fragment, {
    WHOLE_DOCUMENT: false,
    FORBID_TAGS: ['iframe', 'object', 'embed', 'style', 'link', 'meta'],
    ALLOW_DATA_ATTR: true
  })

  return buildCaptureDocumentHtml(sanitizedBody)
}

function downloadPngBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.download = sanitizeArtifactPngFileName(fileName)
    link.href = objectUrl
    link.rel = 'noopener'
    link.click()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function downloadValidatedPngDataUrl(dataUrl: string, fileName: string): void {
  const blob = blobFromValidatedPngDataUrl(dataUrl)
  if (!blob) return
  downloadPngBlob(blob, fileName)
}

function measureDocumentHeight(doc: Document): number {
  return Math.max(
    doc.documentElement?.scrollHeight ?? 0,
    doc.body?.scrollHeight ?? 0,
    doc.documentElement?.offsetHeight ?? 0,
    doc.body?.offsetHeight ?? 0
  )
}

async function captureElement(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    scale: Math.min(2, globalThis.devicePixelRatio ?? 1),
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  })
  return canvas.toDataURL('image/png')
}

async function tryCaptureIframeDirect(iframe: HTMLIFrameElement): Promise<string | null> {
  try {
    const doc = iframe.contentDocument
    if (!doc?.body) return null
    const target = doc.documentElement ?? doc.body
    if (measureDocumentHeight(doc) <= 0) return null
    return await captureElement(target)
  } catch {
    return null
  }
}

function resolveCaptureTargetOrigin(iframe: HTMLIFrameElement | null | undefined, downloadUrl?: string): string | null {
  const candidates: string[] = []
  if (downloadUrl) candidates.push(downloadUrl)
  const iframeSrc = iframe?.src?.trim()
  if (iframeSrc && iframeSrc !== 'about:blank') candidates.push(iframeSrc)

  for (const candidate of candidates) {
    try {
      const origin = new URL(candidate, globalThis.location.href).origin
      if (origin && origin !== 'null') return origin
    } catch {
      continue
    }
  }
  return null
}

async function tryPostMessageCapture(
  iframe: HTMLIFrameElement,
  targetOrigin: string,
  timeoutMs = 2500
): Promise<string | null> {
  if (!targetOrigin || targetOrigin === '*') return null

  return new Promise(resolve => {
    const timer = globalThis.setTimeout(() => {
      globalThis.removeEventListener('message', onMessage)
      resolve(null)
    }, timeoutMs)

    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== targetOrigin) return
      if (ev.data?.type !== 'capture-png-result' || typeof ev.data.dataUrl !== 'string') return
      if (!blobFromValidatedPngDataUrl(ev.data.dataUrl)) return

      globalThis.clearTimeout(timer)
      globalThis.removeEventListener('message', onMessage)
      resolve(ev.data.dataUrl)
    }

    globalThis.addEventListener('message', onMessage)
    iframe.contentWindow?.postMessage({ type: 'capture-png' }, targetOrigin)
  })
}

function delayMs(ms: number): Promise<void> {
  return new Promise(resolve => {
    globalThis.setTimeout(resolve, ms)
  })
}

async function captureIframeDocument(iframe: HTMLIFrameElement): Promise<string> {
  await delayMs(800)
  const doc = iframe.contentDocument
  if (!doc?.body) throw new Error('Capture iframe has no document')

  const height = measureDocumentHeight(doc)
  iframe.style.height = `${Math.max(height, 420)}px`
  await delayMs(300)

  const target = doc.documentElement ?? doc.body
  return captureElement(target)
}

async function captureFromHtmlString(html: string): Promise<string> {
  const safeHtml = sanitizeArtifactHtmlForCapture(html)

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    iframe.setAttribute('style', 'position:fixed;left:-10000px;top:0;width:1280px;height:720px;border:0')
    iframe.hidden = true
    iframe.setAttribute('aria-hidden', 'true')

    const cleanup = () => iframe.remove()
    const timer = globalThis.setTimeout(() => {
      cleanup()
      reject(new Error('PNG capture timed out'))
    }, 15_000)

    const finishCapture = (dataUrl: string) => {
      globalThis.clearTimeout(timer)
      cleanup()
      resolve(dataUrl)
    }

    const failCapture = (error: unknown) => {
      globalThis.clearTimeout(timer)
      cleanup()
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    iframe.onload = () => {
      void captureIframeDocument(iframe).then(finishCapture).catch(failCapture)
    }

    iframe.srcdoc = safeHtml
    document.body.appendChild(iframe)
  })
}

export interface DownloadHtmlArtifactPngParams {
  fileName: string
  iframe?: HTMLIFrameElement | null
  downloadUrl?: string
  fetchHtml?: () => Promise<string>
}

/** Capture an HTML artifact as PNG and trigger a browser download. */
export async function downloadHtmlArtifactPng(params: DownloadHtmlArtifactPngParams): Promise<boolean> {
  const { fileName, iframe, downloadUrl, fetchHtml } = params
  const targetOrigin = resolveCaptureTargetOrigin(iframe, downloadUrl)

  if (iframe?.contentWindow && targetOrigin) {
    const fromMessage = await tryPostMessageCapture(iframe, targetOrigin)
    if (fromMessage) {
      downloadValidatedPngDataUrl(fromMessage, fileName)
      return true
    }

    const fromIframe = await tryCaptureIframeDirect(iframe)
    if (fromIframe) {
      downloadValidatedPngDataUrl(fromIframe, fileName)
      return true
    }
  }

  if (fetchHtml) {
    const html = await fetchHtml()
    const dataUrl = await captureFromHtmlString(html)
    downloadValidatedPngDataUrl(dataUrl, fileName)
    return true
  }

  return false
}
