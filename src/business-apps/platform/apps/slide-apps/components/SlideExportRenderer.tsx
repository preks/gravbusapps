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
import { gradientToCss, getImageCropStyles, textTransformToCss, textElementStubForShapeInText } from './slideElements'
import { resolveFontStack } from './fontStack'
import { RichTextContent } from './RichTextContent'
import { tryRenderOfficePresetShape } from './OfficeShapeRenderer'
import { sanitizeSlideImageUrl } from '../utils/slideMediaUrl'

/**
 * Default export dimensions when the deck has no declared canvas size.
 * Matches the legacy 16:9 widescreen preset (1280x720 @ 96 DPI).
 */
const DEFAULT_SLIDE_WIDTH = 1280
const DEFAULT_SLIDE_HEIGHT = 720

const sanitizeMediaUrl = sanitizeSlideImageUrl

interface SlideExportRendererProps {
  slides: SlideData[]
  slideIndices: number[]
}

/**
 * Renders a single shape element.
 */
const renderShape = (element: ShapeElement): React.ReactNode => {
  const { shapeType, fill, gradient, strokeColor, strokeWidth, strokeStyle, cornerRadius, shadow } = element
  const fillStyle = gradient ? gradientToCss(gradient) : fill

  // Preset-aware renderer for PPTX-imported shapes. When the shape does not
  // carry importMeta (or the preset is not implemented) we fall back to the
  // generic shapeType switch below, so editor-native shapes are unaffected.
  const officePreset = tryRenderOfficePresetShape({
    element,
    fillStyle,
    strokeColor,
    strokeWidth,
    shadow,
    width: element.size.width,
    height: element.size.height
  })
  if (officePreset) {
    return <div style={{ width: '100%', height: '100%' }}>{officePreset}</div>
  }

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: fillStyle,
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxShadow: shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
  }

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
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="50,5 95,95 5,95"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
              style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
            />
          </svg>
        </div>
      )
    case 'diamond':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="50,5 95,50 50,95 5,50"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
              style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
            />
          </svg>
        </div>
      )
    case 'star':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
              style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
            />
          </svg>
        </div>
      )
    case 'hexagon':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="25,5 75,5 100,50 75,95 25,95 0,50"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
              style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
            />
          </svg>
        </div>
      )
    case 'arrow-right':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="0,20 65,20 65,5 100,30 65,55 65,40 0,40"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
            />
          </svg>
        </div>
      )
    case 'arrow-left':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="100,20 35,20 35,5 0,30 35,55 35,40 100,40"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
            />
          </svg>
        </div>
      )
    case 'arrow-up':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="30,0 55,35 40,35 40,100 20,100 20,35 5,35"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
            />
          </svg>
        </div>
      )
    case 'arrow-down':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 60 100" style={{ width: '100%', height: '100%' }}>
            <polygon
              points="30,100 55,65 40,65 40,0 20,0 20,65 5,65"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
            />
          </svg>
        </div>
      )
    case 'line':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: strokeWidth || 4, backgroundColor: fill }} />
        </div>
      )
    case 'callout':
      return (
        <div style={{ width: '100%', height: '100%' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <path
              d="M5,5 H95 V70 H40 L25,95 L30,70 H5 Z"
              fill={fillStyle}
              stroke={strokeWidth > 0 ? strokeColor : 'none'}
              strokeWidth={strokeWidth}
              style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
            />
          </svg>
        </div>
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
      {element.type === 'text' &&
        (() => {
          const textEl: TextElement = element
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: textEl.gradient ? undefined : textEl.backgroundColor,
                background: textEl.gradient ? gradientToCss(textEl.gradient) : undefined,
                padding: textEl.padding,
                display: 'flex',
                flexDirection: 'column',
                justifyContent:
                  textEl.verticalAlign === 'top'
                    ? 'flex-start'
                    : textEl.verticalAlign === 'bottom'
                      ? 'flex-end'
                      : 'center',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: '100%',
                  fontFamily: resolveFontStack(textEl.fontFamily),
                  fontSize: textEl.fontSize,
                  fontWeight: textEl.fontWeight,
                  fontStyle: textEl.fontStyle,
                  textDecoration: textEl.textDecoration,
                  textAlign: textEl.textAlign,
                  color: textEl.color,
                  lineHeight: textEl.lineHeight,
                  letterSpacing: textEl.letterSpacing,
                  ...textTransformToCss(textEl.textTransform),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {textEl.paragraphs && textEl.paragraphs.length > 0 ? (
                  <RichTextContent element={textEl} paragraphs={textEl.paragraphs} />
                ) : (
                  textEl.content
                )}
              </div>
            </div>
          )
        })()}

      {element.type === 'shape' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {renderShape(element)}
          {(() => {
            const se: ShapeElement = element
            const st = se.shapeText
            if (!st) return null
            const te = textElementStubForShapeInText(se, st)
            return (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent:
                    te.verticalAlign === 'top' ? 'flex-start' : te.verticalAlign === 'bottom' ? 'flex-end' : 'center',
                  padding: st.padding,
                  overflow: st.allowOverflow === true ? 'visible' : 'hidden',
                  boxSizing: 'border-box',
                  zIndex: 1
                }}
              >
                {st.paragraphs && st.paragraphs.length > 0 ? (
                  <RichTextContent element={te} paragraphs={st.paragraphs} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      fontFamily: resolveFontStack(te.fontFamily),
                      fontSize: te.fontSize,
                      fontWeight: te.fontWeight,
                      fontStyle: te.fontStyle,
                      textDecoration: te.textDecoration,
                      textAlign: te.textAlign,
                      color: te.color,
                      lineHeight: te.lineHeight,
                      letterSpacing: te.letterSpacing,
                      ...textTransformToCss(te.textTransform),
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {st.content}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {element.type === 'image' &&
        sanitizeMediaUrl(element.src) &&
        (() => {
          const imgEl: ImageElement = element
          const crop = getImageCropStyles(imgEl.cropRect)
          const commonVisualStyle = {
            borderRadius: imgEl.borderRadius,
            border: imgEl.borderWidth > 0 ? `${imgEl.borderWidth}px solid ${imgEl.borderColor}` : 'none',
            boxShadow: imgEl.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
          }

          if (crop.wrapperNeeded) {
            return (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  ...commonVisualStyle
                }}
              >
                <img
                  src={sanitizeMediaUrl(imgEl.src)}
                  alt={imgEl.alt}
                  crossOrigin="anonymous"
                  style={crop.imgStyle}
                  draggable={false}
                />
              </div>
            )
          }

          return (
            <img
              src={sanitizeMediaUrl(imgEl.src)}
              alt={imgEl.alt}
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: imgEl.objectFit, ...commonVisualStyle }}
              draggable={false}
            />
          )
        })()}

      {element.type === 'code' &&
        (() => {
          const ce: CodeElement = element
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

      {element.type === 'video' &&
        (() => {
          const videoEl: VideoElement = element
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'hsl(var(--foreground))',
                borderRadius: videoEl.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--background))',
                fontSize: '14px'
              }}
            >
              <span>Video: {videoEl.src}</span>
            </div>
          )
        })()}

      {element.type === 'table' &&
        (() => {
          const tableEl: TableElement = element
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: tableEl.borderRadius,
                border: `${tableEl.borderWidth}px solid ${tableEl.borderColor}`
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
                    {tableEl.headers.map((header, idx) => (
                      <th
                        key={`header-${idx}`}
                        style={{
                          backgroundColor: tableEl.headerBackground,
                          color: tableEl.headerTextColor,
                          fontSize: tableEl.headerFontSize,
                          fontWeight: 'bold',
                          padding: tableEl.cellPadding,
                          textAlign: 'left',
                          borderBottom: `${tableEl.borderWidth}px solid ${tableEl.borderColor}`,
                          borderRight:
                            idx < tableEl.headers.length - 1
                              ? `${tableEl.borderWidth}px solid ${tableEl.borderColor}`
                              : 'none'
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableEl.rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={`cell-${rowIdx}-${cellIdx}`}
                          style={{
                            backgroundColor:
                              tableEl.rowAlternateBackground && rowIdx % 2 === 1
                                ? tableEl.rowAlternateBackground
                                : tableEl.rowBackground,
                            color: tableEl.rowTextColor,
                            fontSize: tableEl.fontSize,
                            padding: tableEl.cellPadding,
                            textAlign: 'left',
                            borderBottom:
                              rowIdx < tableEl.rows.length - 1
                                ? `${tableEl.borderWidth}px solid ${tableEl.borderColor}`
                                : 'none',
                            borderRight:
                              cellIdx < row.length - 1
                                ? `${tableEl.borderWidth}px solid ${tableEl.borderColor}`
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
          )
        })()}
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
  // Render at the slide's declared canvas size so PPTX imports preserve
  // their original aspect ratio (4:3, A4, etc.) in PDF / image exports.
  const slideWidth = slide.canvasSize?.width ?? DEFAULT_SLIDE_WIDTH
  const slideHeight = slide.canvasSize?.height ?? DEFAULT_SLIDE_HEIGHT

  return (
    <div
      data-export-slide="true"
      style={{
        width: slideWidth,
        height: slideHeight,
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
