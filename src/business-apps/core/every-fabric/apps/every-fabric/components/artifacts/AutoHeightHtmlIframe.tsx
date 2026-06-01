import React, { useCallback, useEffect, useRef, useState } from 'react'

const RESIZE_MESSAGE = 'nw-artifact-resize'

export type AutoHeightHtmlIframeVariant = 'inline' | 'panel' | 'modal'

const VARIANT_LIMITS: Record<AutoHeightHtmlIframeVariant, { min: number; max: number; defaultHeight: number }> = {
  inline: { min: 360, max: 720, defaultHeight: 360 },
  panel: { min: 420, max: 2000, defaultHeight: 480 },
  modal: { min: 420, max: 50_000, defaultHeight: 480 }
}

function resolveMaxHeight(variant: AutoHeightHtmlIframeVariant): number {
  const cap = VARIANT_LIMITS[variant].max
  if (variant === 'inline' && typeof globalThis.innerHeight === 'number') {
    return Math.min(cap, Math.round(globalThis.innerHeight * 0.7))
  }
  return cap
}

export function clampHeight(raw: number, variant: AutoHeightHtmlIframeVariant = 'inline'): number {
  const min = VARIANT_LIMITS[variant].min
  const max = resolveMaxHeight(variant)
  return Math.min(max, Math.max(min, Math.ceil(raw)))
}

function resolvePanelClass(variant: AutoHeightHtmlIframeVariant): string {
  if (variant === 'panel') return 'gba:flex-1 gba:min-h-[420px] gba:w-full'
  if (variant === 'modal') return 'gba:w-full'
  return 'gba:w-full gba:max-w-full'
}

function resolveIframeScrolling(variant: AutoHeightHtmlIframeVariant, atCap: boolean): 'auto' | 'no' {
  if (variant === 'modal') return 'no'
  if (atCap) return 'auto'
  return 'no'
}

function resolveIframeOverflow(variant: AutoHeightHtmlIframeVariant, atCap: boolean): 'auto' | 'hidden' {
  if (variant === 'modal') return 'hidden'
  if (atCap) return 'auto'
  return 'hidden'
}

/** True for `.html` / `.htm` session artifacts (path or basename). */
export function isHtmlArtifactFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.html') || lower.endsWith('.htm')
}

export function isTimelineHtmlArtifact(name: string): boolean {
  return name.toLowerCase().endsWith('.timeline.html')
}

/** @deprecated Prefer {@link shouldUseAutoHeightHtmlViewer}; kept for callers that only targeted dashboards. */
export function isDashboardHtmlArtifact(name: string): boolean {
  return isHtmlArtifactFile(name) && name.toLowerCase().includes('dashboard')
}

/**
 * Fixed 1920×1080 "cinema" viewer — hyperframe / GSAP compositions and other
 * full-viewport animations. All other HTML uses auto-height (chat-aligned).
 */
const FIXED_VIEWPORT_HTML_DENYLIST: RegExp[] = [/\.cinema\.html$/i, /hyperframe/i, /composition/i, /\bgsap\b/i]

export function isFixedViewportHtmlArtifact(name: string): boolean {
  if (!isHtmlArtifactFile(name)) return false
  const lower = name.toLowerCase()
  return FIXED_VIEWPORT_HTML_DENYLIST.some(pattern => pattern.test(lower))
}

/** Full workspace viewer: auto-height for every HTML file unless denylisted. */
export function shouldUseAutoHeightHtmlViewer(name: string): boolean {
  return isHtmlArtifactFile(name) && !isFixedViewportHtmlArtifact(name)
}

export interface AutoHeightHtmlIframeProps {
  /** Remote artefact URL (mutually exclusive with srcDoc). */
  src?: string
  /** Inline HTML for chat previews (mutually exclusive with src). */
  srcDoc?: string
  title: string
  className?: string
  iframeRef?: React.Ref<HTMLIFrameElement>
  sandbox?: string
  variant?: AutoHeightHtmlIframeVariant
  'data-testid'?: string
}

/** Iframe that listens for height postMessage from HTML artefacts. */
export const AutoHeightHtmlIframe: React.FC<AutoHeightHtmlIframeProps> = ({
  src,
  srcDoc,
  title,
  className,
  iframeRef: externalRef,
  sandbox = 'allow-scripts allow-same-origin',
  variant = 'inline',
  'data-testid': testId
}) => {
  const internalRef = useRef<HTMLIFrameElement | null>(null) as React.MutableRefObject<HTMLIFrameElement | null>
  const [height, setHeight] = useState(() => VARIANT_LIMITS[variant].defaultHeight)
  const [atCap, setAtCap] = useState(false)
  const resizeReceivedRef = useRef(false)

  const applyHeight = useCallback(
    (raw: number) => {
      if (variant === 'modal') {
        setHeight(Math.max(VARIANT_LIMITS.modal.min, Math.ceil(raw)))
        setAtCap(false)
        return
      }
      const max = resolveMaxHeight(variant)
      const clamped = clampHeight(raw, variant)
      setHeight(clamped)
      setAtCap(raw > max)
    },
    [variant]
  )

  const setRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      internalRef.current = el
      if (typeof externalRef === 'function') externalRef(el)
      else if (externalRef) (externalRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el
    },
    [externalRef]
  )

  useEffect(() => {
    setHeight(VARIANT_LIMITS[variant].defaultHeight)
    setAtCap(false)
    resizeReceivedRef.current = false
  }, [src, srcDoc, variant])

  useEffect(() => {
    let expectedOrigin: string | null = null
    if (src) {
      try {
        expectedOrigin = new URL(src, globalThis.location.href).origin
      } catch {
        expectedOrigin = null
      }
    }

    const onMessage = (ev: MessageEvent) => {
      if (expectedOrigin && ev.origin !== expectedOrigin) return
      if (ev.data?.type !== RESIZE_MESSAGE || typeof ev.data.height !== 'number') return
      resizeReceivedRef.current = true
      applyHeight(ev.data.height)
    }
    globalThis.addEventListener('message', onMessage)
    return () => globalThis.removeEventListener('message', onMessage)
  }, [applyHeight, src])

  const measureFallback = useCallback(() => {
    const iframe = internalRef.current
    if (!iframe || resizeReceivedRef.current) return
    try {
      const doc = iframe.contentDocument
      if (!doc) return
      const raw = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
        doc.documentElement?.offsetHeight ?? 0,
        doc.body?.offsetHeight ?? 0
      )
      if (raw > 0) applyHeight(raw)
    } catch {
      // cross-origin — rely on postMessage only
    }
  }, [applyHeight])

  const handleLoad = useCallback(() => {
    globalThis.setTimeout(measureFallback, 500)
  }, [measureFallback])

  const panelClass = resolvePanelClass(variant)
  const iframeScrolling = resolveIframeScrolling(variant, atCap)
  const iframeOverflow = resolveIframeOverflow(variant, atCap)

  return (
    <iframe
      ref={setRef}
      {...(srcDoc ? { srcDoc } : { src: src ?? '' })}
      title={title}
      sandbox={sandbox}
      scrolling={iframeScrolling}
      onLoad={handleLoad}
      className={`${panelClass} ${className ?? ''}`.trim()}
      data-testid={testId}
      style={{
        width: '100%',
        height,
        border: 0,
        display: 'block',
        overflow: iframeOverflow
      }}
    />
  )
}

export { RESIZE_MESSAGE, clampHeight as clampTimelineIframeHeight }
