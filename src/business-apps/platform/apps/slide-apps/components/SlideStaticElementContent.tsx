import React from 'react'
import type {
  AnySlideElement,
  BadgeElement,
  CodeElement,
  ConnectorElement,
  FooterElement,
  GroupElement,
  ImageElement,
  LayerElement,
  LogoElement,
  MetricCardElement,
  ShapeElement,
  TableElement,
  TextElement,
  VideoElement
} from './slideElements'
import { gradientToCss, getImageCropStyles, textElementStubForShapeInText, textTransformToCss } from './slideElements'
import { resolveFontStack } from './fontStack'
import { SlideChartRenderer } from './SlideChartRenderer'
import { RichTextContent } from './RichTextContent'
import { getRichTextBoxStyle } from './richTextStyles'
import { TextWithLinks } from './TextWithLinks'
import { tryRenderOfficePresetShape } from './OfficeShapeRenderer'
import { renderShape as renderSharedShape } from './slideRenderUtils'
import { useResolvedSlideMediaUrl } from '../hooks/useResolvedSlideMediaUrl'
import { isEmbedVideoElement, resolveVideoPlaybackUrl, resolveVideoPreviewUrl } from '../utils/videoElement'

interface SlideStaticElementContentProps {
  element: AnySlideElement
  isPresenting?: boolean
  onLinkClick?: (url: string, linkId: string, e: React.MouseEvent) => void
  renderVideoElement?: boolean
  disableMediaPointerEvents?: boolean
}

function StaticImageContent({ element }: { element: ImageElement }) {
  const imageUrl = useResolvedSlideMediaUrl(element.src)
  const crop = getImageCropStyles(element.cropRect)
  const commonStyle = {
    borderRadius: element.borderRadius,
    border: element.borderWidth > 0 ? `${element.borderWidth}px solid ${element.borderColor}` : 'none',
    boxShadow: element.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
  }

  if (!imageUrl) return null

  return crop.wrapperNeeded ? (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...commonStyle }}>
      <img src={imageUrl} alt={element.alt} style={crop.imgStyle} draggable={false} />
    </div>
  ) : (
    <img
      src={imageUrl}
      alt={element.alt}
      style={{ width: '100%', height: '100%', objectFit: element.objectFit, ...commonStyle }}
      draggable={false}
    />
  )
}

function StaticVideoContent({
  element,
  renderVideoElement,
  disableMediaPointerEvents = false
}: {
  element: VideoElement
  renderVideoElement: boolean
  disableMediaPointerEvents?: boolean
}) {
  const previewImageUrl = useResolvedSlideMediaUrl(resolveVideoPreviewUrl(element))
  const videoUrl = useResolvedSlideMediaUrl(resolveVideoPlaybackUrl(element))

  if (!renderVideoElement) {
    if (previewImageUrl) {
      return (
        <img
          src={previewImageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: element.objectFit,
            borderRadius: element.borderRadius,
            boxShadow: element.shadow
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : 'none'
          }}
          draggable={false}
        />
      )
    }

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'hsl(var(--foreground))',
          borderRadius: element.borderRadius
        }}
      />
    )
  }

  if (!videoUrl) return null

  if (isEmbedVideoElement(element)) {
    return (
      <iframe
        src={videoUrl}
        title={element.provider === 'youtube' ? 'YouTube video' : 'Embedded video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        data-testid={`slide-video-embed-${element.id}`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: element.borderRadius,
          boxShadow: element.shadow
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : 'none',
          pointerEvents: disableMediaPointerEvents ? 'none' : 'auto',
          cursor: disableMediaPointerEvents ? 'inherit' : 'auto'
        }}
      />
    )
  }

  return (
    <video
      src={videoUrl}
      controls
      loop={element.loop}
      muted={element.muted}
      playsInline
      preload="metadata"
      poster={previewImageUrl || undefined}
      data-testid={`slide-video-element-${element.id}`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: element.objectFit,
        borderRadius: element.borderRadius,
        boxShadow: element.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
        pointerEvents: disableMediaPointerEvents ? 'none' : 'auto',
        cursor: disableMediaPointerEvents ? 'inherit' : 'auto'
      }}
    />
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '')
  const r = Number.parseInt(cleanHex.substring(0, 2), 16)
  const g = Number.parseInt(cleanHex.substring(2, 4), 16)
  const b = Number.parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function renderShapeBody(element: ShapeElement): React.ReactNode {
  const {
    shapeType,
    fill,
    gradient,
    strokeColor,
    strokeWidth,
    strokeStyle,
    cornerRadius,
    shadow,
    pictureFill,
    patternFill
  } = element
  const fillStyle = pictureFill
    ? `url("${pictureFill.src}")`
    : patternFill
      ? patternFill.fgColor
      : gradient
        ? gradientToCss(gradient)
        : fill

  const officePreset = tryRenderOfficePresetShape({
    element,
    fillStyle: pictureFill || patternFill ? 'transparent' : fillStyle,
    ...(gradient ? { gradient } : {}),
    strokeColor,
    strokeWidth,
    shadow,
    width: element.size.width,
    height: element.size.height
  })

  if (officePreset) {
    if (pictureFill) {
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <img
            src={pictureFill.src}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: pictureFill.tile ? 'none' : 'cover',
              backgroundRepeat: pictureFill.tile ? 'repeat' : 'no-repeat'
            }}
          />
          <div style={{ position: 'absolute', inset: 0 }}>{officePreset}</div>
        </div>
      )
    }

    if (patternFill) {
      const patternBg = `repeating-linear-gradient(45deg, ${patternFill.fgColor} 0, ${patternFill.fgColor} 3px, ${patternFill.bgColor} 3px, ${patternFill.bgColor} 8px)`
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: patternBg }} />
          <div style={{ position: 'absolute', inset: 0 }}>{officePreset}</div>
        </div>
      )
    }

    return <div style={{ width: '100%', height: '100%' }}>{officePreset}</div>
  }

  if (!pictureFill && !patternFill) {
    return renderSharedShape(element, 'slide-static')
  }

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: pictureFill
      ? `url("${pictureFill.src}") center / ${pictureFill.tile ? 'auto repeat' : 'cover no-repeat'}`
      : patternFill
        ? `repeating-linear-gradient(45deg, ${patternFill.fgColor} 0, ${patternFill.fgColor} 3px, ${patternFill.bgColor} 3px, ${patternFill.bgColor} 8px)`
        : fillStyle,
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxShadow: shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
  }

  switch (shapeType) {
    case 'rounded-rectangle':
      return <div style={{ ...baseStyle, borderRadius: cornerRadius || 0 }} />
    case 'circle':
    case 'ellipse':
      return <div style={{ ...baseStyle, borderRadius: '50%' }} />
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="50,5 95,95 5,95"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="50,5 95,50 50,95 5,50"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'hexagon':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="25,5 75,5 100,50 75,95 25,95 0,50"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="0,20 65,20 65,5 100,30 65,55 65,40 0,40"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
          <polygon
            points="100,20 35,20 35,5 0,30 35,55 35,40 100,40"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    case 'line':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: strokeWidth || 4, backgroundColor: fill }} />
        </div>
      )
    case 'callout':
      return (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <path
            d="M5,5 H95 V70 H40 L25,95 L30,70 H5 Z"
            fill={fillStyle}
            stroke={strokeWidth > 0 ? strokeColor : 'none'}
            strokeWidth={strokeWidth}
          />
        </svg>
      )
    default:
      return <div style={baseStyle} />
  }
}

function renderShapeContent(
  element: ShapeElement,
  isPresenting: boolean,
  onLinkClick?: SlideStaticElementContentProps['onLinkClick']
) {
  const st = element.shapeText
  const effects = element.effects
  const filters: string[] = []
  if (effects?.glow) filters.push(`drop-shadow(0 0 ${effects.glow.size}px ${effects.glow.color})`)
  if (effects?.outerShadow)
    filters.push(
      `drop-shadow(${effects.outerShadow.offsetX}px ${effects.outerShadow.offsetY}px ${effects.outerShadow.blur}px ${effects.outerShadow.color})`
    )
  if (effects?.innerShadow)
    filters.push(
      `drop-shadow(${effects.innerShadow.offsetX}px ${effects.innerShadow.offsetY}px ${effects.innerShadow.size}px ${effects.innerShadow.color})`
    )
  if (effects?.blur) filters.push(`blur(${Math.max(0, effects.blur.radius)}px)`)
  if (effects?.softEdges) filters.push(`blur(${Math.max(0, Math.min(effects.softEdges.size, 10))}px)`)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '100%', filter: filters.length > 0 ? filters.join(' ') : undefined }}>
        {renderShapeBody(element)}
      </div>
      {effects?.reflection && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: `calc(100% + ${effects.reflection.distance}px)`,
            width: '100%',
            height: '100%',
            transform: 'scaleY(-1)',
            transformOrigin: 'top',
            opacity: effects.reflection.opacity,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
            pointerEvents: 'none'
          }}
        >
          {renderShapeBody(element)}
        </div>
      )}
      {st && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent:
              st.verticalAlign === 'top' ? 'flex-start' : st.verticalAlign === 'bottom' ? 'flex-end' : 'center',
            padding: st.padding,
            overflow: st.allowOverflow === true ? 'visible' : 'hidden',
            boxSizing: 'border-box',
            zIndex: 1
          }}
        >
          {st.paragraphs && st.paragraphs.length > 0 ? (
            <RichTextContent element={textElementStubForShapeInText(element, st)} paragraphs={st.paragraphs} />
          ) : (
            <div
              style={{
                width: '100%',
                fontFamily: resolveFontStack(st.fontFamily),
                fontSize: st.fontSize,
                fontWeight: st.fontWeight,
                fontStyle: st.fontStyle,
                textDecoration: st.textDecoration,
                textAlign: st.textAlign,
                color: st.color,
                lineHeight: st.lineHeight,
                letterSpacing: st.letterSpacing,
                ...textTransformToCss(st.textTransform),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              <TextWithLinks
                content={st.content}
                links={st.links ?? []}
                isPresenting={isPresenting}
                onLinkClick={onLinkClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function renderGroupContent(group: GroupElement, props: Omit<SlideStaticElementContentProps, 'element'>) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
      {group.children.map(child => (
        <div
          key={child.id}
          style={{
            position: 'absolute',
            left: child.position.x,
            top: child.position.y,
            width: child.size.width,
            height: child.size.height,
            transform: `rotate(${child.rotation ?? 0}deg)`,
            opacity: child.opacity ?? 1
          }}
        >
          <SlideStaticElementContent element={child} {...props} />
        </div>
      ))}
    </div>
  )
}

export function SlideStaticElementContent({
  element,
  isPresenting = false,
  onLinkClick,
  renderVideoElement = true,
  disableMediaPointerEvents = false
}: SlideStaticElementContentProps) {
  if (element.type === 'text') {
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
            textEl.verticalAlign === 'top' ? 'flex-start' : textEl.verticalAlign === 'bottom' ? 'flex-end' : 'center',
          overflow: 'hidden'
        }}
      >
        <div style={getRichTextBoxStyle(textEl)}>
          {textEl.paragraphs && textEl.paragraphs.length > 0 ? (
            <RichTextContent element={textEl} paragraphs={textEl.paragraphs} />
          ) : (
            <TextWithLinks
              content={textEl.content}
              links={textEl.links ?? []}
              isPresenting={isPresenting}
              onLinkClick={onLinkClick}
            />
          )}
        </div>
      </div>
    )
  }

  if (element.type === 'shape') return renderShapeContent(element, isPresenting, onLinkClick)

  if (element.type === 'image') return <StaticImageContent element={element} />

  if (element.type === 'code') {
    const codeEl: CodeElement = element
    const defaultBg = codeEl.theme === 'dark' ? '#1e1e1e' : '#f8f8f8'
    const defaultColor = codeEl.theme === 'dark' ? '#d4d4d4' : '#333'
    return (
      <pre
        style={{
          width: '100%',
          height: '100%',
          margin: 0,
          padding: codeEl.padding ?? 16,
          backgroundColor: codeEl.backgroundColor || defaultBg,
          color: codeEl.textColor || defaultColor,
          fontFamily: 'monospace',
          fontSize: codeEl.fontSize,
          overflow: 'hidden',
          borderRadius: codeEl.borderRadius ?? 8,
          border:
            (codeEl.borderWidth ?? 0) > 0 ? `${codeEl.borderWidth}px solid ${codeEl.borderColor || '#333333'}` : 'none',
          boxShadow: codeEl.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
          boxSizing: 'border-box'
        }}
      >
        <code>{codeEl.code}</code>
      </pre>
    )
  }

  if (element.type === 'video') {
    return (
      <StaticVideoContent
        element={element}
        renderVideoElement={renderVideoElement}
        disableMediaPointerEvents={disableMediaPointerEvents}
      />
    )
  }

  if (element.type === 'table') {
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
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
                        cellIdx < row.length - 1 ? `${tableEl.borderWidth}px solid ${tableEl.borderColor}` : 'none',
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
  }

  if (element.type === 'chart')
    return <SlideChartRenderer element={element} width={element.size.width} height={element.size.height} />

  if (element.type === 'logo') {
    const logoEl: LogoElement = element
    const isDark = logoEl.preset === 'newwork-dark'
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8
        }}
      >
        {logoEl.showText && (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 1,
              color: isDark ? '#ffffff' : '#0a0a0a',
              backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <span>NEW</span>
            <span>WORK</span>
          </span>
        )}
      </div>
    )
  }

  if (element.type === 'footer') {
    const footerEl: FooterElement = element
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 80,
          paddingRight: 80,
          fontSize: footerEl.fontSize,
          color: footerEl.color
        }}
      >
        <div style={{ flex: 1 }}>
          {footerEl.confidentialityText && (
            <span style={{ fontSize: footerEl.fontSize - 2 }}>{footerEl.confidentialityText}</span>
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>{footerEl.dateText}</div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          {footerEl.showPageNumber && (
            <span>
              {footerEl.pageNumber}
              {footerEl.totalPages && ` / ${footerEl.totalPages}`}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (element.type === 'badge') {
    const badgeEl: BadgeElement = element
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: badgeEl.borderRadius,
      fontSize: badgeEl.fontSize,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif'
    }
    const style =
      badgeEl.variant === 'outlined'
        ? {
            ...baseStyle,
            color: badgeEl.backgroundColor,
            border: `2px solid ${badgeEl.borderColor || badgeEl.backgroundColor}`
          }
        : badgeEl.variant === 'subtle'
          ? { ...baseStyle, backgroundColor: `${badgeEl.backgroundColor}20`, color: badgeEl.backgroundColor }
          : { ...baseStyle, backgroundColor: badgeEl.backgroundColor, color: badgeEl.textColor }
    return (
      <div style={style}>
        <span>{badgeEl.label}</span>
      </div>
    )
  }

  if (element.type === 'connector') {
    const connectorEl: ConnectorElement = element
    const relativeStart = {
      x: connectorEl.startPoint.x - element.position.x,
      y: connectorEl.startPoint.y - element.position.y
    }
    const relativeEnd = {
      x: connectorEl.endPoint.x - element.position.x,
      y: connectorEl.endPoint.y - element.position.y
    }
    const arrowMarkerId = `arrow-${connectorEl.id}`
    const path =
      connectorEl.lineType === 'straight'
        ? `M ${relativeStart.x} ${relativeStart.y} L ${relativeEnd.x} ${relativeEnd.y}`
        : connectorEl.lineType === 'elbow'
          ? `M ${relativeStart.x} ${relativeStart.y} L ${(relativeStart.x + relativeEnd.x) / 2} ${relativeStart.y} L ${(relativeStart.x + relativeEnd.x) / 2} ${relativeEnd.y} L ${relativeEnd.x} ${relativeEnd.y}`
          : `M ${relativeStart.x} ${relativeStart.y} Q ${(relativeStart.x + relativeEnd.x) / 2} ${relativeStart.y} ${(relativeStart.x + relativeEnd.x) / 2} ${(relativeStart.y + relativeEnd.y) / 2} Q ${(relativeStart.x + relativeEnd.x) / 2} ${relativeEnd.y} ${relativeEnd.x} ${relativeEnd.y}`
    const strokeDasharray =
      connectorEl.strokeStyle === 'dashed' ? '8 4' : connectorEl.strokeStyle === 'dotted' ? '2 4' : undefined

    return (
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth={connectorEl.arrowSize}
            markerHeight={connectorEl.arrowSize}
            refX={connectorEl.arrowSize - 1}
            refY={connectorEl.arrowSize / 2}
            orient="auto"
          >
            <polygon
              points={`0 0, ${connectorEl.arrowSize} ${connectorEl.arrowSize / 2}, 0 ${connectorEl.arrowSize}`}
              fill={connectorEl.strokeColor}
            />
          </marker>
        </defs>
        <path
          d={path}
          stroke={connectorEl.strokeColor}
          strokeWidth={connectorEl.strokeWidth}
          strokeDasharray={strokeDasharray}
          fill="none"
          markerEnd={connectorEl.endArrow ? `url(#${arrowMarkerId})` : undefined}
          markerStart={connectorEl.startArrow ? `url(#${arrowMarkerId})` : undefined}
        />
        {connectorEl.label && (
          <text
            x={(relativeStart.x + relativeEnd.x) / 2}
            y={(relativeStart.y + relativeEnd.y) / 2 - 8}
            textAnchor="middle"
            fill={connectorEl.labelColor || connectorEl.strokeColor}
            fontSize={connectorEl.labelFontSize || 12}
            fontFamily="Inter, sans-serif"
          >
            {connectorEl.label}
          </text>
        )}
      </svg>
    )
  }

  if (element.type === 'layer') {
    const layerEl: LayerElement = element
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          backgroundColor: layerEl.backgroundColor,
          color: layerEl.textColor,
          borderRadius: layerEl.borderRadius,
          border: layerEl.borderColor !== 'transparent' ? `1px solid ${layerEl.borderColor}` : undefined,
          boxShadow: layerEl.depth > 0 ? `0 ${layerEl.depth}px ${layerEl.depth * 2}px rgba(0,0,0,0.2)` : undefined,
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: layerEl.labelFontSize, fontWeight: 600 }}>{layerEl.label}</div>
          {layerEl.description && (
            <div style={{ fontSize: layerEl.descriptionFontSize, opacity: 0.8, marginTop: 2 }}>
              {layerEl.description}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (element.type === 'metric-card') {
    const metricEl: MetricCardElement = element
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          backgroundColor: metricEl.backgroundColor,
          borderRadius: metricEl.borderRadius,
          border: metricEl.borderWidth ? `${metricEl.borderWidth}px solid ${metricEl.borderColor}` : undefined,
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {metricEl.trendValue && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: 12,
              color: metricEl.trend === 'up' ? '#22c55e' : metricEl.trend === 'down' ? '#ef4444' : '#64748b'
            }}
          >
            {metricEl.trendValue}
          </div>
        )}
        <div
          style={{
            fontSize: metricEl.valueFontSize,
            fontWeight: 700,
            color: metricEl.valueColor,
            lineHeight: 1.1,
            marginBottom: 8
          }}
        >
          {metricEl.value}
        </div>
        <div style={{ fontSize: metricEl.labelFontSize, fontWeight: 600, color: metricEl.labelColor, marginBottom: 4 }}>
          {metricEl.label}
        </div>
        {metricEl.description && (
          <div
            style={{
              fontSize: metricEl.descriptionFontSize,
              color: metricEl.descriptionColor || hexToRgba(metricEl.labelColor, 0.7),
              lineHeight: 1.4
            }}
          >
            {metricEl.description}
          </div>
        )}
      </div>
    )
  }

  if (element.type === 'group') return renderGroupContent(element, { isPresenting, onLinkClick, renderVideoElement })

  return null
}

export default SlideStaticElementContent
