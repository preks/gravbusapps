/**
 * Hook for subscribing to build progress via SSE
 *
 * Manages the connection to the SSE stream and updates tile states
 * based on incoming progress events.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
 * Hook for managing build progress with SSE streaming
 */
export function useBuildProgress({
  client,
  plan,
  onComplete,
  onError
}: UseBuildProgressOptions): UseBuildProgressResult {
  const [isBuilding, setIsBuilding] = useState(false)
  const [buildError, setBuildError] = useState<string | null>(null)
  const [tiles, setTiles] = useState<TileState>(() => createInitialTileState(plan))
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [reusedCount, setReusedCount] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<BuildPhase | null>(null)
  const [phaseMessage, setPhaseMessage] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset tile state when plan changes
  useEffect(() => {
    setTiles(createInitialTileState(plan))
    setCompletedCount(0)
    setFailedCount(0)
    setReusedCount(0)
    setBuildError(null)
    setCurrentPhase(null)
    setPhaseMessage(null)
  }, [plan])

  const totalCount = plan?.components.length || 0

  // Include reused components in overall progress
  const overallProgress =
    totalCount > 0 ? Math.round(((completedCount + failedCount + reusedCount) / totalCount) * 100) : 0

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

      const handler = phaseHandlers[event.event_type]
      if (handler) {
        handler()
        return true
      }
      return false
    },
    [onComplete]
  )

  /**
   * Handle component reused event
   */
  const handleComponentReused = (tile: any, event: BuildProgressEvent) => {
    tile.status = 'completed'
    tile.currentOperation = event.message
    const item = tile.items.find((i: any) => i.id === event.component_id)
    if (item) {
      item.status = 'reused'
      item.createdId = event.created_id
      item.reused = true
    }
    tile.reusedCount = (tile.reusedCount || 0) + 1
  }

  /**
   * Handle component completed event
   */
  const handleComponentCompleted = (tile: any, event: BuildProgressEvent) => {
    tile.currentOperation = undefined
    const item = tile.items.find((i: any) => i.id === event.component_id)
    if (item) {
      item.status = 'completed'
      item.createdId = event.created_id
    }
    // Check if all items in tile are done
    const allDone = tile.items.every(
      (i: any) => i.status === 'completed' || i.status === 'reused' || i.status === 'error' || i.status === 'skipped'
    )
    if (allDone) {
      const hasErrors = tile.items.some((i: any) => i.status === 'error')
      tile.status = hasErrors ? 'error' : 'completed'
    }
  }

  /**
   * Handle component error event
   */
  const handleComponentError = (tile: any, event: BuildProgressEvent) => {
    tile.currentOperation = undefined
    const item = tile.items.find((i: any) => i.id === event.component_id)
    if (item) {
      item.status = 'error'
      item.error = event.error_details
    }
  }

  /**
   * Handle component progress event
   */
  const handleComponentProgress = (tile: any, event: BuildProgressEvent) => {
    tile.currentOperation = event.message
    if (event.progress_percent !== undefined) {
      tile.progressPercent = event.progress_percent
    }
  }

  /**
   * Handle component-level events
   */
  const handleComponentEvent = useCallback((event: BuildProgressEvent) => {
    setTiles(prevTiles => {
      const newTiles = { ...prevTiles }

      if (!event.component_type) return newTiles

      const tile = newTiles[event.component_type]
      if (!tile) return newTiles

      const eventHandlers: Record<string, (tile: any, event: BuildProgressEvent) => void> = {
        component_reused: handleComponentReused,
        component_started: (t, e) => {
          t.status = 'building'
          t.currentOperation = e.message
        },
        component_completed: handleComponentCompleted,
        component_error: handleComponentError,
        component_progress: handleComponentProgress,
        // Capture publish results (URLs from deployment)
        publish_progress: (t, e) => {
          t.currentOperation = e.message
          // Update component with publish results
          if (plan && e.component_id) {
            const component = plan.components.find(c => c.id === e.component_id)
            if (component) {
              component.resource_url = e.resource_url
              component.azure_url = e.azure_url
              component.published_file_count = e.files_published
            }
          }
        }
      }

      const handler = eventHandlers[event.event_type]
      if (handler) {
        handler(tile, event)
      }

      return newTiles
    })

    // Update counts
    const countUpdaters: Record<string, () => void> = {
      component_completed: () => setCompletedCount(prev => prev + 1),
      component_error: () => setFailedCount(prev => prev + 1),
      component_reused: () => setReusedCount(prev => prev + 1)
    }

    const updater = countUpdaters[event.event_type]
    if (updater) updater()
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
        job_id: plan.job_id,
        skip_components: skipComponents
      }

      try {
        await client.executeWithProgress(
          plan.job_id,
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
      client.cancelBuild(plan.job_id).catch(console.error)
    }
  }, [client, plan])

  /**
   * Reset progress state
   */
  const resetProgress = useCallback(() => {
    setTiles(createInitialTileState(plan))
    setCompletedCount(0)
    setFailedCount(0)
    setReusedCount(0)
    setBuildError(null)
    setIsBuilding(false)
    setCurrentPhase(null)
    setPhaseMessage(null)
  }, [plan])

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
