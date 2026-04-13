import React from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { appendClassName, CUSTOM_IMAGE_FIGURE_CLASS } from './styleUtils'
import type { CustomImageAttributes } from './types'
import type { WordLikeImageLayout } from './wrapLayoutEngine'

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface CustomImageFigureProps {
  readonly layout: WordLikeImageLayout
  readonly interactiveAttributes: CustomImageAttributes
  readonly figureDataAttributes: Record<string, string>
  readonly displaySrc: string
  readonly error: boolean
  readonly selected: boolean
  readonly isCropMode: boolean
  readonly isFloatingImage: boolean
  readonly figureStyleOverride?: React.CSSProperties
  readonly selectionAnchorAttributes?: Record<string, string>
  readonly imageFrameRef?: React.Ref<HTMLElement>
  readonly onSelect: (event: React.MouseEvent) => void
  readonly onStartMove: (event: React.MouseEvent) => void
  readonly onStartResize: (direction: ResizeDirection, event: React.MouseEvent) => void
  readonly onStartRotate: (event: React.MouseEvent) => void
  readonly onImageLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void
  readonly getHandleCursor: (direction: ResizeDirection, cropMode: boolean) => string
}

const HANDLE_DIRECTIONS: ReadonlyArray<ResizeDirection> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function ImageBorderOverlay({ layout }: Readonly<{ layout: WordLikeImageLayout }>) {
  const { imageBorder } = layout

  if (!imageBorder.visible) {
    return null
  }

  const rectWidth = Math.max(0, layout.frameWidth - imageBorder.widthPx)
  const rectHeight = Math.max(0, layout.frameHeight - imageBorder.widthPx)
  const radius = Math.max(0, imageBorder.radius - imageBorder.inset)

  return (
    <span
      className="gba:pointer-events-none gba:absolute gba:inset-0"
      aria-hidden
      data-testid="document-editor-image-border"
    >
      <svg
        className="gba:h-full gba:w-full"
        viewBox={`0 0 ${layout.frameWidth} ${layout.frameHeight}`}
        preserveAspectRatio="none"
      >
        <rect
          x={imageBorder.inset}
          y={imageBorder.inset}
          width={rectWidth}
          height={rectHeight}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={imageBorder.color}
          strokeWidth={imageBorder.widthPx}
          strokeDasharray={imageBorder.dashArray ?? undefined}
        />
      </svg>
    </span>
  )
}

export function CustomImageFigure({
  layout,
  interactiveAttributes,
  figureDataAttributes,
  displaySrc,
  error,
  selected,
  isCropMode,
  isFloatingImage,
  figureStyleOverride,
  selectionAnchorAttributes,
  imageFrameRef,
  onSelect,
  onStartMove,
  onStartResize,
  onStartRotate,
  onImageLoad,
  getHandleCursor
}: Readonly<CustomImageFigureProps>) {
  const figureStyle = figureStyleOverride ?? layout.figureStyle
  const overlayPassesPointerEventsThrough = figureStyle.pointerEvents === 'none'
  const interactivePointerClass = overlayPassesPointerEventsThrough && selected ? 'gba:pointer-events-auto' : ''
  const behindTextPassThroughStyle =
    interactiveAttributes.wrapMode === 'behind'
      ? ({ pointerEvents: 'none' as const } satisfies React.CSSProperties)
      : null

  return (
    <span
      className={appendClassName(CUSTOM_IMAGE_FIGURE_CLASS, 'editor-image-container')}
      style={figureStyle}
      data-testid="document-editor-image-figure"
      onClick={onSelect}
      {...figureDataAttributes}
      {...selectionAnchorAttributes}
    >
      <span className="gba:relative gba:inline-flex gba:max-w-full">
        {error || !displaySrc ? (
          <span
            ref={imageFrameRef}
            className="gba:relative gba:inline-flex gba:max-w-full"
            style={layout.imageFrameStyle}
            data-testid="document-editor-image-frame"
          >
            <span className="gba:relative gba:inline-block" style={layout.cropViewportStyle}>
              <span
                className="gba:inline-flex gba:h-full gba:w-full gba:items-center gba:justify-center gba:rounded gba:bg-muted gba:text-muted-foreground gba:text-sm"
                style={behindTextPassThroughStyle ?? undefined}
                data-testid="document-editor-image-broken"
              >
                {error ? 'Image' : 'Loading image...'}
              </span>
              <ImageBorderOverlay layout={layout} />
            </span>
          </span>
        ) : (
          <span
            ref={imageFrameRef}
            className={`gba:relative gba:inline-flex gba:max-w-full ${interactivePointerClass} ${isFloatingImage && selected && !isCropMode ? 'gba:cursor-move' : ''}`}
            style={layout.imageFrameStyle}
            onMouseDown={onStartMove}
            data-testid="document-editor-image-frame"
          >
            <span className="gba:relative gba:inline-block" style={layout.cropViewportStyle}>
              <img
                src={displaySrc}
                alt={interactiveAttributes.alt ?? ''}
                title={interactiveAttributes.title ?? undefined}
                className="editor-image gba:block"
                style={
                  behindTextPassThroughStyle
                    ? { ...layout.renderedImageStyle, ...behindTextPassThroughStyle }
                    : layout.renderedImageStyle
                }
                contentEditable={false}
                draggable={false}
                onLoad={onImageLoad}
                data-testid="document-editor-image"
              />
              <ImageBorderOverlay layout={layout} />
              {isCropMode ? (
                <>
                  <span
                    className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                    style={{ height: `${layout.crop.top * 100}%` }}
                  />
                  <span
                    className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                    style={{ height: `${layout.crop.bottom * 100}%` }}
                  />
                  <span
                    className="gba:absolute gba:top-0 gba:bottom-0 gba:left-0 gba:bg-black/20 gba:pointer-events-none"
                    style={{ width: `${layout.crop.left * 100}%` }}
                  />
                  <span
                    className="gba:absolute gba:top-0 gba:bottom-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                    style={{ width: `${layout.crop.right * 100}%` }}
                  />
                </>
              ) : null}
            </span>
            {selected ? (
              <span
                className={`gba:absolute gba:-inset-1 gba:border-2 gba:border-primary/70 gba:pointer-events-none ${
                  isCropMode ? 'gba:border-dashed' : 'gba:border-solid'
                }`}
                data-testid="document-editor-image-selection-frame"
              />
            ) : null}
            {selected && !error && displaySrc
              ? HANDLE_DIRECTIONS.map(direction => {
                  const directionClasses: Record<ResizeDirection, string> = {
                    n: 'gba:top-0 gba:left-1/2 gba:-translate-x-1/2 gba:-translate-y-1/2',
                    ne: 'gba:top-0 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
                    e: 'gba:top-1/2 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
                    se: 'gba:bottom-0 gba:right-0 gba:translate-x-1/2 gba:translate-y-1/2',
                    s: 'gba:bottom-0 gba:left-1/2 gba:-translate-x-1/2 gba:translate-y-1/2',
                    sw: 'gba:bottom-0 gba:left-0 gba:-translate-x-1/2 gba:translate-y-1/2',
                    w: 'gba:top-1/2 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2',
                    nw: 'gba:top-0 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2'
                  }

                  return (
                    <button
                      key={direction}
                      type="button"
                      className={`gba:absolute gba:z-20 gba:h-3 gba:w-3 gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 gba:pointer-events-auto ${directionClasses[direction]}`}
                      style={{ cursor: getHandleCursor(direction, isCropMode) }}
                      onMouseDown={event => onStartResize(direction, event)}
                      data-image-handle="true"
                      data-testid={`document-editor-image-handle-${direction}`}
                    />
                  )
                })
              : null}
            {selected && !error && displaySrc ? (
              <span
                className="gba:absolute gba:bottom-full gba:left-1/2 gba:z-10 gba:flex gba:flex-col gba:items-center gba:-translate-x-1/2 gba:pb-2 gba:pointer-events-auto"
                data-image-handle="true"
              >
                <button
                  type="button"
                  aria-label="Rotate image"
                  className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 gba:text-primary gba:shadow-sm gba:cursor-grab gba:pointer-events-auto hover:gba:bg-accent"
                  onMouseDown={onStartRotate}
                  data-image-handle="true"
                  data-testid="document-editor-image-rotate-handle"
                >
                  <ArrowClockwise className="gba:h-3.5 gba:w-3.5" />
                </button>
                <span className="gba:h-4 gba:w-px gba:bg-primary/70 gba:pointer-events-none" />
              </span>
            ) : null}
          </span>
        )}
      </span>
      {interactiveAttributes.caption ? (
        <span
          className="editor-image-caption gba:mt-1 gba:block gba:text-xs gba:text-muted-foreground"
          data-image-caption-text="true"
          data-testid="document-editor-image-caption"
        >
          {interactiveAttributes.caption}
        </span>
      ) : null}
    </span>
  )
}
