import React, { useMemo } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ArrowLeft, Calendar, CheckCircle, Clock, ExternalLink, RefreshCw, User, UserCheck } from 'lucide-react'
import { formatDisplayText } from '@/common/utils/displayText'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { FlowDetailData, FlowStep } from './types'
import { useResolvedActorNames } from './useResolvedActorNames'
import { calculateRunningTimeFromStart, formatFlowDuration, getFlowStatusBadgeClass, getStatusEndLabel } from './utils'
import { CopyFlowShareLinkButton } from './CopyFlowShareLinkButton'

interface FlowDetailHeaderProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  accessToken?: string
  onBack?: () => void
  showBackButton?: boolean
  showFlowId?: boolean
  onRefresh: () => Promise<void>
  isRefreshing?: boolean
}

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

const ACTIVE_STEP_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'CLAIMED', 'ACTIVE'])
const NON_USER_ASSIGNEE_VALUES = new Set(['MULTIPLE', 'UNASSIGNED', 'AVAILABLE', 'PENDING'])

export const FlowDetailHeader: React.FC<FlowDetailHeaderProps> = ({
  flowData,
  flowSteps,
  accessToken,
  onBack,
  showBackButton = true,
  showFlowId = true,
  onRefresh,
  isRefreshing = false
}) => {
  const minutesRunning = flowData.timeInsights?.minutesRunning ?? calculateRunningTimeFromStart(flowData.startTime)
  const { label: durationLabel, duration } = formatFlowDuration(flowData, minutesRunning)
  const activeStep = useMemo(
    () =>
      flowSteps.find(step => ACTIVE_STEP_STATUSES.has(step.status.toUpperCase())) ??
      flowSteps.find(step => step.stepIndex === Math.max(flowData.currentStep - 1, 0)),
    [flowData.currentStep, flowSteps]
  )
  const currentStepSla = useMemo(() => {
    if (!activeStep) return null

    const slaTimestamp = activeStep.dueDate || activeStep.expectedFinishAt
    if (!slaTimestamp) return null

    return {
      label: 'Current step SLA',
      value: formatTimestamp(slaTimestamp)
    }
  }, [activeStep])
  const currentAssigneeId =
    activeStep?.assignedTo && !NON_USER_ASSIGNEE_VALUES.has(activeStep.assignedTo) ? activeStep.assignedTo : undefined
  const initiatorActorId = flowData.initiatedById || flowData.initiatedBy
  const actorNames = useResolvedActorNames(accessToken, [initiatorActorId, currentAssigneeId])
  const initiatedBy = initiatorActorId
    ? actorNames[initiatorActorId] || flowData.initiatedBy || initiatorActorId
    : 'System'
  const currentAssignee = currentAssigneeId ? actorNames[currentAssigneeId] || currentAssigneeId : undefined
  const flowStudioUrl = useMemo(() => {
    if (!flowData.templateId) return null

    return `${buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { flowId: flowData.templateId })}#flows`
  }, [flowData.templateId])

  return (
    <div className="gba:border-b gba:border-border gba:bg-background gba:px-0 gba:py-4">
      {showBackButton && onBack ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gba:mb-3 gba:flex gba:items-center gba:gap-2 gba:px-0"
          data-testid="flow-detail-back-button"
        >
          <ArrowLeft className="gba:h-4 gba:w-4" />
          Back to Flows
        </Button>
      ) : null}

      <div className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4">
        <div className="gba:flex gba:flex-col gba:gap-4">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <h1 className="gba:max-w-full gba:truncate gba:text-2xl gba:font-semibold gba:text-foreground">
                  {formatDisplayText(flowData.flowName, 'Unknown Workflow')}
                </h1>
                <Badge
                  className={`gba:border-none gba:text-xs gba:font-semibold ${getFlowStatusBadgeClass(flowData.status)}`}
                >
                  {flowData.status}
                </Badge>
              </div>
            </div>

            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
              <CopyFlowShareLinkButton
                flowId={flowData.flowId}
                label="Copy link"
                tooltip="Copy link to this flow"
                data-testid="flow-detail-copy-flow-link"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onRefresh()}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="flow-detail-refresh"
              >
                <RefreshCw className={`gba:h-4 gba:w-4 ${isRefreshing ? 'gba:animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="gba:flex gba:flex-wrap gba:items-stretch gba:gap-2">
            <MetaChip
              icon={<Calendar className="gba:h-4 gba:w-4" />}
              label="Started"
              value={formatTimestamp(flowData.startTime)}
            />
            <MetaChip icon={<Clock className="gba:h-4 gba:w-4" />} label={durationLabel} value={duration} />
            <MetaChip icon={<User className="gba:h-4 gba:w-4" />} label="Initiated by" value={initiatedBy} />
            {currentAssignee ? (
              <MetaChip icon={<UserCheck className="gba:h-4 gba:w-4" />} label="Assigned to" value={currentAssignee} />
            ) : null}
            {currentStepSla ? (
              <MetaChip
                icon={<Clock className="gba:h-4 gba:w-4" />}
                label={currentStepSla.label}
                value={currentStepSla.value}
              />
            ) : null}
            {['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(flowData.status) && flowData.endTime ? (
              <MetaChip
                icon={<CheckCircle className="gba:h-4 gba:w-4" />}
                label={getStatusEndLabel(flowData.status)}
                value={formatTimestamp(flowData.endTime)}
              />
            ) : null}
            {showFlowId ? <MetaChip label="Flow ID" value={flowData.flowId} isCode /> : null}
            {flowStudioUrl ? (
              <MetaLinkChip
                icon={<ExternalLink className="gba:h-4 gba:w-4" />}
                label="Flow template"
                href={flowStudioUrl}
                value="Open in Flow Studio"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetaChipProps {
  icon?: React.ReactNode
  label: string
  value: string
  isCode?: boolean
}

const MetaChip: React.FC<MetaChipProps> = ({ icon, label, value, isCode = false }) => (
  <div className="gba:flex gba:min-w-[160px] gba:max-w-full gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5">
    {icon ? <div className="gba:mt-0.5 gba:text-muted-foreground">{icon}</div> : null}
    <div className="gba:min-w-0">
      <div className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {label}
      </div>
      <div className={`gba:truncate gba:text-sm gba:font-medium gba:text-foreground ${isCode ? 'gba:font-mono' : ''}`}>
        {value}
      </div>
    </div>
  </div>
)

interface MetaLinkChipProps {
  icon?: React.ReactNode
  label: string
  href: string
  value: string
}

const MetaLinkChip: React.FC<MetaLinkChipProps> = ({ icon, label, href, value }) => (
  <a
    href={href}
    onClick={event => {
      event.preventDefault()
      navigateTo(href, { forceReload: true })
    }}
    className="gba:flex gba:min-w-[160px] gba:max-w-full gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5 gba:no-underline gba:transition-colors gba:hover:bg-muted/40"
    data-testid="flow-detail-flow-studio-link"
  >
    {icon ? <div className="gba:mt-0.5 gba:text-primary">{icon}</div> : null}
    <div className="gba:min-w-0">
      <div className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {label}
      </div>
      <div className="gba:truncate gba:text-sm gba:font-medium gba:text-primary">{value}</div>
    </div>
  </a>
)
