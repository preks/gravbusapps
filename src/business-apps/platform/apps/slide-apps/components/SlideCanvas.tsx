/**
 * SlideCanvas - Draggable/Resizable canvas for slide elements
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import type {
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  TableElement,
  Position,
  Size
} from './slideElements'
import { gradientToCss } from './slideElements'

interface SlideCanvasProps {
  elements: AnySlideElement[]
  selectedId: string | null
  background: {
    type: 'solid' | 'gradient' | 'image' | 'video'
    color?: string
    gradient?: { type: 'linear' | 'radial'; angle: number; stops: { color: string; position: number }[] }
    imageUrl?: string
    videoUrl?: string
    videoMuted?: boolean
    videoLoop?: boolean
  }
  onSelectElement: (id: string | null) => void
  onUpdateElement: (id: string, updates: Partial<AnySlideElement>) => void
  onEditText: (id: string) => void
  scale?: number
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  elements,
  selectedId,
  background,
  onSelectElement,
  onUpdateElement,
  onEditText,
  scale = 1
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [elementStart, setElementStart] = useState<{ position: Position; size: Size } | null>(null)

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (background.type) {
      case 'gradient':
        return background.gradient ? { background: gradientToCss(background.gradient) } : {}
      case 'image':
        return background.imageUrl
          ? { backgroundImage: `url(${background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}
      case 'video':
        // Video backgrounds are rendered separately, use transparent background
        return { backgroundColor: '#000000' }
      default:
        return { backgroundColor: background.color || '#ffffff' }
    }
  }

  const renderVideoBackground = () => {
    if (background.type !== 'video' || !background.videoUrl) return null
    return (
      <video
        autoPlay
        loop={background.videoLoop !== false}
        muted={background.videoMuted !== false}
        playsInline
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src={background.videoUrl} type="video/mp4" />
      </video>
    )
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectElement(null)
    }
  }

  const handleElementMouseDown = (e: React.MouseEvent, element: AnySlideElement) => {
    e.stopPropagation()
    if (element.locked) return

    onSelectElement(element.id)
    setIsDragging(true)
    setDragStart({ x: e.clientX / scale, y: e.clientY / scale })
    setElementStart({ position: { ...element.position }, size: { ...element.size } })
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle, element: AnySlideElement) => {
    e.stopPropagation()
    if (element.locked) return

    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: e.clientX / scale, y: e.clientY / scale })
    setElementStart({ position: { ...element.position }, size: { ...element.size } })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!selectedId || !elementStart) return

      const currentX = e.clientX / scale
      const currentY = e.clientY / scale
      const deltaX = currentX - dragStart.x
      const deltaY = currentY - dragStart.y

      if (isDragging) {
        onUpdateElement(selectedId, {
          position: {
            x: Math.max(0, elementStart.position.x + deltaX),
            y: Math.max(0, elementStart.position.y + deltaY)
          }
        })
      } else if (isResizing && resizeHandle) {
        const newPosition = { ...elementStart.position }
        const newSize = { ...elementStart.size }

        switch (resizeHandle) {
          case 'se':
            newSize.width = Math.max(50, elementStart.size.width + deltaX)
            newSize.height = Math.max(30, elementStart.size.height + deltaY)
            break
          case 'sw':
            newPosition.x = Math.max(0, elementStart.position.x + deltaX)
            newSize.width = Math.max(50, elementStart.size.width - deltaX)
            newSize.height = Math.max(30, elementStart.size.height + deltaY)
            break
          case 'ne':
            newPosition.y = Math.max(0, elementStart.position.y + deltaY)
            newSize.width = Math.max(50, elementStart.size.width + deltaX)
            newSize.height = Math.max(30, elementStart.size.height - deltaY)
            break
          case 'nw':
            newPosition.x = Math.max(0, elementStart.position.x + deltaX)
            newPosition.y = Math.max(0, elementStart.position.y + deltaY)
            newSize.width = Math.max(50, elementStart.size.width - deltaX)
            newSize.height = Math.max(30, elementStart.size.height - deltaY)
            break
          case 'n':
            newPosition.y = Math.max(0, elementStart.position.y + deltaY)
            newSize.height = Math.max(30, elementStart.size.height - deltaY)
            break
          case 's':
            newSize.height = Math.max(30, elementStart.size.height + deltaY)
            break
          case 'e':
            newSize.width = Math.max(50, elementStart.size.width + deltaX)
            break
          case 'w':
            newPosition.x = Math.max(0, elementStart.position.x + deltaX)
            newSize.width = Math.max(50, elementStart.size.width - deltaX)
            break
        }

        onUpdateElement(selectedId, { position: newPosition, size: newSize })
      }
    },
    [selectedId, isDragging, isResizing, resizeHandle, dragStart, elementStart, onUpdateElement, scale]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
    setElementStart(null)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const renderShape = (element: ShapeElement) => {
    const { shapeType, fill, gradient, strokeColor, strokeWidth, strokeStyle, cornerRadius, shadow } = element
    const fillStyle = gradient ? gradientToCss(gradient) : fill

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
        return <div style={{ ...baseStyle, borderRadius: '50%' }} />
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
                rx={cornerRadius}
                style={{ filter: shadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}
              />
            </svg>
          </div>
        )
      default:
        return <div style={baseStyle} />
    }
  }

  const renderElement = (element: AnySlideElement) => {
    const isSelected = selectedId === element.id

    const wrapperStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      cursor: element.locked ? 'not-allowed' : 'move',
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px',
      zIndex: element.zIndex
    }

    const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]

    return (
      <div
        key={element.id}
        style={wrapperStyle}
        onMouseDown={e => handleElementMouseDown(e, element)}
        onDoubleClick={() => element.type === 'text' && onEditText(element.id)}
      >
        {element.type === 'text' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              fontFamily: (element as TextElement).fontFamily,
              fontSize: (element as TextElement).fontSize,
              fontWeight: (element as TextElement).fontWeight,
              fontStyle: (element as TextElement).fontStyle,
              textDecoration: (element as TextElement).textDecoration,
              textAlign: (element as TextElement).textAlign,
              color: (element as TextElement).color,
              backgroundColor: (element as TextElement).gradient ? undefined : (element as TextElement).backgroundColor,
              background: (element as TextElement).gradient
                ? gradientToCss((element as TextElement).gradient!)
                : undefined,
              lineHeight: (element as TextElement).lineHeight,
              letterSpacing: (element as TextElement).letterSpacing,
              padding: (element as TextElement).padding,
              display: 'flex',
              alignItems:
                (element as TextElement).verticalAlign === 'top'
                  ? 'flex-start'
                  : (element as TextElement).verticalAlign === 'bottom'
                    ? 'flex-end'
                    : 'center',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {(element as TextElement).content}
          </div>
        )}

        {element.type === 'shape' && renderShape(element as ShapeElement)}

        {element.type === 'image' && (
          <img
            src={(element as ImageElement).src}
            alt={(element as ImageElement).alt}
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

        {element.type === 'code' && (
          <pre
            style={{
              width: '100%',
              height: '100%',
              margin: 0,
              padding: '1rem',
              backgroundColor: (element as any).theme === 'dark' ? '#1e1e1e' : '#f8f8f8',
              color: (element as any).theme === 'dark' ? '#d4d4d4' : '#333',
              fontFamily: 'monospace',
              fontSize: (element as any).fontSize,
              overflow: 'auto',
              borderRadius: '8px'
            }}
          >
            <code>{(element as any).code}</code>
          </pre>
        )}

        {element.type === 'video' && (
          <video
            src={(element as VideoElement).src}
            autoPlay={(element as VideoElement).autoplay}
            loop={(element as VideoElement).loop}
            muted={(element as VideoElement).muted}
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: (element as VideoElement).objectFit,
              borderRadius: (element as VideoElement).borderRadius,
              boxShadow: (element as VideoElement).shadow
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                : 'none'
            }}
          />
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

        {/* Resize handles */}
        {isSelected && !element.locked && (
          <>
            {resizeHandles.map(handle => {
              const handleStyle: React.CSSProperties = {
                position: 'absolute',
                width: 10,
                height: 10,
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: getCursor(handle),
                zIndex: 1000
              }

              const positions: Record<ResizeHandle, React.CSSProperties> = {
                nw: { top: -5, left: -5 },
                n: { top: -5, left: '50%', transform: 'translateX(-50%)' },
                ne: { top: -5, right: -5 },
                e: { top: '50%', right: -5, transform: 'translateY(-50%)' },
                se: { bottom: -5, right: -5 },
                s: { bottom: -5, left: '50%', transform: 'translateX(-50%)' },
                sw: { bottom: -5, left: -5 },
                w: { top: '50%', left: -5, transform: 'translateY(-50%)' }
              }

              return (
                <div
                  key={handle}
                  style={{ ...handleStyle, ...positions[handle] }}
                  onMouseDown={e => handleResizeMouseDown(e, handle, element)}
                />
              )
            })}
          </>
        )}
      </div>
    )
  }

  // Wrapper to contain scaled canvas properly
  return (
    <div
      style={{
        width: 1280 * scale,
        height: 720 * scale,
        overflow: 'hidden'
      }}
    >
      <div
        ref={canvasRef}
        className="gba:relative"
        style={{
          width: 1280,
          height: 720,
          ...getBackgroundStyle(),
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
        onClick={handleCanvasClick}
      >
        {/* Video Background */}
        {renderVideoBackground()}

        {/* Elements */}
        {(elements || []).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element => renderElement(element))}
      </div>
    </div>
  )
}

function getCursor(handle: ResizeHandle): string {
  const cursors: Record<ResizeHandle, string> = {
    nw: 'nw-resize',
    n: 'n-resize',
    ne: 'ne-resize',
    e: 'e-resize',
    se: 'se-resize',
    s: 's-resize',
    sw: 'sw-resize',
    w: 'w-resize'
  }
  return cursors[handle]
}

export default SlideCanvas
