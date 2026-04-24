// Memoized slide sidebar thumbnail. Only re-renders when the slide
// data or selection state actually changes, avoiding expensive base64
// image decodes on unrelated state updates.

import React, { useMemo } from 'react'
import type { SlideData, AnySlideElement, ChartElement, ShapeElement, CodeElement } from './slideElements'
import { gradientToCss, textTransformToCss } from './slideElements'
import { resolveFontStack } from './fontStack'
import { SlideChartRenderer } from './SlideChartRenderer'
import { tryRenderOfficePresetShape, isOfficePresetSupported } from './OfficeShapeRenderer'
import { getCachedImageUrl } from '../hooks/useImageObjectUrls'
import { sanitizeSlideImageUrl } from '../utils/slideMediaUrl'

/**
 * True when the shape has Office preset metadata that we can draw with its
 * own SVG path. We use this both in ThumbnailElement (to render the preset)
 * and on the outer wrapper (to suppress the generic fill/borderRadius so we
 * do not double-paint underneath the preset path).
 */
function hasOfficePresetGeometry(el: AnySlideElement): boolean {
  if (el.type !== 'shape') return false
  const meta = (el as ShapeElement).importMeta
  if (!meta) return false
  if (meta.custGeomPath) return true
  return isOfficePresetSupported(meta.prst)
}

function resolveImageSrc(src: string | undefined): string {
  const sanitized = sanitizeSlideImageUrl(src)
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
          fontFamily: resolveFontStack(te.fontFamily),
          textAlign: te.textAlign,
          lineHeight: te.lineHeight || 1.2,
          ...textTransformToCss(te.textTransform),
          backgroundColor: te.backgroundColor && te.backgroundColor !== 'transparent' ? te.backgroundColor : undefined,
          background: te.gradient ? gradientToCss(te.gradient) : undefined
        }}
      >
        {te.content}
      </div>
    )
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

  if (el.type === 'shape') {
    const s = el as ShapeElement
    const t = s.shapeText
    const fillStyle = s.gradient ? gradientToCss(s.gradient) : s.fill

    // Render the exact PPTX preset shape if we know how to draw it. We use
    // the full element size here because the outer wrapper already scales
    // the whole thumbnail via CSS transform.
    const officePreset = tryRenderOfficePresetShape({
      element: s,
      fillStyle: fillStyle || 'transparent',
      strokeColor: s.strokeColor || 'transparent',
      strokeWidth: s.strokeWidth || 0,
      shadow: !!s.shadow,
      width: Math.max(1, s.size.width),
      height: Math.max(1, s.size.height)
    })

    if (officePreset) {
      return (
        <div className="gba:absolute gba:inset-0">
          {officePreset}
          {t?.content && (
            <div
              className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:overflow-hidden gba:px-0.5 gba:text-center gba:leading-tight"
              style={{
                color: t.color,
                fontSize: Math.max(4, (t.fontSize || 12) * 0.1),
                fontWeight: t.fontWeight,
                fontFamily: resolveFontStack(t.fontFamily)
              }}
            >
              {t.content}
            </div>
          )}
        </div>
      )
    }

    if (!t?.content) return null
    return (
      <div
        className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:overflow-hidden gba:px-0.5 gba:text-center gba:leading-tight"
        style={{
          color: t.color,
          fontSize: Math.max(4, (t.fontSize || 12) * 0.1),
          fontWeight: t.fontWeight,
          fontFamily: resolveFontStack(t.fontFamily)
        }}
      >
        {t.content}
      </div>
    )
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
        const url = resolveImageSrc(bg.imageUrl)
        return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}
      }
      default:
        return { backgroundColor: bg.color || '#ffffff' }
    }
  }, [slide.background])

  // Use the slide's declared canvas (populated for PPTX imports) so 4:3 /
  // A4 / custom-size decks thumb at their true aspect ratio.
  const canvasW = slide.canvasSize?.width ?? 1280
  const canvasH = slide.canvasSize?.height ?? 720

  return (
    <>
      <div
        className="gba:relative gba:overflow-hidden"
        style={{ width: '100%', aspectRatio: `${canvasW} / ${canvasH}` }}
      >
        <div className="gba:absolute gba:inset-0" style={bgStyle}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: canvasW,
              height: canvasH,
              transform: `scale(${thumbScale})`,
              transformOrigin: 'top left'
            }}
          >
            {sortedElements.map(el => {
              const usePresetRenderer = hasOfficePresetGeometry(el)
              return (
                <div
                  key={el.id}
                  className="gba:absolute"
                  style={{
                    left: el.position.x,
                    top: el.position.y,
                    width: el.size.width,
                    height: el.size.height,
                    zIndex: el.zIndex || 0,
                    backgroundColor:
                      !usePresetRenderer && el.type === 'shape' && !(el as any).gradient
                        ? (el as any).fill
                        : 'transparent',
                    background:
                      !usePresetRenderer && el.type === 'shape' && (el as any).gradient
                        ? gradientToCss((el as any).gradient)
                        : undefined,
                    borderRadius:
                      !usePresetRenderer && el.type === 'shape'
                        ? (el as any).shapeType === 'circle' || (el as any).shapeType === 'ellipse'
                          ? '50%'
                          : (el as any).cornerRadius || (el as any).borderRadius
                        : undefined,
                    overflow: el.type === 'text' ? 'hidden' : undefined
                  }}
                >
                  <ThumbnailElement el={el} />
                </div>
              )
            })}
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
