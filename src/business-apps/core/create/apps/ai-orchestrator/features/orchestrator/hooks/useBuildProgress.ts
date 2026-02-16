/**
 * Hook for subscribing to build progress via SSE
 *
 * Manages the connection to the SSE stream and updates tile states
 * based on incoming progress events.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import type {
  BuildPlan,
  BuildProgressEvent,
  ComponentType,
  ComponentTileInfo,
  TileState,
  ExecuteRequest,
  BuildPhase
} from '../types'

export interface UseBuildProgressOptions {
  client: OrchestratorClient
  plan: BuildPlan | null
  onComplete?: (success: boolean) => void
  onError?: (error: string) => void
  /** Called when build_complete SSE event is received; use event.metadata.sessionId/repoId for execute-again */
  onBuildComplete?: (event: BuildProgressEvent) => void
  onComponentUpdate?: (
    componentId: string,
    updates: Partial<{
      status: string
      resourceUrl: string
      azureUrl: string
      publishedFileCount: number
      errorMessage: string
      createdId: string
      metadata: Record<string, unknown>
    }>
  ) => void
}

export interface UseBuildProgressResult {
  // State
  isBuilding: boolean
  buildError: string | null
  tiles: TileState
  overallProgress: number
  completedCount: number
  failedCount: number
  reusedCount: number // Components reused from existing resources
  totalCount: number
  currentPhase: BuildPhase | null // Current build phase
  phaseMessage: string | null // Current phase status message

  // Methods
  startBuild: (skipComponents?: string[], sessionId?: string, repoId?: string) => Promise<void>
  cancelBuild: () => void
  resetProgress: () => void
}

/**
 * Create initial tile state for a component type
 */
function createInitialTile(type: ComponentType, title: string, description: string): ComponentTileInfo {
  return {
    type,
    icon: getIconForType(type),
    title,
    description,
    status: 'pending',
    items: [],
    progressPercent: 0,
    reusedCount: 0
  }
}

/**
 * Get icon name for component type
 */
function getIconForType(type: ComponentType): string {
  const icons: Record<ComponentType, string> = {
    screen: 'Monitor',
    agent: 'Bot',
    function: 'Code2',
    flow: 'Workflow',
    data_model: 'Database'
  }
  return icons[type]
}

/**
 * Create initial tile state from a build plan
 */
function createInitialTileState(plan: BuildPlan | null): TileState {
  const tiles: TileState = {
    screen: createInitialTile('screen', 'Screens', 'UI screens and dashboards'),
    agent: createInitialTile('agent', 'AI Task Experts', 'AI-powered assistants'),
    function: createInitialTile('function', 'Functions', 'Serverless tools'),
    flow: createInitialTile('flow', 'Flows', 'Automated workflows'),
    data_model: createInitialTile('data_model', 'Data Models', 'Catalogs and entities')
  }

  if (plan) {
    // Populate items from plan components
    for (const component of plan.components) {
      const tile = tiles[component.type]
      if (tile) {
        tile.items.push({
          id: component.id,
          name: component.name,
          status: component.status
        })
      }
    }

    // Mark tiles with no items as skipped
    for (const key of Object.keys(tiles) as ComponentType[]) {
      if (tiles[key].items.length === 0) {
        tiles[key].status = 'skipped'
      }
    }
  }

  return tiles
}

/**
 * Reducer for tiles state - ensures atomic updates without race conditions
 */
function tilesReducer(
  state: TileState,
  action:
    | { type: 'UPDATE_TILE'; componentType: ComponentType; updater: (tile: any) => any }
    | { type: 'RESET'; plan: BuildPlan | null }
): TileState {
  if (action.type === 'RESET') {
    return createInitialTileState(action.plan)
  }

  if (action.type === 'UPDATE_TILE') {
    const { componentType, updater } = action
    const prevTile = state[componentType]
    if (!prevTile) return state

    // Clone tile and items immutably
    const newTile = { ...prevTile, items: [...prevTile.items] }
    // Apply updater function
    updater(newTile)

    // Return new state with updated tile
    return {
      ...state,
      [componentType]: newTile
    }
  }

  return state
}

/**
 * Hook for managing build progress with SSE streaming
 */
export function useBuildProgress({
  client,
  plan,
  onComplete,
  onError,
  onBuildComplete,
  onComponentUpdate
}: UseBuildProgressOptions): UseBuildProgressResult {
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [tiles, dispatchTiles] = useReducer(tilesReducer, plan, createInitialTileState)
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [reusedCount, setReusedCount] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<BuildPhase | null>(null)
  const [phaseMessage, setPhaseMessage] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const onComponentUpdateRef = useRef(onComponentUpdate)
  const onBuildCompleteRef = useRef(onBuildComplete)
  const currentJobIdRef = useRef<string | null>(null)

  // Keep refs in sync with props
  useEffect(() => {
    onComponentUpdateRef.current = onComponentUpdate
  }, [onComponentUpdate])
  useEffect(() => {
    onBuildCompleteRef.current = onBuildComplete
  }, [onBuildComplete])

  // Internal reset helper
  const resetState = useCallback(() => {
    dispatchTiles({ type: 'RESET', plan })
    setCompletedCount(0)
    setFailedCount(0)
    setReusedCount(0)
    setOverallProgress(0)
    setBuildError(null)
    setCurrentPhase(null)
    setPhaseMessage(null)
  }, [plan])

  // Reset tile state ONLY when jobId changes (new build), NOT on every plan object change
  useEffect(() => {
    const newJobId = plan?.jobId ?? null
    if (currentJobIdRef.current !== newJobId) {
      currentJobIdRef.current = newJobId
      resetState()
    }
  }, [plan?.jobId, resetState])

  const totalCount = plan?.components.length || 0

  // Event-driven progress — bumped monotonically by SSE event handlers.
  // This avoids the problem of completedCount hitting 100% prematurely
  // (component_completed fires during the fast building phase, well before
  // actual screen generation in the publish phase).
  const [overallProgress, setOverallProgress] = useState(0)

  /**
   * Handle phase-level events
   */
  const handlePhaseEvent = useCallback(
    (event: BuildProgressEvent) => {
      const phaseHandlers: Record<string, () => void> = {
        discovery_started: () => {
          setCurrentPhase('discovery')
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 5))
        },
        discovery_complete: () => {
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 10))
        },
        build_started: () => {
          setCurrentPhase('building')
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 12))
        },
        // Wiring + Publish happen after the fast building phase but BEFORE
        // the actual screen generation. Keep the timeline at 'building' so users
        // see building as the long active phase (which it is from their perspective).
        wiring_started: () => {
          setPhaseMessage('Connecting components...')
          setOverallProgress(p => Math.max(p, 18))
        },
        wiring_progress: () => setPhaseMessage(event.message),
        wiring_completed: () => {
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 22))
        },
        publish_started: () => {
          setPhaseMessage('Preparing screen generation...')
          setOverallProgress(p => Math.max(p, 25))
        },
        publish_progress: () => {
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 30))
        },
        publish_completed: () => {
          // Only now advance past building → wiring is auto-marked complete
          setCurrentPhase('wiring')
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 92))
        },
        publish_error: () => setPhaseMessage(event.message),
        publish_skipped: () => setPhaseMessage(event.message),
        // AI Builder streaming events — show stable descriptive messages
        // (raw token-level content would flash too fast to read)
        ai_builder_started: () => {
          setPhaseMessage(`Generating code for ${event.componentName || 'screen'}...`)
          setOverallProgress(p => Math.max(p, 35))
        },
        ai_builder_response: () => {
          // Don't update phaseMessage on every token — keep the stable message
        },
        ai_builder_tool_call: () => {
          setPhaseMessage(`Writing files for ${event.componentName || 'screen'}...`)
          setOverallProgress(p => Math.min(p + 5, 78))
        },
        ai_builder_tool_result: () => {
          setPhaseMessage(`Files written for ${event.componentName || 'screen'}`)
          setOverallProgress(p => Math.min(p + 5, 83))
        },
        ai_builder_done: () => {
          setPhaseMessage(`Code generation complete for ${event.componentName || 'screen'}`)
          setOverallProgress(p => Math.max(p, 88))
        },
        ai_builder_error: () => setPhaseMessage(event.message),
        screen_generation_complete: () => {
          setPhaseMessage(event.message)
          setOverallProgress(p => Math.max(p, 90))
        },
        build_complete: () => {
          setCurrentPhase('complete')
          setIsBuilding(false)
          setPhaseMessage(event.message)
          setOverallProgress(100)
          const success = event.status === 'completed'
          onComplete?.(success)
          onBuildCompleteRef.current?.(event)
        }
      }

      const handler = phaseHandlers[event.eventType]
      if (handler) {
        handler()
        return true
      }
      return false
    },
    [onComplete]
  )

  /**
   * Handle component-level events
   */
  const handleComponentEvent = useCallback((event: BuildProgressEvent) => {
    if (!event.componentType) return

    // Use reducer dispatch to update tile atomically
    dispatchTiles({
      type: 'UPDATE_TILE',
      componentType: event.componentType,
      updater: (tile: any) => {
        const eventHandlers: Record<string, (t: any, e: BuildProgressEvent) => void> = {
          component_reused: (t, e) => {
            t.currentOperation = e.message
            t.reusedCount = (t.reusedCount || 0) + 1
            t.items = t.items.map((i: any) =>
              i.id === e.componentId ? { ...i, status: 'reused', createdId: e.createdId, reused: true } : i
            )
            // Only mark tile as completed when all items are done (mirror component_completed logic)
            const allDone = t.items.every((i: any) => ['completed', 'reused', 'error', 'skipped'].includes(i.status))
            if (allDone) {
              t.status = t.items.some((i: any) => i.status === 'error') ? 'error' : 'completed'
            } else if (t.status !== 'building') {
              t.status = 'building' // Ensure tile shows as in-progress if not all done
            }
            if (e.componentId) {
              onComponentUpdateRef.current?.(e.componentId, { status: 'reused', createdId: e.createdId })
            }
          },
          component_started: (t, e) => {
            t.status = 'building'
            t.currentOperation = e.message
            t.items = t.items.map((i: any) => (i.id === e.componentId ? { ...i, status: 'building' } : i))
            if (e.componentId) {
              onComponentUpdateRef.current?.(e.componentId, { status: 'building' })
            }
          },
          component_completed: (t, e) => {
            t.currentOperation = undefined
            t.items = t.items.map((i: any) =>
              i.id === e.componentId ? { ...i, status: 'completed', createdId: e.createdId } : i
            )
            const allDone = t.items.every((i: any) => ['completed', 'reused', 'error', 'skipped'].includes(i.status))
            if (allDone) {
              t.status = t.items.some((i: any) => i.status === 'error') ? 'error' : 'completed'
            }

            // Pass metadata and status to the component update
            if (e.componentId) {
              const updates: any = {
                status: 'completed',
                createdId: e.createdId
              }

              if (e.metadata) {
                updates.metadata = e.metadata
              }

              onComponentUpdateRef.current?.(e.componentId, updates)
            }
          },
          component_error: (t, e) => {
            t.currentOperation = undefined
            t.items = t.items.map((i: any) =>
              i.id === e.componentId ? { ...i, status: 'error', error: e.errorDetails } : i
            )
            if (e.componentId) {
              const updates: any = {
                status: 'error',
                errorMessage: e.errorDetails || e.message
              }

              // Include metadata if present (for accessing partial generated code)
              if (e.metadata) {
                updates.metadata = e.metadata
              }

              onComponentUpdateRef.current?.(e.componentId, updates)
            }
          },
          component_progress: (t, e) => {
            // Only update currentOperation with meaningful messages (not single-token AI stream chunks)
            if (e.message && e.message.length > 10) {
              t.currentOperation = e.message
            }
            if (e.progressPercent !== undefined) t.progressPercent = e.progressPercent
          },
          publish_progress: (t, e) => {
            t.currentOperation = e.message
            if (e.componentId) {
              onComponentUpdateRef.current?.(e.componentId, {
                resourceUrl: e.resourceUrl,
                azureUrl: e.azureUrl,
                publishedFileCount: e.filesPublished,
                metadata: e.metadata
              })
            }
          }
        }

        eventHandlers[event.eventType]?.(tile, event)
      }
    })

    // Update counts
    const countUpdaters: Record<string, () => void> = {
      component_completed: () => setCompletedCount(prev => prev + 1),
      component_error: () => setFailedCount(prev => prev + 1),
      component_reused: () => setReusedCount(prev => prev + 1)
    }
    countUpdaters[event.eventType]?.()
  }, [])

  /**
   * Handle incoming progress event
   */
  const handleProgressEvent = useCallback(
    (event: BuildProgressEvent) => {
      // Handle as phase event first
      const isPhaseEvent = handlePhaseEvent(event)

      // For publish/AI builder events that also carry component info,
      // forward to component handler so the tile shows current operation.
      // Use stable descriptive messages — never raw streaming tokens.
      if (isPhaseEvent && event.componentType) {
        const tileMessages: Record<string, string | null> = {
          publish_started: `Generating ${event.componentName || 'screen'}...`,
          publish_progress: `Building ${event.componentName || 'screen'}...`,
          ai_builder_started: `Generating code for ${event.componentName || 'screen'}...`,
          ai_builder_tool_call: `Writing files for ${event.componentName || 'screen'}...`,
          ai_builder_tool_result: `Files written for ${event.componentName || 'screen'}`,
          ai_builder_done: `Code generation complete`,
          ai_builder_error: event.message || 'Error during generation',
          publish_completed: `Published ${event.componentName || 'screen'}`,
          screen_generation_complete: `Screen generated`
        }
        const tileMessage = tileMessages[event.eventType]
        if (tileMessage !== undefined) {
          dispatchTiles({
            type: 'UPDATE_TILE',
            componentType: event.componentType,
            updater: (tile: any) => {
              // Reset tile to 'building' during any active publish/generation work
              const activeBuildEvents = [
                'publish_started',
                'publish_progress',
                'ai_builder_started',
                'ai_builder_tool_call',
                'ai_builder_tool_result'
              ]
              if (activeBuildEvents.includes(event.eventType)) {
                tile.status = 'building'
              }
              // Mark tile completed when publish finishes
              if (event.eventType === 'publish_completed' || event.eventType === 'screen_generation_complete') {
                tile.status = 'completed'
              }
              if (tileMessage) {
                tile.currentOperation = tileMessage
              }
            }
          })
        }
        // Skip ai_builder_response entirely — it's token-level noise
        return
      }

      if (isPhaseEvent) return

      // Handle as component event
      handleComponentEvent(event)
    },
    [handlePhaseEvent, handleComponentEvent, dispatchTiles]
  )

  /**
   * Start the build execution
   * First run: omit sessionId/repoId. Refine/execute-again: pass stored sessionId/repoId.
   */
  const startBuild = useCallback(
    async (skipComponents?: string[], sessionId?: string, repoId?: string) => {
      if (!plan) {
        onError?.('No build plan available')
        return
      }

      setIsBuilding(true)
      setBuildError(null)
      abortControllerRef.current = new AbortController()

      const request: ExecuteRequest = {
        jobId: plan.jobId,
        skipComponents: skipComponents ?? []
      }
      if (sessionId !== undefined && sessionId !== '') request.sessionId = sessionId
      if (repoId !== undefined && repoId !== '') request.repoId = repoId

      try {
        await client.executeWithProgress(
          plan.jobId,
          request,
          handleProgressEvent,
          error => {
            setBuildError(error.message)
            setIsBuilding(false)
            onError?.(error.message)
          },
          () => {
            // Stream ended
            setIsBuilding(false)
          }
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Build failed'
        setBuildError(errorMessage)
        setIsBuilding(false)
        onError?.(errorMessage)
      }
    },
    [client, plan, handleProgressEvent, onError]
  )

  /**
   * Cancel the current build
   */
  const cancelBuild = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsBuilding(false)

    if (plan) {
      client.cancelBuild(plan.jobId).catch(console.error)
    }
  }, [client, plan])

  /**
   * Reset progress state (for retry)
   */
  const resetProgress = useCallback(() => {
    resetState()
    setIsBuilding(false)
  }, [resetState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    isBuilding,
    buildError,
    tiles,
    overallProgress,
    completedCount,
    failedCount,
    reusedCount,
    totalCount,
    currentPhase,
    phaseMessage,
    startBuild,
    cancelBuild,
    resetProgress
  }
}

export default useBuildProgress
