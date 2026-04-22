/**
 * SlideExportRenderer - Read-only slide renderer for PDF/image export.
 * Renders slides at full 1280x720 resolution without interactive elements.
 */

import React from 'react'
import type {
  SlideData,
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  CodeElement,
  TableElement
} from './slideElements'
import { gradientToCss, gradientToSvgAttrs } from './slideElements'
import type { GradientConfig } from './slideElements'

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

/**
 * Sanitize media URL to prevent XSS attacks.
 * Only allows https, http, data:image, blob, or relative paths.
 */
const sanitizeMediaUrl = (url: string | undefined): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return trimmed
  }
  return ''
}

interface SlideExportRendererProps {
  slides: SlideData[]
  slideIndices: number[]
}

const renderSvgGradientDefs = (gradient: GradientConfig, id: string, viewBox = 100) => {
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

/**
 * Renders a single shape element.
 */
const renderShape = (element: ShapeElement): React.ReactNode => {
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

  const gradId = `export-grad-${element.id}`
  const svgFill = gradient ? `url(#${gradId})` : fill

  switch (shapeType) {
    case 'rectangle':
      return <div style={baseStyle} />
    case 'rounded-rectangle':
      return <div style={{ ...baseStyle, borderRadius: cornerRadius }} />
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
            points="30,0 55,35 40,35 40,100 20,100 20,35 5,35"
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
            points="30,100 55,65 40,65 40,0 20,0 20,65 5,65"
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
    default:
      return <div style={baseStyle} />
  }
}

/**
 * Renders a single slide element without interactive features.
 */
const renderElement = (element: AnySlideElement): React.ReactNode => {
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    transform: `rotate(${element.rotation}deg)`,
    opacity: element.opacity,
    zIndex: element.zIndex
  }

  return (
    <div key={element.id} style={wrapperStyle}>
      {element.type === 'text' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: (element as TextElement).gradient ? undefined : (element as TextElement).backgroundColor,
            background: (element as TextElement).gradient
              ? gradientToCss((element as TextElement).gradient!)
              : undefined,
            padding: (element as TextElement).padding,
            display: 'flex',
            flexDirection: 'column',
            justifyContent:
              (element as TextElement).verticalAlign === 'top'
                ? 'flex-start'
                : (element as TextElement).verticalAlign === 'bottom'
                  ? 'flex-end'
                  : 'center',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '100%',
              fontFamily: (element as TextElement).fontFamily,
              fontSize: (element as TextElement).fontSize,
              fontWeight: (element as TextElement).fontWeight,
              fontStyle: (element as TextElement).fontStyle,
              textDecoration: (element as TextElement).textDecoration,
              textAlign: (element as TextElement).textAlign,
              color: (element as TextElement).color,
              lineHeight: (element as TextElement).lineHeight,
              letterSpacing: (element as TextElement).letterSpacing,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {(element as TextElement).content}
          </div>
        </div>
      )}

      {element.type === 'shape' && renderShape(element as ShapeElement)}

      {element.type === 'image' && sanitizeMediaUrl((element as ImageElement).src) && (
        <img
          src={sanitizeMediaUrl((element as ImageElement).src)}
          alt={(element as ImageElement).alt}
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: (element as ImageElement).objectFit,
            borderRadius: (element as ImageElement).borderRadius,
            border:
              (element as ImageElement).borderWidth > 0
                ? `${(element as ImageElement).borderWidth}px solid ${(element as ImageElement).borderColor}`
                : 'none',
            boxShadow: (element as ImageElement).shadow
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : 'none'
          }}
          draggable={false}
        />
      )}

      {element.type === 'code' &&
        (() => {
          const ce = element as CodeElement
          const defaultBg = ce.theme === 'dark' ? '#1e1e1e' : '#f8f8f8'
          const defaultColor = ce.theme === 'dark' ? '#d4d4d4' : '#333'
          return (
            <pre
              style={{
                width: '100%',
                height: '100%',
                margin: 0,
                padding: ce.padding ?? 16,
                backgroundColor: ce.backgroundColor || defaultBg,
                color: ce.textColor || defaultColor,
                fontFamily: 'monospace',
                fontSize: ce.fontSize,
                overflow: 'hidden',
                borderRadius: ce.borderRadius ?? 8,
                border: (ce.borderWidth ?? 0) > 0 ? `${ce.borderWidth}px solid ${ce.borderColor || '#333333'}` : 'none',
                boxShadow: ce.shadow
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  : 'none'
              }}
            >
              <code>{ce.code}</code>
            </pre>
          )
        })()}

      {element.type === 'video' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'hsl(var(--foreground))',
            borderRadius: (element as VideoElement).borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(var(--background))',
            fontSize: '14px'
          }}
        >
          <span>Video: {(element as VideoElement).src}</span>
        </div>
      )}

      {element.type === 'table' && (
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: (element as TableElement).borderRadius,
            border: `${(element as TableElement).borderWidth}px solid ${(element as TableElement).borderColor}`
          }}
        >
          <table
            style={{
              width: '100%',
              height: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}
          >
            <thead>
              <tr>
                {(element as TableElement).headers.map((header, idx) => (
                  <th
                    key={`header-${idx}`}
                    style={{
                      backgroundColor: (element as TableElement).headerBackground,
                      color: (element as TableElement).headerTextColor,
                      fontSize: (element as TableElement).headerFontSize,
                      fontWeight: 'bold',
                      padding: (element as TableElement).cellPadding,
                      textAlign: 'left',
                      borderBottom: `${(element as TableElement).borderWidth}px solid ${(element as TableElement).borderColor}`,
                      borderRight:
                        idx < (element as TableElement).headers.length - 1
                          ? `${(element as TableElement).borderWidth}px solid ${(element as TableElement).borderColor}`
                          : 'none'
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(element as TableElement).rows.map((row, rowIdx) => (
                <tr key={`row-${rowIdx}`}>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={`cell-${rowIdx}-${cellIdx}`}
                      style={{
                        backgroundColor:
                          (element as TableElement).rowAlternateBackground && rowIdx % 2 === 1
                            ? (element as TableElement).rowAlternateBackground
                            : (element as TableElement).rowBackground,
                        color: (element as TableElement).rowTextColor,
                        fontSize: (element as TableElement).fontSize,
                        padding: (element as TableElement).cellPadding,
                        textAlign: 'left',
                        borderBottom:
                          rowIdx < (element as TableElement).rows.length - 1
                            ? `${(element as TableElement).borderWidth}px solid ${(element as TableElement).borderColor}`
                            : 'none',
                        borderRight:
                          cellIdx < row.length - 1
                            ? `${(element as TableElement).borderWidth}px solid ${(element as TableElement).borderColor}`
                            : 'none',
                        verticalAlign: 'middle',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Get background style for a slide.
 */
const getBackgroundStyle = (background: SlideData['background']): React.CSSProperties => {
  switch (background.type) {
    case 'gradient':
      return background.gradient ? { background: gradientToCss(background.gradient) } : {}
    case 'image':
      return background.imageUrl
        ? {
            backgroundImage: `url(${background.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        : {}
    case 'video':
      return { backgroundColor: '#000000' }
    default:
      return { backgroundColor: background.color || '#ffffff' }
  }
}

/**
 * Renders a single slide for export.
 */
const ExportSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  return (
    <div
      data-export-slide="true"
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        ...getBackgroundStyle(slide.background)
      }}
    >
      {slide.background.type === 'video' && slide.background.videoUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'hsl(var(--foreground))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(var(--background))',
            fontSize: '16px'
          }}
        >
          Video Background
        </div>
      )}
      {sortedElements.map(element => renderElement(element))}
    </div>
  )
}

/**
 * Container component that renders multiple slides for export.
 * Positioned off-screen for capturing.
 */
export const SlideExportRenderer: React.FC<SlideExportRendererProps> = ({ slides, slideIndices }) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'hsl(var(--muted))',
        padding: '8px'
      }}
    >
      {slideIndices.map(index => {
        const slide = slides[index]
        if (!slide) return null
        return <ExportSlide key={`export-${slide.id}-${index}`} slide={slide} />
      })}
    </div>
  )
}

export default SlideExportRenderer
