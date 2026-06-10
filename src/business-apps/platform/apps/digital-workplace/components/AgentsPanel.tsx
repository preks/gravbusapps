import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { RobotIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useWorkforceLiveActivity } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/useWorkforceLiveActivity'
import {
  runStatusVisual,
  shortenInput
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/runDisplay'
import type { WorkforceActiveRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WorkplacePanel from './WorkplacePanel'
import { WorkforceHitlDialog } from './WorkforceHitlDialog'
import type { WorkplacePanelBaseProps } from '../types'

const TEST_ID = 'digital-workplace-agents'

function openRun(run: WorkforceActiveRun): void {
  if (!run.agent_id) {
    navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
    return
  }
  navigateTo(
    buildPlatformUrl(Navigation.EVERY_FABRIC, {
      view: 'enterprise-workforce',
      agentId: run.agent_id,
      tab: 'runs',
      runId: run.session_id
    })
  )
}

interface AgentRowProps {
  run: WorkforceActiveRun
  detail: string
  onSelect: (run: WorkforceActiveRun) => void
}

const AgentRow: React.FC<AgentRowProps> = ({ run, detail, onSelect }) => {
  const visual = runStatusVisual(run.status)
  return (
    <button
      type="button"
      onClick={() => onSelect(run)}
      className="gba:flex gba:w-full gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
      data-testid={`${TEST_ID}-run-${run.session_id}`}
    >
      <RobotIcon className="gba:mt-0.5 gba:size-4 gba:shrink-0 gba:text-muted-foreground" />
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
            {run.display_name || run.agent_id}
          </span>
          <Badge variant="outline" size="sm" className={`gba:shrink-0 ${visual.pillClass}`}>
            {visual.label}
          </Badge>
        </div>
        <p className="gba:mt-0.5 gba:line-clamp-2 gba:text-xs gba:text-muted-foreground">{detail}</p>
      </div>
    </button>
  )
}

/** Live Agent Workforce: HITL runs that need the user first, then working runs. */
const AgentsPanel: React.FC<WorkplacePanelBaseProps> = ({ context, onMetric, className }) => {
  const { t } = useWorkplaceTranslation()
  const { overview, totalWorking } = useWorkforceLiveActivity(context.accessToken)

  const [activeRun, setActiveRun] = useState<WorkforceActiveRun | null>(null)

  const runs = useMemo(() => overview?.runs ?? [], [overview])
  const waiting = useMemo(() => runs.filter(run => run.status === 'waiting_for_human'), [runs])
  const working = useMemo(() => runs.filter(run => run.status !== 'waiting_for_human'), [runs])

  useEffect(() => {
    onMetric('agentsWaiting', waiting.length)
  }, [waiting.length, onMetric])

  useEffect(() => {
    onMetric('agentsWorking', totalWorking)
  }, [totalWorking, onMetric])

  // HITL runs open inline so the user can respond without leaving the desk;
  // runs that are merely working have no pending prompt, so jump to the full
  // run detail in the workforce instead.
  const handleSelect = useCallback((run: WorkforceActiveRun) => {
    if (run.status === 'waiting_for_human') {
      setActiveRun(run)
      return
    }
    openRun(run)
  }, [])

  return (
    <>
      <WorkplacePanel
        title={t('agents-title')}
        icon={RobotIcon}
        count={runs.length}
        onTitleClick={() => navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))}
        titleActionLabel={t('agents-open')}
        className={className}
        testId={TEST_ID}
        errorTitle={t('error-title')}
        isEmpty={runs.length === 0}
        emptyTitle={t('agents-empty-title')}
        emptyDescription={t('agents-empty-desc')}
      >
        <div className="gba:flex gba:flex-col gba:gap-4">
          {waiting.length > 0 ? (
            <section className="gba:flex gba:flex-col gba:gap-2" data-testid={`${TEST_ID}-waiting`}>
              <h3 className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
                {t('agents-waiting-section')}
              </h3>
              {waiting.map(run => (
                <AgentRow
                  key={run.session_id}
                  run={run}
                  detail={run.pending_human_question || t('agents-waiting-default')}
                  onSelect={handleSelect}
                />
              ))}
            </section>
          ) : null}

          {working.length > 0 ? (
            <section className="gba:flex gba:flex-col gba:gap-2" data-testid={`${TEST_ID}-working`}>
              <h3 className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground">
                {t('agents-working-section')}
              </h3>
              {working.map(run => (
                <AgentRow
                  key={run.session_id}
                  run={run}
                  detail={run.current_activity || shortenInput(run.input, 80) || t('agents-no-activity')}
                  onSelect={handleSelect}
                />
              ))}
            </section>
          ) : null}
        </div>
      </WorkplacePanel>

      <WorkforceHitlDialog
        open={activeRun !== null}
        sessionId={activeRun?.session_id ?? null}
        agentId={activeRun?.agent_id ?? null}
        agentName={activeRun?.display_name || activeRun?.agent_id || ''}
        accessToken={context.accessToken}
        onClose={() => setActiveRun(null)}
      />
    </>
  )
}

export default AgentsPanel
export { AgentsPanel }
