/**
 * ElbowConnector - orthogonal dependency connector with violation highlighting.
 */

import React, { useMemo } from 'react'
import type { DependencyType } from '../../types'

export interface BarGeo {
  x: number
  y: number
  w: number
  h: number
}

export interface ConnectorEdge {
  from: string
  to: string
  type: DependencyType
}

const ARROW_SIZE = 5

export const ElbowConnector: React.FC<{
  edge: ConnectorEdge
  fromGeo: BarGeo
  toGeo: BarGeo
}> = ({ edge, fromGeo, toGeo }) => {
  const { path, isViolation, ex, ey } = useMemo(() => {
    const midY = (g: BarGeo) => g.y + g.h / 2
    let sx: number, sy: number, _ex: number, _ey: number
    switch (edge.type) {
      case 'SS':
        sx = fromGeo.x
        sy = midY(fromGeo)
        _ex = toGeo.x
        _ey = midY(toGeo)
        break
      case 'FF':
        sx = fromGeo.x + fromGeo.w
        sy = midY(fromGeo)
        _ex = toGeo.x + toGeo.w
        _ey = midY(toGeo)
        break
      case 'SF':
        sx = fromGeo.x
        sy = midY(fromGeo)
        _ex = toGeo.x + toGeo.w
        _ey = midY(toGeo)
        break
      case 'FS':
      default:
        sx = fromGeo.x + fromGeo.w
        sy = midY(fromGeo)
        _ex = toGeo.x
        _ey = midY(toGeo)
        break
    }

    const gap = 12
    const turnX = sx + gap
    const d = `M ${sx} ${sy} H ${turnX} V ${_ey} H ${_ex}`

    let viol = false
    switch (edge.type) {
      case 'FS':
        viol = fromGeo.x + fromGeo.w > toGeo.x
        break
      case 'SS':
        viol = fromGeo.x > toGeo.x
        break
      case 'FF':
        viol = fromGeo.x + fromGeo.w > toGeo.x + toGeo.w
        break
      case 'SF':
        viol = fromGeo.x > toGeo.x + toGeo.w
        break
    }

    return { path: d, isViolation: viol, ex: _ex, ey: _ey }
  }, [edge, fromGeo, toGeo])

  const strokeClass = isViolation ? 'gba:stroke-destructive' : 'gba:stroke-muted-foreground'
  const fillClass = isViolation ? 'gba:fill-destructive' : 'gba:fill-muted-foreground'
  const op = isViolation ? 0.85 : 0.5

  return (
    <g pointerEvents="none">
      <path d={path} fill="none" strokeWidth={1.5} className={strokeClass} opacity={op} />
      <polygon
        points={`${ex},${ey} ${ex - ARROW_SIZE},${ey - ARROW_SIZE} ${ex - ARROW_SIZE},${ey + ARROW_SIZE}`}
        className={fillClass}
        opacity={op}
      />
    </g>
  )
}
