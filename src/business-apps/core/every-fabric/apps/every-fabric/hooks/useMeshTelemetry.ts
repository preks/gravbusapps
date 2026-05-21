import { useCallback } from 'react'

export type MeshTelemetryEvent =
  | { type: 'mesh.scope_changed'; from: string; to: string; source: 'tab' | 'canvas' | 'panel' | 'breadcrumb' | 'back' }
  | { type: 'mesh.fullscreen_toggled'; entering: boolean; scope: string }
  | { type: 'mesh.drill_to_session'; origin: string; sessionIdHash: string }
  | { type: 'mesh.back'; from: string; to: string }

/**
 * Optional global telemetry sink. Apps can wire their analytics adapter to
 * `globalThis.__meshTelemetrySink` (e.g. Segment, Amplitude, internal pipe).
 * The hook is a no-op when no sink is registered, so call sites stay clean.
 */
declare global {
  var __meshTelemetrySink: ((event: MeshTelemetryEvent) => void) | undefined
}

function hashIdentifier(id: string): string {
  // Lightweight non-cryptographic hash so sessionIds aren't leaked verbatim.
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function useMeshTelemetry() {
  const emit = useCallback((event: MeshTelemetryEvent) => {
    const sink = globalThis.__meshTelemetrySink
    if (!sink) return
    try {
      sink(event)
    } catch {
      // Never let a telemetry sink failure bubble up into the UI.
    }
  }, [])

  return { emit, hashIdentifier }
}
