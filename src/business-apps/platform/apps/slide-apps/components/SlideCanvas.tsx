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
  TableElement,
  ChartElement,
  IconElement,
  LogoElement,
  FooterElement,
  BadgeElement,
  ConnectorElement,
  LayerElement,
  MetricCardElement,
  Position,
  Size
} from './slideElements'
import { gradientToCss } from './slideElements'
import { SlideChartRenderer } from './SlideChartRenderer'
import { TextWithLinks } from './TextWithLinks'
import { getCachedImageUrl } from '../hooks/useImageObjectUrls'

const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Sanitize media URL to prevent XSS attacks.
 * Only allows https, http, data:image/video, blob, or relative paths.
 */
const sanitizeMediaUrl = (url: string | undefined, allowedTypes: string[] = ['image/', 'video/']): string => {
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
  for (const type of allowedTypes) {
    if (trimmed.startsWith(`data:${type}`)) {
      return trimmed
    }
  }
  return ''
}

interface InlineEditingProps {
  editingTextId: string | null
  onTextChange: (value: string) => void
  onFinishEditing: () => void
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
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

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
    onLinkClick
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
    const mouseDownElementRef = useRef<{ id: string; x: number; y: number; type: string } | null>(null)
    const CLICK_MOVE_THRESHOLD = 4

    // Marquee selection state (for rendering the selection box)
    const [isMarquee, setIsMarquee] = useState(false)
    const [marqueeStart, setMarqueeStart] = useState<Position>({ x: 0, y: 0 })
    const [marqueeEnd, setMarqueeEnd] = useState<Position>({ x: 0, y: 0 })

    // Flag to prevent click handler from clearing selection after marquee
    const justFinishedMarqueeRef = useRef(false)

    // Snap guides state
    const CANVAS_WIDTH = 1280
    const CANVAS_HEIGHT = 720
    const SNAP_THRESHOLD = 8
    const [snapGuides, setSnapGuides] = useState<{ type: 'horizontal' | 'vertical'; position: number }[]>([])

    // Track images that failed to load
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

    const handleImageError = useCallback((elementId: string) => {
      setFailedImages(prev => new Set(prev).add(elementId))
    }, [])

    const getBackgroundStyle = (): React.CSSProperties => {
      switch (background.type) {
        case 'gradient':
          return background.gradient ? { background: gradientToCss(background.gradient) } : {}
        case 'branded': {
          // Branded backgrounds layer: overlay (top) + gradient (middle) + base color (bottom)
          const layers: string[] = []

          if (background.overlay) {
            layers.push(gradientToCss(background.overlay))
          }
          if (background.gradient) {
            layers.push(gradientToCss(background.gradient))
          }

          const baseColor = background.color || '#0a0a0a'

          if (layers.length > 0) {
            return { background: `${layers.join(', ')}, ${baseColor}` }
          }
          return { backgroundColor: baseColor }
        }
        case 'image':
          return background.imageUrl
            ? {
                backgroundImage: `url(${getCachedImageUrl(background.imageUrl)})`,
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

    const renderVideoBackground = () => {
      if (background.type !== 'video' || !background.videoUrl) return null
      const sanitizedVideoUrl = sanitizeMediaUrl(background.videoUrl, ['video/'])
      if (!sanitizedVideoUrl) return null
      return (
        <video
          autoPlay
          loop={background.videoLoop !== false}
          muted={background.videoMuted !== false}
          playsInline
          className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <source src={sanitizedVideoUrl} type="video/mp4" />
        </video>
      )
    }

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
      // Start marquee selection when clicking on empty canvas area
      // Check if clicking on canvas itself or on background elements (not slide elements)
      const target = e.target as HTMLElement
      const isClickOnElement = target.closest('[data-slide-element]')

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
      // Skip if we just finished a marquee selection (to avoid clearing the selection)
      if (justFinishedMarqueeRef.current) {
        mouseDownElementRef.current = null
        return
      }

      const target = e.target as HTMLElement
      const isClickOnElement = target.closest('[data-slide-element]')

      // Single-click-to-edit: if mouseDown ref survived (mouse didn't drag), enter text editing
      const mdRef = mouseDownElementRef.current
      mouseDownElementRef.current = null

      if (mdRef && mdRef.type === 'text') {
        if (inlineEditing?.editingTextId && inlineEditing.editingTextId !== mdRef.id) {
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

      // Call onElementClick for presenter view highlighting (works even on locked elements)
      onElementClick?.(element.id)

      if (element.locked) return

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

      effectiveSelection.forEach(id => {
        const el = elements.find(e => e.id === id)
        if (el) positions.set(id, { ...el.position })
      })
      setMultiDragStart(positions)

      // Track mousedown for single-click-to-edit detection (plain click on single element only)
      if (!isShiftKey && !isCtrlKey && effectiveSelection.size === 1) {
        mouseDownElementRef.current = { id: element.id, x: e.clientX, y: e.clientY, type: element.type }
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

        if (closestXSnap) {
          snappedX = closestXSnap.snapTo
          guides.push({ type: 'vertical', position: closestXSnap.guideX })
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

        if (closestYSnap) {
          snappedY = closestYSnap.snapTo
          guides.push({ type: 'horizontal', position: closestYSnap.guideY })
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

        const currentX = e.clientX / scale
        const currentY = e.clientY / scale

        const deltaX = currentX - dragStart.x
        const deltaY = currentY - dragStart.y

        if (isDragging) {
          // Multi-element drag
          if (selectedIds.size > 1 && multiDragStart.size > 0) {
            // Calculate bounding box of all selected elements for snapping
            const selectedElements = elements.filter(el => selectedIds.has(el.id))
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
              selectedIds
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
            const selectedId = [...selectedIds][0]
            const selectedElement = elements.find(el => el.id === selectedId)
            if (selectedId && selectedElement) {
              const newPosition = {
                x: elementStart.position.x + deltaX,
                y: elementStart.position.y + deltaY
              }

              const { snappedPosition, guides } = calculateSnap(newPosition, selectedElement.size, selectedIds)

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

      return (
        <div
          key={element.id}
          data-slide-element="true"
          data-element-id={element.id}
          style={wrapperStyle}
          onMouseDown={e => handleElementMouseDown(e, element)}
        >
          {element.type === 'text' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: (element as TextElement).gradient
                  ? undefined
                  : (element as TextElement).backgroundColor,
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
                overflow: inlineEditing?.editingTextId === element.id ? 'visible' : 'hidden',
                position: 'relative'
              }}
            >
              {inlineEditing?.editingTextId === element.id ? (
                <>
                  <textarea
                    ref={el => {
                      if (el) {
                        el.focus()
                        el.selectionStart = el.selectionEnd = el.value.length
                      }
                    }}
                    value={(element as TextElement).content}
                    onChange={e => inlineEditing.onTextChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        inlineEditing.onFinishEditing()
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
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
                      lineHeight: (element as TextElement).lineHeight,
                      letterSpacing: (element as TextElement).letterSpacing,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      resize: 'none',
                      padding: 0,
                      margin: 0
                    }}
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
                    >
                      <Check className="gba:w-4 gba:h-4" />
                    </button>
                  </div>
                  {/* Voice feedback panel */}
                  {inlineEditing.voiceInput?.isListening && (
                    <div
                      className="gba:bg-background gba:rounded-xl gba:shadow-xl gba:border gba:border-border"
                      style={{
                        position: 'absolute',
                        top: -120 / scale,
                        left: '50%',
                        transform: `translateX(-50%) scale(${1 / scale})`,
                        transformOrigin: 'bottom center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 16px',
                        minWidth: 200,
                        maxWidth: 400,
                        zIndex: 10000
                      }}
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      {/* Recording status with volume bars */}
                      <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
                        <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-destructive/10 gba:rounded-md">
                          <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse" />
                          <span className="gba:text-xs gba:font-semibold gba:text-destructive">REC</span>
                        </div>

                        {/* Volume indicator bars */}
                        <div className="gba:flex gba:items-end gba:gap-0.5 gba:h-5">
                          {[0.15, 0.3, 0.5, 0.7, 0.85].map((threshold, i) => {
                            const volume = inlineEditing.voiceInput?.volume || 0
                            const isActive = volume > threshold
                            return (
                              <div
                                key={i}
                                className={`gba:w-1 gba:rounded-sm gba:transition-colors ${isActive ? 'gba:bg-green-500' : 'gba:bg-border'}`}
                                style={{ height: 6 + i * 3 }}
                              />
                            )
                          })}
                        </div>

                        <span className="gba:text-[11px] gba:text-muted-foreground gba:ml-auto">Speak now...</span>
                      </div>

                      {/* Interim transcript */}
                      {inlineEditing.voiceInput?.interimTranscript && (
                        <div className="gba:w-full gba:px-2.5 gba:py-2 gba:bg-muted gba:rounded-md gba:text-sm gba:text-foreground gba:italic gba:leading-relaxed gba:max-h-[60px] gba:overflow-hidden">
                          "{inlineEditing.voiceInput.interimTranscript}"
                        </div>
                      )}

                      {/* Hint */}
                      <div className="gba:text-[11px] gba:text-muted-foreground">
                        Click mic button or outside to stop
                      </div>
                    </div>
                  )}
                </>
              ) : (
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
                  <TextWithLinks
                    content={(element as TextElement).content}
                    links={(element as TextElement).links}
                    isPresenting={isPresenting}
                    onLinkClick={onLinkClick}
                  />
                </div>
              )}
            </div>
          )}

          {element.type === 'shape' && renderShape(element as ShapeElement)}

          {element.type === 'image' && (
            <>
              {!failedImages.has(element.id) && sanitizeMediaUrl((element as ImageElement).src, ['image/']) ? (
                <img
                  src={getCachedImageUrl(sanitizeMediaUrl((element as ImageElement).src, ['image/']))}
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
                  onError={() => handleImageError(element.id)}
                />
              ) : (
                <div
                  className="gba:w-full gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-muted gba:text-muted-foreground gba:rounded"
                  style={{
                    borderRadius: (element as ImageElement).borderRadius,
                    border:
                      (element as ImageElement).borderWidth > 0
                        ? `${(element as ImageElement).borderWidth}px solid ${(element as ImageElement).borderColor}`
                        : 'none'
                  }}
                >
                  <ImageOff className="gba:w-8 gba:h-8 gba:mb-2" />
                  <span className="gba:text-xs">Image failed to load</span>
                </div>
              )}
            </>
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

          {element.type === 'video' && sanitizeMediaUrl((element as VideoElement).src, ['video/']) && (
            <video
              src={sanitizeMediaUrl((element as VideoElement).src, ['video/'])}
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

          {element.type === 'chart' && (
            <SlideChartRenderer
              element={element as ChartElement}
              width={element.size.width}
              height={element.size.height}
            />
          )}

          {element.type === 'icon' &&
            (() => {
              const iconEl = element as IconElement
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
              const connEl = element as ConnectorElement
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

          {/* Resize handles - only for single selection */}
          {isSelected && isSingleSelection && !element.locked && (
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

    // Wrapper maintains 16:9 aspect ratio and scales canvas
    const scaledWidth = 1280 * scale
    const scaledHeight = 720 * scale

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
          className="gba:relative"
          style={{
            width: 1280,
            height: 720,
            ...getBackgroundStyle(),
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
        >
          {/* Video Background */}
          {renderVideoBackground()}

          {/* Elements */}
          {(elements || []).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element => renderElement(element))}

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
