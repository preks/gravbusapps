import type { SignatureResizeDirection } from './SignatureCropOverlay'

const ROTATION_SNAP_INCREMENT = 15
const ROTATION_SNAP_TOLERANCE = 3

export function getSignatureResizeHandleCursor(direction: SignatureResizeDirection, cropMode: boolean): string {
  if (cropMode) {
    if (direction === 'n' || direction === 's') return 'ns-resize'
    if (direction === 'e' || direction === 'w') return 'ew-resize'
    if (direction === 'ne' || direction === 'sw') return 'nesw-resize'
    return 'nwse-resize'
  }
  if (direction === 'n' || direction === 's') return 'ns-resize'
  if (direction === 'e' || direction === 'w') return 'ew-resize'
  if (direction === 'ne' || direction === 'sw') return 'nesw-resize'
  return 'nwse-resize'
}

export function clampSignatureRotation(rotation: number): number {
  const normalized = ((rotation % 360) + 360) % 360
  const nearestSnap = Math.round(normalized / ROTATION_SNAP_INCREMENT) * ROTATION_SNAP_INCREMENT
  if (Math.abs(nearestSnap - normalized) <= ROTATION_SNAP_TOLERANCE) {
    return nearestSnap % 360
  }
  return Number(normalized.toFixed(2))
}

export function getPointerAngleFromRect(clientX: number, clientY: number, rect: DOMRect): number {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI
}
