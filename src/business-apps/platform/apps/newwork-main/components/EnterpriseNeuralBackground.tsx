import React, { useEffect, useRef } from 'react'

interface EnterpriseNeuralBackgroundProps {
  className?: string
  height?: string // CSS height value, e.g., "100vh", "150vh", "800px"
}

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulsePhase: number
  brightness: number
}

/**
 * EnterpriseNeuralBackground - Scrollable neural network
 * NOT fixed - scrolls with page content so user can scroll past it
 */
export const EnterpriseNeuralBackground: React.FC<EnterpriseNeuralBackgroundProps> = ({
  className = '',
  height = '100%'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Node[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      initializeNodes()
    }

    const initializeNodes = () => {
      const nodes: Node[] = []
      const nodeCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000))

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2 + 1,
          pulsePhase: Math.random() * Math.PI * 2,
          brightness: 0.3 + Math.random() * 0.7
        })
      }

      nodesRef.current = nodes
    }

    resizeCanvas()

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)

    // Colors
    const primaryColor = { r: 139, g: 92, b: 246 } // Purple
    const secondaryColor = { r: 59, g: 130, b: 246 } // Blue
    const accentColor = { r: 6, g: 182, b: 212 } // Cyan

    let time = 0
    const animate = () => {
      if (!canvas || !ctx) return

      time += 0.008
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Central glow
      const centerX = canvas.width / 2
      const centerY = canvas.height * 0.4
      const glowRadius = Math.min(canvas.width, canvas.height) * 0.6

      const centralGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
      centralGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.15)`)
      centralGlow.addColorStop(0.5, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.05)`)
      centralGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = centralGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const nodes = nodesRef.current

      // Update node positions
      nodes.forEach(node => {
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))
      })

      // Draw connections
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i >= j) return

          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 120

          if (distance < maxDist && distance > 0) {
            const opacity = (1 - distance / maxDist) * 0.15

            // Gradient connection
            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
            gradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${opacity})`)
            gradient.addColorStop(1, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${opacity})`)

            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      nodes.forEach(node => {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
        const radius = node.radius * pulse

        // Node glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 6)
        glowGradient.addColorStop(
          0,
          `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${0.2 * node.brightness})`
        )
        glowGradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius * 6, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Node core
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${0.6 * node.brightness})`
        ctx.fill()
      })

      // Central pulsing hexagon
      const hexPulse = Math.sin(time * 1.5) * 0.15 + 0.85
      const hexRadius = 40 * hexPulse

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(time * 0.2)

      // Outer ring
      ctx.beginPath()
      ctx.arc(0, 0, hexRadius * 2.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.15)`
      ctx.lineWidth = 1
      ctx.stroke()

      // Hexagon
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
        const hx = Math.cos(angle) * hexRadius
        const hy = Math.sin(angle) * hexRadius
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.4)`
      ctx.lineWidth = 2
      ctx.stroke()

      // Inner hexagon
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
        const hx = Math.cos(angle) * hexRadius * 0.5
        const hy = Math.sin(angle) * hexRadius * 0.5
        if (i === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fillStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.3)`
      ctx.fill()

      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`gba:absolute gba:inset-0 gba:pointer-events-none gba:overflow-hidden ${className}`}
      style={{ height, zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="gba:w-full gba:h-full" style={{ opacity: 0.7 }} />
    </div>
  )
}

export default EnterpriseNeuralBackground
