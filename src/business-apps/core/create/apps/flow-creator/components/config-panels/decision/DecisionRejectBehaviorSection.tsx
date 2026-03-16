import React, { useCallback, useMemo } from 'react'
import { useFlowStudioStore } from '../../../hooks/useFlowStudioStore'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import { RejectBehaviorSection, type RejectReworkConfig } from './RejectBehaviorSection'

interface DecisionRejectBehaviorSectionProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  nodeId: string
  branchEdges: Array<{ id: string; source: string; target: string; label?: string }>
  eligibleSendBackTargets: Array<{ id: string; label: string }>
}

export const DecisionRejectBehaviorSection: React.FC<DecisionRejectBehaviorSectionProps> = ({
  config,
  update,
  mode,
  testId,
  branchEdges,
  eligibleSendBackTargets
}) => {
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)

  const rejectEdge = useMemo(
    () =>
      branchEdges.find(
        e =>
          String(e.label || '')
            .trim()
            .toLowerCase() === 'reject'
      ) ?? branchEdges[1],
    [branchEdges]
  )

  const endNodeId = useMemo(() => nodes.find(n => n.type === 'end')?.id, [nodes])

  const rework: RejectReworkConfig | undefined = (config.rejectRework ?? (config.userConfig as any)?.rejectRework) as
    | RejectReworkConfig
    | undefined
  const enabled = Boolean(rework)
  const selectedTargetId = rework?.targetNodeId

  const applyRejectEdge = useCallback(
    (nextEnabled: boolean, nextRework?: RejectReworkConfig) => {
      if (!rejectEdge?.id) return

      const rejectEdgeFull = edges.find(e => e.id === rejectEdge.id)
      const meta: any = { ...(rejectEdgeFull as any)?.metadata }

      const previous = meta?.rework && typeof meta.rework === 'object' ? meta.rework : {}

      if (!nextEnabled) {
        const restoreTarget =
          String(previous?.originalTarget || '').trim() || String(rejectEdgeFull?.target || '').trim() || endNodeId
        const nextMeta = { ...meta }
        if (nextMeta?.rework) delete nextMeta.rework
        updateEdge(rejectEdge.id, { direction: 'forward', target: restoreTarget, metadata: nextMeta })
        return
      }

      const target = String(nextRework?.targetNodeId || '').trim()
      if (!target) return

      const currentDirection = String((rejectEdgeFull as any)?.direction || 'forward').toLowerCase()
      const originalTarget =
        String(previous?.originalTarget || '').trim() ||
        (currentDirection !== 'backward' ? String(rejectEdgeFull?.target || '').trim() : '')

      updateEdge(rejectEdge.id, {
        direction: 'backward',
        target,
        metadata: {
          ...meta,
          reworkReason: 'Rejected',
          rework: {
            originalTarget,
            targetNodeId: target,
            requireReason: nextRework?.requireReason ?? false,
            preserveData: nextRework?.preserveData ?? true,
            maxIterations: nextRework?.maxIterations
          }
        }
      })
    },
    [edges, endNodeId, rejectEdge?.id, updateEdge]
  )

  const updateRejectRework = useCallback(
    (partial: Partial<RejectReworkConfig>) => {
      const base = (rework ?? { requireReason: false, preserveData: true }) as RejectReworkConfig
      const next = { ...base, ...partial }
      update({ rejectRework: next } as any)
      if (config.decisionMode === 'USER' && config.userConfig) {
        update({ userConfig: { ...(config.userConfig as any), rejectRework: next } as any })
      }
      applyRejectEdge(true, next)
    },
    [applyRejectEdge, config.decisionMode, config.userConfig, rework, update]
  )

  return (
    <RejectBehaviorSection
      mode={mode}
      enabled={enabled}
      disabled={!rejectEdge?.id || eligibleSendBackTargets.length === 0}
      selectedTargetId={selectedTargetId}
      eligibleTargets={eligibleSendBackTargets}
      rework={rework}
      onToggle={checked => {
        if (!checked) {
          update({ rejectRework: undefined } as any)
          if (config.decisionMode === 'USER' && config.userConfig) {
            update({ userConfig: { ...(config.userConfig as any), rejectRework: undefined } as any })
          }
          applyRejectEdge(false)
          return
        }
        const defaultTarget = selectedTargetId ?? eligibleSendBackTargets[eligibleSendBackTargets.length - 1]?.id
        const next: RejectReworkConfig = { targetNodeId: defaultTarget, requireReason: false, preserveData: true }
        update({ rejectRework: next } as any)
        if (config.decisionMode === 'USER' && config.userConfig) {
          update({ userConfig: { ...(config.userConfig as any), rejectRework: next } as any })
        }
        applyRejectEdge(true, next)
      }}
      onChangeTarget={v => updateRejectRework({ targetNodeId: v })}
      onChangeRequireReason={checked => updateRejectRework({ requireReason: checked })}
      onChangePreserveData={checked => updateRejectRework({ preserveData: checked })}
      onChangeMaxIterations={v => updateRejectRework({ maxIterations: v })}
      data-testid={`${testId}-reject-send-back`}
    />
  )
}
