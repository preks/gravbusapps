/**
 * Crop handles + dimmed regions for signature crop mode (fractional crop model matches document images).
 */

import React, { useCallback, useRef } from 'react'
import type { NormalizedImageCrop } from '@/components/tiptap-extensions/tiptap-custom-image/cropUtils'
import { normalizeImageCrop } from '@/components/tiptap-extensions/tiptap-custom-image/cropUtils'

export type SignatureResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

const HANDLE_DIRECTIONS: ReadonlyArray<SignatureResizeDirection> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function getHandleCursor(direction: SignatureResizeDirection): string {
  if (direction === 'n' || direction === 's') return 'ns-resize'
  if (direction === 'e' || direction === 'w') return 'ew-resize'
  if (direction === 'ne' || direction === 'sw') return 'nesw-resize'
  return 'nwse-resize'
}

function preventDefaultStop(event: React.MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

export interface SignatureCropOverlayProps {
  frameWidth: number
  frameHeight: number
  crop: NormalizedImageCrop
  onCropPreview: (next: NormalizedImageCrop) => void
  onCropCommit: (next: NormalizedImageCrop) => void
  /** Short hint shown on the overlay (translated). */
  hintText?: string
  'data-testid'?: string
}

export function SignatureCropOverlay({
  frameWidth,
  frameHeight,
  crop,
  onCropPreview,
  onCropCommit,
  hintText,
  'data-testid': testId = 'document-editor-signature-crop-overlay'
}: Readonly<SignatureCropOverlayProps>) {
  const lastCropRef = useRef<NormalizedImageCrop>(crop)
  lastCropRef.current = crop

  const startCropInteraction = useCallback(
    (direction: SignatureResizeDirection, event: React.MouseEvent) => {
      preventDefaultStop(event)
      const startX = event.clientX
      const startY = event.clientY
      const startW = Math.max(1, frameWidth)
      const startH = Math.max(1, frameHeight)
      const sc = lastCropRef.current
      const startCrop = { top: sc.top, right: sc.right, bottom: sc.bottom, left: sc.left }

      const onMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        const includesWest = direction.includes('w')
        const includesEast = direction.includes('e')
        const includesNorth = direction.includes('n')
        const includesSouth = direction.includes('s')

        const nextCrop = {
          top: startCrop.top + (includesNorth ? dy / startH : 0),
          right: startCrop.right + (includesEast ? -dx / startW : 0),
          bottom: startCrop.bottom + (includesSouth ? -dy / startH : 0),
          left: startCrop.left + (includesWest ? dx / startW : 0)
        }
        const normalizedCrop = normalizeImageCrop({
          cropTop: nextCrop.top,
          cropRight: nextCrop.right,
          cropBottom: nextCrop.bottom,
          cropLeft: nextCrop.left
        })
        lastCropRef.current = normalizedCrop
        onCropPreview(normalizedCrop)
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        onCropCommit(lastCropRef.current)
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [frameHeight, frameWidth, onCropCommit, onCropPreview]
  )

  const directionClasses: Record<SignatureResizeDirection, string> = {
    n: 'gba:top-0 gba:left-1/2 gba:-translate-x-1/2 gba:-translate-y-1/2',
    ne: 'gba:top-0 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
    e: 'gba:top-1/2 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
    se: 'gba:bottom-0 gba:right-0 gba:translate-x-1/2 gba:translate-y-1/2',
    s: 'gba:bottom-0 gba:left-1/2 gba:-translate-x-1/2 gba:translate-y-1/2',
    sw: 'gba:bottom-0 gba:left-0 gba:-translate-x-1/2 gba:translate-y-1/2',
    w: 'gba:top-1/2 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2',
    nw: 'gba:top-0 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2'
  }

  const dimClass = 'gba:absolute gba:pointer-events-none gba:bg-black/55'
  const innerLeftPct = crop.left * 100
  const innerTopPct = crop.top * 100
  const innerWidthPct = Math.max(0, (1 - crop.left - crop.right) * 100)
  const innerHeightPct = Math.max(0, (1 - crop.top - crop.bottom) * 100)

  return (
    <span className="gba:absolute gba:inset-0 gba:z-20 gba:pointer-events-none" data-testid={testId}>
      <span className={`${dimClass} gba:top-0 gba:left-0 gba:right-0`} style={{ height: `${crop.top * 100}%` }} />
      <span className={`${dimClass} gba:bottom-0 gba:left-0 gba:right-0`} style={{ height: `${crop.bottom * 100}%` }} />
      <span className={`${dimClass} gba:top-0 gba:bottom-0 gba:left-0`} style={{ width: `${crop.left * 100}%` }} />
      <span className={`${dimClass} gba:top-0 gba:bottom-0 gba:right-0`} style={{ width: `${crop.right * 100}%` }} />
      {/* High-contrast outline around the visible crop window (helps on busy page text). */}
      <span
        className="gba:absolute gba:z-20 gba:pointer-events-none gba:ring-2 gba:ring-inset gba:ring-primary gba:shadow-md"
        style={{
          left: `${innerLeftPct}%`,
          top: `${innerTopPct}%`,
          width: `${innerWidthPct}%`,
          height: `${innerHeightPct}%`
        }}
        data-testid={`${testId}-aperture-ring`}
      />
      <span className="gba:absolute gba:-inset-1 gba:z-10 gba:border-2 gba:border-dashed gba:border-primary gba:pointer-events-none" />
      {HANDLE_DIRECTIONS.map(direction => (
        <button
          key={direction}
          type="button"
          className={`gba:absolute gba:z-30 gba:h-4 gba:w-4 gba:rounded-full gba:border-2 gba:border-primary gba:bg-background gba:shadow-md gba:p-0 gba:pointer-events-auto gba:ring-2 gba:ring-background ${directionClasses[direction]}`}
          style={{ cursor: getHandleCursor(direction) }}
          onMouseDown={event => startCropInteraction(direction, event)}
          data-signature-crop-handle="true"
          data-testid={`${testId}-handle-${direction}`}
        />
      ))}
      {hintText ? (
        <span className="gba:sr-only" data-testid={`${testId}-hint`}>
          {hintText}
        </span>
      ) : null}
    </span>
  )
}
