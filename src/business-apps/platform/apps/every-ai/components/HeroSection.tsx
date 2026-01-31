import React, { useEffect, useRef } from 'react'
import { Microphone, Lightning, ChartLineUp } from '@phosphor-icons/react'
import { Brain } from 'lucide-react'

interface HeroSectionProps {
  'data-testid'?: string
}

// Keyframes styles
const keyframesStyles = `
  @keyframes gradient-shift-ai {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes float-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes pulse-glow-ai {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
`

interface NeuralNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulsePhase: number
  brightness: number
}

/**
 * DeepBlueNeuralBackground - Canvas-based neural network with deep blue/cyan colors
 * Matches the EveryOne dashboard style with dark navy background and bright nodes
 */
export const DeepBlueNeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<NeuralNode[]>([])
  const startTimeRef = useRef<number>(Date.now())

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
      const nodes: NeuralNode[] = []
      const nodeCount = Math.min(65, Math.floor((canvas.width * canvas.height) / 10000))

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 2 + 1,
          pulsePhase: Math.random() * Math.PI * 2,
          brightness: 0.6 + Math.random() * 0.4
        })
      }

      nodesRef.current = nodes
    }

    resizeCanvas()

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)

    // Deep blue color palette matching EveryOne dashboard
    const cyanBright = { r: 147, g: 197, b: 253 } // Light sky blue (nodes)
    const cyanLight = { r: 224, g: 242, b: 254 } // Very light cyan (highlights)
    const royalBlue = { r: 59, g: 130, b: 246 } // Royal blue (connections)

    // Soft circular blobs for smooth animated background
    const softBlobs = [
      { baseX: 0.2, baseY: 0.3, ampX: 0.1, ampY: 0.15, radius: 0.6, phase: 0, r: 59, g: 130, b: 246, alpha: 0.25 },
      {
        baseX: 0.5,
        baseY: 0.4,
        ampX: 0.12,
        ampY: 0.1,
        radius: 0.5,
        phase: Math.PI * 0.5,
        r: 96,
        g: 165,
        b: 250,
        alpha: 0.2
      },
      {
        baseX: 0.75,
        baseY: 0.35,
        ampX: 0.08,
        ampY: 0.12,
        radius: 0.45,
        phase: Math.PI,
        r: 147,
        g: 197,
        b: 253,
        alpha: 0.18
      },
      {
        baseX: 0.3,
        baseY: 0.65,
        ampX: 0.1,
        ampY: 0.08,
        radius: 0.5,
        phase: Math.PI * 1.5,
        r: 30,
        g: 64,
        b: 175,
        alpha: 0.3
      },
      {
        baseX: 0.7,
        baseY: 0.7,
        ampX: 0.06,
        ampY: 0.1,
        radius: 0.4,
        phase: Math.PI * 0.3,
        r: 59,
        g: 130,
        b: 246,
        alpha: 0.22
      }
    ]

    const drawBackground = (time: number) => {
      const w = canvas.width
      const h = canvas.height
      const maxDim = Math.max(w, h)

      // Deep navy base - solid dark background
      ctx.fillStyle = 'rgb(15, 23, 42)'
      ctx.fillRect(0, 0, w, h)

      // Add subtle static gradient overlay
      const baseGradient = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.3, h * 0.3, maxDim * 0.8)
      baseGradient.addColorStop(0, 'rgba(30, 58, 138, 0.4)')
      baseGradient.addColorStop(0.5, 'rgba(30, 64, 175, 0.2)')
      baseGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = baseGradient
      ctx.fillRect(0, 0, w, h)

      // Draw soft animated circular blobs (no hard edges)
      for (const blob of softBlobs) {
        const wx = Math.sin(time * 0.2 + blob.phase) * blob.ampX * w
        const wy = Math.cos(time * 0.15 + blob.phase * 1.2) * blob.ampY * h
        const x = blob.baseX * w + wx
        const y = blob.baseY * h + wy
        const r = maxDim * blob.radius * (0.9 + 0.1 * Math.sin(time * 0.25 + blob.phase))

        // Draw as pure radial gradient circle - no transforms that create hard edges
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
        gradient.addColorStop(0, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${blob.alpha})`)
        gradient.addColorStop(0.3, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${blob.alpha * 0.5})`)
        gradient.addColorStop(0.6, `rgba(${blob.r}, ${blob.g}, ${blob.b}, ${blob.alpha * 0.2})`)
        gradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    const updateNodes = (nodes: NeuralNode[]) => {
      for (const node of nodes) {
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))
      }
    }

    const drawConnections = (nodes: NeuralNode[]) => {
      const maxDist = 120
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance >= maxDist || distance <= 0) continue

          const opacity = (1 - distance / maxDist) * 0.35
          const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
          gradient.addColorStop(0, `rgba(${royalBlue.r}, ${royalBlue.g}, ${royalBlue.b}, ${opacity})`)
          gradient.addColorStop(1, `rgba(${cyanBright.r}, ${cyanBright.g}, ${cyanBright.b}, ${opacity})`)

          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }

    const drawNodes = (nodes: NeuralNode[], time: number) => {
      for (const node of nodes) {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
        const radius = node.radius * pulse

        // Larger glow effect for visibility on dark background
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 8)
        glowGradient.addColorStop(0, `rgba(${cyanLight.r}, ${cyanLight.g}, ${cyanLight.b}, ${0.4 * node.brightness})`)
        glowGradient.addColorStop(
          0.5,
          `rgba(${cyanBright.r}, ${cyanBright.g}, ${cyanBright.b}, ${0.15 * node.brightness})`
        )
        glowGradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius * 8, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Bright node core
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${cyanLight.r}, ${cyanLight.g}, ${cyanLight.b}, ${0.95 * node.brightness})`
        ctx.fill()
      }
    }

    const animate = () => {
      if (!canvas || !ctx) return

      const time = (Date.now() - startTimeRef.current) * 0.001
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const nodes = nodesRef.current
      drawBackground(time)
      updateNodes(nodes)
      drawConnections(nodes)
      drawNodes(nodes, time)

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
      className="gba:absolute gba:inset-0 gba:pointer-events-none gba:overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="gba:w-full gba:h-full" />
    </div>
  )
}

/**
 * HeroSection - Premium animated hero for EveryAI
 * Features deep blue gradient background with animated neural network (matches EveryOne style)
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'every-ai-hero' }) => {
  return (
    <>
      <style>{keyframesStyles}</style>
      <section
        className="gba:relative gba:pt-12 gba:pb-16 gba:px-6 gba:overflow-hidden gba:flex-1 gba:flex gba:flex-col gba:h-full"
        data-testid={testId}
      >
        {/* Content - white text on dark background */}
        <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center" style={{ zIndex: 10 }}>
          {/* Animated logo */}
          <div className="gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
              {/* eslint-disable newwork-local/no-hardcoded-colors -- Icon glow and glassmorphism effects require specific translucent colors */}
              {/* Icon with glow effect */}
              <div className="gba:relative">
                {/* Subtle glow ring */}
                <div
                  className="gba:absolute gba:inset-0 gba:rounded-2xl gba:blur-xl"
                  style={{
                    animation: 'pulse-glow-ai 3s ease-in-out infinite',
                    transform: 'scale(1.8)',
                    background: 'rgba(147, 197, 253, 0.25)'
                  }}
                />
                {/* Icon container - translucent with outline brain */}
                <div
                  className="gba:relative gba:w-16 gba:h-16 gba:rounded-2xl gba:flex gba:items-center gba:justify-center gba:border gba:border-white/20"
                  style={{
                    animation: 'float-subtle 4s ease-in-out infinite',
                    background: 'rgba(147, 197, 253, 0.15)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <Brain className="gba:w-8 gba:h-8" style={{ color: 'rgba(147, 197, 253, 0.8)' }} strokeWidth={1.5} />
                </div>
              </div>
              {/* eslint-enable newwork-local/no-hardcoded-colors */}

              {/* Brand text */}
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:uppercase gba:mt-3 gba:text-white/60">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span className="gba:text-white">Every</span>
                <span
                  className="gba:bg-clip-text gba:text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #60a5fa, #93c5fd, #60a5fa)',
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift-ai 4s ease infinite'
                  }}
                >
                  AI
                </span>
              </h1>
            </div>
          </div>

          {/* Badges - Voice, Workflows, Insights */}
          <div
            className="gba:flex gba:items-center gba:justify-center gba:gap-2.5 gba:mb-5"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
          >
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-white/10 gba:text-white/90 gba:border gba:border-white/20">
              <Microphone className="gba:w-3 gba:h-3" weight="fill" />
              Voice
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-white/10 gba:text-white/90 gba:border gba:border-white/20">
              <Lightning className="gba:w-3 gba:h-3" weight="fill" />
              Workflows
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-white/10 gba:text-white/90 gba:border gba:border-white/20">
              <ChartLineUp className="gba:w-3 gba:h-3" weight="fill" />
              Insights
            </span>
          </div>

          {/* Main headline */}
          <h2
            className="gba:text-xl gba:sm:text-2xl gba:font-semibold gba:tracking-tight gba:mb-2.5 gba:text-white"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}
            data-testid={`${testId}-headline`}
          >
            Your intelligent assistant.
            <span className="gba:text-white/70"> Voice-enabled.</span>
          </h2>

          {/* Subtitle */}
          <p
            className="gba:text-sm gba:max-w-lg gba:mx-auto gba:leading-relaxed gba:mb-12 gba:text-white/60"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-subtitle`}
          >
            Ask questions, automate workflows, analyze data, and get intelligent insights — all by voice or text.
          </p>
        </div>
      </section>
    </>
  )
}

export default HeroSection
