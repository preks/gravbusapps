// Flows tab: lists every workflow the run triggered (with a live status badge
// and step progress) and renders the full FlowDetailPanel for the selected one.
// Offers two views, a list+detail layout and a timeline (Gantt) reusing the
// shared case-management FlowGanttChart. Selection is controlled by the parent
// so the Actions & Records tab can deep-link into a specific flow via
// `onOpenFlow`.

import { ChartBarHorizontalIcon, FlowArrowIcon, ListBulletsIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'

import { FlowGanttChart } from '@/business-apps/common/apps/case-management/components/FlowGanttChart'

import { labelForStatusCode, variantForStatusCode, STATUS_BADGE_CLASS } from '../../../../utils/actionCardTrace'
import { useLiveFlowProgress } from '../../../../hooks/useLiveFlowProgress'
import { FlowDetailPanel } from '../../flow-detail/FlowDetailPanel'
import { FlowProgressBar } from '../../flow-detail/FlowProgressBar'
import { useFlowGanttData, type FlowEntry } from '../../flow-detail/useFlowGanttData'
import type { WorkforceRun, WorkforceRunDomainAction } from '../../workforceTypes'
import { resolveDomainActions } from '../runDetailFacts'
import { SectionTitle } from '../RunDetailSection'

export interface FlowsTabProps {
  run: WorkforceRun
  accessToken: string
  selectedFlowId: string | null
  onSelectFlow: (workflowId: string) => void
}

type FlowsViewMode = 'list' | 'timeline'

function toFlowEntries(actions: readonly WorkforceRunDomainAction[]): FlowEntry[] {
  const entries: FlowEntry[] = []
  const seen = new Set<string>()
  for (const action of actions) {
    if (action.domain !== 'flow') continue
    const workflowId = action.record_ids?.workflow_id
    if (!workflowId || seen.has(workflowId)) continue
    seen.add(workflowId)
    entries.push({
      workflowId,
      templateId: action.record_ids?.template_id,
      name: action.record_labels?.[workflowId] || 'Workflow',
      succeeded: action.succeeded
    })
  }
  return entries
}

const FlowListItem: React.FC<{
  entry: FlowEntry
  isSelected: boolean
  accessToken: string
  onSelect: (workflowId: string) => void
}> = ({ entry, isSelected, accessToken, onSelect }) => {
  const initialCode = entry.succeeded ? 'RUNNING' : 'FAILED'
  const live = useLiveFlowProgress({
    workflowId: entry.workflowId,
    accessToken,
    initialStatus: {
      code: initialCode,
      label: labelForStatusCode(initialCode),
      variant: variantForStatusCode(initialCode)
    },
    enabled: Boolean(entry.workflowId)
  })
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(entry.workflowId)}
        className={`gba:flex gba:w-full gba:flex-col gba:gap-1.5 gba:rounded-lg gba:border gba:p-2.5 gba:text-left gba:text-xs gba:transition-colors ${
          isSelected
            ? 'gba:border-primary/50 gba:bg-primary/5'
            : 'gba:border-border/60 gba:bg-card gba:hover:bg-muted/40'
        }`}
        data-testid="flow-list-item"
        data-selected={isSelected}
      >
        <span className="gba:truncate gba:font-medium gba:text-foreground">{entry.name}</span>
        <span
          className={`gba:inline-flex gba:w-fit gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${STATUS_BADGE_CLASS[live.status.variant]}`}
          data-status-code={live.status.code}
        >
          {live.status.variant === 'running' && (
            <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
          )}
          {live.status.label}
        </span>
        <FlowProgressBar
          completedSteps={live.completedSteps}
          totalSteps={live.totalSteps}
          percentage={live.percentage}
          variant={live.status.variant}
        />
      </button>
    </li>
  )
}

const ViewToggle: React.FC<{ value: FlowsViewMode; onChange: (mode: FlowsViewMode) => void }> = ({
  value,
  onChange
}) => {
  const buttonClass = (active: boolean): string =>
    `gba:inline-flex gba:h-7 gba:items-center gba:gap-1 gba:rounded gba:px-2 gba:text-xs gba:font-medium gba:transition-colors ${
      active ? 'gba:bg-card gba:text-foreground gba:shadow-sm' : 'gba:text-muted-foreground gba:hover:text-foreground'
    }`
  return (
    <div
      className="gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-md gba:bg-muted gba:p-0.5"
      data-testid="flows-view-toggle"
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        className={buttonClass(value === 'list')}
        aria-pressed={value === 'list'}
        data-testid="flows-view-list"
      >
        <ListBulletsIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange('timeline')}
        className={buttonClass(value === 'timeline')}
        aria-pressed={value === 'timeline'}
        data-testid="flows-view-timeline"
      >
        <ChartBarHorizontalIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
        Timeline
      </button>
    </div>
  )
}

export const FlowsTab: React.FC<FlowsTabProps> = ({ run, accessToken, selectedFlowId, onSelectFlow }) => {
  const flows = toFlowEntries(resolveDomainActions(run))
  const [viewMode, setViewMode] = useState<FlowsViewMode>('list')
  const ganttFlows = useFlowGanttData(flows, accessToken, viewMode === 'timeline')

  if (flows.length === 0) {
    return (
      <div className="gba:space-y-6">
        <section>
          <SectionTitle icon={FlowArrowIcon}>Flows</SectionTitle>
          <p className="gba:text-xs gba:italic gba:text-muted-foreground" data-testid="flows-tab-empty">
            This run did not trigger any workflows.
          </p>
        </section>
      </div>
    )
  }

  const effectiveSelectedId = flows.some(flow => flow.workflowId === selectedFlowId)
    ? selectedFlowId
    : flows[0].workflowId
  const selected = flows.find(flow => flow.workflowId === effectiveSelectedId) ?? flows[0]

  const handleOpenDetail = (workflowId: string): void => {
    onSelectFlow(workflowId)
    setViewMode('list')
  }

  return (
    <div className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:justify-between">
        <SectionTitle icon={FlowArrowIcon}>Flows</SectionTitle>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === 'timeline' ? (
        <div data-testid="flows-timeline">
          <FlowGanttChart flows={ganttFlows} onFlowClick={flow => handleOpenDetail(flow.workflowId)} readOnly />
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-4 lg:gba:flex-row">
          <ul className="gba:space-y-1.5 lg:gba:w-60 lg:gba:shrink-0" data-testid="flows-tab-list">
            {flows.map(flow => (
              <FlowListItem
                key={flow.workflowId}
                entry={flow}
                isSelected={flow.workflowId === selected.workflowId}
                accessToken={accessToken}
                onSelect={onSelectFlow}
              />
            ))}
          </ul>
          <div className="gba:min-w-0 gba:flex-1">
            <FlowDetailPanel
              key={selected.workflowId}
              workflowId={selected.workflowId}
              templateId={selected.templateId}
              workflowName={selected.name}
              accessToken={accessToken}
              succeeded={selected.succeeded}
            />
          </div>
        </div>
      )}
    </div>
  )
}
