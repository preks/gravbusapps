// Drives a step-by-step "replay" of the path a flow took, for the workforce
// Flow Map. From the polled overview it derives the ordered list of steps that
// actually ran (completed / active / failed) and synthesises one
// FlowExecutionState frame per step, so the map can animate from start to the
// current step and show which branch was taken. A final frame reflects the
// terminal / live state.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { mapStepStatusToExecutionStatus } from '@/common/components/flow/flow-detail/utils'
import { stepIndexToFlowNodeId } from '@/common/data/flow/templateToFlowGraph'
import type { FlowExecutionState, StepStatus } from '@/common/components/flow/flow-viewer/types/viewerTypes'

import { isTerminalFlowStatus } from '../../../utils/flowEngineShared'
import type { FlowDetailOverview } from './flowDetailTypes'

const BASE_FRAME_INTERVAL_MS = 1_100
export const REPLAY_SPEEDS = [0.5, 1, 2] as const
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

interface ReplayStep {
  stepIndex: number
  nodeId: string
  title: string
  status: StepStatus
}

export interface FlowReplayController {
  /** Execution state for the current frame, or null when there is nothing to replay. */
  frame: FlowExecutionState | null
  /** Whether a meaningful replay exists (more than one executed step). */
  hasReplay: boolean
  frameIndex: number
  frameCount: number
  isPlaying: boolean
  /** Title of the step the current frame focuses on (undefined on the terminal frame). */
  currentStepTitle: string | undefined
  speed: ReplaySpeed
  play: () => void
  pause: () => void
  toggle: () => void
  restart: () => void
  stepForward: () => void
  stepBack: () => void
  seek: (index: number) => void
  setSpeed: (speed: ReplaySpeed) => void
}

const RAN_STATUSES: ReadonlySet<StepStatus> = new Set<StepStatus>(['completed', 'active', 'failed'])

function parseTime(value: string | null | undefined): number {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

function buildReplaySteps(overview: FlowDetailOverview | null): ReplayStep[] {
  if (!overview) return []
  const ran = overview.steps
    .map(step => ({ step, status: mapStepStatusToExecutionStatus(step.status) }))
    .filter(entry => RAN_STATUSES.has(entry.status))

  ran.sort((a, b) => {
    const ta = parseTime(a.step.completedAt ?? a.step.startedAt ?? a.step.claimedAt)
    const tb = parseTime(b.step.completedAt ?? b.step.startedAt ?? b.step.claimedAt)
    if (ta !== tb) return ta - tb
    return a.step.stepIndex - b.step.stepIndex
  })

  return ran.map(entry => ({
    stepIndex: entry.step.stepIndex,
    nodeId: stepIndexToFlowNodeId(entry.step.stepIndex),
    title: entry.step.title,
    status: entry.status
  }))
}

function buildFrames(steps: ReplayStep[], overview: FlowDetailOverview | null): FlowExecutionState[] {
  if (steps.length === 0) return []

  const frames: FlowExecutionState[] = []

  for (let focus = 0; focus < steps.length; focus += 1) {
    const nodeStates: Record<string, StepStatus> = { start: 'completed' }
    steps.forEach((step, index) => {
      if (index < focus) nodeStates[step.nodeId] = step.status === 'failed' ? 'failed' : 'completed'
      else if (index === focus) nodeStates[step.nodeId] = 'active'
      else nodeStates[step.nodeId] = 'pending'
    })
    frames.push({ nodeStates, activeNodeId: steps[focus].nodeId })
  }

  // Terminal frame: every executed step in its final state, end node lit when
  // the workflow finished, no active node once it is terminal.
  const terminalStates: Record<string, StepStatus> = { start: 'completed' }
  steps.forEach(step => {
    terminalStates[step.nodeId] = step.status === 'failed' ? 'failed' : 'completed'
  })
  const isTerminal = isTerminalFlowStatus(overview?.status)
  if (isTerminal) {
    terminalStates.end = (overview?.status ?? '').toUpperCase() === 'COMPLETED' ? 'completed' : 'failed'
  }
  const stillActive = steps.find(step => step.status === 'active')
  frames.push({ nodeStates: terminalStates, activeNodeId: isTerminal ? undefined : stillActive?.nodeId })

  return frames
}

export function useFlowReplay(overview: FlowDetailOverview | null): FlowReplayController {
  const steps = useMemo(() => buildReplaySteps(overview), [overview])
  const frames = useMemo(() => buildFrames(steps, overview), [steps, overview])
  const frameCount = frames.length

  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<ReplaySpeed>(1)
  // Until the user actively plays / steps / seeks, the map should show the final
  // state (the full route bold), not the first frame. Playback only takes over
  // once the user engages it.
  const [hasEngaged, setHasEngaged] = useState(false)

  // Reset playback when a different workflow is shown.
  const workflowId = overview?.id ?? null
  const prevWorkflowIdRef = useRef<string | null>(workflowId)
  useEffect(() => {
    if (prevWorkflowIdRef.current !== workflowId) {
      prevWorkflowIdRef.current = workflowId
      setFrameIndex(0)
      setIsPlaying(false)
      setHasEngaged(false)
    }
  }, [workflowId])

  // Before the user engages playback, park the position on the terminal frame so
  // the default view is the finished flow. Also tracks the latest frame as live
  // polling appends more.
  useEffect(() => {
    if (!hasEngaged && frameCount > 0) {
      setFrameIndex(frameCount - 1)
    }
  }, [hasEngaged, frameCount])

  // Keep the index valid as live polling appends frames.
  const clampedIndex = frameCount === 0 ? 0 : Math.min(frameIndex, frameCount - 1)

  useEffect(() => {
    if (!isPlaying || frameCount === 0) return
    const interval = window.setInterval(() => {
      setFrameIndex(prev => {
        const next = prev + 1
        if (next >= frameCount - 1) {
          setIsPlaying(false)
          return frameCount - 1
        }
        return next
      })
    }, BASE_FRAME_INTERVAL_MS / speed)
    return () => window.clearInterval(interval)
  }, [isPlaying, frameCount, speed])

  const play = useCallback(() => {
    if (frameCount === 0) return
    setHasEngaged(true)
    setFrameIndex(prev => (prev >= frameCount - 1 ? 0 : prev))
    setIsPlaying(true)
  }, [frameCount])

  const pause = useCallback(() => setIsPlaying(false), [])
  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else play()
  }, [isPlaying, pause, play])

  const restart = useCallback(() => {
    if (frameCount === 0) return
    setHasEngaged(true)
    setFrameIndex(0)
    setIsPlaying(true)
  }, [frameCount])

  const stepForward = useCallback(() => {
    setHasEngaged(true)
    setIsPlaying(false)
    setFrameIndex(prev => (frameCount === 0 ? 0 : Math.min(prev + 1, frameCount - 1)))
  }, [frameCount])

  const stepBack = useCallback(() => {
    setHasEngaged(true)
    setIsPlaying(false)
    setFrameIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const seek = useCallback(
    (index: number) => {
      setHasEngaged(true)
      setIsPlaying(false)
      setFrameIndex(frameCount === 0 ? 0 : Math.max(0, Math.min(index, frameCount - 1)))
    },
    [frameCount]
  )

  const currentStepTitle = clampedIndex < steps.length ? steps[clampedIndex]?.title : undefined

  return {
    frame: frameCount === 0 ? null : frames[clampedIndex],
    hasReplay: steps.length > 1,
    frameIndex: clampedIndex,
    frameCount,
    isPlaying,
    currentStepTitle,
    speed,
    play,
    pause,
    toggle,
    restart,
    stepForward,
    stepBack,
    seek,
    setSpeed
  }
}
