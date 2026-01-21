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
 * GoldenNeuralBackground - Canvas-based neural network with golden/amber colors on silver background
 */
const GoldenNeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<NeuralNode[]>([])

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
      const nodeCount = Math.min(55, Math.floor((canvas.width * canvas.height) / 12000))

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.5 + 0.8,
          pulsePhase: Math.random() * Math.PI * 2,
          brightness: 0.5 + Math.random() * 0.5
        })
      }

      nodesRef.current = nodes
    }

    resizeCanvas()

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)

    // Golden/amber colors for neural network - visible against silver/gray background
    const goldPrimary = { r: 212, g: 175, b: 55 } // Rich gold
    const goldLight = { r: 244, g: 208, b: 63 } // Light gold/amber
    const goldWarm = { r: 230, g: 180, b: 80 } // Warm gold

    let time = 0
    const animate = () => {
      if (!canvas || !ctx) return

      time += 0.007
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Subtle warm central glow
      const centerX = canvas.width / 2
      const centerY = canvas.height * 0.45
      const glowRadius = Math.min(canvas.width, canvas.height) * 0.45

      const centralGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
      centralGlow.addColorStop(0, `rgba(${goldWarm.r}, ${goldWarm.g}, ${goldWarm.b}, 0.08)`)
      centralGlow.addColorStop(0.5, `rgba(${goldPrimary.r}, ${goldPrimary.g}, ${goldPrimary.b}, 0.03)`)
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

      // Draw connections with golden gradient
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i >= j) return

          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 100

          if (distance < maxDist && distance > 0) {
            const opacity = (1 - distance / maxDist) * 0.18

            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
            gradient.addColorStop(0, `rgba(${goldPrimary.r}, ${goldPrimary.g}, ${goldPrimary.b}, ${opacity})`)
            gradient.addColorStop(1, `rgba(${goldLight.r}, ${goldLight.g}, ${goldLight.b}, ${opacity})`)

            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = gradient
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        })
      })

      // Draw nodes with golden glow
      nodes.forEach(node => {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7
        const radius = node.radius * pulse

        // Node glow - golden halo
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 5)
        glowGradient.addColorStop(0, `rgba(${goldLight.r}, ${goldLight.g}, ${goldLight.b}, ${0.2 * node.brightness})`)
        glowGradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius * 5, 0, Math.PI * 2)
        ctx.fillStyle = glowGradient
        ctx.fill()

        // Node core - solid gold
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${goldPrimary.r}, ${goldPrimary.g}, ${goldPrimary.b}, ${0.8 * node.brightness})`
        ctx.fill()
      })

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
 * Features elegant silver/gray background with golden neural network
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ 'data-testid': testId = 'every-ai-hero' }) => {
  return (
    <>
      <style>{keyframesStyles}</style>
      <section
        className="gba:relative gba:pt-12 gba:pb-0 gba:px-6 gba:overflow-hidden gba:bg-gradient-to-br gba:from-muted/30 gba:via-background gba:to-muted/20"
        data-testid={testId}
      >
        {/* Golden neural network background */}
        <GoldenNeuralBackground />

        {/* Subtle silver/warm mesh gradient overlay */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-30"
          className="gba:bg-gradient-to-br"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, var(--nw-ai)14 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, var(--nw-muted)26 0%, transparent 50%)',
            animation: 'gradient-shift-ai 25s ease infinite',
            backgroundSize: '200% 200%'
          }}
        />

        {/* Subtle dot pattern */}
        <div
          className="gba:absolute gba:inset-0 gba:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Content */}
        <div className="gba:relative gba:max-w-4xl gba:mx-auto gba:text-center" style={{ zIndex: 10 }}>
          {/* Animated logo */}
          <div className="gba:mb-6" style={{ animation: 'fadeInUp 0.6s ease-out' }} data-testid={`${testId}-logo`}>
            <div className="gba:inline-flex gba:flex-col gba:items-center gba:gap-2">
              {/* Icon with glow effect */}
              <div className="gba:relative">
                {/* Glow ring */}
                <div
                  className="gba:absolute gba:inset-0 gba:rounded-2xl gba:blur-xl gba:bg-ai/30"
                  style={{
                    animation: 'pulse-glow-ai 3s ease-in-out infinite',
                    transform: 'scale(2)'
                  }}
                />
                {/* Icon container */}
                <div
                  className="gba:relative gba:w-14 gba:h-14 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary"
                  style={{
                    animation: 'float-subtle 4s ease-in-out infinite'
                  }}
                >
                  <Brain className="gba:w-7 gba:h-7 gba:text-ai-foreground" />
                </div>
              </div>

              {/* Brand text */}
              <span className="gba:text-xs gba:font-medium gba:tracking-[0.4em] gba:uppercase gba:mt-3 gba:text-muted-foreground">
                NEWWORK
              </span>
              <h1 className="gba:text-5xl gba:sm:text-6xl gba:lg:text-7xl gba:font-bold gba:tracking-tight">
                <span className="gba:text-foreground">Every</span>
                <span
                  className="gba:bg-gradient-to-r gba:from-ai gba:via-ai-secondary gba:to-ai gba:bg-clip-text gba:text-transparent"
                  style={{
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
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-ai/10 gba:text-ai gba:border gba:border-ai/20">
              <Microphone className="gba:w-3 gba:h-3" weight="fill" />
              Voice
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-ai-secondary/10 gba:text-ai-secondary gba:border gba:border-ai-secondary/20">
              <Lightning className="gba:w-3 gba:h-3" weight="fill" />
              Workflows
            </span>
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-ai/10 gba:text-ai gba:border gba:border-ai/20">
              <ChartLineUp className="gba:w-3 gba:h-3" weight="fill" />
              Insights
            </span>
          </div>

          {/* Main headline */}
          <h2
            className="gba:text-xl gba:sm:text-2xl gba:font-semibold gba:tracking-tight gba:mb-2.5 gba:text-foreground"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.15s both' }}
            data-testid={`${testId}-headline`}
          >
            Your intelligent assistant.
            <span className="gba:text-muted-foreground"> Voice-enabled.</span>
          </h2>

          {/* Subtitle */}
          <p
            className="gba:text-sm gba:max-w-lg gba:mx-auto gba:leading-relaxed gba:mb-12 gba:text-muted-foreground"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            data-testid={`${testId}-subtitle`}
          >
            Ask questions, automate workflows, analyze data, and get intelligent insights — all by voice or text.
          </p>
        </div>

        {/* Smooth gradient transition to input */}
        <div
          className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:h-20 gba:pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, var(--nw-muted)80 40%, var(--nw-background) 100%)',
            zIndex: 5
          }}
        />
      </section>
    </>
  )
}

export default HeroSection
