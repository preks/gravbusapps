/**
 * DecisionConfigPanel - Configuration for decision nodes with USER/AI/LOGIC modes.
 * Uses the same tab shell and section fragments as TaskConfigPanel.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { Settings2, Users, Filter } from 'lucide-react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import type { DecisionNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../types/studioTypes'
import { AIDecisionConfig } from './decision/AIDecisionConfig'
import { DecisionAssignmentTab } from './decision/DecisionAssignmentTab'
import { DecisionGeneralTab } from './decision/DecisionGeneralTab'
import { DecisionOutcomesSection } from './decision/DecisionOutcomesSection'
import { LogicDecisionConfig } from './decision/LogicDecisionConfig'
import { useDecisionBranchSanitizers } from './decision/useDecisionBranchSanitizers'
import { isApprovalUserDecision } from '../step-picker/decisionUserKind'
import { useEligibleSendBackTargets } from './decision/user/useEligibleSendBackTargets'
import { collectAssignmentPersonFieldOptions } from '../../utils/assignmentPersonFieldUtils'
import { StepConfigTabShell, type StepConfigTabItem } from './shared/StepConfigTabShell'

interface DecisionConfigPanelProps {
  nodeId: string
  config: DecisionNodeConfig
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  'data-testid'?: string
}

export const DecisionConfigPanel: React.FC<DecisionConfigPanelProps> = ({
  nodeId,
  config,
  mode,
  accessToken,
  studioData,
  'data-testid': testId = 'flow-studio-decision-config'
}) => {
  const { t } = useTranslation(translations)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const edges = useFlowStudioStore(s => s.edges)
  const addEdge = useFlowStudioStore(s => s.addEdge)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)
  const requestDeleteEdges = useFlowStudioStore(s => s.requestDeleteEdges)
  const nodes = useFlowStudioStore(s => s.nodes)

  const availableStartFields = useMemo(() => {
    return collectAssignmentPersonFieldOptions({ nodes, edges: edges as any, currentNodeId: nodeId })
  }, [edges, nodeId, nodes])

  const branchEdges = edges.filter(edge => edge.source === nodeId)

  const eligibleSendBackTargets = useMemo(
    () => useEligibleSendBackTargets(nodes as any, edges as any, nodeId),
    [edges, nodeId, nodes]
  )

  const update = useCallback(
    (partial: Partial<DecisionNodeConfig>, options?: FlowStudioUpdateOptions) => {
      updateNodeConfig(nodeId, partial, options)
    },
    [nodeId, updateNodeConfig]
  )

  useDecisionBranchSanitizers(config, update)

  const approvalOutcomesSelected = useMemo(() => isApprovalUserDecision(config), [config])

  useEffect(() => {
    if (approvalOutcomesSelected) return
    const outgoing = edges.filter(edge => edge.source === nodeId)
    const endNodeId = nodes.find(node => node.type === 'end')?.id
    for (const edge of outgoing) {
      const meta: Record<string, unknown> = { ...((edge as { metadata?: Record<string, unknown> }).metadata ?? {}) }
      const hasRework = Boolean(meta.rework)
      const isBackward = String((edge as { direction?: string }).direction || 'forward').toLowerCase() === 'backward'
      if (!hasRework && !isBackward) continue
      const originalTarget = String(
        (meta.rework as { originalTarget?: string } | undefined)?.originalTarget || ''
      ).trim()
      const nextMeta = { ...meta }
      delete nextMeta.rework
      delete nextMeta.reworkReason
      updateEdge(edge.id, {
        direction: 'forward',
        target: originalTarget || edge.target || endNodeId,
        metadata: nextMeta
      })
    }
  }, [approvalOutcomesSelected, edges, nodeId, nodes, updateEdge])

  const syncBranches = useCallback(
    (labels: string[]) => {
      const fallbackTarget =
        nodes.find(node => node.type === 'end' && node.id !== nodeId) ?? nodes.find(node => node.id !== nodeId)
      if (!fallbackTarget) return

      for (let index = 0; index < labels.length; index++) {
        if (index < branchEdges.length) {
          updateEdge(branchEdges[index].id, { label: labels[index] })
        } else {
          addEdge(nodeId, fallbackTarget.id, labels[index])
        }
      }

      const surplus = branchEdges.slice(labels.length).map(edge => edge.id)
      if (surplus.length > 0) requestDeleteEdges(surplus)
    },
    [addEdge, branchEdges, nodeId, nodes, requestDeleteEdges, updateEdge]
  )

  const onUpdateEdgeLabel = useCallback((edgeId: string, label: string) => updateEdge(edgeId, { label }), [updateEdge])

  const outcomesSectionProps = useMemo(
    () => ({
      branchEdges,
      routingBranchEdges: approvalOutcomesSelected ? branchEdges : undefined,
      eligibleSendBackTargets: approvalOutcomesSelected ? eligibleSendBackTargets : undefined,
      syncBranches,
      onUpdateEdgeLabel
    }),
    [approvalOutcomesSelected, branchEdges, eligibleSendBackTargets, onUpdateEdgeLabel, syncBranches]
  )

  const tabs: StepConfigTabItem[] =
    config.decisionMode === 'USER'
      ? [
          {
            id: 'general',
            label: t('config-general'),
            icon: Settings2,
            content: (
              <DecisionGeneralTab
                nodeId={nodeId}
                config={config}
                mode={mode}
                testId={testId}
                studioData={studioData}
                update={update}
                outcomes={outcomesSectionProps}
              />
            )
          },
          {
            id: 'assignment',
            label: t('config-assignment'),
            icon: Users,
            content: (
              <DecisionAssignmentTab
                config={config}
                mode={mode}
                testId={testId}
                accessToken={accessToken}
                availableStartFields={availableStartFields}
                update={update}
              />
            )
          }
        ]
      : config.decisionMode === 'AI'
        ? [
            {
              id: 'general',
              label: t('config-general'),
              icon: Settings2,
              content: (
                <AIDecisionConfig
                  nodeId={nodeId}
                  config={config}
                  update={update}
                  mode={mode}
                  testId={testId}
                  accessToken={accessToken}
                  studioData={studioData}
                  availableStartFields={availableStartFields}
                  outcomes={outcomesSectionProps}
                />
              )
            }
          ]
        : config.decisionMode === 'LOGIC'
          ? [
              {
                id: 'general',
                label: t('config-general'),
                icon: Settings2,
                content: (
                  <div className="gba:flex gba:flex-col gba:gap-4">
                    <DecisionOutcomesSection
                      config={config}
                      mode={mode}
                      testId={testId}
                      update={update}
                      {...outcomesSectionProps}
                      routingBranchEdges={undefined}
                      eligibleSendBackTargets={undefined}
                    />
                  </div>
                )
              },
              {
                id: 'conditions',
                label: t('config-conditions'),
                icon: Filter,
                content: <LogicDecisionConfig config={config} update={update} mode={mode} testId={testId} />
              }
            ]
          : []

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <StepConfigTabShell tabs={tabs} testId={testId} defaultTabId="general" />
    </div>
  )
}
