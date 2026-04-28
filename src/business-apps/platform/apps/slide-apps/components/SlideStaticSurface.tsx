import React, { useMemo } from 'react'
import type { SlideBackground, SlideCanvasSize, SlideData } from './slideElements'
import { DEFAULT_SLIDE_CANVAS_SIZE } from './slideElements'
import { SlideStaticElementContent } from './SlideStaticElementContent'
import { getSlideBackgroundStyle, SlideBackgroundMedia } from './slideBackgroundUtils'

interface SlideStaticSurfaceProps {
  elements: SlideData['elements']
  background: SlideBackground
  canvasSize?: SlideCanvasSize
  isPresenting?: boolean
  onLinkClick?: (url: string, linkId: string, e: React.MouseEvent) => void
  renderVideoBackground?: boolean
  renderVideoElements?: boolean
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}

export const SlideStaticSurface: React.FC<SlideStaticSurfaceProps> = ({
  elements,
  background,
  canvasSize = DEFAULT_SLIDE_CANVAS_SIZE,
  isPresenting = false,
  onLinkClick,
  renderVideoBackground = true,
  renderVideoElements = true,
  className,
  style,
  'data-testid': testId
}) => {
  const sortedElements = useMemo(
    () => [...(elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [elements]
  )

  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        position: 'relative',
        width: canvasSize.width,
        height: canvasSize.height,
        overflow: 'hidden',
        ...getSlideBackgroundStyle(background),
        ...style
      }}
    >
      <SlideBackgroundMedia
        background={background}
        renderVideo={renderVideoBackground}
        autoPlay={renderVideoBackground}
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
        style={{ zIndex: 0 }}
      />
      {sortedElements.map(element => (
        <div
          key={element.id}
          data-slide-static-element="true"
          data-element-id={element.id}
          data-testid={`slide-static-element-${element.id}`}
          style={{
            position: 'absolute',
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            transform: `rotate(${element.rotation}deg)`,
            opacity: element.opacity,
            zIndex: element.zIndex
          }}
        >
          <SlideStaticElementContent
            element={element}
            isPresenting={isPresenting}
            onLinkClick={onLinkClick}
            renderVideoElement={renderVideoElements}
          />
        </div>
      ))}
    </div>
  )
}

export default SlideStaticSurface
