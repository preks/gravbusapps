import React, { useEffect, useRef } from 'react'

interface ContentBackgroundProps {
  className?: string
}

interface FloatingElement {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
  type: 'sparkle' | 'code' | 'brackets'
  opacity: number
}

/**
 * ContentBackground - Animated background with floating AI/code shapes
 * Creates a tech-themed atmosphere with abstract code representations
 */
export const ContentBackground: React.FC<ContentBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const elementsRef = useRef<FloatingElement[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const elementCount = 25
    const elements: FloatingElement[] = []
    const types: Array<'sparkle' | 'code' | 'brackets'> = ['sparkle', 'code', 'brackets']

    for (let i = 0; i < elementCount; i++) {
      elements.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 20 + 12,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.005,
        type: types[Math.floor(Math.random() * types.length)],
        opacity: Math.random() * 0.3 + 0.1
      })
    }
    elementsRef.current = elements

    const getColor = (cssVar: string, fallback: string) => {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
      return computed || fallback
    }

    const drawSparkle = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.moveTo(0, -size / 2)
      ctx.lineTo(0, size / 2)
      ctx.moveTo(-size / 2, 0)
      ctx.lineTo(size / 2, 0)
      ctx.moveTo(-size / 3, -size / 3)
      ctx.lineTo(size / 3, size / 3)
      ctx.moveTo(size / 3, -size / 3)
      ctx.lineTo(-size / 3, size / 3)
      ctx.stroke()
    }

    const drawCode = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5

      ctx.strokeRect(-size / 2, -size / 2, size, size)

      ctx.beginPath()
      ctx.moveTo(-size / 3, -size / 6)
      ctx.lineTo(size / 4, -size / 6)
      ctx.moveTo(-size / 3, size / 8)
      ctx.lineTo(size / 4, size / 8)
      ctx.moveTo(-size / 3, size / 3)
      ctx.lineTo(0, size / 3)
      ctx.stroke()
    }

    const drawBrackets = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5

      ctx.beginPath()
      ctx.moveTo(-size / 2, -size / 3)
      ctx.lineTo(-size / 2, -size / 2)
      ctx.lineTo(-size / 3, -size / 2)
      ctx.moveTo(-size / 2, size / 3)
      ctx.lineTo(-size / 2, size / 2)
      ctx.lineTo(-size / 3, size / 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(size / 2, -size / 3)
      ctx.lineTo(size / 2, -size / 2)
      ctx.lineTo(size / 3, -size / 2)
      ctx.moveTo(size / 2, size / 3)
      ctx.lineTo(size / 2, size / 2)
      ctx.lineTo(size / 3, size / 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(-size / 4, -size / 6)
      ctx.lineTo(size / 4, size / 6)
      ctx.stroke()
    }

    const animate = () => {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const primaryColor = getColor('--nw-primary', '#3b82f6')
      const accentColor = getColor('--nw-accent', '#8b5cf6')
      const secondaryColor = getColor('--nw-secondary', '#ec4899')

      elements.forEach(el => {
        el.x += el.vx
        el.y += el.vy
        el.rotation += el.rotationSpeed

        if (el.x < -el.size) el.x = canvas.width + el.size
        if (el.x > canvas.width + el.size) el.x = -el.size
        if (el.y < -el.size) el.y = canvas.height + el.size
        if (el.y > canvas.height + el.size) el.y = -el.size

        ctx.save()
        ctx.translate(el.x, el.y)
        ctx.rotate(el.rotation)
        ctx.globalAlpha = el.opacity

        const color = el.type === 'sparkle' ? primaryColor : el.type === 'code' ? accentColor : secondaryColor

        switch (el.type) {
          case 'sparkle':
            drawSparkle(ctx, el.size, color)
            break
          case 'code':
            drawCode(ctx, el.size, color)
            break
          case 'brackets':
            drawBrackets(ctx, el.size, color)
            break
        }

        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`gba:absolute gba:inset-0 gba:pointer-events-none ${className}`}
      style={{ opacity: 0.35 }}
    />
  )
}

export default ContentBackground
