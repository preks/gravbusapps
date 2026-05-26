// R3F Canvas wrapper for the 3D agent mesh. Mirrors the public surface of
// `MeshGraph` so `AgentMeshCanvas` can swap renderers based on the 2D/3D
// view-mode toggle without owning any WebGL-specific state.

import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { TraceModel } from '../../utils/traceModel'
import type { MeshLayerKey } from './meshLayers'
import { Mesh3DScene } from './Mesh3DScene'
import { useMeshTheme } from './useMeshTheme'

interface ErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
  errorMessage?: string
}

class Mesh3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message ?? String(error) }
  }
  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[Mesh3DGraph] Crashed while rendering 3D scene:', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export interface Mesh3DGraphProps {
  model: TraceModel
  activeLayers: ReadonlySet<MeshLayerKey>
  positionMs: number
  durationMs: number
  selectedNodeId: string | null
  hoveredNodeId: string | null
  dense?: boolean
  onSelectNode: (nodeId: string | null) => void
  onSelectEdge: (edgeId: string) => void
  onHoverNode: (nodeId: string | null) => void
  onPaneClick?: () => void
  /** Optional fallback when WebGL is unavailable (rendered in place of the canvas). */
  fallback?: React.ReactNode
}

/** Cheap one-time WebGL probe so we render the 2D fallback in headless environments. */
function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!ctx
  } catch {
    return false
  }
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const handler = () => setPrefers(mq.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return prefers
}

export function Mesh3DGraph(props: Mesh3DGraphProps) {
  const colors = useMeshTheme()
  const reducedMotion = usePrefersReducedMotion()
  const supportsWebGL = useMemo(() => detectWebGL(), [])
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (!supportsWebGL) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Mesh3DGraph] WebGL unavailable, rendering 2D fallback.')
    }
    return <>{props.fallback ?? null}</>
  }

  // Matches the 2D canvas exactly: same Tailwind background classes, no
  // WebGL clear colour overrides. The canvas is transparent and the Tailwind
  // container behind it paints the theme background (using the scoped
  // `--background` variable, which lives on our app root, NOT on <html>).
  const containerClass = props.dense
    ? 'gba:relative gba:h-full gba:w-full gba:overflow-hidden gba:bg-background'
    : 'gba:relative gba:h-full gba:w-full gba:rounded-[1.5rem] gba:border gba:border-border/60 gba:bg-gradient-to-br gba:from-background gba:to-muted/30 gba:overflow-hidden'

  return (
    <div ref={containerRef} className={containerClass} data-testid="mesh-graph-3d">
      <Mesh3DErrorBoundary fallback={props.fallback ?? null}>
        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          camera={{ position: [0, 260, 1400], fov: 50, near: 1, far: 8000 }}
          onCreated={state => {
            // Transparent clear so the Tailwind-styled container shows through.
            state.gl.setClearColor(0x000000, 0)
          }}
          onPointerMissed={() => {
            props.onSelectNode(null)
            props.onPaneClick?.()
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Mesh3DScene
            model={props.model}
            activeLayers={props.activeLayers}
            positionMs={props.positionMs}
            durationMs={props.durationMs}
            selectedNodeId={props.selectedNodeId}
            hoveredNodeId={props.hoveredNodeId}
            colors={colors}
            reducedMotion={reducedMotion}
            onSelectNode={props.onSelectNode}
            onSelectEdge={props.onSelectEdge}
            onHoverNode={props.onHoverNode}
          />
        </Canvas>
      </Mesh3DErrorBoundary>
    </div>
  )
}

export default Mesh3DGraph
