/**
 * DecisionConfigPanel - Configuration for decision nodes with USER/AI/LOGIC tabs.
 * Simple mode: policy picker for AI decisions.
 * Advanced mode: full prompt config, custom expressions.
 */

import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Textarea,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Bot,
  GitBranch,
  Plus,
  Trash2,
  User,
  Brain,
  Sparkles,
  Code,
  ChevronsUpDown,
  Check,
  FileText,
  Loader2
} from 'lucide-react'
import { v4 as uuid } from 'uuid'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import { useStudioExpressionSuggestions } from '../../hooks/useStudioExpressionSuggestions'
import { DecisionAIBanner } from './decision/DecisionAIBanner'
import { ExpressionEditor } from '@/common/components/flow/expression-editor'
import type { ExpressionSuggestionItem, ExpressionValueType } from '@/common/components/flow/expression-editor'
import type {
  DecisionNodeConfig,
  DecisionBranch,
  DesignerMode,
  DecisionMode,
  UserDecisionType,
  EscalationConfig
} from '../../types/studioTypes'
import { AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { AssignmentSelector } from '@/components/assignment-selector/AssignmentSelector'
import type { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { isPolicyContentEntry } from '@/business-apps/core/content/utils/policyUtils'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../utils/neutralSwitchClassName'

const MODE_ICONS: Record<DecisionMode, React.ElementType> = {
  USER: User,
  AI: Sparkles,
  LOGIC: Code
}

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
  const requestDeleteEdge = useFlowStudioStore(s => s.requestDeleteEdge)
  const requestDeleteEdges = useFlowStudioStore(s => s.requestDeleteEdges)
  const nodes = useFlowStudioStore(s => s.nodes)
  // Branches are the canonical outgoing edges of the decision.
  // Some branches can be "backward" (send-back / rework).
  const branchEdges = edges.filter(edge => edge.source === nodeId)

  const update = useCallback(
    (partial: Partial<DecisionNodeConfig>) => {
      updateNodeConfig(nodeId, partial)
    },
    [nodeId, updateNodeConfig]
  )

  const handleModeChange = useCallback(
    (newMode: string) => {
      update({ decisionMode: newMode as DecisionMode })
    },
    [update]
  )

  const isUserApproval =
    config.decisionMode === 'USER' && (config.userConfig?.userDecisionType ?? 'APPROVAL') === 'APPROVAL'

  /**
   * Sync branch edges to match a desired set of labels.
   * - Reuses existing edges (updates labels)
   * - Adds missing edges to the end node (or first non-self node)
   * - Removes surplus edges
   */
  const syncBranches = useCallback(
    (labels: string[]) => {
      const fallbackTarget = nodes.find(n => n.type === 'end' && n.id !== nodeId) ?? nodes.find(n => n.id !== nodeId)
      if (!fallbackTarget) return

      // Update existing, add missing
      for (let i = 0; i < labels.length; i++) {
        if (i < branchEdges.length) {
          // Update label on existing edge
          updateEdge(branchEdges[i].id, { label: labels[i] })
        } else {
          // Add a new edge
          addEdge(nodeId, fallbackTarget.id, labels[i])
        }
      }
      // Remove surplus edges (from the end) with a warning if steps would be removed.
      const surplus = branchEdges.slice(labels.length).map(e => e.id)
      if (surplus.length > 0) requestDeleteEdges(surplus)
    },
    [addEdge, branchEdges, nodeId, nodes, requestDeleteEdges, updateEdge]
  )

  // Branch management (for non-USER or CUSTOM modes)
  const addBranch = useCallback(() => {
    const fallbackTarget = nodes.find(n => n.type === 'end' && n.id !== nodeId) ?? nodes.find(n => n.id !== nodeId)
    if (!fallbackTarget) return
    addEdge(nodeId, fallbackTarget.id, `Branch ${branchEdges.length + 1}`)
  }, [addEdge, branchEdges.length, nodeId, nodes])

  const updateBranch = useCallback(
    (edgeId: string, partial: Partial<DecisionBranch>) => {
      const edge = branchEdges.find(item => item.id === edgeId)
      if (!edge) return
      updateEdge(edgeId, {
        ...(partial.label === undefined ? {} : { label: partial.label }),
        ...(partial.targetNodeId === undefined ? {} : { target: partial.targetNodeId }),
        ...(partial.condition === undefined
          ? {}
          : {
              metadata: {
                ...edge.metadata,
                condition: partial.condition
              }
            })
      })
    },
    [branchEdges, updateEdge]
  )

  const removeBranch = useCallback(
    (edgeId: string) => {
      if (branchEdges.length <= 2) return
      requestDeleteEdge(edgeId)
    },
    [branchEdges.length, requestDeleteEdge]
  )

  // Whether branches are locked (USER Approval = fixed Approve/Reject)
  const branchesLocked = isUserApproval

  // Available decision modes for mode toggle
  const availableModes: DecisionMode[] = ['USER', 'AI', 'LOGIC']

  const header = useMemo(() => {
    if (config.decisionMode === 'AI') {
      return {
        Icon: Sparkles,
        bg: 'gba:bg-muted',
        fg: 'gba:text-foreground',
        title: 'AI Decision'
      }
    }
    if (config.decisionMode === 'LOGIC') {
      return {
        Icon: Code,
        bg: 'gba:bg-muted',
        fg: 'gba:text-foreground',
        title: 'Logic Decision'
      }
    }
    return {
      Icon: GitBranch,
      bg: 'gba:bg-muted',
      fg: 'gba:text-foreground',
      title: 'User Decision'
    }
  }, [config.decisionMode])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-3 gba:border-b gba:border-border gba:bg-background">
        <div className={`gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md ${header.bg}`}>
          <header.Icon className={`gba:h-4 gba:w-4 ${header.fg}`} />
        </div>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{header.title}</h3>
      </div>

      {/* Decision Mode Tabs */}
      <Tabs
        value={config.decisionMode}
        onValueChange={handleModeChange}
        className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden"
      >
        <div className="gba:px-5 gba:pt-3">
          <TabsList className="gba:w-full gba:bg-muted gba:p-1 gba:rounded-lg">
            {availableModes.map(dm => {
              const Icon = MODE_ICONS[dm]
              const isActive = config.decisionMode === dm
              return (
                <TabsTrigger
                  key={dm}
                  value={dm}
                  startIcon={<Icon className="gba:h-3.5 gba:w-3.5" />}
                  className={
                    isActive
                      ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                      : 'gba:text-muted-foreground'
                  }
                  data-testid={`${testId}-mode-${dm.toLowerCase()}`}
                >
                  {t(`decision-mode-${dm.toLowerCase()}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        <div className="gba:flex-1 gba:overflow-y-auto gba:p-5">
          {/* USER Mode */}
          <TabsContent value="USER" className="gba:flex gba:flex-col gba:gap-4 gba:mt-0">
            <UserDecisionConfig
              config={config}
              update={update}
              mode={mode}
              testId={testId}
              accessToken={accessToken}
              branchEdges={branchEdges}
              nodeId={nodeId}
              syncBranches={syncBranches}
            />
          </TabsContent>

          {/* AI Mode */}
          <TabsContent value="AI" className="gba:flex gba:flex-col gba:gap-4 gba:mt-0">
            <DecisionAIBanner mode={mode} data-testid={`${testId}-ai-banner`} />
            <AIDecisionConfig
              config={config}
              update={update}
              mode={mode}
              testId={testId}
              accessToken={accessToken}
              studioData={studioData}
            />
          </TabsContent>

          {/* LOGIC Mode */}
          <TabsContent value="LOGIC" className="gba:flex gba:flex-col gba:gap-4 gba:mt-0">
            <LogicDecisionConfig config={config} update={update} mode={mode} testId={testId} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Branches (always visible) */}
      <div className="gba:border-t gba:border-border gba:p-5 gba:bg-background">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <Label className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-foreground">
            {t('config-branches')} ({branchEdges.length})
          </Label>
          {!branchesLocked && (
            <Button variant="ghost" size="sm" onClick={addBranch} data-testid={`${testId}-add-branch`}>
              <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
              {t('decision-branch-add')}
            </Button>
          )}
        </div>

        {branchesLocked && (
          <p className="gba:text-[11px] gba:text-muted-foreground gba:mb-2">
            Branches are managed by the Approval decision type.
          </p>
        )}

        <div className="gba:flex gba:flex-col gba:gap-2 gba:max-h-[200px] gba:overflow-y-auto">
          {branchEdges.map((branch, index) => {
            const branchColorClass = getBranchColorClass(branchesLocked, index)
            return (
              <div
                key={branch.id}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={`${testId}-branch-${index}`}
              >
                <div
                  className={`gba:w-5 gba:h-5 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-bold gba:flex-shrink-0 ${branchColorClass}`}
                >
                  {index + 1}
                </div>
                {branchesLocked ? (
                  <span className="gba:flex-1 gba:text-xs gba:font-medium gba:text-foreground gba:px-2 gba:py-1.5">
                    {branch.label ?? `Branch ${index + 1}`}
                  </span>
                ) : (
                  <Input
                    value={branch.label ?? ''}
                    onChange={e => updateBranch(branch.id, { label: e.target.value })}
                    className="gba:flex-1 gba:h-8 gba:text-xs"
                    data-testid={`${testId}-branch-label-${index}`}
                  />
                )}
                <Select value={branch.target} onValueChange={v => updateBranch(branch.id, { targetNodeId: v })}>
                  <SelectTrigger className="gba:w-[120px] gba:h-8 gba:text-xs">
                    <SelectValue placeholder="Target" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes
                      .filter(n => n.id !== nodeId && n.type !== 'start')
                      .map(n => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!branchesLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBranch(branch.id)}
                    disabled={branchEdges.length <= 2}
                    data-testid={`${testId}-branch-remove-${index}`}
                  >
                    <Trash2 className="gba:h-3 gba:w-3" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---- Sub-components for each decision mode ----

function getBranchColorClass(branchesLocked: boolean, index: number): string {
  if (branchesLocked && index === 0) return 'gba:bg-success-secondary gba:text-success-secondary-foreground'
  if (branchesLocked && index === 1) return 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground'
  return 'gba:bg-accent gba:text-accent-foreground'
}

interface UserDecisionConfigProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  accessToken: string
  /** Edge management for syncing branches with options */
  branchEdges: Array<{ id: string; source: string; target: string; label?: string }>
  nodeId: string
  syncBranches: (labels: string[]) => void
}

interface AIDecisionConfigProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  accessToken: string
  studioData: FlowStudioData
}

const UserDecisionConfig: React.FC<UserDecisionConfigProps> = ({
  config,
  update,
  mode,
  testId,
  branchEdges,
  nodeId,
  syncBranches,
  accessToken
}) => {
  const { t } = useTranslation(translations)
  const decisionType = config.userConfig?.userDecisionType ?? 'APPROVAL'
  const isApproval = decisionType === 'APPROVAL'
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const updateEdge = useFlowStudioStore(s => s.updateEdge)

  const eligibleSendBackTargets = useMemo(() => {
    const forwardEdges = edges.filter(e => String((e as any).direction ?? 'forward').toLowerCase() === 'forward')
    const nextBySource = new Map<string, string[]>()
    for (const edge of forwardEdges) {
      nextBySource.set(edge.source, [...(nextBySource.get(edge.source) ?? []), edge.target])
    }
    const order: string[] = []
    const visited = new Set<string>()
    const start = nodes.find(n => n.type === 'start')?.id
    const queue = [start].filter(Boolean) as string[]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      order.push(current)
      for (const next of nextBySource.get(current) ?? []) queue.push(next)
    }
    const indexById = new Map(order.map((id, i) => [id, i] as const))
    const decisionIndex = indexById.get(nodeId) ?? Number.MAX_SAFE_INTEGER

    return nodes
      .filter(n => n.type === 'task')
      .map(n => ({ id: n.id, label: n.label }))
      .filter(t => (indexById.get(t.id) ?? Number.MAX_SAFE_INTEGER) < decisionIndex)
  }, [edges, nodeId, nodes])

  const applyUserDecisionType = useCallback(
    (value: string) => {
      const userDecisionType = value as UserDecisionType
      const nonApprovalOptions = config.userConfig?.options?.length
        ? config.userConfig.options
        : [
            { id: uuid(), label: 'Option 1' },
            { id: uuid(), label: 'Option 2' }
          ]
      const defaultOptions =
        userDecisionType === 'APPROVAL'
          ? [
              { id: 'approve', label: 'Approve' },
              { id: 'reject', label: 'Reject' }
            ]
          : nonApprovalOptions

      update({
        userConfig: {
          assignment: config.userConfig?.assignment ?? { targets: null, assignmentMode: AssignmentMode.CLAIM },
          timeoutMinutes: config.userConfig?.timeoutMinutes,
          escalation: config.userConfig?.escalation,
          userDecisionType,
          options: defaultOptions
        }
      })

      // Sync branch edges to match options
      syncBranches(defaultOptions.map(o => o.label))
    },
    [config.userConfig, update, syncBranches]
  )

  const updateCustomOption = useCallback(
    (index: number, label: string) => {
      const options = [...(config.userConfig?.options ?? [])]
      options[index] = { ...options[index], label }
      update({ userConfig: { ...config.userConfig!, options } })
      // Sync edge label for this branch
      syncBranches(options.map(o => o.label))
    },
    [config.userConfig, update, syncBranches]
  )

  const addCustomOption = useCallback(() => {
    const newOption = { id: uuid(), label: `Option ${(config.userConfig?.options?.length ?? 0) + 1}` }
    const options = [...(config.userConfig?.options ?? []), newOption]
    update({
      userConfig: {
        ...config.userConfig!,
        assignment: config.userConfig?.assignment ?? {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM
        },
        options
      }
    })
    syncBranches(options.map(o => o.label))
  }, [config.userConfig, update, syncBranches])

  const removeCustomOption = useCallback(
    (index: number) => {
      const options = (config.userConfig?.options ?? []).filter((_, j) => j !== index)
      if (options.length < 2) return // Keep at least 2 options
      update({ userConfig: { ...config.userConfig!, options } })
      syncBranches(options.map(o => o.label))
    },
    [config.userConfig, update, syncBranches]
  )

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">Decision Type</Label>
        <Select value={decisionType} onValueChange={applyUserDecisionType}>
          <SelectTrigger data-testid={`${testId}-user-decision-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="APPROVAL">Approval</SelectItem>
            <SelectItem value="CUSTOM">Custom choices</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isApproval ? (
        <>
          <p className="gba:text-xs gba:text-muted-foreground">
            An approval task will be assigned. The assignee can only Approve or Reject. Branches are created
            automatically.
          </p>

          <div className="gba:flex gba:flex-col gba:gap-1.5 gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
            <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
              Fixed outcomes
            </span>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-success/30 gba:bg-success-secondary gba:px-2.5 gba:py-1.5">
                <span className="gba:text-xs gba:font-medium gba:text-success-secondary-foreground">Approve</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-destructive/30 gba:bg-destructive-secondary gba:px-2.5 gba:py-1.5">
                <span className="gba:text-xs gba:font-medium gba:text-destructive-secondary-foreground">Reject</span>
              </div>
            </div>
          </div>

          {/* Reject behavior (send back / rework) */}
          {(() => {
            const rejectEdge = branchEdges.find(e => (e.label ?? '').toLowerCase() === 'reject') ?? branchEdges[1]
            const rejectEdgeFull = rejectEdge ? edges.find(e => e.id === rejectEdge.id) : undefined
            const endNodeId = nodes.find(n => n.type === 'end')?.id

            const rework = config.userConfig?.rejectRework
            const enabled = Boolean(rework)
            const selectedTargetId = rework?.targetNodeId

            const applyEdge = (nextEnabled: boolean, nextRework?: typeof rework) => {
              if (!rejectEdge?.id) return
              if (!endNodeId) return

              if (!nextEnabled) {
                // Revert Reject branch to a normal forward branch to end.
                const nextMeta = { ...rejectEdgeFull?.metadata }
                delete (nextMeta as any).rework
                updateEdge(rejectEdge.id, { direction: 'forward', target: endNodeId, metadata: nextMeta })
                return
              }

              const target = nextRework?.targetNodeId
              if (!target) return

              updateEdge(rejectEdge.id, {
                direction: 'backward',
                target,
                metadata: {
                  ...rejectEdgeFull?.metadata,
                  reworkReason: 'Rejected',
                  rework: {
                    targetNodeId: target,
                    requireReason: nextRework?.requireReason ?? false,
                    preserveData: nextRework?.preserveData ?? true,
                    maxIterations: nextRework?.maxIterations
                  }
                }
              })
            }

            const updateRejectRework = (partial: Partial<NonNullable<typeof rework>>) => {
              const base = config.userConfig ?? {
                userDecisionType: 'APPROVAL' as const,
                assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
                options: [
                  { id: 'approve', label: 'Approve' },
                  { id: 'reject', label: 'Reject' }
                ]
              }

              const next = {
                ...(base.rejectRework ?? { requireReason: false, preserveData: true }),
                ...partial
              }

              update({
                userConfig: {
                  ...base,
                  rejectRework: next
                }
              })
              applyEdge(true, next)
            }

            return (
              <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Reject behavior</Label>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Send back</Label>
                    <Switch
                      checked={enabled}
                      disabled={!rejectEdge?.id || eligibleSendBackTargets.length === 0}
                      onCheckedChange={checked => {
                        const base = config.userConfig ?? {
                          userDecisionType: 'APPROVAL' as const,
                          assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
                          options: [
                            { id: 'approve', label: 'Approve' },
                            { id: 'reject', label: 'Reject' }
                          ]
                        }

                        if (!checked) {
                          update({ userConfig: { ...base, rejectRework: undefined } })
                          applyEdge(false)
                          return
                        }

                        const defaultTarget =
                          selectedTargetId ?? eligibleSendBackTargets[eligibleSendBackTargets.length - 1]?.id
                        const next = {
                          targetNodeId: defaultTarget,
                          requireReason: false,
                          preserveData: true
                        }
                        update({ userConfig: { ...base, rejectRework: next } })
                        applyEdge(true, next)
                      }}
                      className={NEUTRAL_SWITCH_CLASSNAME}
                      data-testid={`${testId}-approval-reject-send-back`}
                    />
                  </div>
                </div>

                {eligibleSendBackTargets.length === 0 ? (
                  <p className="gba:text-[11px] gba:text-muted-foreground">
                    Add a task before this decision to enable send-back.
                  </p>
                ) : (
                  <>
                    {enabled && (
                      <>
                        <div className="gba:flex gba:flex-col gba:gap-1.5">
                          <Label className="gba:text-xs gba:font-medium">Send back to</Label>
                          <Select
                            value={selectedTargetId ?? ''}
                            onValueChange={v => updateRejectRework({ targetNodeId: v })}
                          >
                            <SelectTrigger
                              className="gba:h-8 gba:text-xs gba:bg-background"
                              data-testid={`${testId}-approval-send-back-target`}
                            >
                              <SelectValue placeholder="Select step..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleSendBackTargets.map(tgt => (
                                <SelectItem key={tgt.id} value={tgt.id}>
                                  {tgt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {mode === 'advanced' && (
                          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2 gba:rounded-md gba:bg-background gba:border gba:border-border">
                              <Label className="gba:text-xs gba:font-medium gba:text-foreground">Require reason</Label>
                              <Switch
                                checked={rework?.requireReason ?? false}
                                onCheckedChange={checked => updateRejectRework({ requireReason: checked })}
                                className={NEUTRAL_SWITCH_CLASSNAME}
                                data-testid={`${testId}-approval-send-back-reason`}
                              />
                            </div>
                            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2 gba:rounded-md gba:bg-background gba:border gba:border-border">
                              <Label className="gba:text-xs gba:font-medium gba:text-foreground">Preserve data</Label>
                              <Switch
                                checked={rework?.preserveData ?? true}
                                onCheckedChange={checked => updateRejectRework({ preserveData: checked })}
                                className={NEUTRAL_SWITCH_CLASSNAME}
                                data-testid={`${testId}-approval-send-back-preserve`}
                              />
                            </div>
                            <div className="gba:flex gba:flex-col gba:gap-1.5 gba:col-span-2">
                              <Label className="gba:text-xs gba:font-medium">Max iterations (optional)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={rework?.maxIterations ?? ''}
                                onChange={e => {
                                  const v = e.target.value
                                  updateRejectRework({ maxIterations: v === '' ? undefined : Number(v) })
                                }}
                                className="gba:h-8 gba:text-xs gba:bg-background"
                                data-testid={`${testId}-approval-send-back-max-iterations`}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {!enabled && (
                      <p className="gba:text-[11px] gba:text-muted-foreground">
                        When enabled, the Reject branch becomes a backward connection.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </>
      ) : (
        <>
          <p className="gba:text-xs gba:text-muted-foreground">
            Define custom options for the assignee to choose from. Each option creates a corresponding branch.
          </p>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">Decision Options</Label>
            <div className="gba:flex gba:flex-col gba:gap-1">
              {(config.userConfig?.options ?? []).map((opt, i) => (
                <div key={opt.id} className="gba:flex gba:items-center gba:gap-2">
                  <Input
                    value={opt.label}
                    onChange={e => updateCustomOption(i, e.target.value)}
                    className="gba:h-8 gba:text-xs"
                    placeholder={`Option ${i + 1}`}
                    data-testid={`${testId}-user-option-${i}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={(config.userConfig?.options?.length ?? 0) <= 2}
                    onClick={() => removeCustomOption(i)}
                  >
                    <Trash2 className="gba:h-3 gba:w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCustomOption} data-testid={`${testId}-user-add-option`}>
                <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
                Add Option
              </Button>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
        <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
          {isApproval ? 'Approver Assignment' : 'Assignment'}
        </Label>
        <div className="gba:flex gba:flex-col gba:gap-2">
          {(() => {
            const assignmentMode = config.userConfig?.assignment?.assignmentMode ?? AssignmentMode.CLAIM
            const modeDescription =
              assignmentMode === AssignmentMode.ASSIGN
                ? t('assignment-mode-desc-assign')
                : t('assignment-mode-desc-claim')

            return (
              <>
                <Select
                  value={assignmentMode}
                  onValueChange={v =>
                    update({
                      userConfig: {
                        ...config.userConfig!,
                        assignment: {
                          targets: config.userConfig?.assignment?.targets ?? null,
                          assignmentMode: v as AssignmentMode
                        },
                        options: config.userConfig?.options ?? []
                      }
                    })
                  }
                >
                  <SelectTrigger
                    data-testid={`${testId}-user-assignment-mode`}
                    className="gba:h-8 gba:text-xs gba:bg-background"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AssignmentMode.CLAIM}>{t('assignment-mode-claim')}</SelectItem>
                    <SelectItem value={AssignmentMode.ASSIGN}>{t('assignment-mode-assign')}</SelectItem>
                  </SelectContent>
                </Select>

                <p
                  className="gba:text-xs gba:text-muted-foreground"
                  data-testid={`${testId}-user-assignment-mode-desc`}
                >
                  {modeDescription}
                </p>

                <AssignmentSelector
                  value={{
                    targets: config.userConfig?.assignment?.targets ?? null,
                    assignmentMode,
                    allowReassignment: true
                  }}
                  onChange={(assignment: TaskAssignment) =>
                    update({
                      userConfig: {
                        ...config.userConfig!,
                        assignment: {
                          targets: assignment.targets,
                          assignmentMode
                        },
                        options: config.userConfig?.options ?? []
                      }
                    })
                  }
                  assignmentMode={assignmentMode}
                  accessToken={accessToken}
                  data-testid={`${testId}-user-assignment-selector`}
                />
              </>
            )
          })()}
        </div>
        {isApproval && (
          <span className="gba:text-[11px] gba:text-muted-foreground">
            Uses the built-in APPROVAL user task subflow.
          </span>
        )}
      </div>

      {mode === 'advanced' && (
        <div className="gba:flex gba:flex-col gba:gap-2">
          {(() => {
            const unit = deriveTimeUnit(config.userConfig?.timeoutMinutes)
            const amountValue = (() => {
              const mins = Number(config.userConfig?.timeoutMinutes || 0)
              if (!mins) return ''
              const per = MINUTES_PER[unit]
              const val = Math.round(mins / per)
              return String(val > 0 ? val : '')
            })()

            return (
              <>
                <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('decision-due-label')}</Label>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={amountValue}
                    placeholder={t('decision-due-placeholder')}
                    onChange={e => {
                      const raw = String(e.target.value || '').trim()
                      if (!raw) {
                        update({ userConfig: { ...config.userConfig!, timeoutMinutes: undefined } })
                        return
                      }
                      const n = Number.parseInt(raw, 10)
                      if (!Number.isFinite(n) || n <= 0) {
                        update({ userConfig: { ...config.userConfig!, timeoutMinutes: undefined } })
                        return
                      }
                      update({
                        userConfig: {
                          ...config.userConfig!,
                          timeoutMinutes: n * MINUTES_PER[unit]
                        }
                      })
                    }}
                    className="gba:flex-1"
                    data-testid={`${testId}-user-due-amount`}
                  />
                  <Select
                    value={unit}
                    onValueChange={(next: string) => {
                      const nextUnit = next as DueUnit
                      const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
                      update({
                        userConfig: {
                          ...config.userConfig!,
                          timeoutMinutes: currentAmount * MINUTES_PER[nextUnit]
                        }
                      })
                    }}
                  >
                    <SelectTrigger className="gba:w-32" data-testid={`${testId}-user-due-unit`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">{t('decision-due-unit-minutes')}</SelectItem>
                      <SelectItem value="hours">{t('decision-due-unit-hours')}</SelectItem>
                      <SelectItem value="days">{t('decision-due-unit-days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </>
  )
}

type DueUnit = 'minutes' | 'hours' | 'days'
const MINUTES_PER: Record<DueUnit, number> = { minutes: 1, hours: 60, days: 24 * 60 }

function deriveTimeUnit(mins?: number): DueUnit {
  const m = Number(mins || 0)
  if (!m) return 'days'
  if (m % MINUTES_PER.days === 0) return 'days'
  if (m % MINUTES_PER.hours === 0) return 'hours'
  return 'minutes'
}

const POLICY_PICKER_FIELDS: Array<keyof ContentEntry> = [
  'id',
  'title',
  'preview',
  'entryVersion',
  'contentGroupRef',
  'contentTypeRef',
  'contentGroup',
  'contentType',
  'contentEntryCategories',
  'contentEntryTags',
  'updatedAt',
  'additionalProperties'
]

type JsonSchema = Record<string, unknown>

function visitJsonSchemaNodeProps(
  props: Record<string, unknown>,
  prefix: string,
  out: string[],
  visitFn: (n: any, p: string) => void
): void {
  for (const [k, v] of Object.entries(props)) {
    const key = String(k || '').trim()
    if (!key) continue
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    out.push(nextPrefix)
    visitFn(v, nextPrefix)
  }
}

function visitJsonSchemaNodeAlts(node: any, prefix: string, visitFn: (n: any, p: string) => void): void {
  const alts = [...(Array.isArray(node.oneOf) ? node.oneOf : []), ...(Array.isArray(node.anyOf) ? node.anyOf : [])]
  for (const alt of alts) visitFn(alt, prefix)
  if (Array.isArray(node.allOf)) {
    for (const part of node.allOf) visitFn(part, prefix)
  }
}

function visitJsonSchemaNode(
  node: any,
  prefix: string,
  out: string[],
  visited: Set<unknown>,
  visitFn: (n: any, p: string) => void
): void {
  if (!node || typeof node !== 'object') return
  if (visited.has(node)) return
  visited.add(node)

  const type = node.type
  const props = type === 'object' ? node.properties : undefined
  if (props && typeof props === 'object') {
    visitJsonSchemaNodeProps(props as Record<string, unknown>, prefix, out, visitFn)
  }

  if (type === 'array' && node.items) {
    visitFn(node.items, prefix ? `${prefix}[]` : '[]')
  }

  visitJsonSchemaNodeAlts(node, prefix, visitFn)
}

function collectJsonSchemaPaths(schema: unknown): string[] {
  const out: string[] = []
  const visited = new Set<unknown>()

  const visit = (node: any, prefix: string) => {
    visitJsonSchemaNode(node, prefix, out, visited, visit)
  }

  visit(schema as JsonSchema, '')
  return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b))
}

const AIDecisionConfig: React.FC<AIDecisionConfigProps> = ({
  config,
  update,
  mode,
  testId,
  accessToken,
  studioData
}) => {
  const { t } = useTranslation(translations)
  const expressionSuggestions = useStudioExpressionSuggestions()
  const [policyOpen, setPolicyOpen] = useState(false)
  const [policySearch, setPolicySearch] = useState('')
  const [taskExpertOpen, setTaskExpertOpen] = useState(false)
  const [taskExpertSearch, setTaskExpertSearch] = useState('')

  type AIExecutor = 'EVERYAI' | 'TASK_EXPERT'
  const deriveExecutor = useCallback((): AIExecutor => {
    const v = config.aiConfig?.executor
    return v === 'TASK_EXPERT' || v === 'EVERYAI' ? v : 'EVERYAI'
  }, [config.aiConfig?.executor])

  const getAiConfigOrDefault = useCallback(
    (fallbackExecutor: AIExecutor = 'EVERYAI') => {
      const existing = config.aiConfig
      const executor = (existing?.executor as AIExecutor | undefined) ?? fallbackExecutor
      const defaultEscalation = {
        mode: 'USER' as const,
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      }

      return existing
        ? {
            ...existing,
            executor,
            humanInstructions: existing.humanInstructions ?? '',
            escalation: existing.escalation ?? defaultEscalation
          }
        : {
            executor,
            promptId: undefined,
            policyDocumentId: undefined,
            policyDocumentTitle: undefined,
            policyDocumentVersion: undefined,
            instructions: '',
            humanInstructions: '',
            mapping: undefined,
            reasoningPath: undefined,
            escalation: defaultEscalation
          }
    },
    [config.aiConfig]
  )

  // Escalation is a core part of AI decisions. Ensure config always has a concrete escalation object.
  React.useEffect(() => {
    if (!config.aiConfig) return
    if (config.aiConfig.escalation) return
    update({
      aiConfig: {
        ...config.aiConfig,
        escalation: {
          mode: 'USER',
          assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
        }
      }
    })
  }, [config.aiConfig, update])

  // Fetch content entries via GraphQL (same pattern as content-portal PoliciesView)
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRefs: [
        ContentGroup.NEWS,
        ContentGroup.KNOWLEDGE,
        ContentGroup.DOCUMENT,
        ContentGroup.QUESTION,
        ContentGroup.INTRANET,
        ContentGroup.GLOSSARY
      ],
      limit: 100,
      offset: 0,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }),
    []
  )

  const policyQueryOptions = useMemo(() => ({ fields: POLICY_PICKER_FIELDS }), [])
  const { entries, isLoading } = useContentEntries(queryParams, accessToken, policyQueryOptions)

  // Filter to only policy content entries
  const allPolicies = useMemo(() => entries.filter(isPolicyContentEntry), [entries])

  // Local search filtering for the combobox
  const filteredPolicies = useMemo(
    () =>
      policySearch
        ? allPolicies.filter(p => (p.title ?? '').toLowerCase().includes(policySearch.toLowerCase()))
        : allPolicies,
    [allPolicies, policySearch]
  )

  const selectedPolicy = allPolicies.find(p => p.id === config.aiConfig?.policyDocumentId)

  const decisionTaskExperts = useMemo(() => {
    const isDecisionExpert = (p: any): boolean => {
      if (!p || typeof p !== 'object') return false
      if (p.agent_type !== 'decision') return false
      const schema = p.response_schema
      const props = schema && typeof schema === 'object' ? (schema as Record<string, unknown>).properties : undefined
      const dr = props && typeof props === 'object' ? (props as Record<string, unknown>).decisionResult : undefined
      const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
      return Array.isArray(en) && en.length > 0 && en.every((v: any) => typeof v === 'string' && String(v).trim())
    }
    return (studioData.agents ?? []).filter(isDecisionExpert)
  }, [studioData.agents])

  const filteredTaskExperts = useMemo(() => {
    const q = String(taskExpertSearch || '')
      .trim()
      .toLowerCase()
    if (!q) return decisionTaskExperts
    return decisionTaskExperts.filter(a => (a.name ?? '').toLowerCase().includes(q))
  }, [decisionTaskExperts, taskExpertSearch])

  const selectedTaskExpert = useMemo(() => {
    const promptId = String(config.aiConfig?.promptId || '').trim()
    if (!promptId) return undefined
    return decisionTaskExperts.find(a => a._id === promptId)
  }, [config.aiConfig?.promptId, decisionTaskExperts])

  const decisionResultEnumOptions = useMemo(() => {
    const schema = selectedTaskExpert?.response_schema
    const props = schema && typeof schema === 'object' ? schema.properties : undefined
    const dr = props && typeof props === 'object' ? (props as Record<string, unknown>).decisionResult : undefined
    const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
    if (!Array.isArray(en)) return []
    return en.map(v => String(v || '').trim()).filter(Boolean)
  }, [selectedTaskExpert])

  const selectPolicy = useCallback(
    (policy: Pick<ContentEntry, 'id' | 'title' | 'entryVersion'>) => {
      update({
        aiConfig: {
          ...getAiConfigOrDefault('EVERYAI'),
          policyDocumentId: policy.id ?? undefined,
          policyDocumentTitle: policy.title ?? undefined,
          policyDocumentVersion: policy.entryVersion ?? undefined
        }
      })
      setPolicyOpen(false)
    },
    [getAiConfigOrDefault, update]
  )

  const renderHumanFallback = useCallback(
    (executor: AIExecutor, variant: 'simple' | 'advanced') => {
      const ai = getAiConfigOrDefault(executor)
      const escalation: EscalationConfig = ai.escalation ?? {
        mode: 'USER',
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      }
      const assignmentMode = escalation.assignment.assignmentMode
      let modeDescription: string
      if (assignmentMode === AssignmentMode.ASSIGN) {
        modeDescription = t('assignment-mode-desc-assign')
      } else if (assignmentMode === AssignmentMode.ASSIGN_DEFERRED) {
        modeDescription = t('assignment-mode-desc-deferred')
      } else {
        modeDescription = t('assignment-mode-desc-claim')
      }

      const unit = deriveTimeUnit(escalation.timeoutMinutes)
      const amountValue = (() => {
        const mins = Number(escalation.timeoutMinutes || 0)
        if (!mins) return ''
        const per = MINUTES_PER[unit]
        const val = Math.round(mins / per)
        return String(val > 0 ? val : '')
      })()

      const suffix = variant === 'advanced' ? '-adv' : ''

      return (
        <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:bg-muted gba:p-3 gba:border gba:border-border">
          <div className="gba:text-xs gba:font-semibold gba:text-foreground">{t('decision-human-fallback-title')}</div>
          <div className="gba:text-xs gba:text-muted-foreground">{t('decision-human-fallback-desc')}</div>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">{t('decision-human-instructions-label')}</Label>
            <p className="gba:text-xs gba:text-muted-foreground">{t('decision-human-instructions-desc')}</p>
            <ExpressionEditor
              value={ai.humanInstructions ?? ''}
              onChange={value =>
                update({
                  aiConfig: {
                    ...ai,
                    executor,
                    humanInstructions: value
                  }
                })
              }
              suggestions={expressionSuggestions}
              placeholder={t('decision-human-instructions-placeholder')}
              allowFreeText
              multiline
              data-testid={`${testId}-ai-human-instructions${suffix}`}
            />
          </div>

          {executor === 'EVERYAI' && (
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">{t('decision-escalation-instructions-label')}</Label>
              <p className="gba:text-xs gba:text-muted-foreground">{t('decision-escalation-instructions-desc')}</p>
              <Textarea
                value={escalation.instructions ?? ''}
                onChange={e =>
                  update({
                    aiConfig: {
                      ...ai,
                      executor,
                      escalation: { ...escalation, instructions: e.target.value }
                    }
                  })
                }
                placeholder={t('decision-escalation-instructions-placeholder')}
                data-testid={`${testId}-ai-escalation-instructions${suffix}`}
              />
            </div>
          )}

          <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:bg-background gba:p-3 gba:border gba:border-border">
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-mode-label')}</Label>
              <Select
                value={assignmentMode}
                onValueChange={v =>
                  update({
                    aiConfig: {
                      ...ai,
                      executor,
                      escalation: {
                        ...escalation,
                        assignment: {
                          targets: escalation.assignment.targets ?? null,
                          assignmentMode: v as AssignmentMode
                        }
                      }
                    }
                  })
                }
              >
                <SelectTrigger
                  className="gba:h-8 gba:text-xs gba:bg-background"
                  data-testid={`${testId}-ai-escalation-assignment-mode${suffix}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AssignmentMode.CLAIM}>{t('assignment-mode-claim')}</SelectItem>
                  <SelectItem value={AssignmentMode.ASSIGN}>{t('assignment-mode-assign')}</SelectItem>
                  <SelectItem value={AssignmentMode.ASSIGN_DEFERRED}>{t('assignment-mode-deferred')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="gba:text-xs gba:text-muted-foreground">{modeDescription}</p>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
                {t('assignment-audience-label')}
              </Label>
              <AssignmentSelector
                value={{
                  targets: escalation.assignment.targets ?? null,
                  assignmentMode,
                  allowReassignment: true
                }}
                onChange={(assignment: TaskAssignment) =>
                  update({
                    aiConfig: {
                      ...ai,
                      executor,
                      escalation: {
                        ...escalation,
                        assignment: {
                          targets: assignment.targets,
                          assignmentMode
                        }
                      }
                    }
                  })
                }
                assignmentMode={assignmentMode}
                accessToken={accessToken}
                data-testid={`${testId}-ai-escalation-assignment-selector${suffix}`}
              />
            </div>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
              {t('decision-escalation-due-label')}
            </Label>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Input
                type="number"
                min={1}
                value={amountValue}
                placeholder={t('decision-due-placeholder')}
                onChange={e => {
                  const raw = String(e.target.value || '').trim()
                  if (!raw) {
                    update({
                      aiConfig: { ...ai, executor, escalation: { ...escalation, timeoutMinutes: undefined } }
                    })
                    return
                  }
                  const n = Number.parseInt(raw, 10)
                  if (!Number.isFinite(n) || n <= 0) {
                    update({
                      aiConfig: { ...ai, executor, escalation: { ...escalation, timeoutMinutes: undefined } }
                    })
                    return
                  }
                  update({
                    aiConfig: { ...ai, executor, escalation: { ...escalation, timeoutMinutes: n * MINUTES_PER[unit] } }
                  })
                }}
                className="gba:flex-1"
                data-testid={`${testId}-ai-escalation-due-amount${suffix}`}
              />
              <Select
                value={unit}
                onValueChange={(next: string) => {
                  const nextUnit = next as DueUnit
                  const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
                  update({
                    aiConfig: {
                      ...ai,
                      executor,
                      escalation: { ...escalation, timeoutMinutes: currentAmount * MINUTES_PER[nextUnit] }
                    }
                  })
                }}
              >
                <SelectTrigger className="gba:w-32" data-testid={`${testId}-ai-escalation-due-unit${suffix}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">{t('decision-due-unit-minutes')}</SelectItem>
                  <SelectItem value="hours">{t('decision-due-unit-hours')}</SelectItem>
                  <SelectItem value="days">{t('decision-due-unit-days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="gba:rounded-lg gba:bg-background gba:p-3 gba:border gba:border-border">
            <div className="gba:text-xs gba:font-semibold gba:text-foreground">
              {t('decision-escalation-how-title')}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('decision-escalation-how-desc')}</div>
          </div>
        </div>
      )
    },
    [accessToken, expressionSuggestions, getAiConfigOrDefault, t, testId, update]
  )

  const renderPolicyPicker = useCallback(
    (dataTestId: string) => {
      const ai = getAiConfigOrDefault()
      return (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('decision-policy')}</Label>
          <Popover open={policyOpen} onOpenChange={setPolicyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={policyOpen}
                className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal"
                data-testid={dataTestId}
              >
                {selectedPolicy || ai.policyDocumentTitle ? (
                  <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                    <FileText className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                    {selectedPolicy?.title ?? ai.policyDocumentTitle ?? 'Untitled policy'}
                  </span>
                ) : (
                  <span className="gba:text-muted-foreground">
                    {isLoading ? 'Loading policies...' : t('decision-policy-optional-placeholder')}
                  </span>
                )}
                <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search policies..." value={policySearch} onValueChange={setPolicySearch} />
                <CommandList className="gba:max-h-72 gba:overflow-y-auto">
                  {isLoading ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                      <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                      Loading policies...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No policies found.</CommandEmpty>
                      <CommandGroup>
                        {filteredPolicies.map(policy => (
                          <CommandItem key={policy.id} value={policy.id ?? ''} onSelect={() => selectPolicy(policy)}>
                            <FileText className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                              <span className="gba:truncate gba:text-foreground">{policy.title ?? 'Untitled'}</span>
                              {policy.preview && (
                                <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                  {policy.preview}
                                </span>
                              )}
                            </div>
                            {ai.policyDocumentId === policy.id && (
                              <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
    [filteredPolicies, getAiConfigOrDefault, isLoading, policyOpen, policySearch, selectPolicy, selectedPolicy, t]
  )

  const advancedExecutor = deriveExecutor()
  const ai = getAiConfigOrDefault(advancedExecutor)

  // Hooks must run in a stable order across renders (simple/advanced).
  const mappingWrapperConfig = useMemo(() => {
    const mappingConditions = ai.mapping?.conditions ?? []
    return { ...config, logicConfig: { conditions: mappingConditions } } as DecisionNodeConfig
  }, [ai.mapping?.conditions, config])

  const mappingWrapperUpdate = useCallback(
    (partial: Partial<DecisionNodeConfig>) => {
      if (!partial.logicConfig) return update(partial)
      const nextConditions = partial.logicConfig.conditions ?? []
      update({
        aiConfig: {
          ...getAiConfigOrDefault('TASK_EXPERT'),
          executor: 'TASK_EXPERT',
          mapping: { conditions: nextConditions }
        }
      })
    },
    [getAiConfigOrDefault, update]
  )

  const taskExpertSchemaPaths = useMemo(() => {
    const promptId = String(ai.promptId || '').trim()
    if (!promptId) return []
    const prompt = studioData.agents.find(a => a._id === promptId)
    return collectJsonSchemaPaths(prompt?.response_schema ?? null)
  }, [ai.promptId, studioData.agents])

  const taskExpertMappingExpressionSuggestions = useMemo((): ExpressionSuggestionItem[] => {
    const promptId = String(ai.promptId || '').trim()
    const prompt = promptId ? studioData.agents.find(a => a._id === promptId) : undefined
    const schema = (prompt?.response_schema ?? null) as any

    const getObjectProperty = (node: any, key: string): any => {
      if (node?.type === 'object' && node?.properties && typeof node.properties === 'object') {
        return node.properties[key]
      }
      return undefined
    }

    const getSchemaNodeAtPath = (root: any, path: string): any => {
      if (!root || typeof root !== 'object') return null
      const raw = String(path || '').trim()
      if (!raw) return root

      const parts = raw.split('.').filter(Boolean)
      let cur: any = root
      for (const part0 of parts) {
        if (!cur || typeof cur !== 'object') return null
        const part = String(part0)

        if (part.endsWith('[]')) {
          const key = part.slice(0, -2)
          if (key) cur = getObjectProperty(cur, key)
          cur = cur?.items
          continue
        }

        cur = getObjectProperty(cur, part)
      }
      return cur
    }

    const inferValueType = (node: any): ExpressionValueType => {
      const type = String(node?.type || '').trim()
      const format = String(node?.format || '').trim()
      if (type === 'boolean') return 'boolean'
      if (type === 'number' || type === 'integer') return 'number'
      if (type === 'string') {
        if (format === 'date') return 'date'
        if (format === 'date-time' || format === 'datetime') return 'datetime'
        return 'string'
      }
      return 'unknown'
    }

    const schemaItems: ExpressionSuggestionItem[] = (taskExpertSchemaPaths || []).map((p, i) => {
      const path = String(p || '').trim()
      const node = path ? getSchemaNodeAtPath(schema, path) : null
      const type = inferValueType(node)
      return {
        id: `taskexpert-schema-${i}-${path}`,
        label: `Task Expert — ${path}`,
        expression: `$steps.self.resultData.${path}`,
        source: 'steps',
        dataType: type,
        description: 'From the selected Task Expert output schema.'
      }
    })

    // For Task Expert mapping rules we intentionally scope suggestions to the Task Expert output.
    // This avoids accidentally mapping based on unrelated step/trigger values.
    const merged = [...schemaItems]
    const seen = new Set<string>()
    return merged.filter(item => {
      const key = String(item.expression || '').trim()
      if (!key) return false
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [ai.promptId, studioData.agents, taskExpertSchemaPaths])

  const ensureDefaultMapping = useCallback(
    (promptEnum: string[] | undefined) => {
      const branchId = config.branches[0]?.id ?? ''
      const value = String(promptEnum?.[0] ?? '').trim()
      const escapedValue = value.split("'").join(String.raw`\'`)
      const rhs = value ? `'${escapedValue}'` : "''"
      return {
        conditions: [
          {
            expression: `{{$steps.self.resultData.decisionResult}} == ${rhs}`,
            branchId
          }
        ]
      }
    },
    [config.branches]
  )

  // In TASK_EXPERT mode mapping rules are required by backend validation.
  React.useEffect(() => {
    if (ai.executor !== 'TASK_EXPERT') return
    const conds = ai.mapping?.conditions
    if (Array.isArray(conds) && conds.length > 0) return
    update({
      aiConfig: {
        ...ai,
        executor: 'TASK_EXPERT',
        mapping: ensureDefaultMapping(decisionResultEnumOptions)
      }
    })
  }, [ai, decisionResultEnumOptions, ensureDefaultMapping, update])

  if (mode === 'simple') {
    return (
      <>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('decision-ai-executor-label')}</Label>
          <Tabs
            value={ai.executor}
            onValueChange={(next: string) => {
              const executor = next === 'TASK_EXPERT' ? ('TASK_EXPERT' as const) : ('EVERYAI' as const)
              if (executor === 'EVERYAI') {
                update({
                  aiConfig: {
                    ...getAiConfigOrDefault('EVERYAI'),
                    executor: 'EVERYAI',
                    promptId: undefined,
                    mapping: undefined,
                    reasoningPath: undefined
                  }
                })
                return
              }
              update({
                aiConfig: {
                  ...getAiConfigOrDefault('TASK_EXPERT'),
                  executor: 'TASK_EXPERT',
                  instructions: undefined,
                  policyDocumentId: undefined,
                  policyDocumentTitle: undefined,
                  policyDocumentVersion: undefined,
                  promptId: undefined,
                  mapping: ensureDefaultMapping(undefined)
                }
              })
            }}
          >
            <TabsList
              className="gba:w-full gba:grid gba:grid-cols-2"
              data-testid={`${testId}-ai-decision-executor-simple`}
            >
              <TabsTrigger
                value="EVERYAI"
                className="gba:text-xs"
                data-testid={`${testId}-ai-decision-executor-everyai-simple`}
              >
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                  {t('decision-ai-executor-everyai')}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="TASK_EXPERT"
                className="gba:text-xs"
                data-testid={`${testId}-ai-decision-executor-taskexpert-simple`}
              >
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                  {t('decision-ai-executor-taskexpert')}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {ai.executor === 'EVERYAI' ? (
          <>
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">{t('decision-ai-instructions-label')}</Label>
              <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-instructions-desc')}</p>
              <ExpressionEditor
                value={ai.instructions ?? ''}
                onChange={value =>
                  update({
                    aiConfig: {
                      ...ai,
                      executor: 'EVERYAI',
                      instructions: value
                    }
                  })
                }
                suggestions={expressionSuggestions}
                placeholder={t('decision-ai-instructions-placeholder')}
                allowFreeText
                multiline
                data-testid={`${testId}-ai-decision-instructions`}
              />
            </div>

            {renderPolicyPicker(`${testId}-ai-policy`)}
          </>
        ) : (
          <>
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">{t('task-type-ai_task_expert')}</Label>
              <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-picker-desc')}</p>
              <Popover open={taskExpertOpen} onOpenChange={setTaskExpertOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={taskExpertOpen}
                    className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal"
                    data-testid={`${testId}-ai-taskexpert-picker-simple`}
                  >
                    {selectedTaskExpert ? (
                      <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                        <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                        {selectedTaskExpert.name}
                      </span>
                    ) : (
                      <span className="gba:text-muted-foreground">
                        {t('decision-ai-taskexpert-picker-placeholder')}
                      </span>
                    )}
                    <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('decision-ai-taskexpert-picker-search')}
                      value={taskExpertSearch}
                      onValueChange={setTaskExpertSearch}
                    />
                    <CommandList className="gba:max-h-72 gba:overflow-y-auto">
                      <CommandEmpty>{t('decision-ai-taskexpert-picker-empty')}</CommandEmpty>
                      <CommandGroup>
                        {filteredTaskExperts.map(agent => (
                          <CommandItem
                            key={agent._id}
                            value={agent._id ?? ''}
                            onSelect={() => {
                              const schema = agent.response_schema
                              const props = schema && typeof schema === 'object' ? schema.properties : undefined
                              const dr =
                                props && typeof props === 'object'
                                  ? (props as Record<string, unknown>).decisionResult
                                  : undefined
                              const en = dr && typeof dr === 'object' ? (dr as Record<string, unknown>).enum : undefined
                              const enumOpts = Array.isArray(en)
                                ? en.map((v: any) => String(v || '').trim()).filter(Boolean)
                                : []

                              update({
                                aiConfig: {
                                  ...getAiConfigOrDefault('TASK_EXPERT'),
                                  executor: 'TASK_EXPERT',
                                  instructions: undefined,
                                  policyDocumentId: undefined,
                                  policyDocumentTitle: undefined,
                                  policyDocumentVersion: undefined,
                                  promptId: agent._id,
                                  mapping: ensureDefaultMapping(enumOpts)
                                }
                              })
                              setTaskExpertOpen(false)
                            }}
                          >
                            <Bot className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                              <span className="gba:truncate gba:text-foreground">{agent.name}</span>
                              {agent.description && (
                                <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                  {agent.description}
                                </span>
                              )}
                            </div>
                            {ai.promptId === agent._id && (
                              <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-mapping-label')}</Label>
              <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-mapping-desc')}</p>
            </div>
            <LogicDecisionConfig
              config={mappingWrapperConfig}
              update={mappingWrapperUpdate}
              mode={mode}
              testId={`${testId}-taskexpert-mapping-simple`}
              expressionSuggestionsOverride={taskExpertMappingExpressionSuggestions}
              stringEnumOptionsByExpression={{
                '$steps.self.resultData.decisionResult': decisionResultEnumOptions
              }}
            />
          </>
        )}

        {renderHumanFallback(ai.executor, 'simple')}
      </>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-ai-executor-label')}</Label>
        <Tabs
          value={advancedExecutor}
          onValueChange={(next: string) => {
            const executor = next === 'TASK_EXPERT' ? ('TASK_EXPERT' as const) : ('EVERYAI' as const)
            if (executor === 'EVERYAI') {
              update({
                aiConfig: {
                  ...getAiConfigOrDefault('EVERYAI'),
                  executor: 'EVERYAI',
                  promptId: undefined,
                  mapping: undefined,
                  reasoningPath: undefined
                }
              })
              return
            }
            update({
              aiConfig: {
                ...getAiConfigOrDefault('TASK_EXPERT'),
                executor: 'TASK_EXPERT',
                instructions: undefined,
                promptId: String(config.aiConfig?.promptId || '').trim() || undefined,
                // Task Expert decisions do not use policy selection.
                policyDocumentId: undefined,
                policyDocumentTitle: undefined,
                policyDocumentVersion: undefined,
                mapping: config.aiConfig?.mapping ?? { conditions: [] }
              }
            })
          }}
        >
          <TabsList className="gba:w-full gba:grid gba:grid-cols-2" data-testid={`${testId}-ai-decision-executor`}>
            <TabsTrigger value="EVERYAI" className="gba:text-xs" data-testid={`${testId}-ai-decision-executor-everyai`}>
              <span className="gba:flex gba:items-center gba:gap-2">
                <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                {t('decision-ai-executor-everyai')}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="TASK_EXPERT"
              className="gba:text-xs"
              data-testid={`${testId}-ai-decision-executor-taskexpert`}
            >
              <span className="gba:flex gba:items-center gba:gap-2">
                <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                {t('decision-ai-executor-taskexpert')}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="gba:text-xs gba:text-muted-foreground">
          {advancedExecutor === 'EVERYAI'
            ? t('decision-ai-executor-everyai-desc')
            : t('decision-ai-executor-taskexpert-desc')}
        </p>
      </div>

      {advancedExecutor === 'EVERYAI' && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">{t('decision-ai-instructions-label')}</Label>
          <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-instructions-desc')}</p>
          <ExpressionEditor
            value={ai.instructions ?? ''}
            onChange={value =>
              update({
                aiConfig: {
                  ...ai,
                  executor: 'EVERYAI',
                  instructions: value
                }
              })
            }
            suggestions={expressionSuggestions}
            placeholder={t('decision-ai-instructions-placeholder')}
            allowFreeText
            multiline
            data-testid={`${testId}-ai-decision-instructions-adv`}
          />
        </div>
      )}

      {advancedExecutor === 'EVERYAI' && renderPolicyPicker(`${testId}-ai-policy-adv`)}

      {advancedExecutor === 'TASK_EXPERT' && (
        <>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">{t('task-type-ai_task_expert')}</Label>
            <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-picker-desc')}</p>
            <Popover open={taskExpertOpen} onOpenChange={setTaskExpertOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={taskExpertOpen}
                  className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal"
                  data-testid={`${testId}-ai-taskexpert-prompt`}
                >
                  {selectedTaskExpert ? (
                    <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                      <Bot className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                      {selectedTaskExpert.name}
                    </span>
                  ) : (
                    <span className="gba:text-muted-foreground">
                      {studioData.agentsLoading ? 'Loading experts...' : t('decision-ai-taskexpert-picker-placeholder')}
                    </span>
                  )}
                  <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:w-[var(--radix-popover-trigger-width)] gba:p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('decision-ai-taskexpert-picker-search')}
                    value={taskExpertSearch}
                    onValueChange={setTaskExpertSearch}
                  />
                  <CommandList className="gba:max-h-72 gba:overflow-y-auto">
                    {studioData.agentsLoading ? (
                      <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                        <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                        Loading experts...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>{t('decision-ai-taskexpert-picker-empty')}</CommandEmpty>
                        <CommandGroup>
                          {filteredTaskExperts.map(agent => (
                            <CommandItem
                              key={agent._id}
                              value={agent._id ?? ''}
                              onSelect={() => {
                                update({
                                  aiConfig: {
                                    ...ai,
                                    executor: 'TASK_EXPERT',
                                    promptId: agent._id ?? undefined,
                                    // Task Expert decisions do not use policy selection.
                                    policyDocumentId: undefined,
                                    policyDocumentTitle: undefined,
                                    policyDocumentVersion: undefined
                                  }
                                })
                                setTaskExpertOpen(false)
                              }}
                            >
                              <Bot className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                              <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                                <span className="gba:truncate gba:text-foreground">{agent.name}</span>
                                {agent.description && (
                                  <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                    {agent.description}
                                  </span>
                                )}
                              </div>
                              {ai.promptId === agent._id && (
                                <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-mapping-label')}</Label>
            <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-mapping-desc')}</p>
          </div>
          <LogicDecisionConfig
            // Reuse the logic builder UI for mapping rules.
            config={mappingWrapperConfig}
            update={mappingWrapperUpdate}
            mode={mode}
            testId={`${testId}-taskexpert-mapping`}
            expressionSuggestionsOverride={taskExpertMappingExpressionSuggestions}
            stringEnumOptionsByExpression={{
              '$steps.self.resultData.decisionResult': decisionResultEnumOptions
            }}
          />
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">{t('decision-ai-taskexpert-reasoning-label')}</Label>
            <p className="gba:text-xs gba:text-muted-foreground">{t('decision-ai-taskexpert-reasoning-desc')}</p>
            {(() => {
              const NONE = '__none__'
              const current = String(ai.reasoningPath || '').trim()
              const options =
                current && !taskExpertSchemaPaths.includes(current)
                  ? [current, ...taskExpertSchemaPaths]
                  : taskExpertSchemaPaths
              const value = current || NONE
              return (
                <Select
                  value={value}
                  onValueChange={(v: string) =>
                    update({
                      aiConfig: {
                        ...ai,
                        executor: 'TASK_EXPERT',
                        reasoningPath: v === NONE ? undefined : v
                      }
                    })
                  }
                >
                  <SelectTrigger data-testid={`${testId}-ai-taskexpert-reasoning-path`}>
                    <SelectValue placeholder={t('decision-ai-taskexpert-reasoning-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('decision-ai-taskexpert-reasoning-none')}</SelectItem>
                    {options.map(p => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })()}
          </div>
        </>
      )}

      {renderHumanFallback(advancedExecutor, 'advanced')}
    </>
  )
}

type OperatorId = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'

function stripQuotes(v: string): string {
  const s = String(v ?? '').trim()
  if (
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2) ||
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2)
  ) {
    return s.slice(1, -1)
  }
  return s
}

function quoteSingle(v: string): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  const escaped = s.split("'").join(String.raw`\'`)
  return `'${escaped}'`
}

type ValueType = 'boolean' | 'date' | 'datetime' | 'number' | 'string' | 'unknown'

interface LogicValueInputProps {
  valueType: ValueType
  rhs: string
  lhs: string
  activeOpId: OperatorId
  testId: string
  index: number
  stringEnumOptionsByExpression?: Record<string, string[]>
  valuePlaceholder: string
  onChangeExpr: (nextExpr: string) => void
  buildConditionExpression: (lhs: string, opId: OperatorId, rhs: string) => string
}

const LogicValueInput: React.FC<LogicValueInputProps> = ({
  valueType,
  rhs,
  lhs,
  activeOpId,
  testId,
  index,
  stringEnumOptionsByExpression,
  valuePlaceholder,
  onChangeExpr,
  buildConditionExpression
}) => {
  if (valueType === 'boolean') {
    return (
      <Select value={rhs || 'true'} onValueChange={v => onChangeExpr(buildConditionExpression(lhs, activeOpId, v))}>
        <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-logic-value-${index}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    )
  }
  if (valueType === 'date') {
    return (
      <Input
        type="date"
        value={stripQuotes(rhs).slice(0, 10)}
        onChange={e => {
          const raw = String(e.target.value || '').trim()
          onChangeExpr(buildConditionExpression(lhs, activeOpId, raw ? quoteSingle(raw) : ''))
        }}
        className="gba:h-8 gba:text-xs gba:bg-background"
        data-testid={`${testId}-logic-value-${index}`}
      />
    )
  }
  if (valueType === 'datetime') {
    const rawDt = stripQuotes(rhs)
    const noZ = rawDt.endsWith('Z') ? rawDt.slice(0, -1) : rawDt
    const dtSliced = noZ.length >= 16 ? noZ.slice(0, 16) : noZ
    const dtValue = rawDt ? dtSliced : ''
    return (
      <Input
        type="datetime-local"
        value={dtValue}
        onChange={e => {
          const raw = String(e.target.value || '').trim()
          onChangeExpr(buildConditionExpression(lhs, activeOpId, raw ? quoteSingle(raw) : ''))
        }}
        className="gba:h-8 gba:text-xs gba:bg-background"
        data-testid={`${testId}-logic-value-${index}`}
      />
    )
  }
  const enumOptions = valueType === 'string' ? stringEnumOptionsByExpression?.[String(lhs || '').trim()] : undefined
  if (Array.isArray(enumOptions) && enumOptions.length > 0) {
    const NONE = '__none__'
    const raw = stripQuotes(rhs)
    const value = raw || NONE
    const options = raw && !enumOptions.includes(raw) ? [raw, ...enumOptions] : enumOptions
    return (
      <Select
        value={value}
        onValueChange={v => onChangeExpr(buildConditionExpression(lhs, activeOpId, v === NONE ? '' : quoteSingle(v)))}
      >
        <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-logic-value-${index}`}>
          <SelectValue placeholder={valuePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      value={rhs}
      onChange={e => onChangeExpr(buildConditionExpression(lhs, activeOpId, e.target.value))}
      placeholder={valueType === 'number' ? 'e.g. 1000' : valuePlaceholder}
      className="gba:h-8 gba:text-xs gba:bg-background"
      data-testid={`${testId}-logic-value-${index}`}
    />
  )
}

type LogicDecisionConfigProps = {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  expressionSuggestionsOverride?: ExpressionSuggestionItem[]
  /** Optional string enum choices for RHS, keyed by LHS expression (without {{ }}). */
  stringEnumOptionsByExpression?: Record<string, string[]>
}

const LogicDecisionConfig: React.FC<LogicDecisionConfigProps> = ({
  config,
  update,
  mode,
  testId,
  expressionSuggestionsOverride,
  stringEnumOptionsByExpression
}) => {
  const { t } = useTranslation(translations)
  const conditions = config.logicConfig?.conditions ?? []
  const studioSuggestions = useStudioExpressionSuggestions()
  const expressionSuggestions = expressionSuggestionsOverride ?? studioSuggestions

  const stepValueSuggestions = useMemo(
    () => expressionSuggestions.filter(s => s.source === 'steps' || s.source === 'trigger'),
    [expressionSuggestions]
  )

  const OPERATORS_BY_TYPE: Record<ValueType, Array<{ id: OperatorId; label: string }>> = useMemo(
    () => ({
      number: [
        { id: 'eq', label: '==' },
        { id: 'neq', label: '!=' },
        { id: 'gt', label: '>' },
        { id: 'gte', label: '>=' },
        { id: 'lt', label: '<' },
        { id: 'lte', label: '<=' }
      ],
      date: [
        { id: 'eq', label: 'On (==)' },
        { id: 'neq', label: 'Not on (!=)' },
        { id: 'lt', label: 'Before (<)' },
        { id: 'lte', label: 'On or before (<=)' },
        { id: 'gt', label: 'After (>)' },
        { id: 'gte', label: 'On or after (>=)' }
      ],
      datetime: [
        { id: 'eq', label: 'On (==)' },
        { id: 'neq', label: 'Not on (!=)' },
        { id: 'lt', label: 'Before (<)' },
        { id: 'lte', label: 'On or before (<=)' },
        { id: 'gt', label: 'After (>)' },
        { id: 'gte', label: 'On or after (>=)' }
      ],
      boolean: [
        { id: 'eq', label: 'Is (==)' },
        { id: 'neq', label: 'Is not (!=)' }
      ],
      string: [
        { id: 'eq', label: 'Equals (==)' },
        { id: 'neq', label: 'Not equals (!=)' },
        { id: 'contains', label: 'Contains' },
        { id: 'not_contains', label: 'Does not contain' },
        { id: 'starts_with', label: 'Starts with' },
        { id: 'ends_with', label: 'Ends with' }
      ],
      unknown: [
        { id: 'eq', label: '==' },
        { id: 'neq', label: '!=' }
      ]
    }),
    []
  )

  const opIdToSymbol = useCallback((id: OperatorId): string => {
    switch (id) {
      case 'eq':
        return '=='
      case 'neq':
        return '!='
      case 'gt':
        return '>'
      case 'gte':
        return '>='
      case 'lt':
        return '<'
      case 'lte':
        return '<='
      default:
        return '=='
    }
  }, [])

  const symbolToOpId = useCallback((symbol: string): OperatorId => {
    switch (symbol) {
      case '==':
        return 'eq'
      case '!=':
        return 'neq'
      case '>':
        return 'gt'
      case '>=':
        return 'gte'
      case '<':
        return 'lt'
      case '<=':
        return 'lte'
      default:
        return 'eq'
    }
  }, [])

  const parseCondition = useCallback(
    (expression: string): { lhs: string; opId: OperatorId; rhs: string } => {
      const raw = String(expression || '').trim()
      if (!raw) return { lhs: '', opId: 'eq', rhs: '' }

      // Basic comparisons: {{lhs}} <op> rhs
      const cmp = /^\s*\{\{([^}]*)\}\}\s*(==|!=|>=|<=|>|<)\s*(.*)/.exec(raw)
      if (cmp) {
        return {
          lhs: (cmp[1] || '').trim(),
          opId: symbolToOpId(String(cmp[2] || '==').trim()),
          rhs: (cmp[3] || '').trim()
        }
      }

      // String contains / startsWith / endsWith
      const contains = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.includes\(([^)]*)\)\s*$/.exec(raw)
      if (contains) return { lhs: (contains[1] || '').trim(), opId: 'contains', rhs: (contains[2] || '').trim() }

      const notContains = /^!String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.includes\(([^)]*)\)\s*$/.exec(raw)
      if (notContains)
        return { lhs: (notContains[1] || '').trim(), opId: 'not_contains', rhs: (notContains[2] || '').trim() }

      const startsWith = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.startsWith\(([^)]*)\)\s*$/.exec(raw)
      if (startsWith)
        return { lhs: (startsWith[1] || '').trim(), opId: 'starts_with', rhs: (startsWith[2] || '').trim() }

      const endsWith = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.endsWith\(([^)]*)\)\s*$/.exec(raw)
      if (endsWith) return { lhs: (endsWith[1] || '').trim(), opId: 'ends_with', rhs: (endsWith[2] || '').trim() }

      return { lhs: '', opId: 'eq', rhs: '' }
    },
    [symbolToOpId]
  )

  const buildConditionExpression = useCallback(
    (lhs: string, opId: OperatorId, rhs: string): string => {
      const cleanLhs = String(lhs || '').trim()
      const cleanRhs = String(rhs || '').trim()
      if (!cleanLhs) return ''

      if (opId === 'contains') {
        return `String({{${cleanLhs}}} || '').includes(${cleanRhs || "''"})`
      }
      if (opId === 'not_contains') {
        return `!String({{${cleanLhs}}} || '').includes(${cleanRhs || "''"})`
      }
      if (opId === 'starts_with') {
        return `String({{${cleanLhs}}} || '').startsWith(${cleanRhs || "''"})`
      }
      if (opId === 'ends_with') {
        return `String({{${cleanLhs}}} || '').endsWith(${cleanRhs || "''"})`
      }

      const symbol = opIdToSymbol(opId)
      if (!cleanRhs) return `{{${cleanLhs}}} ${symbol} `
      return `{{${cleanLhs}}} ${symbol} ${cleanRhs}`
    },
    [opIdToSymbol]
  )

  return (
    <>
      <p className="gba:text-xs gba:text-muted-foreground">
        {mode === 'simple' ? t('logic-description-simple') : t('logic-description-advanced')}
      </p>

      <div className="gba:flex gba:flex-col gba:gap-2">
        {conditions.map((condition, index) => {
          const parsed = parseCondition(condition.expression)
          const selected = stepValueSuggestions.find(s => s.expression === parsed.lhs)
          const valueType = String(selected?.dataType || 'unknown') as ValueType
          const operators = OPERATORS_BY_TYPE[valueType] ?? OPERATORS_BY_TYPE.unknown
          const activeOpId = operators.some(o => o.id === parsed.opId) ? parsed.opId : operators[0].id

          const handleSelectField = (item: (typeof stepValueSuggestions)[0]) => {
            const nextType = String(item.dataType || 'unknown') as ValueType
            const allowedOps = OPERATORS_BY_TYPE[nextType] ?? OPERATORS_BY_TYPE.unknown
            const nextOpId = allowedOps.some(o => o.id === parsed.opId) ? parsed.opId : allowedOps[0].id
            const nextExpr = buildConditionExpression(item.expression, nextOpId, parsed.rhs)
            const updated = [...conditions]
            updated[index] = { ...updated[index], expression: nextExpr }
            update({ logicConfig: { conditions: updated } })
          }

          return (
            <div
              key={condition.branchId + '-' + index}
              className="gba:flex gba:flex-col gba:gap-1.5 gba:p-3 gba:rounded-lg gba:bg-muted"
              data-testid={`${testId}-logic-condition-${index}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-xs gba:font-medium">
                  Condition {index + 1} → {config.branches.find(b => b.id === condition.branchId)?.label ?? 'Unlinked'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = conditions.filter((_, i) => i !== index)
                    update({ logicConfig: { conditions: updated } })
                  }}
                >
                  <Trash2 className="gba:h-3 gba:w-3" />
                </Button>
              </div>

              <div className="gba:flex gba:flex-col gba:gap-2">
                <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                      {t('logic-field-label')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="gba:w-full gba:justify-between gba:h-8 gba:text-xs gba:bg-background"
                          data-testid={`${testId}-logic-field-${index}`}
                        >
                          {selected ? selected.label : t('logic-field-placeholder')}
                          <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="gba:p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('logic-field-search')} />
                          <CommandEmpty>{t('logic-field-empty')}</CommandEmpty>
                          <CommandList>
                            <CommandGroup heading={t('logic-field-group-steps')}>
                              {stepValueSuggestions.map(item => (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() => handleSelectField(item)}
                                  value={`${item.label} ${item.expression}`}
                                >
                                  <span className="gba:flex gba:flex-col gba:min-w-0">
                                    <span className="gba:text-xs gba:font-medium gba:truncate">{item.label}</span>
                                    <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                      {item.expression}
                                    </span>
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                      {t('logic-operator-label')}
                    </Label>
                    <Select
                      value={activeOpId}
                      onValueChange={opId => {
                        const nextExpr = buildConditionExpression(parsed.lhs, opId as OperatorId, parsed.rhs)
                        const updated = [...conditions]
                        updated[index] = { ...updated[index], expression: nextExpr }
                        update({ logicConfig: { conditions: updated } })
                      }}
                    >
                      <SelectTrigger
                        className="gba:h-8 gba:text-xs gba:bg-background"
                        data-testid={`${testId}-logic-op-${index}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="gba:flex gba:flex-col gba:gap-1">
                    <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                      {t('logic-value-label')}
                    </Label>
                    <LogicValueInput
                      valueType={valueType}
                      rhs={parsed.rhs}
                      lhs={parsed.lhs}
                      activeOpId={activeOpId}
                      testId={testId}
                      index={index}
                      stringEnumOptionsByExpression={stringEnumOptionsByExpression}
                      valuePlaceholder={t('logic-value-placeholder')}
                      buildConditionExpression={buildConditionExpression}
                      onChangeExpr={nextExpr => {
                        const updated = [...conditions]
                        updated[index] = { ...updated[index], expression: nextExpr }
                        update({ logicConfig: { conditions: updated } })
                      }}
                    />
                  </div>
                </div>

                <span
                  className="gba:text-[10px] gba:text-muted-foreground"
                  data-testid={`${testId}-logic-preview-${index}`}
                >
                  {t('logic-preview')} <span className="gba:font-mono">{condition.expression || '—'}</span>
                </span>
              </div>

              <Select
                value={condition.branchId}
                onValueChange={v => {
                  const updated = [...conditions]
                  updated[index] = { ...updated[index], branchId: v }
                  update({ logicConfig: { conditions: updated } })
                }}
              >
                <SelectTrigger className="gba:h-8 gba:text-xs">
                  <SelectValue placeholder="Link to branch" />
                </SelectTrigger>
                <SelectContent>
                  {config.branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newCondition = {
              expression: '',
              branchId: config.branches[0]?.id ?? ''
            }
            update({
              logicConfig: {
                conditions: [...conditions, newCondition]
              }
            })
          }}
          data-testid={`${testId}-logic-add-condition`}
        >
          <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
          Add Condition
        </Button>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('decision-default-branch')}</Label>
        <Select value={config.defaultBranch ?? ''} onValueChange={v => update({ defaultBranch: v })}>
          <SelectTrigger data-testid={`${testId}-logic-default`}>
            <SelectValue placeholder="Select fallback branch" />
          </SelectTrigger>
          <SelectContent>
            {config.branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
