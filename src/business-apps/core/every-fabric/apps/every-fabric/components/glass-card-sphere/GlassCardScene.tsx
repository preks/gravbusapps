// Reusable premium 3D glass card scene.
//
// Renders one floating glass card per model in a rotatable, bloom-lit
// deep-purple scene. Cards whose status is "running" pulse. Falls back to a
// static design-system card grid when WebGL is unavailable, the user prefers
// reduced motion, or the 3D scene fails to mount. Callers pass ready-to-render
// cards (any jitter/derivation happens upstream) plus the distant KPI tiles and
// a heading shown in the top-left overlay chip.

import { Component, type ReactNode, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { GlassCardCluster } from './GlassCardCluster'
import { cardStatusStyle, type GlassCardModel } from './glassCardModel'
import { detectWebGL, usePrefersReducedMotion } from './glassCardEnv'
import { DARK_GLASS_THEME, type GlassCardTheme } from './glassCardTheme'
import type { ValueKpiTile } from './kpiModel'

export interface GlassCardSceneHeading {
  label: string
  value: string
}

interface GlassCardSceneProps {
  cards: GlassCardModel[]
  kpis: ValueKpiTile[]
  heading: GlassCardSceneHeading
  theme?: GlassCardTheme
  testId?: string
}

interface ErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
}

class SceneErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.error('[GlassCardScene] Crashed while rendering 3D scene:', error.message)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

const FallbackGrid: React.FC<{ cards: GlassCardModel[] }> = ({ cards }) => (
  <div
    className="gba:grid gba:grid-cols-1 gba:gap-3 gba:p-4 sm:gba:grid-cols-2 lg:gba:grid-cols-3"
    data-testid="glass-card-scene-fallback"
  >
    {cards.map(card => {
      const style = cardStatusStyle(card.status)
      return (
        <div
          key={card.id}
          className="gba:flex gba:flex-col gba:gap-2 gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card/60 gba:p-4 gba:backdrop-blur"
        >
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
            <div className="gba:min-w-0">
              <h4 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{card.title}</h4>
              <p className="gba:truncate gba:text-xs gba:text-muted-foreground">{card.subtitle}</p>
            </div>
            <span
              className={`gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${style.fallbackClass}`}
            >
              {style.label}
            </span>
          </div>
          <div className="gba:mt-auto">
            <span className="gba:text-xl gba:font-semibold gba:text-foreground">{card.value}</span>
            <span className="gba:ml-1 gba:text-xs gba:text-muted-foreground">{card.valueUnit}</span>
          </div>
        </div>
      )
    })}
  </div>
)

export const GlassCardScene: React.FC<GlassCardSceneProps> = ({
  cards,
  kpis,
  heading,
  theme = DARK_GLASS_THEME,
  testId = 'glass-card-scene'
}) => {
  const reducedMotion = usePrefersReducedMotion()
  const supportsWebGL = useRef(detectWebGL()).current
  const useFallback = !supportsWebGL || reducedMotion

  if (cards.length === 0) return null

  return (
    <div
      className="gba:relative gba:h-[520px] gba:w-full gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border/60 lg:gba:h-[640px]"
      data-testid={testId}
    >
      <div className="gba:pointer-events-none gba:absolute gba:left-4 gba:top-4 gba:z-10 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background/75 gba:px-3 gba:py-2 gba:backdrop-blur">
        <p className="gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {heading.label}
        </p>
        <p className="gba:text-base gba:font-semibold gba:text-foreground">{heading.value}</p>
      </div>

      {useFallback ? (
        <div className="gba:h-full gba:w-full gba:overflow-y-auto gba:bg-card/30 gba:pt-16">
          <FallbackGrid cards={cards} />
        </div>
      ) : (
        <SceneErrorBoundary fallback={<FallbackGrid cards={cards} />}>
          <Canvas
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 100 }}
            onCreated={state => state.gl.setClearColor(theme.clearColor, 1)}
            style={{ width: '100%', height: '100%' }}
          >
            <GlassCardCluster cards={cards} kpis={kpis} reducedMotion={reducedMotion} theme={theme} />
            <EffectComposer>
              <Bloom
                intensity={theme.bloomIntensity}
                luminanceThreshold={theme.bloomThreshold}
                luminanceSmoothing={theme.bloomSmoothing}
                mipmapBlur
              />
            </EffectComposer>
          </Canvas>
        </SceneErrorBoundary>
      )}
    </div>
  )
}

export default GlassCardScene
