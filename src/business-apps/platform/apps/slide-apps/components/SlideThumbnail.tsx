// Memoized slide sidebar thumbnail. Uses the same presentational renderer as
// the main slide for richer parity, but still scales the whole slide down via
// CSS so the left rail stays lightweight.

import React, { useLayoutEffect, useRef, useState } from 'react'
import type { SlideData } from './slideElements'
import { DEFAULT_SLIDE_CANVAS_SIZE } from './slideElements'
import { SlideStaticSurface } from './SlideStaticSurface'

interface SlideThumbnailProps {
  slide: SlideData
  index: number
  thumbScale?: number
}

export const SlideThumbnail = React.memo(function SlideThumbnail({ slide, index, thumbScale }: SlideThumbnailProps) {
  const canvasSize = slide.canvasSize ?? DEFAULT_SLIDE_CANVAS_SIZE
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (thumbScale !== undefined) return

    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width
      if (nextWidth > 0) {
        setMeasuredWidth(nextWidth)
      }
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [thumbScale])

  const effectiveScale = thumbScale ?? (measuredWidth && canvasSize.width > 0 ? measuredWidth / canvasSize.width : null)

  return (
    <div
      ref={containerRef}
      className="gba:relative gba:overflow-hidden"
      style={{ width: '100%', aspectRatio: `${canvasSize.width} / ${canvasSize.height}` }}
    >
      {effectiveScale !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left'
          }}
        >
          <SlideStaticSurface
            elements={slide.elements || []}
            background={slide.background}
            canvasSize={canvasSize}
            renderVideoBackground={false}
            renderVideoElements={false}
          />
        </div>
      )}
      {index >= 0 && (
        <div className="gba:absolute gba:bottom-1 gba:left-1 gba:min-w-5 gba:h-5 gba:px-1 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-black/50">
          <span className="gba:text-[10px] gba:font-medium gba:text-white gba:leading-none">{index + 1}</span>
        </div>
      )}
    </div>
  )
})
