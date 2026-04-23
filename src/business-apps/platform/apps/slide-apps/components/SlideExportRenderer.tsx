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
import { gradientToCss } from './slideElements'
import { sanitizeMediaUrl, renderShape } from './slideRenderUtils'

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

interface SlideExportRendererProps {
  slides: SlideData[]
  slideIndices: number[]
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

      {element.type === 'shape' && renderShape(element as ShapeElement, 'export-grad')}

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
