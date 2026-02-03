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
  type: 'doc' | 'sheet' | 'note'
  opacity: number
}

/**
 * ContentBackground - Subtle animated background with floating content shapes
 * Creates a productivity-themed atmosphere with abstract document representations
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

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize floating elements
    const elementCount = 25
    const elements: FloatingElement[] = []
    const types: Array<'doc' | 'sheet' | 'note'> = ['doc', 'sheet', 'note']

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

    // Get CSS colors
    const getColor = (cssVar: string, fallback: string) => {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
      return computed || fallback
    }

    // Draw document shape
    const drawDocument = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.beginPath()
      ctx.moveTo(-size / 2, -size / 2)
      ctx.lineTo(size / 3, -size / 2)
      ctx.lineTo(size / 2, -size / 3)
      ctx.lineTo(size / 2, size / 2)
      ctx.lineTo(-size / 2, size / 2)
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Corner fold
      ctx.beginPath()
      ctx.moveTo(size / 3, -size / 2)
      ctx.lineTo(size / 3, -size / 3)
      ctx.lineTo(size / 2, -size / 3)
      ctx.stroke()

      // Lines
      ctx.beginPath()
      ctx.moveTo(-size / 3, -size / 6)
      ctx.lineTo(size / 4, -size / 6)
      ctx.moveTo(-size / 3, size / 8)
      ctx.lineTo(size / 4, size / 8)
      ctx.moveTo(-size / 3, size / 3)
      ctx.lineTo(0, size / 3)
      ctx.stroke()
    }

    // Draw grid/sheet shape
    const drawSheet = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5

      // Outer rectangle
      ctx.strokeRect(-size / 2, -size / 2, size, size)

      // Grid lines
      ctx.beginPath()
      ctx.moveTo(-size / 6, -size / 2)
      ctx.lineTo(-size / 6, size / 2)
      ctx.moveTo(size / 6, -size / 2)
      ctx.lineTo(size / 6, size / 2)
      ctx.moveTo(-size / 2, -size / 6)
      ctx.lineTo(size / 2, -size / 6)
      ctx.moveTo(-size / 2, size / 6)
      ctx.lineTo(size / 2, size / 6)
      ctx.stroke()
    }

    // Draw note shape
    const drawNote = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5

      // Rounded rectangle
      const radius = size / 6
      ctx.beginPath()
      ctx.moveTo(-size / 2 + radius, -size / 2)
      ctx.lineTo(size / 2 - radius, -size / 2)
      ctx.quadraticCurveTo(size / 2, -size / 2, size / 2, -size / 2 + radius)
      ctx.lineTo(size / 2, size / 2 - radius)
      ctx.quadraticCurveTo(size / 2, size / 2, size / 2 - radius, size / 2)
      ctx.lineTo(-size / 2 + radius, size / 2)
      ctx.quadraticCurveTo(-size / 2, size / 2, -size / 2, size / 2 - radius)
      ctx.lineTo(-size / 2, -size / 2 + radius)
      ctx.quadraticCurveTo(-size / 2, -size / 2, -size / 2 + radius, -size / 2)
      ctx.stroke()

      // Sticky corner
      ctx.beginPath()
      ctx.moveTo(size / 4, size / 2)
      ctx.quadraticCurveTo(size / 3, size / 3, size / 2, size / 4)
      ctx.stroke()
    }

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const docColor = getColor('--nw-sky-600', '#0284c7')
      const sheetColor = getColor('--nw-teal-600', '#0d9488')
      const noteColor = getColor('--nw-amber-600', '#d97706')

      elements.forEach(el => {
        // Update position
        el.x += el.vx
        el.y += el.vy
        el.rotation += el.rotationSpeed

        // Wrap around edges
        if (el.x < -el.size) el.x = canvas.width + el.size
        if (el.x > canvas.width + el.size) el.x = -el.size
        if (el.y < -el.size) el.y = canvas.height + el.size
        if (el.y > canvas.height + el.size) el.y = -el.size

        // Draw element
        ctx.save()
        ctx.translate(el.x, el.y)
        ctx.rotate(el.rotation)
        ctx.globalAlpha = el.opacity

        const color =
          el.type === 'doc' ? docColor : el.type === 'sheet' ? sheetColor : noteColor

        switch (el.type) {
          case 'doc':
            drawDocument(ctx, el.size, color)
            break
          case 'sheet':
            drawSheet(ctx, el.size, color)
            break
          case 'note':
            drawNote(ctx, el.size, color)
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
