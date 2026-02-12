/**
 * Hook for subscribing to build progress via SSE
 *
 * Manages the connection to the SSE stream and updates tile states
 * based on incoming progress events.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
  startBuild: (skipComponents?: string[]) => Promise<void>
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
  const currentJobIdRef = useRef<string | null>(null)

  // Keep ref in sync with prop
  useEffect(() => {
    onComponentUpdateRef.current = onComponentUpdate
  }, [onComponentUpdate])

  // Internal reset helper
  const resetState = useCallback(() => {
    dispatchTiles({ type: 'RESET', plan })
    setCompletedCount(0)
    setFailedCount(0)
    setReusedCount(0)
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

  // Calculate overall progress including in-progress work
  const overallProgress = useMemo(() => {
    if (totalCount === 0) return 0

    // Count fully completed/failed/reused components (100% each)
    const fullyDoneCount = completedCount + failedCount + reusedCount

    // Count in-progress components (give them 30% credit for being started)
    const inProgressCount = Object.values(tiles).reduce((count, tile) => {
      const inProgress = tile.items.filter(
        (item: any) => item.status === 'building' || item.status === 'pending'
      ).length
      return count + inProgress
    }, 0)

    const inProgressCredit = inProgressCount * 0.3

    return Math.round(((fullyDoneCount + inProgressCredit) / totalCount) * 100)
  }, [totalCount, completedCount, failedCount, reusedCount, tiles])

  /**
   * Handle phase-level events
   */
  const handlePhaseEvent = useCallback(
    (event: BuildProgressEvent) => {
      const phaseHandlers: Record<string, () => void> = {
        discovery_started: () => {
          setCurrentPhase('discovery')
          setPhaseMessage(event.message)
        },
        discovery_complete: () => setPhaseMessage(event.message),
        build_started: () => {
          setCurrentPhase('building')
          setPhaseMessage(event.message)
        },
        wiring_started: () => {
          setCurrentPhase('wiring')
          setPhaseMessage(event.message)
        },
        wiring_progress: () => setPhaseMessage(event.message),
        wiring_completed: () => setPhaseMessage(event.message),
        // Publish phase events (deployment)
        publish_started: () => {
          setCurrentPhase('wiring') // Keep showing wiring phase during publish
          setPhaseMessage(event.message)
        },
        publish_progress: () => setPhaseMessage(event.message),
        publish_completed: () => setPhaseMessage(event.message),
        publish_error: () => setPhaseMessage(event.message),
        publish_skipped: () => setPhaseMessage(event.message),
        // AI Builder streaming events
        ai_builder_started: () => setPhaseMessage(event.message),
        ai_builder_response: () => setPhaseMessage(event.content || event.message),
        ai_builder_tool_call: () => setPhaseMessage(event.message),
        ai_builder_tool_result: () => setPhaseMessage(event.message),
        ai_builder_done: () => setPhaseMessage(event.message),
        ai_builder_error: () => setPhaseMessage(event.message),
        screen_generation_complete: () => setPhaseMessage(event.message),
        build_complete: () => {
          setCurrentPhase('complete')
          setIsBuilding(false)
          setPhaseMessage(event.message)
          const success = event.status === 'completed'
          onComplete?.(success)
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
            t.currentOperation = e.message
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
      // Try to handle as phase event first
      const isPhaseEvent = handlePhaseEvent(event)
      if (isPhaseEvent) return

      // Otherwise handle as component event
      handleComponentEvent(event)
    },
    [handlePhaseEvent, handleComponentEvent]
  )

  /**
   * Start the build execution
   */
  const startBuild = useCallback(
    async (skipComponents: string[] = []) => {
      if (!plan) {
        onError?.('No build plan available')
        return
      }

      setIsBuilding(true)
      setBuildError(null)
      abortControllerRef.current = new AbortController()

      const request: ExecuteRequest = {
        jobId: plan.jobId,
        skipComponents: skipComponents
      }

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
