/**
 * Hook for subscribing to build progress via SSE.
 * Uses an event ledger as the single source of truth.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { BuildLogEntry } from '../components/widgets/BuildConsoleLog'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import translations from '../../../_i18n'
import type {
  BuildJobStatus,
  BuildPlan,
  BuildProgressEvent,
  ComponentType,
  ComponentTileInfo,
  TileState,
  ExecuteRequest,
  BuildPhase,
  BuildStatus
} from '../types'
import { isCompletedBuildStatus } from '../types'

type ComponentUpdateFn = ((id: string, updates: any) => void) | null | undefined

interface DerivedProgressState {
  tiles: TileState
  completedCount: number
  failedCount: number
  reusedCount: number
  currentPhase: BuildPhase | null
  phaseMessage: string | null
  overallProgress: number
  buildLogs: BuildLogEntry[]
  isProgressEstimated: boolean
}

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
      status: BuildStatus
      errorMessage: string
      createdId: string
      metadata: Record<string, unknown>
    }>
  ) => void
}

export interface UseBuildProgressResult {
  isBuilding: boolean
  buildError: string | null
  tiles: TileState
  overallProgress: number
  completedCount: number
  failedCount: number
  reusedCount: number
  totalCount: number
  currentPhase: BuildPhase | null
  phaseMessage: string | null
  buildDuration: number
  buildLogs: BuildLogEntry[]
  isProgressEstimated: boolean
  eventLedger: BuildProgressEvent[]
  wiringWarnings: string[]
  hasWiringWarnings: boolean
  buildSummaryMessage: string | null
  startBuild: (
    skipComponents?: string[],
    sessionId?: string,
    repoId?: string,
    createdBy?: ExecuteRequest['createdBy']
  ) => Promise<void>
  startWiringRetry: (sessionId?: string, repoId?: string) => Promise<void>
  cancelBuild: () => void
  resetProgress: () => void
}

const DONE_STATUSES = new Set<BuildStatus>(['completed', 'reused', 'error', 'skipped', 'cancelled'])

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

function createInitialTileState(
  plan: BuildPlan | null,
  agentTileLabels?: { title: string; description: string }
): TileState {
  const tiles: TileState = {
    screen: createInitialTile('screen', 'Screens', 'UI screens and dashboards'),
    agent: createInitialTile(
      'agent',
      agentTileLabels?.title ?? 'Agents',
      agentTileLabels?.description ?? 'AI-powered assistants'
    ),
    function: createInitialTile('function', 'Functions', 'Serverless tools'),
    flow: createInitialTile('flow', 'Flows', 'Automated workflows'),
    data_model: createInitialTile('data_model', 'Data Models', 'Catalogs and entities')
  }

  if (!plan) return tiles

  for (const component of plan.components) {
    const tile = tiles[component.type]
    tile.items.push({
      id: component.id,
      name: component.name,
      status: component.status
    })
  }

  for (const type of Object.keys(tiles) as ComponentType[]) {
    if (tiles[type].items.length === 0) {
      tiles[type].status = 'skipped'
    }
  }

  return tiles
}

function toLogType(event: BuildProgressEvent): BuildLogEntry['type'] {
  if (event.eventType === 'wiring_error') return 'warning'
  if (event.eventType.endsWith('_error') || event.status === 'error') return 'error'
  if (
    event.eventType === 'build_complete' ||
    event.eventType === 'component_completed' ||
    event.eventType === 'component_reused'
  ) {
    return 'success'
  }
  return 'info'
}

function toLogTimestamp(rawTimestamp: string): string {
  const date = new Date(rawTimestamp)
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('en-US', { hour12: false })
  }
  return date.toLocaleTimeString('en-US', { hour12: false })
}

function pushEvent(ledger: BuildProgressEvent[], event: BuildProgressEvent): BuildProgressEvent[] {
  const prev = ledger[ledger.length - 1]
  if (
    prev?.eventType === event.eventType &&
    prev?.componentId === event.componentId &&
    prev?.status === event.status &&
    prev?.message === event.message
  ) {
    return ledger
  }
  return [...ledger, event]
}

interface PhaseTrackingState {
  currentPhase: BuildPhase | null
  phaseMessage: string | null
  sawDiscoveryComplete: boolean
  sawWiringCompleted: boolean
  sawBuildError: boolean
  sawBuildComplete: boolean
}

interface TileStatusSummary {
  completedCount: number
  failedCount: number
  reusedCount: number
  totalActiveItems: number
  tileReused: number
  tileFailed: number
  tileBuilding: number
  tilePending: number
  tileProgressAccumulator: number
  totalProgressAccumulator: number
  hasMeasuredProgress: boolean
}

interface TileAggregationResult {
  completedCount: number
  failedCount: number
  reusedCount: number
  totalActiveItems: number
  progressAccumulator: number
  hasProgressPercent: boolean
}

interface ProgressSample {
  ts: number
  progress: number | null
  message: string
}

type FinishBuildFn = (success: boolean, errorMessage?: string, event?: BuildProgressEvent) => void

function createPhaseTrackingState(): PhaseTrackingState {
  return {
    currentPhase: null,
    phaseMessage: null,
    sawDiscoveryComplete: false,
    sawWiringCompleted: false,
    sawBuildError: false,
    sawBuildComplete: false
  }
}

function updatePhaseFromEvent(event: BuildProgressEvent, phaseState: PhaseTrackingState): void {
  switch (event.eventType) {
    case 'discovery_started':
      phaseState.currentPhase = 'discovery'
      break
    case 'build_started':
      phaseState.currentPhase = 'building'
      break
    case 'wiring_started':
    case 'wiring_completed':
    case 'wiring_error':
      phaseState.currentPhase = 'wiring'
      break
    case 'build_complete':
      phaseState.currentPhase = 'complete'
      break
  }

  if (event.message) {
    phaseState.phaseMessage = event.message
  }
}

function updatePhaseFlags(event: BuildProgressEvent, phaseState: PhaseTrackingState): void {
  if (event.eventType === 'discovery_complete') phaseState.sawDiscoveryComplete = true
  if (event.eventType === 'wiring_completed') phaseState.sawWiringCompleted = true
  if (event.eventType === 'build_complete') phaseState.sawBuildComplete = true
  if (event.eventType === 'build_error') phaseState.sawBuildError = true
}

function updateTileItem(tiles: TileState, event: BuildProgressEvent, updater: (item: any) => void): void {
  if (!event.componentType || !event.componentId) return
  const tile = tiles[event.componentType]
  if (!tile) return

  const idx = tile.items.findIndex(item => item.id === event.componentId)
  if (idx < 0) return

  const updatedItem = { ...tile.items[idx] }
  updater(updatedItem)
  tile.items[idx] = updatedItem
}

function applyEventToTileState(
  event: BuildProgressEvent,
  tiles: TileState,
  componentProgress: Map<string, number>
): void {
  switch (event.eventType) {
    case 'component_reused':
      updateTileItem(tiles, event, item => {
        item.status = 'reused'
        item.reused = true
        item.createdId = event.createdId
      })
      break
    case 'component_started':
      updateTileItem(tiles, event, item => {
        item.status = 'building'
      })
      break
    case 'component_progress':
      updateTileItem(tiles, event, item => {
        if (DONE_STATUSES.has(item.status) === false) {
          item.status = 'building'
        }
      })
      if (event.componentId && event.progressPercent !== undefined) {
        componentProgress.set(event.componentId, Math.max(0, Math.min(100, event.progressPercent)))
      }
      break
    case 'component_completed':
      updateTileItem(tiles, event, item => {
        item.status = 'completed'
        item.createdId = event.createdId
      })
      break
    case 'component_error':
      updateTileItem(tiles, event, item => {
        item.status = 'error'
        item.error = event.errorDetails || event.message
      })
      break
  }

  if (!event.componentType) return
  const tile = tiles[event.componentType]
  if (!tile) return

  if (event.message) {
    tile.currentOperation = event.message
  }
  if (event.progressPercent !== undefined) {
    tile.progressPercent = event.progressPercent
  }
}

function summarizeTileItems(tile: ComponentTileInfo, componentProgress: Map<string, number>): TileStatusSummary {
  let completedCount = 0
  let failedCount = 0
  let reusedCount = 0
  let totalActiveItems = 0
  let tileReused = 0
  let tileFailed = 0
  let tileBuilding = 0
  let tilePending = 0
  let tileProgressAccumulator = 0
  let totalProgressAccumulator = 0
  let hasMeasuredProgress = false

  for (const item of tile.items) {
    totalActiveItems++

    switch (item.status) {
      case 'completed':
        completedCount++
        tileProgressAccumulator += 100
        totalProgressAccumulator += 100
        break
      case 'reused':
        tileReused++
        reusedCount++
        tileProgressAccumulator += 100
        totalProgressAccumulator += 100
        break
      case 'error':
        tileFailed++
        failedCount++
        tileProgressAccumulator += 100
        totalProgressAccumulator += 100
        break
      case 'building': {
        tileBuilding++
        const measuredProgress = componentProgress.get(item.id)
        if (measuredProgress === undefined) {
          tileProgressAccumulator += 40
          totalProgressAccumulator += 40
          break
        }

        hasMeasuredProgress = true
        tileProgressAccumulator += measuredProgress
        totalProgressAccumulator += measuredProgress
        break
      }
      default:
        tilePending++
    }
  }

  return {
    completedCount,
    failedCount,
    reusedCount,
    totalActiveItems,
    tileReused,
    tileFailed,
    tileBuilding,
    tilePending,
    tileProgressAccumulator,
    totalProgressAccumulator,
    hasMeasuredProgress
  }
}

function applyTileDerivedState(
  tile: ComponentTileInfo,
  summary: TileStatusSummary,
  currentPhase: BuildPhase | null,
  phaseMessage: string | null
): void {
  tile.reusedCount = summary.tileReused
  tile.progressPercent = Math.round(summary.tileProgressAccumulator / tile.items.length)

  if (summary.tileBuilding > 0) {
    tile.status = currentPhase === 'discovery' ? 'discovering' : 'building'
    return
  }

  if (summary.tilePending > 0) {
    tile.status = currentPhase === 'discovery' ? 'discovering' : 'pending'
    if (currentPhase === 'discovery') {
      tile.currentOperation = phaseMessage || 'Discovering reusable resources...'
    }
    return
  }

  if (summary.tileFailed > 0) {
    tile.status = 'error'
    tile.currentOperation = undefined
    return
  }

  tile.status = 'completed'
  tile.currentOperation = undefined
}

function aggregateTiles(
  tiles: TileState,
  componentProgress: Map<string, number>,
  currentPhase: BuildPhase | null,
  phaseMessage: string | null
): TileAggregationResult {
  let completedCount = 0
  let failedCount = 0
  let reusedCount = 0
  let totalActiveItems = 0
  let progressAccumulator = 0
  let hasProgressPercent = false

  for (const type of Object.keys(tiles) as ComponentType[]) {
    const tile = tiles[type]
    if (tile.items.length === 0) {
      tile.status = 'skipped'
      tile.currentOperation = undefined
      tile.progressPercent = 0
      continue
    }

    const summary = summarizeTileItems(tile, componentProgress)
    applyTileDerivedState(tile, summary, currentPhase, phaseMessage)

    completedCount += summary.completedCount
    failedCount += summary.failedCount
    reusedCount += summary.reusedCount
    totalActiveItems += summary.totalActiveItems
    progressAccumulator += summary.totalProgressAccumulator
    hasProgressPercent = hasProgressPercent || summary.hasMeasuredProgress
  }

  return {
    completedCount,
    failedCount,
    reusedCount,
    totalActiveItems,
    progressAccumulator,
    hasProgressPercent
  }
}

function calculateOverallProgress(phaseState: PhaseTrackingState, componentProgressPercent: number): number {
  if (phaseState.sawBuildComplete) return 100
  if (phaseState.currentPhase === 'wiring') return phaseState.sawWiringCompleted ? 96 : 90
  if (phaseState.currentPhase === 'building') return 15 + Math.round(componentProgressPercent * 0.72)
  if (phaseState.currentPhase === 'discovery') return phaseState.sawDiscoveryComplete ? 15 : 5
  if (phaseState.sawBuildError) return Math.min(99, 15 + Math.round(componentProgressPercent * 0.72))
  return 0
}

function toBuildLogs(eventLedger: BuildProgressEvent[]): BuildLogEntry[] {
  return eventLedger
    .filter(event => event.eventType !== 'heartbeat' && Boolean(event.message))
    .slice(-200)
    .map(event => ({
      timestamp: toLogTimestamp(event.timestamp),
      type: toLogType(event),
      message: event.message,
      componentName: event.componentName
    }))
}

export function deriveProgressState(
  plan: BuildPlan | null,
  eventLedger: BuildProgressEvent[],
  agentTileLabels?: { title: string; description: string }
): DerivedProgressState {
  const tiles = createInitialTileState(plan, agentTileLabels)
  const componentProgress = new Map<string, number>()
  const phaseState = createPhaseTrackingState()

  for (const event of eventLedger) {
    const shouldProcessEvent = event.eventType === 'build_complete' || Boolean(event.message)
    if (shouldProcessEvent === false) continue

    updatePhaseFromEvent(event, phaseState)
    updatePhaseFlags(event, phaseState)
    applyEventToTileState(event, tiles, componentProgress)
  }

  const aggregation = aggregateTiles(tiles, componentProgress, phaseState.currentPhase, phaseState.phaseMessage)

  const componentProgressPercent =
    aggregation.totalActiveItems > 0
      ? Math.max(0, Math.min(100, Math.round(aggregation.progressAccumulator / aggregation.totalActiveItems)))
      : 0

  const overallProgress = Math.max(0, Math.min(100, calculateOverallProgress(phaseState, componentProgressPercent)))
  const buildLogs = toBuildLogs(eventLedger)

  return {
    tiles,
    completedCount: aggregation.completedCount,
    failedCount: aggregation.failedCount,
    reusedCount: aggregation.reusedCount,
    currentPhase: phaseState.currentPhase,
    phaseMessage: phaseState.phaseMessage,
    overallProgress,
    buildLogs,
    isProgressEstimated: !phaseState.sawBuildComplete && !aggregation.hasProgressPercent
  }
}

function syncComponentWithPlan(event: BuildProgressEvent, onUpdate: ComponentUpdateFn) {
  if (!event.componentId) return

  if (event.eventType === 'component_started') {
    onUpdate?.(event.componentId, { status: 'building' })
    return
  }
  if (event.eventType === 'component_reused') {
    onUpdate?.(event.componentId, { status: 'reused', createdId: event.createdId, metadata: event.metadata })
    return
  }
  if (event.eventType === 'component_progress') {
    onUpdate?.(event.componentId, { status: 'building', metadata: event.metadata })
    return
  }
  if (event.eventType === 'component_completed') {
    onUpdate?.(event.componentId, { status: 'completed', createdId: event.createdId, metadata: event.metadata })
    return
  }
  if (event.eventType === 'component_error') {
    onUpdate?.(event.componentId, {
      status: 'error',
      errorMessage: event.errorDetails || event.message,
      metadata: event.metadata
    })
  }
}

function getProgressSamplingKey(event: BuildProgressEvent): string {
  return event.componentId || `${event.componentType || 'unknown'}:${event.componentName || 'unknown'}`
}

function getEventTimestampMs(event: BuildProgressEvent): number {
  const parsedTimestamp = Date.parse(event.timestamp || '')
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now()
}

function shouldKeepProgressSample(
  event: BuildProgressEvent,
  previousSample: ProgressSample | undefined,
  currentProgress: number | null,
  currentTimestamp: number
): boolean {
  if (!previousSample) return true

  const timeDelta = currentTimestamp - previousSample.ts
  const progressDelta =
    currentProgress !== null && previousSample.progress !== null
      ? Math.abs(currentProgress - previousSample.progress)
      : 0
  const messageChanged = event.message !== previousSample.message
  const isFinalProgress = currentProgress !== null && currentProgress >= 100

  return isFinalProgress || progressDelta >= 5 || (messageChanged && timeDelta >= 900) || timeDelta >= 1600
}

function sampleComponentProgress(event: BuildProgressEvent, progressSampling: Map<string, ProgressSample>): boolean {
  if (event.eventType !== 'component_progress') return true

  const progressKey = getProgressSamplingKey(event)
  const currentTimestamp = getEventTimestampMs(event)
  const currentProgress = typeof event.progressPercent === 'number' ? event.progressPercent : null
  const previousSample = progressSampling.get(progressKey)
  const shouldKeep = shouldKeepProgressSample(event, previousSample, currentProgress, currentTimestamp)

  if (shouldKeep === false) return false

  progressSampling.set(progressKey, {
    ts: currentTimestamp,
    progress: currentProgress,
    message: event.message || ''
  })

  return true
}

function handleTerminalBuildEvent(event: BuildProgressEvent, finishBuild: FinishBuildFn): void {
  if (event.eventType === 'build_error') {
    const message = event.message || event.errorDetails || 'Build failed'
    finishBuild(false, message)
    return
  }

  if (event.eventType === 'build_complete') {
    finishBuild(true, undefined, event)
  }
}

function toTerminalStatusEvent(
  jobId: string,
  status: BuildJobStatus,
  fallbackErrorMessage: string
): BuildProgressEvent | null {
  if (isCompletedBuildStatus(status.status)) {
    return {
      eventType: 'build_complete',
      jobId,
      timestamp: new Date().toISOString(),
      status: status.status,
      message:
        `Build complete: ${status.completedComponents} completed, ` +
        `${status.failedComponents} failed, ${status.skippedComponents || 0} skipped`,
      totalComponents: status.totalComponents,
      completedComponents: status.completedComponents,
      failedComponents: status.failedComponents,
      skippedComponents: status.skippedComponents
    }
  }

  if (status.status === 'error' || status.status === 'cancelled') {
    return {
      eventType: 'build_error',
      jobId,
      timestamp: new Date().toISOString(),
      status: 'error',
      message: status.errorMessage || fallbackErrorMessage
    }
  }

  return null
}

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
  const [buildDuration, setBuildDuration] = useState(0)
  const [eventLedger, setEventLedger] = useState<BuildProgressEvent[]>([])
  const [wiringWarnings, setWiringWarnings] = useState<string[]>([])
  const [buildSummaryMessage, setBuildSummaryMessage] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const buildStartTimeRef = useRef<number>(0)
  const currentJobIdRef = useRef<string | null>(null)
  const completedCallbackSentRef = useRef(false)
  const onComponentUpdateRef = useRef(onComponentUpdate)
  const onBuildCompleteRef = useRef(onBuildComplete)
  const progressSamplingRef = useRef<Map<string, { ts: number; progress: number | null; message: string }>>(new Map())

  useEffect(() => {
    onComponentUpdateRef.current = onComponentUpdate
  }, [onComponentUpdate])
  useEffect(() => {
    onBuildCompleteRef.current = onBuildComplete
  }, [onBuildComplete])

  const { t } = useTranslation(translations)
  const totalCount = plan?.components.length || 0
  const agentTileLabels = useMemo(
    () => ({ title: t('build-tile-agents-title'), description: t('build-tile-agents-description') }),
    [t]
  )
  const derived = useMemo(
    () => deriveProgressState(plan, eventLedger, agentTileLabels),
    [plan, eventLedger, agentTileLabels]
  )

  const resetState = useCallback(() => {
    setEventLedger([])
    setBuildDuration(0)
    setBuildError(null)
    setWiringWarnings([])
    setBuildSummaryMessage(null)
    completedCallbackSentRef.current = false
    progressSamplingRef.current.clear()
  }, [])

  useEffect(() => {
    const newJobId = plan?.jobId ?? null
    if (currentJobIdRef.current !== newJobId) {
      currentJobIdRef.current = newJobId
      resetState()
      setIsBuilding(false)
    }
  }, [plan?.jobId, resetState])

  const finishBuild = useCallback(
    (success: boolean, errorMessage?: string, event?: BuildProgressEvent) => {
      if (completedCallbackSentRef.current) return
      completedCallbackSentRef.current = true
      setIsBuilding(false)
      if (buildStartTimeRef.current > 0) {
        setBuildDuration(Date.now() - buildStartTimeRef.current)
      }
      if (!success && errorMessage) {
        setBuildError(errorMessage)
        onError?.(errorMessage)
      }
      if (success && event) {
        onBuildCompleteRef.current?.(event)
      }
      onComplete?.(success)
    },
    [onComplete, onError]
  )

  const handleProgressEvent = useCallback(
    (event: BuildProgressEvent) => {
      if (event.eventType === 'heartbeat') return
      const shouldProcessEvent = sampleComponentProgress(event, progressSamplingRef.current)
      if (shouldProcessEvent === false) return

      if (
        (event.eventType === 'wiring_completed' || event.eventType === 'build_complete') &&
        event.wiringWarnings?.length
      ) {
        setWiringWarnings(event.wiringWarnings)
      }

      syncComponentWithPlan(event, onComponentUpdateRef.current)
      setEventLedger(prev => pushEvent(prev, event))
      handleTerminalBuildEvent(event, finishBuild)
    },
    [finishBuild]
  )

  const reconcileAfterStreamEnd = useCallback(async () => {
    if (!plan || completedCallbackSentRef.current) return
    try {
      const status = await client.getJobStatus(plan.jobId)
      const terminalEvent = toTerminalStatusEvent(plan.jobId, status, 'Build failed before completion')
      if (terminalEvent) {
        handleProgressEvent(terminalEvent)
        return
      }

      finishBuild(false, `Build stream ended while status is still '${status.status}'.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build stream ended unexpectedly'
      finishBuild(false, message)
    }
  }, [client, finishBuild, handleProgressEvent, plan])

  const reconcileAfterStreamFailure = useCallback(
    async (streamError: Error) => {
      if (!plan || completedCallbackSentRef.current) {
        finishBuild(false, streamError.message)
        return
      }

      try {
        // Give the backend a brief moment to persist terminal status after a dropped stream.
        await new Promise(resolve => setTimeout(resolve, 1200))
        const status = await client.getJobStatus(plan.jobId)

        const terminalEvent = toTerminalStatusEvent(plan.jobId, status, streamError.message || 'Build failed')
        if (terminalEvent) {
          handleProgressEvent(terminalEvent)
          return
        }

        finishBuild(false, `${streamError.message} (build status: ${status.status})`)
      } catch {
        finishBuild(false, streamError.message)
      }
    },
    [client, finishBuild, handleProgressEvent, plan]
  )

  const startBuild = useCallback(
    async (skipComponents?: string[], sessionId?: string, repoId?: string, createdBy?: ExecuteRequest['createdBy']) => {
      if (!plan) {
        onError?.('No build plan available')
        return
      }

      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
      buildStartTimeRef.current = Date.now()
      completedCallbackSentRef.current = false
      progressSamplingRef.current.clear()
      setIsBuilding(true)
      setBuildError(null)
      setBuildDuration(0)
      setEventLedger([])
      setBuildSummaryMessage(null)

      const request: ExecuteRequest = {
        jobId: plan.jobId,
        skipComponents: skipComponents ?? []
      }
      if (sessionId) request.sessionId = sessionId
      if (repoId) request.repoId = repoId
      if (createdBy) request.createdBy = createdBy

      await client.executeWithProgress(
        plan.jobId,
        request,
        handleProgressEvent,
        error => {
          if (abortControllerRef.current?.signal.aborted) return
          void reconcileAfterStreamFailure(error)
        },
        () => {
          if (abortControllerRef.current?.signal.aborted) return
          void reconcileAfterStreamEnd()
        },
        abortControllerRef.current.signal,
        content => setBuildSummaryMessage(content)
      )
    },
    [client, handleProgressEvent, onError, plan, reconcileAfterStreamEnd, reconcileAfterStreamFailure]
  )

  const startWiringRetry = useCallback(
    async (sessionId?: string, repoId?: string) => {
      if (!plan) {
        onError?.('No build plan available for wiring retry')
        return
      }

      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
      completedCallbackSentRef.current = false
      progressSamplingRef.current.clear()
      setIsBuilding(true)
      setBuildError(null)
      setWiringWarnings([])
      setEventLedger([])
      setBuildSummaryMessage(null)

      await client.executeWiringRetry(plan.jobId, sessionId, repoId, handleProgressEvent, {
        onError: error => {
          if (abortControllerRef.current?.signal.aborted) return
          void reconcileAfterStreamFailure(error)
        },
        onComplete: () => {
          if (abortControllerRef.current?.signal.aborted) return
          void reconcileAfterStreamEnd()
        },
        signal: abortControllerRef.current.signal,
        onResponse: content => setBuildSummaryMessage(content)
      })
    },
    [client, handleProgressEvent, onError, plan, reconcileAfterStreamEnd, reconcileAfterStreamFailure]
  )

  const cancelBuild = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsBuilding(false)
    if (plan) {
      client.cancelBuild(plan.jobId).catch(console.error)
    }
  }, [client, plan])

  const resetProgress = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsBuilding(false)
    resetState()
  }, [resetState])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    isBuilding,
    buildError,
    buildDuration,
    tiles: derived.tiles,
    overallProgress: derived.overallProgress,
    completedCount: derived.completedCount,
    failedCount: derived.failedCount,
    reusedCount: derived.reusedCount,
    totalCount,
    currentPhase: derived.currentPhase,
    phaseMessage: derived.phaseMessage,
    buildLogs: derived.buildLogs,
    isProgressEstimated: derived.isProgressEstimated,
    eventLedger,
    wiringWarnings,
    hasWiringWarnings: wiringWarnings.length > 0,
    buildSummaryMessage,
    startBuild,
    startWiringRetry,
    cancelBuild,
    resetProgress
  }
}

export default useBuildProgress
