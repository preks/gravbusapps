/**
 * SlideCanvas - Draggable/Resizable canvas for slide elements
 * Supports multi-select with Ctrl/Cmd+click and marquee selection
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { ImageOff, Mic, MicOff, Check, icons as lucideIcons } from 'lucide-react'
import type {
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  CodeElement,
  TableElement,
  IconElement,
  LogoElement,
  FooterElement,
  BadgeElement,
  ConnectorElement,
  LayerElement,
  MetricCardElement,
  GroupElement,
  Position,
  Size
} from './slideElements'
import {
  gradientToCss,
  getImageCropStyles,
  textElementHasVisibleContent,
  textElementStubForShapeInText
} from './slideElements'
import { ensureImportedWebFonts } from './fontStack'

// Webfonts commonly referenced by imported decks (Roboto, Funnel Display,
// Source Sans Pro, …) are not part of the default browser font set. Loading
// them lazily via `<link rel="stylesheet">` on first canvas module use means
// text metrics line up with PowerPoint instead of falling back to Segoe UI /
// SF Pro, which is what was making slide 17's pill widths stop matching
// their labels after the Enterprise AI import.
ensureImportedWebFonts()
import { SlideChartRenderer } from './SlideChartRenderer'
import { TextWithLinks } from './TextWithLinks'
import { RichTextContent } from './RichTextContent'
import { InlineRichTextEditor } from './InlineRichTextEditor'
import { getRichTextBoxStyle } from './richTextStyles'
import { tryRenderOfficePresetShape } from './OfficeShapeRenderer'
import { ShapePointEditor } from './ShapePointEditor'
import { SlideStaticElementContent } from './SlideStaticElementContent'
import { getSlideBackgroundStyle, SlideBackgroundMedia } from './slideBackgroundUtils'
import { renderShape as renderSharedShape } from './slideRenderUtils'
import { useResolvedSlideMediaUrl } from '../hooks/useResolvedSlideMediaUrl'
import { sanitizeSlideMediaUrl, type SlideMediaKind } from '../utils/slideMediaUrl'
import { isEmbedVideoElement, resolveVideoPlaybackUrl, resolveVideoPreviewUrl } from '../utils/videoElement'
import { createDefaultShapeText, type RichTextSelectionRange } from '../utils/richTextEditing'

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '')
  const r = Number.parseInt(cleanHex.substring(0, 2), 16)
  const g = Number.parseInt(cleanHex.substring(2, 4), 16)
  const b = Number.parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function renderTextPlaceholder(element: TextElement, isPresenting: boolean) {
  if (!element.placeholderText || isPresenting) return null

  return (
    <div
      style={{
        ...getRichTextBoxStyle(element),
        color: hexToRgba(element.color, 0.55),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    >
      {element.placeholderText}
    </div>
  )
}

/**
 * Thin adapter over the shared slide media sanitizer. Kept as a local name so
 * call sites read naturally and so we can continue to pass the preferred kind
 * as an array for backwards compatibility with existing call sites.
 */
const sanitizeMediaUrl = (url: string | undefined, allowedTypes: string[] = ['image/', 'video/']): string => {
  const allowImage = allowedTypes.some(t => t.startsWith('image/'))
  const allowVideo = allowedTypes.some(t => t.startsWith('video/'))
  const kinds: SlideMediaKind[] = []
  if (allowImage) kinds.push('image')
  if (allowVideo) kinds.push('video')
  for (const kind of kinds) {
    const sanitized = sanitizeSlideMediaUrl(url, kind)
    if (sanitized) return sanitized
  }
  return ''
}

function CanvasImageElement({ element, onError }: { element: ImageElement; onError: () => void }) {
  const imageUrl = useResolvedSlideMediaUrl(sanitizeMediaUrl(element.src, ['image/']))
  const crop = getImageCropStyles(element.cropRect)
  const commonVisualStyle = {
    borderRadius: element.borderRadius,
    border: element.borderWidth > 0 ? `${element.borderWidth}px solid ${element.borderColor}` : 'none',
    boxShadow: element.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
  }

  if (!imageUrl) return null

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
        <img src={imageUrl} alt={element.alt} style={crop.imgStyle} draggable={false} onError={onError} />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={element.alt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: element.objectFit,
        ...commonVisualStyle
      }}
      draggable={false}
      onError={onError}
    />
  )
}

function CanvasVideoElement({ element }: { element: VideoElement }) {
  const previewImageUrl = useResolvedSlideMediaUrl(resolveVideoPreviewUrl(element))
  const playbackUrl = useResolvedSlideMediaUrl(resolveVideoPlaybackUrl(element))

  if (!playbackUrl) return null

  if (isEmbedVideoElement(element)) {
    return (
      <iframe
        src={playbackUrl}
        title={element.provider === 'youtube' ? 'YouTube video' : 'Embedded video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        data-testid={`slide-video-embed-${element.id}`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: element.borderRadius,
          boxShadow: element.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
        }}
      />
    )
  }

  return (
    <video
      src={playbackUrl}
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
        boxShadow: element.shadow ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
      }}
    />
  )
}
interface InlineEditingProps {
  editingTextId: string | null
  editorElement?: TextElement | null
  onTextChange: (value: string) => void
  onSelectionChange: (range: RichTextSelectionRange | null) => void
  onFinishEditing: () => void
  onCopySelection?: (selection: RichTextSelectionRange, clipboardData: DataTransfer | null) => void
  onCutSelection?: (selection: RichTextSelectionRange, clipboardData: DataTransfer | null) => void
  onPasteSelection?: (selection: RichTextSelectionRange | null, clipboardData: DataTransfer | null) => void
  selectionToRestore?: RichTextSelectionRange | null
  rehydrateToken?: number
  selectionRef?: React.MutableRefObject<RichTextSelectionRange | null>
  voiceInput?: {
    isListening: boolean
    isSupported: boolean
    volume: number
    error: string | null
    interimTranscript: string
    startListening: () => void
    stopListening: () => void
  }
}

interface SlideCanvasProps {
  elements: AnySlideElement[]
  selectedIds: Set<string>
  background: {
    type: 'solid' | 'gradient' | 'image' | 'video' | 'branded'
    color?: string
    gradient?: { type: 'linear' | 'radial'; angle: number; stops: { color: string; position: number }[] }
    overlay?: { type: 'linear' | 'radial'; angle: number; stops: { color: string; position: number }[] }
    imageUrl?: string
    videoUrl?: string
    videoMuted?: boolean
    videoLoop?: boolean
    brandPreset?: string
  }
  onSelectElements: (ids: Set<string>) => void
  onUpdateElement: (id: string, updates: Partial<AnySlideElement>) => void
  onUpdateMultipleElements: (updates: { id: string; updates: Partial<AnySlideElement> }[]) => void
  onEditText: (id: string) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onElementClick?: (elementId: string) => void
  scale?: number
  inlineEditing?: InlineEditingProps
  isPresenting?: boolean
  onLinkClick?: (url: string, linkId: string, e: React.MouseEvent) => void
  /**
   * Canvas dimensions in pixels. Defaults to 1280x720 (16:9) for legacy
   * callers; PPTX-imported decks pass their actual <p:sldSz> so 4:3 / A4 /
   * custom-size slides render with the correct aspect ratio instead of being
   * forced into widescreen.
   */
  canvasSize?: { width: number; height: number }
  /**
   * Edit Points mode. When set to a shape id, the canvas mounts
   * {@link ShapePointEditor} on top of that shape so the user can manipulate
   * its anchors. Standard drag/resize/selection handlers skip this element
   * while the mode is active so point dragging doesn't double-handle events.
   *
   * Mirrors the {@link InlineEditingProps} pattern to keep the canvas a
   * stateless view; SlideEditor owns the current id.
   */
  editingPointsId?: string | null
  /** Called when the user drags/adds/deletes an anchor; receives the new normalised `custGeomPath`. */
  onPointsChange?: (id: string, nextCustGeomPath: string) => void
  /** Called when the user leaves the mode (Esc key or click outside). */
  onExitPointEditing?: () => void
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

function isKeyboardEventFromTextInput(target: EventTarget | null): boolean {
  const targetElement = target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null

  if (!targetElement) return false

  return (
    targetElement.tagName === 'INPUT' ||
    targetElement.tagName === 'TEXTAREA' ||
    targetElement.isContentEditable ||
    targetElement.closest('[contenteditable="true"]') !== null
  )
}

function shouldUseSharedStaticRenderer(
  element: AnySlideElement,
  editingTextId: string | null | undefined,
  editingPointsId: string | null | undefined
): boolean {
  if (element.type === 'text' || element.type === 'code') {
    return editingTextId !== element.id
  }

  if (element.type === 'shape') {
    return editingTextId !== element.id && editingPointsId !== element.id
  }

  return (
    element.type === 'image' ||
    element.type === 'video' ||
    element.type === 'table' ||
    element.type === 'chart' ||
    element.type === 'logo' ||
    element.type === 'footer' ||
    element.type === 'connector' ||
    element.type === 'group'
  )
}

// Memoized to prevent re-renders from parent state changes (like AI assist volume/cooldown)
export const SlideCanvas: React.FC<SlideCanvasProps> = React.memo(
  ({
    elements,
    selectedIds,
    background,
    onSelectElements,
    onUpdateElement,
    onUpdateMultipleElements,
    onEditText,
    onDragStart,
    onDragEnd,
    onElementClick,
    scale = 1,
    inlineEditing,
    isPresenting = false,
    onLinkClick,
    canvasSize,
    editingPointsId,
    onPointsChange,
    onExitPointEditing
  }) => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
    const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
    const [elementStart, setElementStart] = useState<{ position: Position; size: Size } | null>(null)

    // Multi-select drag state - stores initial positions of all selected elements
    const [multiDragStart, setMultiDragStart] = useState<Map<string, Position>>(new Map())

    // Single-click-to-edit: track mousedown origin to detect click vs drag
    const mouseDownElementRef = useRef<{ id: string; x: number; y: number; type: string; wasSelected: boolean } | null>(
      null
    )
    const CLICK_MOVE_THRESHOLD = 4

    // Tracks which element's textarea has been initialized (cursor placed at end)
    const textareaInitializedRef = useRef<string | null>(null)

    // Marquee selection state (for rendering the selection box)
    const [isMarquee, setIsMarquee] = useState(false)
    const [marqueeStart, setMarqueeStart] = useState<Position>({ x: 0, y: 0 })
    const [marqueeEnd, setMarqueeEnd] = useState<Position>({ x: 0, y: 0 })

    // Flag to prevent click handler from clearing selection after marquee
    const justFinishedMarqueeRef = useRef(false)

    // Snap guides state. Canvas dimensions are deck-defined (from <p:sldSz>
    // on PPTX imports) and default to 16:9 widescreen for legacy flows.
    const CANVAS_WIDTH = canvasSize?.width ?? 1280
    const CANVAS_HEIGHT = canvasSize?.height ?? 720
    const SNAP_THRESHOLD = 8
    const [snapGuides, setSnapGuides] = useState<{ type: 'horizontal' | 'vertical'; position: number }[]>([])

    // Track images that failed to load
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

    const handleImageError = useCallback((elementId: string) => {
      setFailedImages(prev => new Set(prev).add(elementId))
    }, [])

    const getBackgroundStyle = (): React.CSSProperties => getSlideBackgroundStyle(background)

    const renderVideoBackground = () => (
      <SlideBackgroundMedia
        background={background}
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
        style={{ zIndex: 0 }}
      />
    )

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
      // Right-click is reserved for the context menu — never start a marquee
      // or clear selection from a non-primary button, otherwise opening the
      // context menu (especially while inline-editing text) would deselect
      // the active element and exit the editor.
      if (e.button !== 0) return

      // Start marquee selection when clicking on empty canvas area
      // Check if clicking on canvas itself or on background elements (not slide elements)
      const target = e.target as HTMLElement
      const isClickOnElement = target.closest('[data-slide-element]')
      const isClickOnPointEditor = target.closest('[data-shape-point-editor]')

      // Clicking outside the shape exits Edit Points mode — mirrors the
      // existing "click off to deselect" affordance so users don't get stuck.
      if (editingPointsId && !isClickOnPointEditor) {
        onExitPointEditing?.()
      }

      if (!isClickOnElement && canvasRef.current) {
        e.preventDefault()

        // Capture values at mousedown time
        const rect = canvasRef.current.getBoundingClientRect()
        const startX = (e.clientX - rect.left) / scale
        const startY = (e.clientY - rect.top) / scale
        const isAdditive = e.ctrlKey || e.metaKey
        let currentEndX = startX
        let currentEndY = startY

        // Update state for rendering
        setIsMarquee(true)
        setMarqueeStart({ x: startX, y: startY })
        setMarqueeEnd({ x: startX, y: startY })

        // Clear selection unless holding Ctrl/Cmd (additive mode)
        if (!isAdditive) {
          onSelectElements(new Set())
        }

        // Create move handler with closure over start position
        const onMouseMove = (moveEvent: MouseEvent) => {
          if (!canvasRef.current) return
          const moveRect = canvasRef.current.getBoundingClientRect()
          currentEndX = (moveEvent.clientX - moveRect.left) / scale
          currentEndY = (moveEvent.clientY - moveRect.top) / scale
          setMarqueeEnd({ x: currentEndX, y: currentEndY })
        }

        // Create mouseup handler with closure over all needed values
        const onMouseUp = () => {
          // Remove listeners first
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)

          // Calculate selection bounds
          const minX = Math.min(startX, currentEndX)
          const maxX = Math.max(startX, currentEndX)
          const minY = Math.min(startY, currentEndY)
          const maxY = Math.max(startY, currentEndY)

          // Only process if marquee has some size (at least 5px drag)
          const hasSize = Math.abs(currentEndX - startX) > 5 || Math.abs(currentEndY - startY) > 5

          if (hasSize) {
            // Select elements that intersect with marquee
            const newSelection = isAdditive ? new Set(selectedIds) : new Set<string>()
            elements.forEach(element => {
              const elLeft = element.position.x
              const elRight = element.position.x + element.size.width
              const elTop = element.position.y
              const elBottom = element.position.y + element.size.height

              // Check intersection - element is selected if marquee crosses into it at all
              const intersects = elLeft <= maxX && elRight >= minX && elTop <= maxY && elBottom >= minY
              if (intersects) {
                newSelection.add(element.id)
              }
            })

            if (newSelection.size > 0) {
              onSelectElements(newSelection)
            }
          }

          // Reset marquee state and set flag to prevent click from clearing selection
          setIsMarquee(false)
          justFinishedMarqueeRef.current = true
          // Reset the flag after a short delay (after click event fires)
          setTimeout(() => {
            justFinishedMarqueeRef.current = false
          }, 10)
        }

        // Attach listeners
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      }
    }

    const handleCanvasClick = (e: React.MouseEvent) => {
      // Only the primary button selects/edits — secondary/middle buttons are
      // reserved for the context menu and must not finish inline editing.
      if (e.button !== 0) return

      // Skip if we just finished a marquee selection (to avoid clearing the selection)
      if (justFinishedMarqueeRef.current) {
        mouseDownElementRef.current = null
        // Still finish inline editing when clicking away from the edited element
        if (inlineEditing?.editingTextId) {
          const target = e.target as HTMLElement
          const editingElement = target.closest(`[data-element-id="${inlineEditing.editingTextId}"]`)
          if (!editingElement) {
            textareaInitializedRef.current = null
            inlineEditing.onFinishEditing()
          }
        }
        return
      }

      const target = e.target as HTMLElement
      const isClickOnElement = target.closest('[data-slide-element]')

      // A plain click selects first; a second plain click on the already
      // selected text/code element enters editing. Double-click still edits
      // immediately via the element-level handler below.
      const mdRef = mouseDownElementRef.current
      mouseDownElementRef.current = null

      if (mdRef && mdRef.wasSelected && (mdRef.type === 'text' || mdRef.type === 'code')) {
        if (inlineEditing?.editingTextId && inlineEditing.editingTextId !== mdRef.id) {
          textareaInitializedRef.current = null
          inlineEditing.onFinishEditing()
        }
        if (inlineEditing?.editingTextId !== mdRef.id) {
          onEditText(mdRef.id)
        }
        return
      }

      // Finish inline editing if clicking outside the editing element
      if (inlineEditing?.editingTextId) {
        const editingElement = target.closest(`[data-element-id="${inlineEditing.editingTextId}"]`)
        if (!editingElement) {
          textareaInitializedRef.current = null
          inlineEditing.onFinishEditing()
          return
        }
      }

      if (!isClickOnElement && !isMarquee) {
        onSelectElements(new Set())
      }
    }

    // Track anchor element for Shift+click range selection
    const [anchorElementId, setAnchorElementId] = useState<string | null>(null)

    const handleElementMouseDown = (e: React.MouseEvent, element: AnySlideElement) => {
      e.stopPropagation()

      // Right-click should never alter selection, drag, or text-editing
      // state. Without this guard, opening the context menu on a text box
      // could change the selection (and exit inline editing for the right
      // element) before the menu was shown.
      if (e.button !== 0) {
        onElementClick?.(element.id)
        return
      }

      // Call onElementClick for presenter view highlighting (works even on locked elements)
      onElementClick?.(element.id)

      // In Edit Points mode the ShapePointEditor owns pointer events for the
      // active shape. Swallow canvas-level drag/select events so the user
      // can manipulate anchors without moving the whole shape by accident.
      if (editingPointsId && editingPointsId === element.id) return

      const editorTarget = (e.target as HTMLElement).closest<HTMLElement>('[contenteditable="true"]')
      const isActiveInlineEditorTarget =
        inlineEditing?.editingTextId === element.id &&
        (element.type === 'text' || element.type === 'shape') &&
        !!editorTarget &&
        e.currentTarget.contains(editorTarget)

      // Keep native caret/selection behavior inside the active inline editor.
      // Moving an actively edited element happens from the dedicated drag
      // handle, not from the contentEditable surface.
      if (isActiveInlineEditorTarget) return

      const isSelected = selectedIds.has(element.id)
      const isCtrlKey = e.ctrlKey || e.metaKey
      const isShiftKey = e.shiftKey

      if (isShiftKey && anchorElementId) {
        // Shift+click: Select range between anchor and clicked element (by z-index)
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
        const anchorIdx = sortedElements.findIndex(el => el.id === anchorElementId)
        const clickedIdx = sortedElements.findIndex(el => el.id === element.id)

        if (anchorIdx !== -1 && clickedIdx !== -1) {
          const startIdx = Math.min(anchorIdx, clickedIdx)
          const endIdx = Math.max(anchorIdx, clickedIdx)
          const rangeIds = sortedElements.slice(startIdx, endIdx + 1).map(el => el.id)

          // If Ctrl is also held, add to existing selection
          const newSelection = isCtrlKey ? new Set(selectedIds) : new Set<string>()
          rangeIds.forEach(id => newSelection.add(id))
          onSelectElements(newSelection)
        }
      } else if (isCtrlKey) {
        // Ctrl/Cmd+click: Toggle individual selection
        const newSelection = new Set(selectedIds)
        if (isSelected) {
          newSelection.delete(element.id)
        } else {
          newSelection.add(element.id)
        }
        onSelectElements(newSelection)
        setAnchorElementId(element.id)
      } else if (!isSelected) {
        // Click without modifier - select only this element
        onSelectElements(new Set([element.id]))
        setAnchorElementId(element.id)
      } else {
        // Already selected, update anchor for future Shift+clicks
        setAnchorElementId(element.id)
      }

      if (element.locked) {
        mouseDownElementRef.current = null
        return
      }

      // Start dragging
      setIsDragging(true)
      onDragStart?.()
      setDragStart({ x: e.clientX / scale, y: e.clientY / scale })
      setElementStart({ position: { ...element.position }, size: { ...element.size } })

      // Store initial positions of all selected elements for multi-drag
      // Calculate what the selection will be after state update
      const positions = new Map<string, Position>()
      let effectiveSelection: Set<string>

      if (isShiftKey && anchorElementId) {
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
        const anchorIdx = sortedElements.findIndex(el => el.id === anchorElementId)
        const clickedIdx = sortedElements.findIndex(el => el.id === element.id)
        if (anchorIdx !== -1 && clickedIdx !== -1) {
          const startIdx = Math.min(anchorIdx, clickedIdx)
          const endIdx = Math.max(anchorIdx, clickedIdx)
          const rangeIds = sortedElements.slice(startIdx, endIdx + 1).map(el => el.id)
          effectiveSelection = isCtrlKey ? new Set([...selectedIds, ...rangeIds]) : new Set(rangeIds)
        } else {
          effectiveSelection = new Set([element.id])
        }
      } else if (isCtrlKey) {
        effectiveSelection = isSelected
          ? new Set([...selectedIds].filter(id => id !== element.id))
          : new Set([...selectedIds, element.id])
      } else {
        effectiveSelection = isSelected ? selectedIds : new Set([element.id])
      }

      const movableEffectiveSelectionIds = [...effectiveSelection].filter(id => {
        const selectedElement = elements.find(candidate => candidate.id === id)
        return !!selectedElement && !selectedElement.locked
      })

      movableEffectiveSelectionIds.forEach(id => {
        const el = elements.find(e => e.id === id)
        if (el) positions.set(id, { ...el.position })
      })
      setMultiDragStart(positions)

      // Track mousedown so a follow-up plain click on an already selected text
      // or code element can enter editing without conflating first-click
      // selection with edit mode.
      if (!isShiftKey && !isCtrlKey && effectiveSelection.size === 1) {
        mouseDownElementRef.current = {
          id: element.id,
          x: e.clientX,
          y: e.clientY,
          type: element.type,
          wasSelected: isSelected
        }
      } else {
        mouseDownElementRef.current = null
      }
    }

    const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle, element: AnySlideElement) => {
      e.stopPropagation()
      if (element.locked) return

      setIsResizing(true)
      onDragStart?.()
      setResizeHandle(handle)
      setDragStart({ x: e.clientX / scale, y: e.clientY / scale })
      setElementStart({ position: { ...element.position }, size: { ...element.size } })
    }

    // Calculate snap positions for an element being dragged
    const calculateSnap = useCallback(
      (
        draggedPosition: Position,
        draggedSize: Size,
        draggedIds: Set<string>
      ): { snappedPosition: Position; guides: { type: 'horizontal' | 'vertical'; position: number }[] } => {
        const guides: { type: 'horizontal' | 'vertical'; position: number }[] = []
        let snappedX = draggedPosition.x
        let snappedY = draggedPosition.y

        // Calculate dragged element edges and center
        const dragLeft = draggedPosition.x
        const dragRight = draggedPosition.x + draggedSize.width
        const dragCenterX = draggedPosition.x + draggedSize.width / 2
        const dragTop = draggedPosition.y
        const dragBottom = draggedPosition.y + draggedSize.height
        const dragCenterY = draggedPosition.y + draggedSize.height / 2

        // Snap points to check (vertical lines for X snapping)
        const verticalSnapPoints: { x: number; type: 'left' | 'center' | 'right' }[] = [
          { x: 0, type: 'left' },
          { x: CANVAS_WIDTH / 2, type: 'center' },
          { x: CANVAS_WIDTH, type: 'right' }
        ]

        // Snap points to check (horizontal lines for Y snapping)
        const horizontalSnapPoints: { y: number; type: 'top' | 'center' | 'bottom' }[] = [
          { y: 0, type: 'top' },
          { y: CANVAS_HEIGHT / 2, type: 'center' },
          { y: CANVAS_HEIGHT, type: 'bottom' }
        ]

        // Add snap points from other elements
        elements.forEach(el => {
          if (draggedIds.has(el.id)) return

          const elLeft = el.position.x
          const elRight = el.position.x + el.size.width
          const elCenterX = el.position.x + el.size.width / 2
          const elTop = el.position.y
          const elBottom = el.position.y + el.size.height
          const elCenterY = el.position.y + el.size.height / 2

          verticalSnapPoints.push(
            { x: elLeft, type: 'left' },
            { x: elRight, type: 'right' },
            { x: elCenterX, type: 'center' }
          )
          horizontalSnapPoints.push(
            { y: elTop, type: 'top' },
            { y: elBottom, type: 'bottom' },
            { y: elCenterY, type: 'center' }
          )
        })

        // Check vertical snap points (X axis)
        let closestXSnap: { distance: number; snapTo: number; guideX: number } | null = null
        verticalSnapPoints.forEach(snap => {
          // Check left edge
          const leftDist = Math.abs(dragLeft - snap.x)
          if (leftDist < SNAP_THRESHOLD && (!closestXSnap || leftDist < closestXSnap.distance)) {
            closestXSnap = { distance: leftDist, snapTo: snap.x, guideX: snap.x }
          }
          // Check right edge
          const rightDist = Math.abs(dragRight - snap.x)
          if (rightDist < SNAP_THRESHOLD && (!closestXSnap || rightDist < closestXSnap.distance)) {
            closestXSnap = { distance: rightDist, snapTo: snap.x - draggedSize.width, guideX: snap.x }
          }
          // Check center
          const centerDist = Math.abs(dragCenterX - snap.x)
          if (centerDist < SNAP_THRESHOLD && (!closestXSnap || centerDist < closestXSnap.distance)) {
            closestXSnap = { distance: centerDist, snapTo: snap.x - draggedSize.width / 2, guideX: snap.x }
          }
        })

        const xSnap = closestXSnap as { distance: number; snapTo: number; guideX: number } | null
        if (xSnap) {
          snappedX = xSnap.snapTo
          guides.push({ type: 'vertical', position: xSnap.guideX })
        }

        // Check horizontal snap points (Y axis)
        let closestYSnap: { distance: number; snapTo: number; guideY: number } | null = null
        horizontalSnapPoints.forEach(snap => {
          // Check top edge
          const topDist = Math.abs(dragTop - snap.y)
          if (topDist < SNAP_THRESHOLD && (!closestYSnap || topDist < closestYSnap.distance)) {
            closestYSnap = { distance: topDist, snapTo: snap.y, guideY: snap.y }
          }
          // Check bottom edge
          const bottomDist = Math.abs(dragBottom - snap.y)
          if (bottomDist < SNAP_THRESHOLD && (!closestYSnap || bottomDist < closestYSnap.distance)) {
            closestYSnap = { distance: bottomDist, snapTo: snap.y - draggedSize.height, guideY: snap.y }
          }
          // Check center
          const centerDist = Math.abs(dragCenterY - snap.y)
          if (centerDist < SNAP_THRESHOLD && (!closestYSnap || centerDist < closestYSnap.distance)) {
            closestYSnap = { distance: centerDist, snapTo: snap.y - draggedSize.height / 2, guideY: snap.y }
          }
        })

        const ySnap = closestYSnap as { distance: number; snapTo: number; guideY: number } | null
        if (ySnap) {
          snappedY = ySnap.snapTo
          guides.push({ type: 'horizontal', position: ySnap.guideY })
        }

        return {
          snappedPosition: { x: Math.max(0, snappedX), y: Math.max(0, snappedY) },
          guides
        }
      },
      [elements]
    )

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        // Only handle element drag/resize here (marquee is handled inline in handleCanvasMouseDown)
        if (selectedIds.size === 0 || !elementStart) return

        const mouseDownElement = mouseDownElementRef.current
        if (isDragging && mouseDownElement) {
          const dx = Math.abs(e.clientX - mouseDownElement.x)
          const dy = Math.abs(e.clientY - mouseDownElement.y)
          if (dx < CLICK_MOVE_THRESHOLD && dy < CLICK_MOVE_THRESHOLD) return
        }

        const currentX = e.clientX / scale
        const currentY = e.clientY / scale

        const deltaX = currentX - dragStart.x
        const deltaY = currentY - dragStart.y

        const movableSelectionIds = [...selectedIds].filter(id => {
          const element = elements.find(candidate => candidate.id === id)
          return !!element && !element.locked
        })
        const movableSelectionIdSet = new Set(movableSelectionIds)

        if (isDragging) {
          if (movableSelectionIds.length === 0) return

          // Multi-element drag
          if (movableSelectionIds.length > 1 && multiDragStart.size > 0) {
            // Calculate bounding box of all selected elements for snapping
            const selectedElements = elements.filter(el => movableSelectionIdSet.has(el.id))
            const minX = Math.min(...selectedElements.map(el => el.position.x))
            const minY = Math.min(...selectedElements.map(el => el.position.y))
            const maxX = Math.max(...selectedElements.map(el => el.position.x + el.size.width))
            const maxY = Math.max(...selectedElements.map(el => el.position.y + el.size.height))

            // Calculate new bounding box position
            const newBoundsX = minX + deltaX
            const newBoundsY = minY + deltaY
            const boundsWidth = maxX - minX
            const boundsHeight = maxY - minY

            // Get snapped position for the bounding box
            const { snappedPosition, guides } = calculateSnap(
              { x: newBoundsX, y: newBoundsY },
              { width: boundsWidth, height: boundsHeight },
              movableSelectionIdSet
            )

            // Calculate the snap offset
            const snapOffsetX = snappedPosition.x - newBoundsX
            const snapOffsetY = snappedPosition.y - newBoundsY

            const updates: { id: string; updates: Partial<AnySlideElement> }[] = []
            multiDragStart.forEach((startPos, id) => {
              updates.push({
                id,
                updates: {
                  position: {
                    x: Math.max(0, startPos.x + deltaX + snapOffsetX),
                    y: Math.max(0, startPos.y + deltaY + snapOffsetY)
                  }
                }
              })
            })
            onUpdateMultipleElements(updates)
            setSnapGuides(guides)
          } else {
            // Single element drag with snapping
            const selectedId = movableSelectionIds[0]
            const selectedElement = elements.find(el => el.id === selectedId)
            if (selectedId && selectedElement) {
              const newPosition = {
                x: elementStart.position.x + deltaX,
                y: elementStart.position.y + deltaY
              }

              const { snappedPosition, guides } = calculateSnap(
                newPosition,
                selectedElement.size,
                movableSelectionIdSet
              )

              onUpdateElement(selectedId, { position: snappedPosition })
              setSnapGuides(guides)
            }
          }
        } else if (isResizing && resizeHandle && selectedIds.size === 1) {
          // Resize only works for single selection
          const selectedId = [...selectedIds][0]
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
      [
        selectedIds,
        isDragging,
        isResizing,
        resizeHandle,
        dragStart,
        elementStart,
        multiDragStart,
        onUpdateElement,
        onUpdateMultipleElements,
        scale,
        elements,
        calculateSnap
      ]
    )

    const handleMouseUp = useCallback(
      (e: MouseEvent) => {
        // If mouse moved beyond threshold, clear the click-to-edit ref (it was a drag)
        const mdRef = mouseDownElementRef.current
        if (mdRef) {
          const dx = Math.abs(e.clientX - mdRef.x)
          const dy = Math.abs(e.clientY - mdRef.y)
          if (dx >= CLICK_MOVE_THRESHOLD || dy >= CLICK_MOVE_THRESHOLD) {
            mouseDownElementRef.current = null
          }
        }

        // Notify parent that drag/resize ended (for history recording)
        if (isDragging || isResizing) {
          onDragEnd?.()
        }
        setIsDragging(false)
        setIsResizing(false)
        setResizeHandle(null)
        setElementStart(null)
        setMultiDragStart(new Map())
        setSnapGuides([])
      },
      [isDragging, isResizing, onDragEnd]
    )

    // Event listeners for element drag/resize (marquee has its own inline handlers)
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
      // Picture fill: paint the shape with a bitmap. When the PPTX used an
      // `a:tile`, repeat the image; default is `a:stretch` (cover). Pattern
      // fill is approximated as a repeating linear gradient on the fg/bg
      // colors — PowerPoint's exact preset patterns (`dkHorz`, `lgGrid`,
      // etc.) collapse to a generic diagonal stripe in this renderer, which
      // still beats losing the fill distinction entirely.
      let fillStyle: string
      if (pictureFill) {
        fillStyle = `url("${pictureFill.src}")`
      } else if (patternFill) {
        fillStyle = patternFill.fgColor
      } else if (gradient) {
        fillStyle = gradientToCss(gradient)
      } else {
        fillStyle = fill
      }

      // If the shape was imported from PPTX and we have a preset-aware
      // renderer for it, use that first. This keeps Office shapes visually
      // identical to PowerPoint without forcing every caller to reimplement
      // the same SVG paths. Picture/pattern fills render as an underlying
      // `<img>` or gradient layer behind the preset so the outline stays
      // crisp without having to rewrite every renderer to emit SVG defs.
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
        return renderSharedShape(element, 'slide-canvas')
      }

      const divBackground = pictureFill
        ? `url("${pictureFill.src}") center / ${pictureFill.tile ? 'auto repeat' : 'cover no-repeat'}`
        : patternFill
          ? `repeating-linear-gradient(45deg, ${patternFill.fgColor} 0, ${patternFill.fgColor} 3px, ${patternFill.bgColor} 3px, ${patternFill.bgColor} 8px)`
          : fillStyle

      const baseStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        background: divBackground,
        border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
        boxShadow: shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'
      }

      switch (shapeType) {
        case 'rectangle':
        case 'rounded-rectangle':
          return <div style={{ ...baseStyle, borderRadius: cornerRadius || 0 }} />
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

    const renderMoveEdges = (
      elementId: string,
      testIdPrefix: string,
      onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void,
      placement: 'centered' | 'outside' = 'centered'
    ) => {
      const edgeThickness = 12 / scale
      const edgeOffset = placement === 'outside' ? edgeThickness : edgeThickness / 2
      const edgeStyles: Record<'top' | 'right' | 'bottom' | 'left', React.CSSProperties> = {
        top: {
          top: -edgeOffset,
          left: 0,
          right: 0,
          height: edgeThickness
        },
        right: {
          top: 0,
          right: -edgeOffset,
          bottom: 0,
          width: edgeThickness
        },
        bottom: {
          bottom: -edgeOffset,
          left: 0,
          right: 0,
          height: edgeThickness
        },
        left: {
          top: 0,
          left: -edgeOffset,
          bottom: 0,
          width: edgeThickness
        }
      }

      return (['top', 'right', 'bottom', 'left'] as const).map(edge => (
        <div
          key={`${elementId}-${edge}`}
          data-testid={`${testIdPrefix}-${elementId}-${edge}`}
          title="Drag to move"
          style={{
            position: 'absolute',
            backgroundColor: 'transparent',
            cursor: 'move',
            userSelect: 'none',
            zIndex: 900,
            ...edgeStyles[edge]
          }}
          onMouseDown={onMouseDown}
        />
      ))
    }

    const renderInlineEditingMoveEdges = (elementId: string) => {
      return renderMoveEdges(elementId, 'slide-inline-editor-move-edge', undefined, 'outside')
    }

    const renderElement = (element: AnySlideElement) => {
      const isSelected = selectedIds.has(element.id)
      const isSingleSelection = selectedIds.size === 1

      // In presenter mode (onElementClick provided), use pointer cursor for click-to-highlight
      const cursorStyle = onElementClick ? 'pointer' : element.locked ? 'not-allowed' : 'move'

      const wrapperStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        transform: `rotate(${element.rotation}deg)`,
        opacity: element.opacity,
        cursor: cursorStyle,

        outline: isSelected ? '2px solid #3b82f6' : 'none',
        outlineOffset: '2px',
        zIndex: element.zIndex,

        boxShadow: isSelected && !isSingleSelection ? '0 0 0 1px rgba(59, 130, 246, 0.5)' : undefined
      }

      const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]
      const resizeHandleNodes =
        isSelected && isSingleSelection && !element.locked ? (
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
        ) : null

      const videoMoveEdgeNodes =
        element.type === 'video' && isSelected && !isPresenting && !element.locked ? (
          <>
            {renderMoveEdges(element.id, 'slide-video-move-edge', e => {
              e.stopPropagation()
              handleElementMouseDown(e, element)
            })}
          </>
        ) : null

      const useSharedStaticRenderer = shouldUseSharedStaticRenderer(
        element,
        inlineEditing?.editingTextId,
        editingPointsId
      )

      const handleWrapperMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (element.type === 'video' && isSelected && e.target !== e.currentTarget) {
          e.stopPropagation()
          return
        }

        handleElementMouseDown(e, element)
      }

      if (useSharedStaticRenderer) {
        return (
          <div
            key={element.id}
            data-slide-element="true"
            data-element-id={element.id}
            role="button"
            tabIndex={element.locked ? -1 : 0}
            aria-label={`${element.type} element`}
            style={wrapperStyle}
            onMouseDown={handleWrapperMouseDown}
            onKeyDown={e => {
              if (isKeyboardEventFromTextInput(e.target)) return

              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (!selectedIds.has(element.id)) onSelectElements(new Set([element.id]))
                if (element.locked) return
                if (e.key === 'Enter' && (element.type === 'text' || element.type === 'shape')) {
                  if (inlineEditing?.editingTextId !== element.id) {
                    onEditText(element.id)
                  }
                }
              }
            }}
            onDoubleClick={e => {
              if (element.locked) return
              if (element.type === 'text' || element.type === 'shape') {
                e.stopPropagation()
                if (inlineEditing?.editingTextId !== element.id) {
                  onEditText(element.id)
                }
              }
            }}
          >
            <SlideStaticElementContent
              element={element}
              isPresenting={isPresenting}
              onLinkClick={onLinkClick}
              renderVideoElement={true}
              disableMediaPointerEvents={
                !isPresenting && element.type === 'video' && (!isSelected || isDragging || isResizing)
              }
            />
            {videoMoveEdgeNodes}
            {resizeHandleNodes}
          </div>
        )
      }

      return (
        <div
          key={element.id}
          data-slide-element="true"
          data-element-id={element.id}
          role="button"
          tabIndex={element.locked ? -1 : 0}
          aria-label={`${element.type} element`}
          style={wrapperStyle}
          onMouseDown={handleWrapperMouseDown}
          onKeyDown={e => {
            if (isKeyboardEventFromTextInput(e.target)) return

            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!selectedIds.has(element.id)) onSelectElements(new Set([element.id]))
              if (element.locked) return
              if (e.key === 'Enter' && (element.type === 'text' || element.type === 'shape')) {
                if (inlineEditing?.editingTextId !== element.id) {
                  onEditText(element.id)
                }
              }
            }
          }}
          onDoubleClick={e => {
            // Double-click to start inline text editing. Works for plain text
            // elements AND shapes with an in-shape label so shape text gets
            // the same first-class editing affordance as text boxes.
            if (element.locked) return
            if (element.type === 'text' || element.type === 'shape') {
              e.stopPropagation()
              if (inlineEditing?.editingTextId !== element.id) {
                onEditText(element.id)
              }
            }
          }}
        >
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
                    overflow: inlineEditing?.editingTextId === element.id ? 'visible' : 'hidden',
                    position: 'relative'
                  }}
                >
                  {inlineEditing?.editingTextId === element.id ? (
                    <>
                      {renderInlineEditingMoveEdges(element.id)}
                      <InlineRichTextEditor
                        key={element.id}
                        element={
                          inlineEditing.editorElement && inlineEditing.editingTextId === element.id
                            ? inlineEditing.editorElement
                            : textEl
                        }
                        onTextChange={inlineEditing.onTextChange}
                        onSelectionChange={inlineEditing.onSelectionChange}
                        onFinishEditing={() => {
                          textareaInitializedRef.current = null
                          inlineEditing.onFinishEditing()
                        }}
                        onCopySelection={inlineEditing.onCopySelection}
                        onCutSelection={inlineEditing.onCutSelection}
                        onPasteSelection={inlineEditing.onPasteSelection}
                        selectionToRestore={inlineEditing.selectionToRestore}
                        rehydrateToken={inlineEditing.rehydrateToken}
                        selectionRef={inlineEditing.selectionRef}
                        data-testid={`slide-text-editor-${element.id}`}
                      />
                      {/* Inline editing toolbar */}
                      <div
                        className="gba:bg-background/95 gba:backdrop-blur-sm gba:rounded-lg gba:shadow-lg gba:border gba:border-border"
                        style={{
                          position: 'absolute',
                          bottom: 8 / scale,
                          right: 8 / scale,
                          transform: `scale(${1 / scale})`,
                          transformOrigin: 'bottom right',
                          display: 'flex',
                          gap: 4,
                          padding: '6px 8px',
                          zIndex: 10000
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        {inlineEditing.voiceInput?.isSupported && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (inlineEditing.voiceInput?.isListening) {
                                inlineEditing.voiceInput.stopListening()
                              } else {
                                inlineEditing.voiceInput?.startListening()
                              }
                            }}
                            className={`gba:flex gba:items-center gba:justify-center gba:gap-1 gba:h-8 gba:rounded-md gba:border-0 gba:cursor-pointer gba:transition-all gba:text-xs gba:font-medium ${
                              inlineEditing.voiceInput?.isListening
                                ? 'gba:bg-destructive gba:text-destructive-foreground gba:px-3 gba:animate-pulse'
                                : 'gba:bg-muted gba:text-foreground gba:w-8'
                            }`}
                            title={inlineEditing.voiceInput?.isListening ? 'Stop voice input' : 'Start voice input'}
                          >
                            {inlineEditing.voiceInput?.isListening ? (
                              <>
                                <MicOff className="gba:w-3.5 gba:h-3.5" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <Mic className="gba:w-4 gba:h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (inlineEditing.voiceInput?.isListening) {
                              inlineEditing.voiceInput.stopListening()
                            }
                            inlineEditing.onFinishEditing()
                          }}
                          className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-md gba:border-0 gba:cursor-pointer gba:bg-primary gba:text-primary-foreground gba:transition-all"
                          title="Done editing"
                          data-testid={`slide-text-editor-done-${element.id}`}
                        >
                          <Check className="gba:w-4 gba:h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={getRichTextBoxStyle(textEl)}>
                      {textElementHasVisibleContent(textEl) ? (
                        textEl.paragraphs && textEl.paragraphs.length > 0 ? (
                          <RichTextContent element={textEl} paragraphs={textEl.paragraphs} />
                        ) : (
                          <TextWithLinks
                            content={textEl.content}
                            links={textEl.links ?? []}
                            isPresenting={isPresenting}
                            onLinkClick={onLinkClick}
                          />
                        )
                      ) : (
                        renderTextPlaceholder(textEl, isPresenting)
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

          {element.type === 'shape' && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {editingPointsId === element.id && (
                <ShapePointEditor
                  element={element}
                  scale={scale}
                  onChangePath={nextPath => onPointsChange?.(element.id, nextPath)}
                  onExit={() => onExitPointEditing?.()}
                />
              )}
              {(() => {
                // Apply flipH/flipV transforms and effect filters (glow, soft
                // edges, reflection) over the rendered shape. Keeping effects
                // as a wrapper rather than patching every shape renderer
                // avoids duplicating effect styles across every preset.
                // NOTE: Shape flip is already applied by the Office preset
                // renderer inside its SVG transform, and by the fallback
                // switch via the shared `renderShape` helper. We intentionally
                // do NOT add a CSS `scale(-1)` here to avoid double-flipping
                // presets.
                const se: ShapeElement = element
                const effects = se.effects
                const filters: string[] = []
                if (effects?.glow) {
                  filters.push(`drop-shadow(0 0 ${effects.glow.size}px ${effects.glow.color})`)
                }
                // CSS `filter: drop-shadow` only renders the shadow of
                // opaque pixels, so PowerPoint's common "card" pattern —
                // `roundRect` + `noFill` + `outerShdw` — would only shadow
                // the 1px stroke and lose the card elevation entirely
                // (e.g. slide 15/16/17 of the Enterprise AI deck). For
                // rectangle-family shapes we prefer `box-shadow` on the
                // wrapper because it follows the bounding rectangle
                // (respecting `border-radius`) and draws the shadow even
                // when the shape itself is transparent. Non-rectangular
                // presets keep the silhouette-accurate drop-shadow path.
                const rectangleFamilyPresets = new Set<string>([
                  'rect',
                  'roundRect',
                  'round1Rect',
                  'round2SameRect',
                  'round2DiagRect',
                  'snip1Rect',
                  'snip2SameRect',
                  'snip2DiagRect',
                  'snipRoundRect',
                  'ellipse'
                ])
                const isRectangleFamily =
                  se.shapeType === 'rectangle' ||
                  se.shapeType === 'rounded-rectangle' ||
                  se.shapeType === 'ellipse' ||
                  (!!se.geometry?.prst && rectangleFamilyPresets.has(se.geometry.prst))
                if (effects?.outerShadow && !isRectangleFamily) {
                  const os = effects.outerShadow
                  filters.push(`drop-shadow(${os.offsetX}px ${os.offsetY}px ${os.blur}px ${os.color})`)
                }
                if (effects?.innerShadow) {
                  // CSS has no native inner shadow filter, so we chain an
                  // offset + inverse blur through drop-shadow; it matches
                  // PowerPoint closely enough for import preview purposes.
                  const is = effects.innerShadow
                  filters.push(`drop-shadow(${is.offsetX}px ${is.offsetY}px ${is.size}px ${is.color})`)
                }
                if (effects?.blur) {
                  filters.push(`blur(${Math.max(0, effects.blur.radius)}px)`)
                }
                if (effects?.softEdges) {
                  filters.push(`blur(${Math.max(0, Math.min(effects.softEdges.size, 10))}px)`)
                }
                const boxShadowParts: string[] = []
                if (effects?.outerShadow && isRectangleFamily) {
                  const os = effects.outerShadow
                  boxShadowParts.push(`${os.offsetX}px ${os.offsetY}px ${os.blur}px ${os.color}`)
                }
                const wrapperStyle: React.CSSProperties = {
                  width: '100%',
                  height: '100%',
                  filter: filters.length > 0 ? filters.join(' ') : undefined,
                  boxShadow: boxShadowParts.length > 0 ? boxShadowParts.join(', ') : undefined,
                  // `box-shadow` hugs the element bounds, so when the
                  // shape is a rounded rectangle we mirror the SVG corner
                  // radius onto the wrapper. The radius matches
                  // `ShapeElement.cornerRadius` which import seeds with
                  // `round1Rect`'s `roundRect` default; user-edited values
                  // flow through the same slot.
                  borderRadius:
                    isRectangleFamily && boxShadowParts.length > 0
                      ? se.shapeType === 'ellipse'
                        ? '50%'
                        : `${se.cornerRadius ?? 0}px`
                      : undefined
                }
                return (
                  <>
                    <div style={wrapperStyle}>{renderShape(se)}</div>
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
                        {renderShape(se)}
                      </div>
                    )}
                  </>
                )
              })()}
              {(() => {
                const se: ShapeElement = element
                const isEditingLabel = inlineEditing?.editingTextId === se.id
                // When editing, force a default ShapeInText so the user has a
                // real text container to type into even on shapes that did not
                // previously have a label.
                const st = se.shapeText ?? (isEditingLabel ? createDefaultShapeText() : null)
                if (!st) return null
                const te = textElementStubForShapeInText(se, st)
                const shouldAllowOverflow = isEditingLabel || st.allowOverflow === true
                return (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      justifyContent:
                        te.verticalAlign === 'top'
                          ? 'flex-start'
                          : te.verticalAlign === 'bottom'
                            ? 'flex-end'
                            : 'center',
                      padding: st.padding,
                      overflow: shouldAllowOverflow ? 'visible' : 'hidden',
                      boxSizing: 'border-box',
                      pointerEvents: isEditingLabel ? 'auto' : 'none',
                      zIndex: 1
                    }}
                  >
                    {isEditingLabel ? (
                      <>
                        {renderInlineEditingMoveEdges(se.id)}
                        <InlineRichTextEditor
                          key={se.id}
                          element={
                            inlineEditing?.editorElement && inlineEditing.editingTextId === se.id
                              ? inlineEditing.editorElement
                              : te
                          }
                          onTextChange={value => inlineEditing?.onTextChange(value)}
                          onSelectionChange={range => inlineEditing?.onSelectionChange(range)}
                          onFinishEditing={() => {
                            textareaInitializedRef.current = null
                            inlineEditing?.onFinishEditing()
                          }}
                          onCopySelection={inlineEditing?.onCopySelection}
                          onCutSelection={inlineEditing?.onCutSelection}
                          onPasteSelection={inlineEditing?.onPasteSelection}
                          selectionToRestore={inlineEditing?.selectionToRestore}
                          rehydrateToken={inlineEditing?.rehydrateToken}
                          selectionRef={inlineEditing?.selectionRef}
                          data-testid={`slide-shape-text-editor-${se.id}`}
                        />
                      </>
                    ) : st.paragraphs && st.paragraphs.length > 0 ? (
                      <RichTextContent element={te} paragraphs={st.paragraphs} />
                    ) : (
                      <div style={getRichTextBoxStyle(te)}>
                        <TextWithLinks
                          content={st.content}
                          links={st.links ?? []}
                          isPresenting={isPresenting}
                          onLinkClick={onLinkClick}
                        />
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {element.type === 'image' && (
            <>
              {!failedImages.has(element.id) && sanitizeMediaUrl(element.src, ['image/']) ? (
                <CanvasImageElement element={element} onError={() => handleImageError(element.id)} />
              ) : (
                (() => {
                  const imgEl: ImageElement = element
                  return (
                    <div
                      className="gba:w-full gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-muted gba:text-muted-foreground gba:rounded"
                      style={{
                        borderRadius: imgEl.borderRadius,
                        border: imgEl.borderWidth > 0 ? `${imgEl.borderWidth}px solid ${imgEl.borderColor}` : 'none'
                      }}
                    >
                      <ImageOff className="gba:w-8 gba:h-8 gba:mb-2" />
                      <span className="gba:text-xs">Image failed to load</span>
                    </div>
                  )
                })()
              )}
            </>
          )}

          {element.type === 'code' &&
            (() => {
              const ce: CodeElement = element
              const defaultBg = ce.theme === 'dark' ? '#1e1e1e' : '#f8f8f8'
              const defaultColor = ce.theme === 'dark' ? '#d4d4d4' : '#333'
              const codeStyle: React.CSSProperties = {
                width: '100%',
                height: '100%',
                margin: 0,
                padding: ce.padding ?? 16,
                backgroundColor: ce.backgroundColor || defaultBg,
                color: ce.textColor || defaultColor,
                fontFamily: 'monospace',
                fontSize: ce.fontSize,
                overflow: 'auto',
                borderRadius: ce.borderRadius ?? 8,
                border: (ce.borderWidth ?? 0) > 0 ? `${ce.borderWidth}px solid ${ce.borderColor || '#333333'}` : 'none',
                boxShadow: ce.shadow
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                  : 'none',
                boxSizing: 'border-box'
              }

              if (inlineEditing?.editingTextId === element.id) {
                return (
                  <textarea
                    ref={el => {
                      if (el && textareaInitializedRef.current !== element.id) {
                        textareaInitializedRef.current = element.id
                        el.focus()
                        el.selectionStart = el.selectionEnd = el.value.length
                      }
                    }}
                    value={ce.code}
                    onChange={e => inlineEditing.onTextChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Escape') {
                        e.stopPropagation()
                      }

                      if (e.key === 'Escape') {
                        e.preventDefault()
                        textareaInitializedRef.current = null
                        inlineEditing.onFinishEditing()
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      ...codeStyle,
                      background: ce.backgroundColor || defaultBg,
                      border:
                        (ce.borderWidth ?? 0) > 0
                          ? `${ce.borderWidth}px solid ${ce.borderColor || '#333333'}`
                          : '1px solid rgba(255,255,255,0.2)',
                      outline: 'none',
                      resize: 'none',
                      whiteSpace: 'pre',
                      tabSize: 2
                    }}
                    spellCheck={false}
                  />
                )
              }

              return (
                <pre style={codeStyle}>
                  <code>{ce.code}</code>
                </pre>
              )
            })()}

          {element.type === 'video' && (() => <CanvasVideoElement element={element} />)()}

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

          {element.type === 'chart' && (
            <SlideChartRenderer element={element} width={element.size.width} height={element.size.height} />
          )}

          {element.type === 'icon' &&
            (() => {
              const iconEl: IconElement = element
              const iconName = iconEl.iconName
                .split('-')
                .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
                .join('')
              const IconComponent = lucideIcons[iconName as keyof typeof lucideIcons] || lucideIcons['FileText']
              return (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconComponent
                    size={Math.min(iconEl.size.width, iconEl.size.height) * 0.8}
                    color={iconEl.color}
                    strokeWidth={iconEl.strokeWidth}
                    fill={iconEl.filled ? iconEl.color : 'none'}
                  />
                </div>
              )
            })()}

          {element.type === 'logo' &&
            (() => {
              const logoEl = element as LogoElement
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
                        color: isDark ? '#ffffff' : '#0a0a0a'
                      }}
                    >
                      <span style={{ color: isDark ? '#e91e8c' : '#e91e8c' }}>NEW</span>
                      <span style={{ color: isDark ? '#f5a623' : '#f5a623' }}>WORK</span>
                    </span>
                  )}
                </div>
              )
            })()}

          {element.type === 'footer' &&
            (() => {
              const footerEl = element as FooterElement
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
            })()}

          {element.type === 'badge' &&
            (() => {
              const badgeEl = element as BadgeElement
              const iconName = badgeEl.iconName
                ?.split('-')
                .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
                .join('')
              const IconComponent = iconName ? lucideIcons[iconName as keyof typeof lucideIcons] : null

              const getBadgeStyle = (): React.CSSProperties => {
                const base: React.CSSProperties = {
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: badgeEl.borderRadius,
                  fontSize: badgeEl.fontSize,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif'
                }

                switch (badgeEl.variant) {
                  case 'filled':
                    return {
                      ...base,
                      backgroundColor: badgeEl.backgroundColor,
                      color: badgeEl.textColor
                    }
                  case 'outlined':
                    return {
                      ...base,
                      backgroundColor: 'transparent',
                      color: badgeEl.backgroundColor,
                      border: `2px solid ${badgeEl.borderColor || badgeEl.backgroundColor}`
                    }
                  case 'subtle':
                    return {
                      ...base,
                      backgroundColor: `${badgeEl.backgroundColor}20`,
                      color: badgeEl.backgroundColor
                    }
                  default:
                    return base
                }
              }

              return (
                <div style={getBadgeStyle()}>
                  {IconComponent && <IconComponent size={badgeEl.iconSize} strokeWidth={2} />}
                  <span>{badgeEl.label}</span>
                </div>
              )
            })()}

          {element.type === 'connector' &&
            (() => {
              const connEl: ConnectorElement = element
              const relativeStart = {
                x: connEl.startPoint.x - element.position.x,
                y: connEl.startPoint.y - element.position.y
              }
              const relativeEnd = {
                x: connEl.endPoint.x - element.position.x,
                y: connEl.endPoint.y - element.position.y
              }

              const getPath = (): string => {
                if (connEl.lineType === 'straight') {
                  return `M ${relativeStart.x} ${relativeStart.y} L ${relativeEnd.x} ${relativeEnd.y}`
                } else if (connEl.lineType === 'elbow') {
                  const midX = (relativeStart.x + relativeEnd.x) / 2
                  return `M ${relativeStart.x} ${relativeStart.y} L ${midX} ${relativeStart.y} L ${midX} ${relativeEnd.y} L ${relativeEnd.x} ${relativeEnd.y}`
                } else {
                  const midX = (relativeStart.x + relativeEnd.x) / 2
                  const midY = (relativeStart.y + relativeEnd.y) / 2
                  return `M ${relativeStart.x} ${relativeStart.y} Q ${midX} ${relativeStart.y} ${midX} ${midY} Q ${midX} ${relativeEnd.y} ${relativeEnd.x} ${relativeEnd.y}`
                }
              }

              const getStrokeDasharray = (): string | undefined => {
                switch (connEl.strokeStyle) {
                  case 'dashed':
                    return '8 4'
                  case 'dotted':
                    return '2 4'
                  default:
                    return undefined
                }
              }

              const arrowMarkerId = `arrow-${connEl.id}`

              return (
                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                  <defs>
                    <marker
                      id={arrowMarkerId}
                      markerWidth={connEl.arrowSize}
                      markerHeight={connEl.arrowSize}
                      refX={connEl.arrowSize - 1}
                      refY={connEl.arrowSize / 2}
                      orient="auto"
                    >
                      <polygon
                        points={`0 0, ${connEl.arrowSize} ${connEl.arrowSize / 2}, 0 ${connEl.arrowSize}`}
                        fill={connEl.strokeColor}
                      />
                    </marker>
                  </defs>
                  <path
                    d={getPath()}
                    stroke={connEl.strokeColor}
                    strokeWidth={connEl.strokeWidth}
                    strokeDasharray={getStrokeDasharray()}
                    fill="none"
                    markerEnd={connEl.endArrow ? `url(#${arrowMarkerId})` : undefined}
                    markerStart={connEl.startArrow ? `url(#${arrowMarkerId})` : undefined}
                  />
                  {connEl.label && (
                    <text
                      x={(relativeStart.x + relativeEnd.x) / 2}
                      y={(relativeStart.y + relativeEnd.y) / 2 - 8}
                      textAnchor="middle"
                      fill={connEl.labelColor || connEl.strokeColor}
                      fontSize={connEl.labelFontSize || 12}
                      fontFamily="Inter, sans-serif"
                    >
                      {connEl.label}
                    </text>
                  )}
                </svg>
              )
            })()}

          {element.type === 'layer' &&
            (() => {
              const layerEl = element as LayerElement
              const iconName = layerEl.iconName
                ?.split('-')
                .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
                .join('')
              const IconComponent = iconName ? lucideIcons[iconName as keyof typeof lucideIcons] : null

              return (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '0 24px',
                    backgroundColor: layerEl.backgroundColor,
                    color: layerEl.textColor,
                    borderRadius: layerEl.borderRadius,
                    border: layerEl.borderColor !== 'transparent' ? `1px solid ${layerEl.borderColor}` : undefined,
                    boxShadow:
                      layerEl.depth > 0 ? `0 ${layerEl.depth}px ${layerEl.depth * 2}px rgba(0,0,0,0.2)` : undefined,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {IconComponent && <IconComponent size={24} strokeWidth={2} />}
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
            })()}

          {element.type === 'group' &&
            (() => {
              // Minimal persistent-group visualization: the group wrapper
              // owns selection/move/resize, and children render inline at
              // positions relative to the group origin. For deep editing
              // users can ungroup (Ctrl/Cmd+Shift+G) or double-click; this
              // mirrors PowerPoint's group-first, edit-in-place escape hatch.
              const groupEl: GroupElement = element
              return (
                <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {groupEl.children.map(child => {
                    if (child.type === 'shape') {
                      const shape: ShapeElement = child
                      const geometry = shape.geometry ?? shape.importMeta
                      return (
                        <div
                          key={child.id}
                          style={{
                            position: 'absolute',
                            left: child.position.x,
                            top: child.position.y,
                            width: child.size.width,
                            height: child.size.height,
                            transform: `rotate(${child.rotation ?? 0}deg)`,
                            opacity: child.opacity ?? 1,
                            background: shape.fill,
                            border: `${shape.strokeWidth}px ${shape.strokeStyle} ${shape.strokeColor}`,
                            borderRadius: shape.shapeType === 'rounded-rectangle' ? shape.cornerRadius : undefined
                          }}
                          aria-hidden={!!geometry}
                        />
                      )
                    }
                    if (child.type === 'text') {
                      const textEl: TextElement = child
                      return (
                        <div
                          key={child.id}
                          style={{
                            position: 'absolute',
                            left: child.position.x,
                            top: child.position.y,
                            width: child.size.width,
                            height: child.size.height,
                            transform: `rotate(${child.rotation ?? 0}deg)`,
                            opacity: child.opacity ?? 1,
                            color: textEl.color,
                            fontSize: textEl.fontSize,
                            fontFamily: textEl.fontFamily,
                            fontWeight: textEl.fontWeight,
                            fontStyle: textEl.fontStyle,
                            textAlign: textEl.textAlign,
                            padding: textEl.padding,
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {textEl.content}
                        </div>
                      )
                    }
                    if (child.type === 'image') {
                      const imgEl: ImageElement = child
                      return (
                        <img
                          key={child.id}
                          src={sanitizeMediaUrl(imgEl.src, ['image/']) || undefined}
                          alt=""
                          style={{
                            position: 'absolute',
                            left: child.position.x,
                            top: child.position.y,
                            width: child.size.width,
                            height: child.size.height,
                            transform: `rotate(${child.rotation ?? 0}deg)`,
                            opacity: child.opacity ?? 1,
                            objectFit: 'cover'
                          }}
                        />
                      )
                    }
                    return (
                      <div
                        key={child.id}
                        style={{
                          position: 'absolute',
                          left: child.position.x,
                          top: child.position.y,
                          width: child.size.width,
                          height: child.size.height,
                          background: 'var(--nw-muted)',
                          border: '1px dashed rgba(100, 116, 139, 0.5)',
                          fontSize: 11,
                          color: 'var(--nw-muted-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {child.type}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

          {element.type === 'metric-card' &&
            (() => {
              const metricEl = element as MetricCardElement
              const iconName = metricEl.iconName
                ?.split('-')
                .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
                .join('')
              const IconComponent = iconName ? lucideIcons[iconName as keyof typeof lucideIcons] : null

              const getTrendIcon = () => {
                if (!metricEl.trend) return null
                const TrendIcon =
                  metricEl.trend === 'up'
                    ? lucideIcons['TrendingUp']
                    : metricEl.trend === 'down'
                      ? lucideIcons['TrendingDown']
                      : lucideIcons['Minus']
                const trendColor =
                  metricEl.trend === 'up' ? '#22c55e' : metricEl.trend === 'down' ? '#ef4444' : '#64748b'
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: trendColor }}>
                    <TrendIcon size={14} />
                    {metricEl.trendValue && <span style={{ fontSize: 12 }}>{metricEl.trendValue}</span>}
                  </div>
                )
              }

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
                    border: metricEl.borderWidth
                      ? `${metricEl.borderWidth}px solid ${metricEl.borderColor}`
                      : undefined,
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}
                  >
                    {IconComponent && (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: hexToRgba(metricEl.valueColor, 0.1),
                          borderRadius: 8,
                          color: metricEl.valueColor
                        }}
                      >
                        <IconComponent size={20} />
                      </div>
                    )}
                    {getTrendIcon()}
                  </div>
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
                  <div
                    style={{
                      fontSize: metricEl.labelFontSize,
                      fontWeight: 600,
                      color: metricEl.labelColor,
                      marginBottom: 4
                    }}
                  >
                    {metricEl.label}
                  </div>
                  {metricEl.description && (
                    <div
                      style={{
                        fontSize: metricEl.descriptionFontSize,
                        color: metricEl.descriptionColor || 'rgba(255,255,255,0.6)',
                        lineHeight: 1.4
                      }}
                    >
                      {metricEl.description}
                    </div>
                  )}
                </div>
              )
            })()}

          {resizeHandleNodes}
        </div>
      )
    }

    // Wrapper matches the deck's declared canvas size and scales the content
    // uniformly; default is the legacy 16:9 preset for editor-native decks.
    const scaledWidth = CANVAS_WIDTH * scale
    const scaledHeight = CANVAS_HEIGHT * scale

    return (
      <div
        style={{
          width: scaledWidth,
          height: scaledHeight,
          flexShrink: 0
        }}
      >
        <div
          ref={canvasRef}
          role="application"
          aria-label="Slide canvas"
          className="gba:relative"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            ...getBackgroundStyle(),
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            userSelect: isDragging || isResizing || isMarquee ? 'none' : undefined
          }}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onSelectElements(new Set())
            }
          }}
        >
          {/* Video Background */}
          {renderVideoBackground()}

          {/* Elements */}
          {(elements || [])
            .filter(element => Boolean(element?.position && element?.size))
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map(element => renderElement(element))}

          {/* Marquee Selection Rectangle */}
          {isMarquee && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(marqueeStart.x, marqueeEnd.x),
                top: Math.min(marqueeStart.y, marqueeEnd.y),
                width: Math.abs(marqueeEnd.x - marqueeStart.x),
                height: Math.abs(marqueeEnd.y - marqueeStart.y),

                border: '1px dashed #3b82f6',
                // eslint-disable-next-line newwork-local/no-hardcoded-colors
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
                zIndex: 9999
              }}
            />
          )}

          {/* Snap Guides */}
          {snapGuides.map((guide, idx) => (
            <div
              key={`snap-guide-${idx}`}
              style={{
                position: 'absolute',
                // eslint-disable-next-line newwork-local/no-hardcoded-colors
                backgroundColor: '#f43f5e',
                pointerEvents: 'none',
                zIndex: 10000,
                ...(guide.type === 'vertical'
                  ? {
                      left: guide.position,
                      top: 0,
                      width: 1,
                      height: CANVAS_HEIGHT
                    }
                  : {
                      left: 0,
                      top: guide.position,
                      width: CANVAS_WIDTH,
                      height: 1
                    })
              }}
            />
          ))}
        </div>
      </div>
    )
  }
)

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
