import React, { useEffect, useRef } from 'react'

interface NeuralBackgroundProps {
  className?: string
}

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulsePhase: number
}

/**
 * NeuralBackground - Subtle animated neural network background
 * Creates an AI-themed atmosphere with floating nodes and connections
 */
export const NeuralBackground: React.FC<NeuralBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>([])

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

    // Initialize nodes
    const nodeCount = 40
    const nodes: Node[] = []
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }
    nodesRef.current = nodes

    // Get CSS colors
    const getColor = (cssVar: string, fallback: string) => {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
      return computed || fallback
    }

    // Animation loop
    let time = 0
    const animate = () => {
      if (!canvas || !ctx) return

      time += 0.01
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const aiColor = getColor('--nw-ai', '#8b5cf6')
      const primaryColor = getColor('--nw-primary', '#3b82f6')

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))

        // Draw connections to nearby nodes
        nodes.forEach((other, j) => {
          if (i >= j) return
          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.hypot(dx, dy)
          const maxDistance = 150

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15
            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
            gradient.addColorStop(0, `${aiColor}`)
            gradient.addColorStop(1, `${primaryColor}`)

            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = gradient
            ctx.globalAlpha = opacity
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        })

        // Draw node with pulse effect
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
        const nodeRadius = node.radius * pulse

        // Glow effect
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius * 4)
        glowGradient.addColorStop(0, `${aiColor}40`)
        glowGradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeRadius * 4, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Core node
        ctx.beginPath()
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2)
        ctx.fillStyle = i % 3 === 0 ? aiColor : primaryColor
        ctx.globalAlpha = 0.6
        ctx.fill()
        ctx.globalAlpha = 1
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
      style={{ opacity: 0.4 }}
    />
  )
}

export default NeuralBackground
