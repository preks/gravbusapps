// Animated Flow Map for a single Custom Flow Engine workflow triggered by a
// workforce run. Renders the flow as a diagram (reusing the shared FlowViewer
// pipeline), colours nodes by live status, highlights the current step and the
// path taken, and offers a replay of that path plus a fullscreen mode.

import { ArrowsInIcon, ArrowsOutIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { ReadonlyTemplateFlowCanvas } from '@/common/components/flow/ReadonlyTemplateFlowCanvas'

import { labelForStatusCode, STATUS_BADGE_CLASS, variantForStatusCode } from '../../../utils/actionCardTrace'
import { FlowLiveBadge } from './FlowLiveBadge'
import { FlowMapLegend } from './FlowMapLegend'
import { FlowMapReplayControls } from './FlowMapReplayControls'
import { FlowProgressBar } from './FlowProgressBar'
import { WorkforceFlowMapStepDetail } from './WorkforceFlowMapStepDetail'
import { progressSummary } from './flowStepFormat'
import { useFlowExecutionState } from './useFlowExecutionState'
import { useFlowReplay } from './useFlowReplay'

export interface WorkforceFlowMapProps {
  workflowId?: string
  templateId?: string
  workflowName: string
  accessToken?: string
  succeeded?: boolean
}

const StatusPill: React.FC<{ code: string; showPulse?: boolean }> = ({ code, showPulse = true }) => {
  const variant = variantForStatusCode(code)
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${STATUS_BADGE_CLASS[variant]}`}
      data-testid="flow-map-status"
      data-status-code={code}
    >
      {showPulse && variant === 'running' && (
        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
      )}
      {labelForStatusCode(code)}
    </span>
  )
}

export const WorkforceFlowMap: React.FC<WorkforceFlowMapProps> = ({
  workflowId,
  templateId,
  workflowName,
  accessToken,
  succeeded
}) => {
  const initialCode = succeeded === false ? 'FAILED' : 'RUNNING'
  const { overview, status, executionState } = useFlowExecutionState({
    workflowId,
    accessToken,
    initialStatus: {
      code: initialCode,
      label: labelForStatusCode(initialCode),
      variant: variantForStatusCode(initialCode)
    },
    enabled: Boolean(workflowId)
  })
  const replay = useFlowReplay(overview)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), [])
  const closeStepDetail = useCallback(() => setSelectedNodeId(null), [])

  useEffect(() => {
    if (!isFullscreen && !selectedNodeId) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (selectedNodeId) {
        setSelectedNodeId(null)
        return
      }
      setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen, selectedNodeId])

  // Show the replay frame while the user is actively replaying; otherwise the
  // live execution state (the terminal replay frame matches it, so the handover
  // is seamless once playback finishes).
  const isReplayingActive = replay.frameCount > 0 && (replay.isPlaying || replay.frameIndex < replay.frameCount - 1)
  const activeExecutionState = isReplayingActive && replay.frame ? replay.frame : executionState

  const isComplete = status.variant === 'success'
  const isLive = status.variant === 'running'
  const progress = overview?.progress
  const stepLabel = useMemo(() => {
    if (isReplayingActive) {
      const suffix = replay.currentStepTitle ? ` \u00b7 ${replay.currentStepTitle}` : ''
      return `Step ${replay.frameIndex + 1} of ${replay.frameCount}${suffix}`
    }
    return progressSummary(
      progress?.currentStep,
      progress?.totalSteps,
      progress?.completedSteps,
      progress?.percentage,
      isComplete
    )
  }, [isReplayingActive, replay.currentStepTitle, replay.frameIndex, replay.frameCount, progress, isComplete])

  const description = isReplayingActive
    ? 'Replaying the path this flow took'
    : isComplete
      ? 'Completed execution path'
      : 'Live execution path'

  const summaryCard = (
    <div
      className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:space-y-2"
      data-testid="flow-map-summary"
    >
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <div className="gba:min-w-0">
          <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{workflowName}</p>
          <p className="gba:text-[11px] gba:text-muted-foreground">{description}</p>
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          {isLive && <FlowLiveBadge />}
          <StatusPill code={status.code} showPulse={false} />
        </div>
      </div>
      {progress?.totalSteps ? (
        <FlowProgressBar
          completedSteps={progress.completedSteps}
          totalSteps={progress.totalSteps}
          percentage={progress.percentage}
          variant={status.variant}
          isComplete={isComplete}
        />
      ) : null}
    </div>
  )

  const toolbar = (
    <>
      <div className="gba:pointer-events-auto gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2">
        {isLive && <FlowLiveBadge label="Updating" />}
        <StatusPill code={status.code} />
        {stepLabel && (
          <span className="gba:truncate gba:text-xs gba:text-muted-foreground" data-testid="flow-map-step-label">
            {stepLabel}
          </span>
        )}
      </div>
      <div className="gba:pointer-events-auto gba:flex gba:flex-wrap gba:items-center gba:justify-end gba:gap-3">
        {replay.hasReplay && <FlowMapReplayControls replay={replay} />}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:bg-card gba:text-foreground gba:transition-colors gba:hover:bg-muted"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
          data-testid="flow-map-fullscreen-toggle"
        >
          {isFullscreen ? <ArrowsInIcon className="gba:h-4 gba:w-4" /> : <ArrowsOutIcon className="gba:h-4 gba:w-4" />}
        </button>
      </div>
    </>
  )

  const commonCanvasProps = {
    accessToken: accessToken ?? '',
    templateId: templateId ?? null,
    title: workflowName,
    description,
    emptyTitle: 'Flow map unavailable',
    emptyDescription: 'This workflow has no template reference, so its diagram cannot be shown.',
    executionState: activeExecutionState,
    selectedNodeId,
    onNodeSelect: setSelectedNodeId,
    minZoom: 0.15,
    showMiniMap: true,
    showControls: true,
    'data-testid': 'flow-map-canvas'
  } as const

  const stepDetail = selectedNodeId ? (
    <WorkforceFlowMapStepDetail
      nodeId={selectedNodeId}
      steps={overview?.steps ?? []}
      workflowId={workflowId}
      accessToken={accessToken}
      onClose={closeStepDetail}
    />
  ) : null

  // `hideHeader` puts the canvas in full-bleed mode (inner div uses h-full), so
  // the Card itself must stretch to the fixed-height wrapper below; otherwise
  // the React Flow container collapses to 0px and renders nothing.
  const canvas = (
    <ReadonlyTemplateFlowCanvas
      {...commonCanvasProps}
      hideHeader
      className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden gba:border gba:border-border gba:bg-card"
    />
  )

  // In fullscreen the canvas is full-bleed: hide the card header and drop the
  // border/background so the flow reaches the very top, visible behind the
  // transparent floating toolbar.
  const fullscreenCanvas = (
    <ReadonlyTemplateFlowCanvas
      {...commonCanvasProps}
      hideHeader
      className="gba:flex gba:h-full gba:flex-col gba:overflow-hidden gba:border-0 gba:bg-card"
    />
  )

  // Fullscreen: the canvas fills the whole viewport and the chrome (toolbar +
  // legend) floats on top as a transparent, click-through overlay, so the flow
  // is visible behind the header instead of being pushed below it. Only the
  // interactive controls capture clicks; the rest passes through to the canvas.
  if (isFullscreen && typeof document !== 'undefined') {
    const overlay = (
      <div
        className="gba:fixed gba:inset-0 gba:z-[60] gba:bg-background"
        data-testid="workforce-flow-map"
        data-fullscreen="true"
      >
        <div className="gba:absolute gba:inset-0">{fullscreenCanvas}</div>
        <div className="gba:pointer-events-none gba:absolute gba:inset-x-0 gba:top-0 gba:z-10 gba:flex gba:flex-col gba:gap-2 gba:p-4">
          <div className="gba:pointer-events-auto">{summaryCard}</div>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">{toolbar}</div>
          <div className="gba:pointer-events-auto gba:w-fit">
            <FlowMapLegend />
          </div>
        </div>
        {stepDetail && (
          <div className="gba:pointer-events-none gba:absolute gba:bottom-4 gba:right-4 gba:top-4 gba:z-20 gba:flex">
            {stepDetail}
          </div>
        )}
      </div>
    )
    // Portal to the document body so no ancestor stacking context (transformed /
    // overflow-clipped parents in the run detail layout) can clip it or trap it
    // beneath the platform navigation.
    return createPortal(overlay, document.body)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid="workforce-flow-map" data-fullscreen="false">
      {summaryCard}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">{toolbar}</div>
      <FlowMapLegend />
      <div className="gba:relative gba:h-[560px]">
        {canvas}
        {stepDetail && (
          <div className="gba:pointer-events-none gba:absolute gba:bottom-3 gba:right-3 gba:top-3 gba:z-20 gba:flex">
            {stepDetail}
          </div>
        )}
      </div>
    </div>
  )
}
