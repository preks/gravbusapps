import React, { useCallback, useEffect, useRef, useState } from 'react'

const RESIZE_MESSAGE = 'nw-artifact-resize'
const DEFAULT_HEIGHT = 200
const MIN_HEIGHT = 120
const MAX_HEIGHT = 480

export function isTimelineHtmlArtifact(name: string): boolean {
  return name.toLowerCase().endsWith('.timeline.html')
}

function clampHeight(raw: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(raw)))
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
  'data-testid'?: string
}

/** Iframe that listens for height postMessage from timeline HTML artefacts. */
export const AutoHeightHtmlIframe: React.FC<AutoHeightHtmlIframeProps> = ({
  src,
  srcDoc,
  title,
  className,
  iframeRef: externalRef,
  sandbox = 'allow-scripts allow-same-origin',
  'data-testid': testId
}) => {
  const internalRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)

  const setRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      internalRef.current = el
      if (typeof externalRef === 'function') externalRef(el)
      else if (externalRef) (externalRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el
    },
    [externalRef]
  )

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
      setHeight(clampHeight(ev.data.height))
    }
    globalThis.addEventListener('message', onMessage)
    return () => globalThis.removeEventListener('message', onMessage)
  }, [src])

  return (
    <iframe
      ref={setRef}
      {...(srcDoc ? { srcDoc } : { src: src ?? '' })}
      title={title}
      sandbox={sandbox}
      scrolling="no"
      className={className}
      data-testid={testId}
      style={{ width: '100%', height, border: 0, display: 'block', overflow: 'hidden' }}
    />
  )
}

export { RESIZE_MESSAGE, clampHeight as clampTimelineIframeHeight }
