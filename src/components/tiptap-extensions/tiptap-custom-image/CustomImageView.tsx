import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { NodeViewWrapper } from '@tiptap/react'
import { DEFAULT_IMAGE_SIZE_REFERENCE, resolveImageDimensions } from './sizeUtils'
import { appendClassName, CUSTOM_IMAGE_FIGURE_CLASS, getFigureDataAttributes } from './styleUtils'
import type { CustomImageAttributes, CustomImageOptions } from './types'

interface CustomImageViewProps {
  readonly node: {
    readonly attrs: CustomImageAttributes
  }
  readonly editor: Editor | null
  readonly getPos: () => number | undefined
  readonly selected: boolean
  readonly options: Pick<
    CustomImageOptions,
    | 'defaultAlign'
    | 'defaultWrapMode'
    | 'defaultAnchorMode'
    | 'defaultDisplay'
    | 'defaultDistance'
    | 'getAccessToken'
    | 'isProtectedSrc'
    | 'resolveProtectedSrc'
    | 'minSize'
  >
}

function getMarginStyle(attributes: CustomImageAttributes, defaultDistance: number) {
  const top = attributes.distanceTop ?? defaultDistance
  const right = attributes.distanceRight ?? defaultDistance
  const bottom = attributes.distanceBottom ?? defaultDistance
  const left = attributes.distanceLeft ?? defaultDistance

  return {
    marginTop: top,
    marginRight: right,
    marginBottom: bottom,
    marginLeft: left
  }
}

function getFigureAlignment(align: NonNullable<CustomImageAttributes['align']>) {
  if (align === 'center') return 'center'
  if (align === 'right') return 'flex-end'
  return 'flex-start'
}

function getFigureMargins(align: NonNullable<CustomImageAttributes['align']>): React.CSSProperties {
  if (align === 'center') {
    return {
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }

  if (align === 'right') {
    return {
      marginLeft: 'auto',
      marginRight: 0
    }
  }

  return {
    marginLeft: 0,
    marginRight: 'auto'
  }
}

function getWrapperStyle(
  attributes: CustomImageAttributes,
  defaultDistance: number,
  contentHeight: number | null
): React.CSSProperties {
  const wrapMode = attributes.wrapMode ?? 'inline'
  const marginStyle = getMarginStyle(attributes, defaultDistance)

  switch (wrapMode) {
    case 'square-left':
    case 'tight':
    case 'through':
      return {
        ...marginStyle,
        float: 'left',
        display: 'block',
        position: 'relative',
        width: 'fit-content',
        maxWidth: '100%'
      }
    case 'square-right':
      return {
        ...marginStyle,
        float: 'right',
        display: 'block',
        position: 'relative',
        width: 'fit-content',
        maxWidth: '100%'
      }
    case 'top-bottom':
      return {
        ...marginStyle,
        display: 'block',
        width: '100%',
        clear: 'both',
        position: 'relative'
      }
    case 'behind':
    case 'front':
      return {
        ...marginStyle,
        display: 'block',
        position: 'relative',
        width: '100%',
        minHeight: Math.max(contentHeight ?? attributes.height ?? 0, 1),
        overflow: 'visible',
        verticalAlign: 'baseline'
      }
    case 'inline':
    default:
      return {
        ...marginStyle,
        display: 'block',
        width: '100%',
        position: 'relative',
        verticalAlign: 'baseline',
        maxWidth: '100%'
      }
  }
}

function getFigureStyle(attributes: CustomImageAttributes): React.CSSProperties {
  const wrapMode = attributes.wrapMode ?? 'inline'
  const align = attributes.align ?? 'left'
  const offsetX = attributes.offsetX ?? 0
  const offsetY = attributes.offsetY ?? 0
  const zIndex = attributes.zIndex ?? 1

  const base: React.CSSProperties = {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: 'fit-content',
    textAlign: align,
    maxWidth: '100%'
  }

  if (wrapMode === 'behind' || wrapMode === 'front') {
    return {
      ...base,
      position: 'absolute',
      left: offsetX,
      top: offsetY,
      zIndex: wrapMode === 'behind' ? -1 : Math.max(1, zIndex)
    }
  }

  if (wrapMode === 'square-left' || wrapMode === 'square-right' || wrapMode === 'tight' || wrapMode === 'through') {
    return base
  }

  return {
    ...base,
    ...getFigureMargins(align),
    alignItems: getFigureAlignment(align)
  }
}

export function CustomImageView({ node, editor, getPos, selected, options }: Readonly<CustomImageViewProps>) {
  const src = node.attrs.src ?? ''
  const [displaySrc, setDisplaySrc] = useState<string>(() => (options.isProtectedSrc(src) ? '' : src))
  const [error, setError] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null)
  const dragSizeRef = useRef<{ width: number; height: number } | null>(null)
  const [measurementContext, setMeasurementContext] = useState<{
    containerWidth: number | null
    containerHeight: number | null
  }>({
    containerWidth: null,
    containerHeight: null
  })

  const mergedAttributes = useMemo<CustomImageAttributes>(
    () => ({
      ...node.attrs,
      originalWidth: node.attrs.originalWidth ?? null,
      originalHeight: node.attrs.originalHeight ?? null,
      align: node.attrs.align ?? options.defaultAlign,
      widthUnit: node.attrs.widthUnit ?? 'px',
      heightUnit: node.attrs.heightUnit ?? 'px',
      widthPercent: node.attrs.widthPercent ?? null,
      heightPercent: node.attrs.heightPercent ?? null,
      widthRelativeTo: node.attrs.widthRelativeTo ?? DEFAULT_IMAGE_SIZE_REFERENCE,
      heightRelativeTo: node.attrs.heightRelativeTo ?? DEFAULT_IMAGE_SIZE_REFERENCE,
      scaleWidthPercent: node.attrs.scaleWidthPercent ?? 100,
      scaleHeightPercent: node.attrs.scaleHeightPercent ?? 100,
      rotation: node.attrs.rotation ?? 0,
      wrapMode: node.attrs.wrapMode ?? options.defaultWrapMode,
      anchorMode: node.attrs.anchorMode ?? options.defaultAnchorMode,
      display: node.attrs.display ?? options.defaultDisplay,
      lockAspectRatio: node.attrs.lockAspectRatio ?? true,
      distanceTop: node.attrs.distanceTop ?? options.defaultDistance,
      distanceRight: node.attrs.distanceRight ?? options.defaultDistance,
      distanceBottom: node.attrs.distanceBottom ?? options.defaultDistance,
      distanceLeft: node.attrs.distanceLeft ?? options.defaultDistance,
      offsetX: node.attrs.offsetX ?? 0,
      offsetY: node.attrs.offsetY ?? 0,
      allowOverlap: node.attrs.allowOverlap ?? false,
      zIndex: node.attrs.zIndex ?? 1
    }),
    [
      node.attrs,
      options.defaultAlign,
      options.defaultAnchorMode,
      options.defaultDisplay,
      options.defaultDistance,
      options.defaultWrapMode
    ]
  )

  const resolvedDimensions = useMemo(
    () => resolveImageDimensions(mergedAttributes, measurementContext),
    [measurementContext, mergedAttributes]
  )
  const displayWidth = dragSize?.width ?? resolvedDimensions.width ?? null
  const displayHeight = dragSize?.height ?? resolvedDimensions.height ?? null
  const lockAspectRatio = mergedAttributes.lockAspectRatio ?? true
  const minSize = options.minSize
  const rotation = resolvedDimensions.rotation

  const figureDataAttributes = getFigureDataAttributes(mergedAttributes)
  const imgStyle: React.CSSProperties = { maxWidth: '100%', height: 'auto' }
  if (displayWidth != null) {
    imgStyle.width = displayWidth
  }
  if (displayHeight != null) {
    imgStyle.height = displayHeight
  }
  if (rotation !== 0) {
    imgStyle.transform = `rotate(${rotation}deg)`
    imgStyle.transformOrigin = 'center center'
  }

  const handleSelectNode = useCallback(
    (event: React.MouseEvent) => {
      if (!editor) return
      const pos = getPos()
      if (pos === undefined) return
      event.preventDefault()
      event.stopPropagation()

      const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
      editor.view.dispatch(tr)
      editor.view.focus()
    },
    [editor, getPos]
  )

  const onResizeHandleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const img = imgRef.current
      if (!img || !editor) return

      const startX = event.clientX
      const startY = event.clientY
      const startWidth = img.offsetWidth
      const startHeight = img.offsetHeight
      const current = { width: startWidth, height: startHeight }
      setDragSize(current)
      dragSizeRef.current = current

      const onMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        let width = Math.max(minSize, Math.round(startWidth + dx))
        let height = Math.max(minSize, Math.round(startHeight + dy))

        if (lockAspectRatio && startWidth > 0 && startHeight > 0) {
          const scaleX = width / startWidth
          const scaleY = height / startHeight
          const scale = Math.min(scaleX, scaleY)
          width = Math.max(minSize, Math.round(startWidth * scale))
          height = Math.max(minSize, Math.round(startHeight * scale))
        }

        const next = { width, height }
        setDragSize(next)
        dragSizeRef.current = next
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)

        const final = dragSizeRef.current ?? current
        setDragSize(null)
        dragSizeRef.current = null

        const pos = getPos()
        if (pos === undefined) return

        const node = editor.state.doc.nodeAt(pos)
        if (node?.type.name !== 'image') return

        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width: Math.max(minSize, Math.round(final.width)),
          height: Math.max(minSize, Math.round(final.height)),
          widthUnit: 'px',
          heightUnit: 'px',
          widthPercent: null,
          heightPercent: null,
          scaleWidthPercent: 100,
          scaleHeightPercent: 100
        })
        tr.setSelection(NodeSelection.create(tr.doc, pos))
        editor.view.dispatch(tr)
        editor.view.focus()
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [editor, getPos, lockAspectRatio, minSize]
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const target = wrapper.parentElement ?? wrapper
    const updateMeasurements = () => {
      setMeasurementContext({
        containerWidth: target.clientWidth || wrapper.clientWidth || null,
        containerHeight: target.clientHeight || null
      })
    }

    updateMeasurements()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateMeasurements()
    })

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!src) {
      setDisplaySrc('')
      setError(true)
      return
    }

    if (!options.isProtectedSrc(src) || !options.resolveProtectedSrc) {
      setDisplaySrc(src)
      setError(false)
      return
    }

    const token = options.getAccessToken()
    if (!token) {
      setDisplaySrc(src)
      setError(false)
      return
    }

    setDisplaySrc('')
    options
      .resolveProtectedSrc(src, token)
      .then(resolved => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }

        if (typeof resolved === 'string') {
          setDisplaySrc(resolved)
        } else {
          objectUrlRef.current = URL.createObjectURL(resolved)
          setDisplaySrc(objectUrlRef.current)
        }
        setError(false)
      })
      .catch(() => {
        setDisplaySrc('')
        setError(true)
      })

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [options, src])

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const naturalWidth = Math.round(img.naturalWidth)
      const naturalHeight = Math.round(img.naturalHeight)

      if (!editor || naturalWidth <= 0 || naturalHeight <= 0) return

      const pos = getPos()
      if (pos === undefined) return

      const currentNode = editor.state.doc.nodeAt(pos)
      if (currentNode?.type.name !== 'image') return

      if (currentNode.attrs.originalWidth === naturalWidth && currentNode.attrs.originalHeight === naturalHeight) {
        return
      }

      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight
      })

      editor.view.dispatch(tr)
    },
    [editor, getPos]
  )

  const wrapperStyle = getWrapperStyle(mergedAttributes, options.defaultDistance, displayHeight)
  const figureStyle = getFigureStyle(mergedAttributes)

  return (
    <NodeViewWrapper
      as="div"
      className="gba:block gba:max-w-full"
      style={wrapperStyle}
      onClick={handleSelectNode}
      data-testid="document-editor-image-anchor"
      ref={wrapperRef}
    >
      <div className="gba:max-w-full">
        <figure
          className={appendClassName(CUSTOM_IMAGE_FIGURE_CLASS, 'editor-image-container')}
          style={figureStyle}
          data-testid="document-editor-image-figure"
          {...figureDataAttributes}
        >
          <span className="gba:relative gba:inline-flex gba:max-w-full">
            {error || !displaySrc ? (
              <span
                className="gba:inline-flex gba:items-center gba:justify-center gba:min-h-[80px] gba:min-w-[120px] gba:rounded gba:bg-muted gba:text-muted-foreground gba:text-sm"
                data-testid="document-editor-image-broken"
              >
                Image
              </span>
            ) : (
              <img
                ref={imgRef}
                src={displaySrc}
                alt={mergedAttributes.alt ?? ''}
                title={mergedAttributes.title ?? undefined}
                width={displayWidth ?? undefined}
                height={displayHeight ?? undefined}
                className="editor-image gba:rounded gba:block gba:max-w-full"
                style={imgStyle}
                contentEditable={false}
                draggable={false}
                onLoad={handleImageLoad}
                data-testid="document-editor-image"
              />
            )}
            {selected && !error && displaySrc && (
              <button
                type="button"
                aria-label="Resize image"
                className="gba:absolute gba:bottom-0 gba:right-0 gba:h-3 gba:w-3 gba:rounded-tl gba:border-l-2 gba:border-t-2 gba:border-primary gba:border-b-0 gba:border-r-0 gba:bg-background gba:p-0 gba:cursor-nwse-resize"
                onMouseDown={onResizeHandleMouseDown}
                data-testid="document-editor-image-resize-handle"
              />
            )}
          </span>
          {mergedAttributes.caption ? (
            <figcaption
              className="editor-image-caption gba:mt-1 gba:text-xs gba:text-muted-foreground"
              data-testid="document-editor-image-caption"
            >
              {mergedAttributes.caption}
            </figcaption>
          ) : null}
        </figure>
      </div>
    </NodeViewWrapper>
  )
}
