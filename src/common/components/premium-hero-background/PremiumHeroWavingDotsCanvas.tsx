import React, { useEffect, useMemo, useRef } from 'react'

export type PremiumHeroWavingDotsAnchor = 'left' | 'right'

export interface PremiumHeroWavingDotsCanvasProps {
  className?: string
  anchor?: PremiumHeroWavingDotsAnchor
  dotSpacing?: number
  dotRadius?: number
  alpha?: number
  /** Grid offset (px) to align dots with the underlying composition. */
  offsetX?: number
  /** Grid offset (px) to align dots with the underlying composition. */
  offsetY?: number
  /** Alpha multiplier at center (default 0.18). */
  centerVisibility?: number
  /** Alpha multiplier at edges (default 1). */
  edgeVisibility?: number
  /** Controls how quickly visibility ramps toward edges (default 1.8). */
  edgePower?: number
  amplitude?: number
  speed?: number
  'data-testid'?: string
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export const PremiumHeroWavingDotsCanvas: React.FC<PremiumHeroWavingDotsCanvasProps> = ({
  className = '',
  anchor = 'right',
  dotSpacing = 18,
  dotRadius = 1.15,
  alpha = 0.28,
  offsetX = 0,
  offsetY = 0,
  centerVisibility = 0.18,
  edgeVisibility = 1,
  edgePower = 1.8,
  amplitude = 10,
  speed = 1,
  'data-testid': testId = 'premium-hero-waving-dots'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const config = useMemo(
    () => ({
      anchor,
      dotSpacing,
      dotRadius,
      alpha: clamp(alpha, 0, 1),
      offsetX,
      offsetY,
      centerVisibility: clamp(centerVisibility, 0, 1),
      edgeVisibility: clamp(edgeVisibility, 0, 1),
      edgePower: Math.max(0.1, edgePower),
      amplitude: Math.max(0, amplitude),
      speed: Math.max(0, speed)
    }),
    [
      alpha,
      amplitude,
      anchor,
      centerVisibility,
      dotRadius,
      dotSpacing,
      edgePower,
      edgeVisibility,
      offsetX,
      offsetY,
      speed
    ]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cap DPR to keep animation smooth (dots are subtle; higher DPR costs a lot of CPU on retina).
    const dpr = Math.max(1, Math.min(1.25, window.devicePixelRatio || 1))

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Pre-render dot "stamps" for fast draws (neutral + slightly cool/blue for near folds).
    // Must exist before drawFrame/drawDot run — including the prefers-reduced-motion static path.
    const stamp = document.createElement('canvas')
    const stampCool = document.createElement('canvas')
    const stampPad = 2
    const stampSize = Math.max(4, Math.ceil((config.dotRadius + stampPad) * 2))
    stamp.width = stampSize * dpr
    stamp.height = stampSize * dpr
    stampCool.width = stampSize * dpr
    stampCool.height = stampSize * dpr

    const buildStamp = (target: HTMLCanvasElement, color: string) => {
      const sctx = target.getContext('2d')
      if (!sctx) return
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sctx.clearRect(0, 0, stampSize, stampSize)

      sctx.fillStyle = color
      sctx.beginPath()
      sctx.arc(stampSize / 2, stampSize / 2, config.dotRadius, 0, Math.PI * 2)
      sctx.fill()
    }

    // Base dot color: more saturated light-blue/cyan (avoid washed-out/gray look on dark background).

    buildStamp(stamp, 'rgb(120 228 255)')
    // Extra tint for "closer" dots (more saturated cyan for higher contrast).

    buildStamp(stampCool, 'rgb(40 205 255)')

    function drawDot(x: number, y: number, a: number, scale: number, coolness: number) {
      if (a <= 0.001) return
      const s = clamp(scale, 0.75, 1.35)
      const size = stampSize * s

      const c = clamp(coolness, 0, 1)
      const coolWeight = 0.8 * c
      const baseWeight = 1 - coolWeight

      ctx.globalAlpha = a * baseWeight
      ctx.drawImage(stamp, x - size / 2, y - size / 2, size, size)

      if (coolWeight > 0.001) {
        ctx.globalAlpha = a * coolWeight
        ctx.drawImage(stampCool, x - size / 2, y - size / 2, size, size)
      }
    }

    function edgeFactor(xNorm: number): number {
      const s = Math.abs(xNorm - 0.5) * 2
      return Math.pow(clamp(s, 0, 1), config.edgePower)
    }

    function drawFrame(t: number) {
      const rect = parent.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const w1x = 0.9
      const w1y = 0.35
      const w2x = -0.55
      const w2y = 0.65

      // Perfectly seamless 20s loop.
      const loopSeconds = 20
      const omega = (Math.PI * 2) / loopSeconds
      const phase1 = t * omega * 3 * config.speed
      const phase2 = t * omega * 4 * config.speed
      const phaseDepth1 = t * omega * 2 * config.speed
      const phaseDepth2 = t * omega * 3 * config.speed

      // "3D flag" shading
      const lx = -0.18
      const ly = -0.08
      const lz = 1
      const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz)

      const startX = ((config.offsetX % config.dotSpacing) + config.dotSpacing) % config.dotSpacing
      const startY = ((config.offsetY % config.dotSpacing) + config.dotSpacing) % config.dotSpacing

      for (let y = startY; y <= h + config.dotSpacing; y += config.dotSpacing) {
        const yNorm = h > 0 ? y / h : 0
        for (let x = startX; x <= w + config.dotSpacing; x += config.dotSpacing) {
          const xNorm = w > 0 ? x / w : 0
          const ef = edgeFactor(xNorm)

          const a1 = (xNorm * w1x + yNorm * w1y) * Math.PI * 2 + phase1
          const a2 = (xNorm * w2x + yNorm * w2y) * Math.PI * 2 + phase2
          const a1d = (xNorm * w1x + yNorm * w1y) * Math.PI * 2 + phaseDepth1
          const a2d = (xNorm * w2x + yNorm * w2y) * Math.PI * 2 + phaseDepth2

          const n1 = Math.sin(a1)
          const n2 = Math.sin(a2)
          const n = 0.62 * n1 + 0.38 * n2

          const dx = config.amplitude * 0.55 * n
          const dy = config.amplitude * 0.95 * Math.cos((xNorm * 0.75 + yNorm * 0.15) * Math.PI * 2 + phase1) * 0.65

          const a1x = w1x * Math.PI * 2
          const a1y = w1y * Math.PI * 2
          const a2x = w2x * Math.PI * 2
          const a2y = w2y * Math.PI * 2

          const dzdx = 0.62 * Math.cos(a1d) * a1x + 0.38 * Math.cos(a2d) * a2x
          const dzdy = 0.62 * Math.cos(a1d) * a1y + 0.38 * Math.cos(a2d) * a2y

          const nx = -dzdx * 0.18
          const ny = -dzdy * 0.18
          const nz = 1
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz)
          const ndotl = Math.max(0, (nx * lx + ny * ly + nz * lz) / (nLen * lLen))
          const shade = 0.72 + 0.38 * ndotl

          const nDepth = 0.62 * Math.sin(a1d) + 0.38 * Math.sin(a2d)
          const depth = clamp(0.65 + 0.35 * nDepth, 0, 1)
          const depthFade = 0.22 + 0.78 * Math.pow(depth, 1.2)
          const depthLight = 0.92 + 0.18 * depth

          const shimmer = 0.92 + 0.08 * Math.sin(phase2 + xNorm * 3.2 + yNorm * 1.3)
          const vis = config.centerVisibility + (config.edgeVisibility - config.centerVisibility) * ef
          const dotAlphaBase = config.alpha * shimmer * vis * shade * depthFade * depthLight
          const coolness = clamp((depth - 0.66) / 0.34, 0, 1)
          // Slightly boost visibility on near/forward folds to avoid “gray” dots.
          const dotAlpha = clamp(dotAlphaBase * (1 + 0.22 * coolness), 0, 1)

          const depthScale = 0.94 + depth * 0.18 + (shade - 1) * 0.1
          drawDot(x + dx, y + dy, dotAlpha, depthScale, coolness)
        }
      }

      ctx.globalAlpha = 1
    }

    if (prefersReducedMotion()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawFrame(0)
      return () => {
        window.removeEventListener('resize', resize)
      }
    }

    let raf = 0
    const t0 = performance.now()

    const tick = (now: number) => {
      const t = (now - t0) / 1000
      drawFrame(t)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [config])

  return (
    <canvas
      ref={canvasRef}
      className={`gba:absolute gba:inset-0 gba:w-full gba:h-full gba:pointer-events-none ${className}`}
      aria-hidden
      data-testid={testId}
    />
  )
}

export default PremiumHeroWavingDotsCanvas
