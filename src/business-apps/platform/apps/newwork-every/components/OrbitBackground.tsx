import React, { useEffect, useRef } from 'react'

interface OrbitBackgroundProps {
  'data-testid'?: string
}

interface Orb {
  x: number
  y: number
  radius: number
  angle: number
  speed: number
  orbitRadius: number
  centerX: number
  centerY: number
  color: string
  opacity: number
}

export const OrbitBackground: React.FC<OrbitBackgroundProps> = ({ 'data-testid': testId = 'orbit-background' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const orbsRef = useRef<Orb[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      // Reinitialize orbs on resize
      initOrbs(rect.width, rect.height)
    }

    // Initialize orbiting particles
    const initOrbs = (width: number, height: number) => {
      const orbs: Orb[] = []
      const colors = [
        'rgba(34, 197, 94, 0.6)', // success/green
        'rgba(245, 158, 11, 0.5)', // warning/amber
        'rgba(59, 130, 246, 0.4)', // primary/blue
        'rgba(139, 92, 246, 0.3)' // ai/purple
      ]

      // Create multiple orbit centers
      const centers = [
        { x: width * 0.2, y: height * 0.3 },
        { x: width * 0.8, y: height * 0.2 },
        { x: width * 0.5, y: height * 0.7 },
        { x: width * 0.15, y: height * 0.8 },
        { x: width * 0.85, y: height * 0.6 }
      ]

      centers.forEach((center, centerIndex) => {
        // Create orbs orbiting each center
        const orbCount = 2 + Math.floor(Math.random() * 2)
        for (let i = 0; i < orbCount; i++) {
          orbs.push({
            x: 0,
            y: 0,
            radius: 2 + Math.random() * 3,
            angle: Math.random() * Math.PI * 2,
            speed: 0.002 + Math.random() * 0.004,
            orbitRadius: 30 + Math.random() * 60,
            centerX: center.x,
            centerY: center.y,
            color: colors[(centerIndex + i) % colors.length],
            opacity: 0.3 + Math.random() * 0.4
          })
        }
      })

      orbsRef.current = orbs
    }

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      orbsRef.current.forEach(orb => {
        // Update position
        orb.angle += orb.speed
        orb.x = orb.centerX + Math.cos(orb.angle) * orb.orbitRadius
        orb.y = orb.centerY + Math.sin(orb.angle) * orb.orbitRadius

        // Draw orb with glow
        ctx.beginPath()
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 3)
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.arc(orb.x, orb.y, orb.radius * 3, 0, Math.PI * 2)
        ctx.fill()

        // Draw core
        ctx.beginPath()
        ctx.fillStyle = orb.color.replace(/[\d.]+\)$/, `${orb.opacity})`)
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw subtle orbit paths
      const centers = [
        { x: rect.width * 0.2, y: rect.height * 0.3 },
        { x: rect.width * 0.8, y: rect.height * 0.2 },
        { x: rect.width * 0.5, y: rect.height * 0.7 }
      ]

      centers.forEach(center => {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.03)'
        ctx.lineWidth = 1
        ctx.arc(center.x, center.y, 50, 0, Math.PI * 2)
        ctx.stroke()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    animate()

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="gba:w-full gba:h-full gba:opacity-60" data-testid={testId} />
}
