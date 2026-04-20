/**
 * SpaceHeroBackground - Lightweight animated gradient background
 * Matches video look: deep indigo → royal blue → light cyan, with moving waves.
 */

import React, { useEffect, useRef } from 'react'

export interface SpaceHeroBackgroundProps {
  className?: string
  /** Speed multiplier for wave motion (default 1). */
  speed?: number
}

interface WaveBlob {
  /** Wave path phase offset (unique per blob). */
  phase: number
  /** Base position along left-to-right (0–1). Left-heavy = 0.2–0.45. */
  baseX: number
  /** Base position top-to-bottom (0–1). */
  baseY: number
  /** Wave amplitude as fraction of dimension. */
  ampX: number
  ampY: number
  /** Blob radius as fraction of min(width, height). */
  radiusScale: number
  /** Radius breathes with this phase. */
  phaseR: number
  color: string
  opacity: number
  /** Stretch for wave band (1 = circle, >1 = elongated). */
  stretch: number
  /** Rotation phase for elongated blobs. */
  phaseRot: number
}

// High contrast: bright cyan/white highlight, mid blue base, deep navy in places
const BASE_BLUE = 'rgb(50, 90, 150)' // mid blue so bright + dark both read
const BRIGHT = [
  'rgba(224, 242, 254, 0.92)', // very light cyan (main bright spot – pops)
  'rgba(147, 197, 253, 0.78)' // light sky blue
]
const MID_DARK = [
  'rgba(59, 130, 246, 0.6)', // royal blue
  'rgba(30, 64, 175, 0.55)', // deep royal
  'rgba(15, 23, 42, 0.5)' // navy (darker areas)
]

export const SpaceHeroBackground: React.FC<SpaceHeroBackgroundProps> = ({ className = '', speed = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>()
  const wavesRef = useRef<WaveBlob[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      if (wavesRef.current.length === 0) {
        initWaves()
      }
    }

    const initWaves = () => {
      wavesRef.current = [
        // 1. Main bright spot – very large, very light (center-left)
        {
          phase: 0,
          baseX: 0.22,
          baseY: 0.35,
          ampX: 0.16,
          ampY: 0.22,
          radiusScale: 1.1,
          phaseR: 0.5,
          color: BRIGHT[0],
          opacity: 1,
          stretch: 1.3,
          phaseRot: 0
        },
        // 2. Second bright area (fanning up/right)
        {
          phase: Math.PI * 0.7,
          baseX: 0.35,
          baseY: 0.28,
          ampX: 0.14,
          ampY: 0.18,
          radiusScale: 0.85,
          phaseR: 1.2,
          color: BRIGHT[1],
          opacity: 1,
          stretch: 1.6,
          phaseRot: 0.3
        },
        // 3. Royal blue (mid transition)
        {
          phase: Math.PI * 1.3,
          baseX: 0.55,
          baseY: 0.5,
          ampX: 0.22,
          ampY: 0.16,
          radiusScale: 0.85,
          phaseR: 0.8,
          color: MID_DARK[0],
          opacity: 0.95,
          stretch: 2,
          phaseRot: 0.6
        },
        // 4. Deep royal (darker band)
        {
          phase: Math.PI * 1.8,
          baseX: 0.72,
          baseY: 0.58,
          ampX: 0.12,
          ampY: 0.14,
          radiusScale: 0.7,
          phaseR: 0.2,
          color: MID_DARK[1],
          opacity: 0.95,
          stretch: 1.2,
          phaseRot: 0
        },
        // 5. Navy (edges / depth)
        {
          phase: Math.PI * 2,
          baseX: 0.85,
          baseY: 0.5,
          ampX: 0.08,
          ampY: 0.12,
          radiusScale: 0.65,
          phaseR: 0.4,
          color: MID_DARK[2],
          opacity: 0.9,
          stretch: 1,
          phaseRot: 0
        }
      ]
    }

    resize()
    if (wavesRef.current.length === 0) initWaves()
    window.addEventListener('resize', resize)

    const t0 = Date.now()
    const animate = () => {
      if (!canvas || !ctx) return

      const w = canvas.width
      const h = canvas.height
      const t = (Date.now() - t0) * 0.001 * speed
      const minDim = Math.min(w, h)

      ctx.fillStyle = BASE_BLUE
      ctx.fillRect(0, 0, w, h)

      wavesRef.current.forEach(blob => {
        // Wave motion: bright spots drift in a smooth curve (like the video frames)
        const wx = Math.sin(t * 0.35 + blob.phase) * blob.ampX * w
        const wy = Math.cos(t * 0.28 + blob.phase * 1.1) * blob.ampY * h
        const x = (blob.baseX + wx) * w
        const y = (blob.baseY + wy) * h

        const r = minDim * blob.radiusScale * (0.9 + 0.1 * Math.sin(t * 0.4 + blob.phaseR))
        const stretch = blob.stretch
        const rot = Math.sin(t * 0.25 + blob.phaseRot) * 0.4

        ctx.save()

        // Elongate and rotate for wave-band look
        ctx.translate(x, y)
        ctx.rotate(rot)
        ctx.scale(stretch, 1)
        ctx.translate(-x, -y)

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(0.4, blob.color.replace(/[\d.]+\)$/, '0.25)'))
        gradient.addColorStop(0.72, blob.color.replace(/[\d.]+\)$/, '0.04)'))
        gradient.addColorStop(1, 'transparent')

        ctx.globalAlpha = blob.opacity
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)

        ctx.restore()
      })

      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [speed])

  return (
    <canvas
      ref={canvasRef}
      className={`gba:absolute gba:inset-0 gba:pointer-events-none gba:w-full gba:h-full ${className}`}
      aria-hidden
      data-testid="space-hero-background"
    />
  )
}

export default SpaceHeroBackground
