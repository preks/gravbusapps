// Tabbed layout for the run/session detail. Owns the active tab and the
// selected flow id; clicking a flow row in Actions & Records selects that flow
// and switches to the Flows tab.
//
// Uses the design-system `TabNav`/`TabNavLink` (underline navigation) so the
// tabs read as a single bar under the header instead of a separated pill group.

import { TabNav, TabNavLink, useTranslation } from '@newwork/nw-design-system'
import React, { useCallback, useState } from 'react'

import type { WorkforceRun, WorkforceRunTraceEvent } from '../workforceTypes'
import { ActionsRecordsTab } from './tabs/ActionsRecordsTab'
import { DiagnosticsTab } from './tabs/DiagnosticsTab'
import { FlowsTab } from './tabs/FlowsTab'
import { OverviewTab } from './tabs/OverviewTab'
import translations from '../../../_i18n'

export interface RunDetailTabsProps {
  run: WorkforceRun
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  errorMessage?: string | null
  onRefreshRun?: () => Promise<void>
}

type RunDetailTabValue = 'overview' | 'actions' | 'flows' | 'diagnostics'

const TAB_DEFS: ReadonlyArray<{ value: RunDetailTabValue; labelKey: string }> = [
  { value: 'overview', labelKey: 'run-tab-overview' },
  { value: 'actions', labelKey: 'run-tab-actions' },
  { value: 'flows', labelKey: 'run-tab-flows' },
  { value: 'diagnostics', labelKey: 'run-tab-diagnostics' }
]

export const RunDetailTabs: React.FC<RunDetailTabsProps> = ({
  run,
  accessToken,
  trace,
  errorMessage,
  onRefreshRun
}) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<RunDetailTabValue>('overview')
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  const handleOpenFlow = useCallback((workflowId: string) => {
    setSelectedFlowId(workflowId)
    setActiveTab('flows')
  }, [])

  const renderActivePanel = () => {
    if (activeTab === 'actions') {
      return <ActionsRecordsTab run={run} accessToken={accessToken} trace={trace} onOpenFlow={handleOpenFlow} />
    }
    if (activeTab === 'flows') {
      return (
        <FlowsTab
          run={run}
          accessToken={accessToken}
          trace={trace}
          selectedFlowId={selectedFlowId}
          onSelectFlow={setSelectedFlowId}
        />
      )
    }
    if (activeTab === 'diagnostics') {
      return <DiagnosticsTab run={run} accessToken={accessToken} trace={trace} />
    }
    return <OverviewTab run={run} accessToken={accessToken} errorMessage={errorMessage} onRefreshRun={onRefreshRun} />
  }

  return (
    <div className="gba:w-full">
      <TabNav showBorder className="gba:mb-5" data-testid="run-detail-tabs-list">
        {TAB_DEFS.map(tab => (
          <TabNavLink
            key={tab.value}
            href={`#${tab.value}`}
            active={activeTab === tab.value}
            onClick={(event: React.MouseEvent) => {
              event.preventDefault()
              setActiveTab(tab.value)
            }}
            data-testid={`run-detail-tab-${tab.value}`}
          >
            {t(tab.labelKey)}
          </TabNavLink>
        ))}
      </TabNav>

      <div data-testid={`run-detail-tab-panel-${activeTab}`}>{renderActivePanel()}</div>
    </div>
  )
}
