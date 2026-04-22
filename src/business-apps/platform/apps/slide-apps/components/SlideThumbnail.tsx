// Memoized slide sidebar thumbnail. Only re-renders when the slide
// data or selection state actually changes, avoiding expensive base64
// image decodes on unrelated state updates.

import React, { useMemo } from 'react'
import type {
  SlideData,
  AnySlideElement,
  ChartElement,
  ShapeElement,
  CodeElement,
  GradientConfig
} from './slideElements'
import { gradientToCss, gradientToSvgAttrs } from './slideElements'
import { SlideChartRenderer } from './SlideChartRenderer'
import { getCachedImageUrl } from '../hooks/useImageObjectUrls'

function sanitizeThumbnailUrl(url: string | undefined): string {
  if (!url) return ''
  const t = url.trim()
  if (
    t.startsWith('https://') ||
    t.startsWith('http://') ||
    t.startsWith('blob:') ||
    t.startsWith('/') ||
    t.startsWith('./')
  )
    return t
  if (t.startsWith('data:image/')) return t
  return ''
}

function resolveImageSrc(src: string | undefined): string {
  const sanitized = sanitizeThumbnailUrl(src)
  if (!sanitized) return ''
  return getCachedImageUrl(sanitized)
}

interface SlideThumbnailProps {
  slide: SlideData
  index: number
  thumbScale: number
}

function renderSvgGradientDefs(gradient: GradientConfig, id: string, viewBox = 100) {
  const attrs = gradientToSvgAttrs(gradient, viewBox)
  if (attrs.type === 'radial') {
    return (
      <defs>
        <radialGradient id={id} cx={attrs.cx} cy={attrs.cy} r={attrs.r}>
          {attrs.stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.stopColor} />
          ))}
        </radialGradient>
      </defs>
    )
  }
  return (
    <defs>
      <linearGradient id={id} x1={attrs.x1} y1={attrs.y1} x2={attrs.x2} y2={attrs.y2} gradientUnits="userSpaceOnUse">
        {attrs.stops.map((s, i) => (
          <stop key={i} offset={s.offset} stopColor={s.stopColor} />
        ))}
      </linearGradient>
    </defs>
  )
}

function ThumbnailShape({ el }: { el: ShapeElement }) {
  const { shapeType, fill, gradient, strokeColor, strokeWidth, strokeStyle, cornerRadius, shadow } = el
  const fillStyle = gradient ? gradientToCss(gradient) : fill
  const svgStroke = strokeWidth > 0 ? strokeColor : 'none'
  const filterStyle = shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none'

  const baseDiv: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: fillStyle,
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxShadow: shadow ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' : 'none'
  }

  const gradId = `thumb-grad-${el.id}`
  const svgFill = gradient ? `url(#${gradId})` : fill

  switch (shapeType) {
    case 'rectangle':
    case 'rounded-rectangle':
      return <div style={{ ...baseDiv, borderRadius: cornerRadius || 0 }} />
    case 'circle':
    case 'ellipse':
      return <div style={{ ...baseDiv, borderRadius: '50%' }} />
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId)}
          <polygon
            points="50,5 95,95 5,95"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId)}
          <polygon
            points="50,5 95,50 50,95 5,50"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId)}
          <polygon
            points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'hexagon':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId)}
          <polygon
            points="25,5 75,5 100,50 75,95 25,95 0,50"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId, 100)}
          <polygon
            points="0,20 65,20 65,5 100,30 65,55 65,40 0,40"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId, 100)}
          <polygon
            points="100,20 35,20 35,5 0,30 35,55 35,40 100,40"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'arrow-up':
      return (
        <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId, 100)}
          <polygon
            points="30,0 60,35 40,35 40,100 20,100 20,35 0,35"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'arrow-down':
      return (
        <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId, 100)}
          <polygon
            points="30,100 60,65 40,65 40,0 20,0 20,65 0,65"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'line':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: strokeWidth || 4, background: fillStyle }} />
        </div>
      )
    case 'callout':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          {gradient && renderSvgGradientDefs(gradient, gradId)}
          <path
            d="M5,5 H95 V70 H40 L25,95 L30,70 H5 Z"
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={strokeWidth}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'container':
      return <div style={{ ...baseDiv, borderRadius: cornerRadius || 8 }} />
    default:
      return <div style={baseDiv} />
  }
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
    return <ThumbnailShape el={el as ShapeElement} />
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
