// Memoized slide sidebar thumbnail. Only re-renders when the slide
// data or selection state actually changes, avoiding expensive base64
// image decodes on unrelated state updates.

import React, { useMemo } from 'react'
import type { SlideData, AnySlideElement, ChartElement, ShapeElement, CodeElement } from './slideElements'
import { gradientToCss } from './slideElements'
import { SlideChartRenderer } from './SlideChartRenderer'
import { getCachedImageUrl } from '../hooks/useImageObjectUrls'
import { sanitizeMediaUrl, renderShape } from './slideRenderUtils'

function resolveImageSrc(src: string | undefined): string {
  const sanitized = sanitizeMediaUrl(src, ['image/'])
  if (!sanitized) return ''
  return getCachedImageUrl(sanitized)
}

interface SlideThumbnailProps {
  slide: SlideData
  index: number
  thumbScale: number
}

const ThumbnailElement = React.memo(function ThumbnailElement({ el }: { el: AnySlideElement }) {
  if (el.type === 'text') {
    const te = el as any
    return (
      <div
        className="gba:w-full gba:h-full gba:overflow-hidden gba:whitespace-pre-wrap"
        style={{
          color: te.color,
          fontSize: te.fontSize,
          fontWeight: te.fontWeight,
          fontFamily: te.fontFamily,
          textAlign: te.textAlign,
          lineHeight: te.lineHeight || 1.2,
          backgroundColor: te.backgroundColor && te.backgroundColor !== 'transparent' ? te.backgroundColor : undefined,
          background: te.gradient ? gradientToCss(te.gradient) : undefined
        }}
      >
        {te.content}
      </div>
    )
  }

  if (el.type === 'shape') {
    return <>{renderShape(el as ShapeElement, 'thumb-grad')}</>
  }

  if (el.type === 'image') {
    const src = resolveImageSrc((el as any).src)
    if (!src) return null
    return <img src={src} alt="" className="gba:w-full gba:h-full gba:object-cover" loading="lazy" decoding="async" />
  }

  if (el.type === 'code') {
    const ce = el as CodeElement
    const defaultBg = ce.theme === 'dark' ? '#1e1e1e' : '#f8f8f8'
    return (
      <div
        className="gba:w-full gba:h-full gba:overflow-hidden"
        style={{
          backgroundColor: ce.backgroundColor || defaultBg,
          borderRadius: ce.borderRadius ?? 8,
          border: (ce.borderWidth ?? 0) > 0 ? `${ce.borderWidth}px solid ${ce.borderColor || '#333333'}` : 'none',
          padding: Math.max((ce.padding ?? 16) * 0.3, 2),
          fontFamily: 'monospace',
          fontSize: Math.max(ce.fontSize * 0.4, 4),
          color: ce.textColor || (ce.theme === 'dark' ? '#d4d4d4' : '#333'),
          lineHeight: 1.2,
          whiteSpace: 'pre',
          boxShadow: ce.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        {ce.code}
      </div>
    )
  }

  if (el.type === 'chart') {
    return <SlideChartRenderer element={el as ChartElement} width={el.size.width} height={el.size.height} />
  }

  return null
})

export const SlideThumbnail = React.memo(function SlideThumbnail({ slide, index, thumbScale }: SlideThumbnailProps) {
  const sortedElements = useMemo(
    () => [...(slide.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [slide.elements]
  )

  const bgStyle = useMemo(() => {
    const bg = slide.background
    if (!bg) return { backgroundColor: '#fff' }

    switch (bg.type) {
      case 'gradient':
        return bg.gradient ? { background: gradientToCss(bg.gradient) } : {}
      case 'branded': {
        const layers: string[] = []
        if (bg.overlay) layers.push(gradientToCss(bg.overlay))
        if (bg.gradient) layers.push(gradientToCss(bg.gradient))
        const baseColor = bg.color || '#0a0a0a'
        return layers.length > 0 ? { background: `${layers.join(', ')}, ${baseColor}` } : { backgroundColor: baseColor }
      }
      case 'image': {
        const url = bg.imageUrl ? getCachedImageUrl(bg.imageUrl) : undefined
        return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}
      }
      default:
        return { backgroundColor: bg.color || '#ffffff' }
    }
  }, [slide.background])

  return (
    <>
      <div className="gba:relative gba:overflow-hidden" style={{ width: '100%', aspectRatio: '16 / 9' }}>
        <div className="gba:absolute gba:inset-0" style={bgStyle}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1280,
              height: 720,
              transform: `scale(${thumbScale})`,
              transformOrigin: 'top left'
            }}
          >
            {sortedElements.map(el => (
              <div
                key={el.id}
                className="gba:absolute"
                style={{
                  left: el.position.x,
                  top: el.position.y,
                  width: el.size.width,
                  height: el.size.height,
                  zIndex: el.zIndex || 0,
                  overflow: el.type === 'text' ? 'hidden' : undefined
                }}
              >
                <ThumbnailElement el={el} />
              </div>
            ))}
          </div>
        </div>
        {index >= 0 && (
          <div className="gba:absolute gba:bottom-1 gba:left-1 gba:min-w-5 gba:h-5 gba:px-1 gba:flex gba:items-center gba:justify-center gba:rounded gba:bg-black/50">
            <span className="gba:text-[10px] gba:font-medium gba:text-white gba:leading-none">{index + 1}</span>
          </div>
        )}
      </div>
    </>
  )
})
