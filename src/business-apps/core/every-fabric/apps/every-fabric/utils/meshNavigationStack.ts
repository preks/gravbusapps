// Pure navigation-stack state machine for the Agent Mesh screen.
// Holds an ordered history of view snapshots so the user can drill down
// (Company -> User -> Session) and step back without losing context.

import type { MeshScope } from '../components/agent-mesh/meshScopes'

export interface MeshNavSnapshot {
  scope: MeshScope
  userId?: string
  sessionId?: string
  fullscreen: boolean
  /** Optional display label resolved lazily (e.g. user name, session title). */
  label?: string
}

export const MAX_STACK_DEPTH = 16

export function snapshotsEqual(a: MeshNavSnapshot, b: MeshNavSnapshot): boolean {
  return (
    a.scope === b.scope &&
    (a.userId ?? null) === (b.userId ?? null) &&
    (a.sessionId ?? null) === (b.sessionId ?? null) &&
    a.fullscreen === b.fullscreen
  )
}

/**
 * Push a snapshot. Dedupes against the top so re-renders don't pollute history.
 * Caps the stack at MAX_STACK_DEPTH by dropping the oldest entry.
 */
export function push(stack: MeshNavSnapshot[], snap: MeshNavSnapshot): MeshNavSnapshot[] {
  const top = stack[stack.length - 1]
  if (top && snapshotsEqual(top, snap)) {
    // Same identity: update the label only (e.g. when title resolves after async load)
    if (snap.label && snap.label !== top.label) {
      const next = stack.slice(0, -1)
      next.push({ ...top, label: snap.label })
      return next
    }
    return stack
  }
  const next = [...stack, snap]
  if (next.length > MAX_STACK_DEPTH) next.shift()
  return next
}

/** Replace the top snapshot in place (no new history entry). */
export function replaceTop(stack: MeshNavSnapshot[], snap: MeshNavSnapshot): MeshNavSnapshot[] {
  if (stack.length === 0) return [snap]
  const next = stack.slice(0, -1)
  next.push(snap)
  return next
}

/** Pop the most recent snapshot. No-op at root. */
export function pop(stack: MeshNavSnapshot[]): MeshNavSnapshot[] {
  if (stack.length <= 1) return stack
  return stack.slice(0, -1)
}

/** Truncate the stack so that `index` becomes the new top. */
export function goToIndex(stack: MeshNavSnapshot[], index: number): MeshNavSnapshot[] {
  if (index < 0 || index >= stack.length) return stack
  if (index === stack.length - 1) return stack
  return stack.slice(0, index + 1)
}

/** Convenience: current (top) snapshot, or null when stack is empty. */
export function current(stack: MeshNavSnapshot[]): MeshNavSnapshot | null {
  return stack[stack.length - 1] ?? null
}
