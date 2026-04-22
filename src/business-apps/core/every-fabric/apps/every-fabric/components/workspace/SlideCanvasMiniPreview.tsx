import React, { useEffect, useRef, useState } from 'react'

/**
 * Measures the clientWidth of a mounted element via ResizeObserver.
 * Returns [ref, width]; width is `null` until the element is attached.
 */
export function useContainerWidth<T extends HTMLElement>(): [React.RefObject<T>, number | null] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width
      if (typeof next === 'number') setWidth(Math.round(next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Cast away the `| null` from the ref's generic so the returned ref is
  // directly assignable to `React.Ref<T>` on the consuming element.
  return [ref as React.RefObject<T>, width]
}

const CANVAS_W = 1280
const CANVAS_H = 720

export interface SlideElement {
  id?: string
  type: string
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  content?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  textAlign?: string
  fontStyle?: string
  fill?: string
  cornerRadius?: number
  shapeType?: string
  opacity?: number
  src?: string
  backgroundColor?: string
}

export interface SlideData {
  id?: string
  elements?: SlideElement[]
  background?: { type?: string; color?: string }
  notes?: string
}

function resolveBackground(bg?: SlideData['background']): string {
  if (!bg) return '#1e293b'
  return bg.color ?? '#1e293b'
}

function clampFontSize(fs: number | undefined, scale: number): number {
  const base = fs ?? 20
  const scaled = Math.round(base * scale)
  return Math.max(5, Math.min(scaled, 24))
}

const SlideElementRenderer: React.FC<{ el: SlideElement; scale: number }> = ({ el, scale }) => {
  const x = (el.position?.x ?? 0) * scale
  const y = (el.position?.y ?? 0) * scale
  const w = (el.size?.width ?? 100) * scale
  const h = (el.size?.height ?? 50) * scale

  if (el.type === 'text') {
    return (
      <div
        className="gba:absolute gba:overflow-hidden gba:leading-tight"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          fontSize: clampFontSize(el.fontSize, scale),
          fontWeight: el.fontWeight === 'bold' ? 700 : 400,
          color: el.color ?? '#f0f6fc',
          textAlign: (el.textAlign as React.CSSProperties['textAlign']) ?? 'left',
          fontStyle: el.fontStyle ?? 'normal',
          opacity: el.opacity ?? 1
        }}
      >
        {el.content}
      </div>
    )
  }

  if (el.type === 'shape') {
    return (
      <div
        className="gba:absolute"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          backgroundColor: el.fill ?? 'transparent',
          borderRadius: el.cornerRadius ? el.cornerRadius * scale : 0,
          opacity: el.opacity ?? 1
        }}
      />
    )
  }

  if (el.type === 'image' && el.src) {
    return (
      <img
        src={el.src}
        alt=""
        className="gba:absolute gba:object-cover"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          opacity: el.opacity ?? 1,
          borderRadius: el.cornerRadius ? el.cornerRadius * scale : 0
        }}
      />
    )
  }

  return null
}

interface SlideCanvasMiniPreviewProps {
  slide: SlideData
  containerWidth: number
}

export const SlideCanvasMiniPreview: React.FC<SlideCanvasMiniPreviewProps> = ({ slide, containerWidth }) => {
  const scale = containerWidth / CANVAS_W
  const containerHeight = CANVAS_H * scale
  const bgColor = resolveBackground(slide.background)

  const elements = Array.isArray(slide.elements) ? slide.elements : []

  return (
    <div
      className="gba:relative gba:overflow-hidden gba:rounded-md gba:border gba:border-border/50"
      style={{
        width: containerWidth,
        height: containerHeight,
        backgroundColor: bgColor,
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {elements.map((el, idx) => (
        <SlideElementRenderer key={el.id ?? `el-${idx}`} el={el as SlideElement} scale={scale} />
      ))}
    </div>
  )
}

interface SlideThumbnailGridProps {
  slides: SlideData[]
  activeSlideIndex: number
  onSelectSlide: (index: number) => void
}

export const SlideThumbnailGrid: React.FC<SlideThumbnailGridProps> = ({ slides, activeSlideIndex, onSelectSlide }) => (
  <div className="gba:grid gba:grid-cols-3 gba:gap-1.5 gba:p-2">
    {slides.map((slide, idx) => (
      <button
        key={slide.id ?? `thumb-${idx}`}
        type="button"
        onClick={() => onSelectSlide(idx)}
        className={`gba:rounded-md gba:ring-1 gba:transition-all gba:cursor-pointer ${
          idx === activeSlideIndex
            ? 'gba:ring-primary gba:ring-2 gba:shadow-sm'
            : 'gba:ring-border/40 gba:hover:ring-border'
        }`}
        data-testid={`fabric-slide-thumb-${idx}`}
      >
        <SlideCanvasMiniPreview slide={slide} containerWidth={80} />
        <span className="gba:block gba:text-[8px] gba:text-muted-foreground gba:text-center gba:py-0.5">{idx + 1}</span>
      </button>
    ))}
  </div>
)
