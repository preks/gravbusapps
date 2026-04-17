/**
 * Selection border, eight-way resize handles, and rotate control — aligned with CustomImageFigure behavior.
 */

import React from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import type { SignatureResizeDirection } from './SignatureCropOverlay'
import { getSignatureResizeHandleCursor } from './signatureInteractionUtils'

const HANDLE_DIRECTIONS: ReadonlyArray<SignatureResizeDirection> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

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

export interface SignatureSelectionChromeProps {
  rotateAriaLabel: string
  onResizeMouseDown: (direction: SignatureResizeDirection, event: React.MouseEvent) => void
  onRotateMouseDown: (event: React.MouseEvent) => void
  'data-testid'?: string
}

export function SignatureSelectionChrome({
  rotateAriaLabel,
  onResizeMouseDown,
  onRotateMouseDown,
  'data-testid': testId = 'document-editor-signature-chrome'
}: Readonly<SignatureSelectionChromeProps>) {
  return (
    <>
      <span
        className="gba:absolute gba:-inset-1 gba:border-2 gba:border-solid gba:border-primary/70 gba:pointer-events-none"
        data-testid={`${testId}-selection-frame`}
      />
      {HANDLE_DIRECTIONS.map(direction => (
        <button
          key={direction}
          type="button"
          className={`gba:absolute gba:z-30 gba:h-3 gba:w-3 gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 ${directionClasses[direction]}`}
          style={{ cursor: getSignatureResizeHandleCursor(direction, false) }}
          onMouseDown={event => onResizeMouseDown(direction, event)}
          data-signature-handle="true"
          data-testid={`${testId}-handle-${direction}`}
        />
      ))}
      <span
        className="gba:absolute gba:bottom-full gba:left-1/2 gba:z-30 gba:flex gba:flex-col gba:items-center gba:-translate-x-1/2 gba:pb-2"
        data-signature-handle="true"
      >
        <button
          type="button"
          aria-label={rotateAriaLabel}
          className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 gba:text-primary gba:shadow-sm gba:cursor-grab hover:gba:bg-accent"
          onMouseDown={onRotateMouseDown}
          data-signature-handle="true"
          data-testid={`${testId}-rotate-handle`}
        >
          <ArrowsClockwise className="gba:h-3.5 gba:w-3.5" aria-hidden />
        </button>
        <span className="gba:h-4 gba:w-px gba:bg-primary/70 gba:pointer-events-none" />
      </span>
    </>
  )
}
