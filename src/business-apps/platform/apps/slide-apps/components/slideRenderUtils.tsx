// Shared rendering utilities for slide elements.
// Used by SlideCanvas, SlideThumbnail, and SlideExportRenderer.

import React from 'react'
import type { ShapeElement, GradientConfig } from './slideElements'
import { gradientToCss, gradientToSvgAttrs } from './slideElements'

export function sanitizeMediaUrl(url: string | undefined, allowedDataTypes: string[] = ['image/', 'video/']): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return trimmed
  }
  for (const type of allowedDataTypes) {
    if (trimmed.startsWith(`data:${type}`)) {
      return trimmed
    }
  }
  return ''
}

export function renderSvgGradientDefs(gradient: GradientConfig, id: string, viewBox = 100): React.ReactNode {
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

export function renderShape(element: ShapeElement, gradIdPrefix: string): React.ReactNode {
  const { shapeType, fill, gradient, strokeColor, strokeWidth, strokeStyle, cornerRadius, shadow } = element
  const fillStyle = gradient ? gradientToCss(gradient) : fill
  const svgStroke = strokeWidth > 0 ? strokeColor : 'none'
  const filterStyle = shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none'

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: fillStyle,
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxShadow: shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
  }

  const gradId = `${gradIdPrefix}-${element.id}`
  const svgFill = gradient ? `url(#${gradId})` : fill

  switch (shapeType) {
    case 'rectangle':
    case 'rounded-rectangle':
      return <div style={{ ...baseStyle, borderRadius: cornerRadius || 0 }} />
    case 'circle':
    case 'ellipse':
      return <div style={{ ...baseStyle, borderRadius: '50%' }} />
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
            rx={cornerRadius}
            style={{ filter: filterStyle }}
          />
        </svg>
      )
    case 'container':
      return <div style={{ ...baseStyle, borderRadius: cornerRadius || 8 }} />
    default:
      return <div style={baseStyle} />
  }
}
