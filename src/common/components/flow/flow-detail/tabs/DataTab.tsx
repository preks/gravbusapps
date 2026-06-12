import React, { useState, useEffect, useMemo } from 'react'
import { Badge, Alert, Spinner, Button } from '@newwork/nw-design-system'
import { FileText, Download, AlertCircle } from 'lucide-react'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import type { StepDataResponse } from '@/common/network/flows/useFlowProgressClient'
import { useEmployeeAvatarsBatch } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'
import { buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import type { FlowDetailData, FlowStep, FlowTriggerData, StepAssignmentInfo } from '../types'
import { useResolvedActorNames } from '../useResolvedActorNames'
import { SingleFormData, StepDataView, buildStepDataTableRows } from './stepDataRendering'

interface DataTabProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
  stepAssignmentsByStepIndex: Record<number, StepAssignmentInfo>
  accessToken?: string
}

interface SupportChip {
  label: string
  value: string
  href?: string
}

const ACTIVE_STEP_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'CLAIMED', 'ACTIVE'])

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  MANUAL_FORM: 'Manual form',
  WEBHOOK: 'Webhook',
  EVENT: 'Event',
  SCHEDULE: 'Scheduled',
  API_SCHEMA: 'API'
}

function formatTriggerTypeLabel(triggerType?: string): string {
  if (!triggerType) return 'Triggered'
  if (TRIGGER_TYPE_LABELS[triggerType]) return TRIGGER_TYPE_LABELS[triggerType]
  return triggerType
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

interface TriggerDataCardProps {
  triggerData: FlowTriggerData
  accessToken?: string
}

const TriggerDataCard: React.FC<TriggerDataCardProps> = ({ triggerData, accessToken }) => (
  <div
    className="gba:space-y-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4"
    data-testid="flow-detail-trigger-data-card"
  >
    <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
      <div className="gba:min-w-0 gba:flex-1">
        <h3 className="gba:text-base gba:font-semibold gba:text-foreground">Start</h3>
        {triggerData.initiatedBy ? (
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">Initiated by {triggerData.initiatedBy}</p>
        ) : null}
      </div>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Badge variant="outline" className="gba:text-xs">
          {formatTriggerTypeLabel(triggerData.triggerType)}
        </Badge>
        <Badge variant="secondary" className="gba:text-xs">
          1 record
        </Badge>
      </div>
    </div>
    <SingleFormData formData={triggerData.payload} accessToken={accessToken} />
  </div>
)

export const DataTab: React.FC<DataTabProps> = ({ flowData, flowSteps, stepAssignmentsByStepIndex, accessToken }) => {
  const [stepDataMap, setStepDataMap] = useState<Map<number, StepDataResponse>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const contextForClient = { accessToken } as Parameters<typeof useFlowProgressClient>[0]
  const { getStepDataByReference } = useFlowProgressClient(contextForClient)

  const assignmentUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          flowSteps.flatMap(step => [
            ...(stepAssignmentsByStepIndex[step.stepIndex]?.assignedUserIds || []),
            ...(step.assignedToIds || []),
            ...(step.eligibleUserIds || [])
          ])
        )
      ),
    [flowSteps, stepAssignmentsByStepIndex]
  )
  const actorNames = useResolvedActorNames(accessToken, assignmentUserIds)
  const { employeeMap } = useEmployeeAvatarsBatch(accessToken || '', assignmentUserIds)
  const supportChips = useMemo<SupportChip[]>(() => {
    const tags = flowData.supportTags
    if (!tags) return []
    return [
      tags.policyDocument
        ? {
            label: 'Policy',
            value: tags.policyDocumentTitle || tags.policyDocument,
            href: buildPlatformUrl(Navigation.CONTENT_ENTRY_RECORD, { contentId: tags.policyDocument })
          }
        : null,
      tags.team ? { label: 'Team', value: tags.teamName || tags.team } : null,
      tags.entity ? { label: 'Entity', value: tags.entityName || tags.entity } : null
    ].filter((chip): chip is SupportChip => Boolean(chip))
  }, [flowData.supportTags])

  const loadStepData = async () => {
    if (hasLoaded || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const stepDataPromises = flowSteps.map(async step => {
        try {
          const stepReference = `step_${step.stepIndex}`
          const stepData = await getStepDataByReference(flowData.flowId, stepReference, { limit: 20 })
          return { stepIndex: step.stepIndex, data: stepData }
        } catch (err) {
          console.warn(`Failed to load data for step ${step.stepIndex}:`, err)
          return null
        }
      })

      const stepDataResults = await Promise.all(stepDataPromises)
      const newStepDataMap = new Map<number, StepDataResponse>()

      stepDataResults.forEach(result => {
        if (result) {
          newStepDataMap.set(result.stepIndex, result.data)
        }
      })

      setStepDataMap(newStepDataMap)
      setHasLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load step data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (flowData.flowId && accessToken && flowSteps.length > 0) {
      void loadStepData()
    }
  }, [])

  const visibleSteps = flowSteps.filter(step => {
    const totalCount = stepDataMap.get(step.stepIndex)?.totalCount ?? 0
    const assigneeCount = new Set([
      ...(stepAssignmentsByStepIndex[step.stepIndex]?.assignedUserIds || []),
      ...(step.assignedToIds || []),
      ...(step.eligibleUserIds || [])
    ]).size
    const hasPendingAssignments =
      typeof step.totalTasks === 'number' &&
      typeof step.completedTasks === 'number' &&
      step.totalTasks > step.completedTasks

    return (
      totalCount > 0 ||
      (ACTIVE_STEP_STATUSES.has(step.status.toUpperCase()) && (assigneeCount > 0 || hasPendingAssignments))
    )
  })

  const hasTriggerData = Boolean(flowData.triggerData)
  const visibleEntryCount = visibleSteps.length + (hasTriggerData ? 1 : 0)
  const hasVisibleEntries = hasTriggerData || visibleSteps.length > 0

  return (
    <div className="gba:mt-0 gba:space-y-4">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <Badge variant="outline">
          {visibleEntryCount} {visibleEntryCount === 1 ? 'entry shown' : 'entries shown'}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          onClick={() => {
            const triggerRow = flowData.triggerData
              ? [
                  'start',
                  '"Start"',
                  flowData.triggerData.triggerType ?? 'TRIGGERED',
                  flowData.triggerData.initiatedBy ?? '',
                  '',
                  flowData.triggerData.initiatedAt ?? '',
                  1
                ].join(',')
              : null

            const csvContent = [
              ['Step ID', 'Title', 'Status', 'Assigned To', 'Due Date', 'Completed At', 'Data Records'].join(','),
              ...(triggerRow ? [triggerRow] : []),
              ...visibleSteps.map(step =>
                [
                  step.id,
                  `"${step.title}"`,
                  step.status,
                  step.assignedTo || '',
                  step.dueDate || '',
                  step.completedAt || '',
                  stepDataMap.get(step.stepIndex)?.totalCount || 0
                ].join(',')
              )
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `flow-${flowData.flowId}-steps.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          disabled={!hasVisibleEntries}
        >
          <Download className="gba:h-4 gba:w-4" />
          Export Step Data
        </Button>
      </div>

      {supportChips.length ? (
        <div
          className="gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2"
          data-testid="flow-detail-support-chips"
        >
          <div className="gba:mb-2 gba:text-xs gba:font-medium gba:text-muted-foreground">
            Support context for this workflow
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {supportChips.map(chip =>
              chip.href ? (
                <a
                  key={`${chip.label}-${chip.value}`}
                  href={chip.href}
                  className="gba:inline-flex"
                  data-testid={`flow-detail-support-chip-link-${chip.label.toLowerCase()}`}
                >
                  <Badge variant="secondary" className="gba:text-xs gba:cursor-pointer">
                    {chip.label}: {chip.value}
                  </Badge>
                </a>
              ) : (
                <Badge key={`${chip.label}-${chip.value}`} variant="secondary" className="gba:text-xs">
                  {chip.label}: {chip.value}
                </Badge>
              )
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Error Loading Step Data</h4>
            <p className="gba:mt-1 gba:text-sm">{error}</p>
          </div>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner className="gba:h-8 gba:w-8" />
          <span className="gba:ml-2 gba:text-muted-foreground">Loading step data...</span>
        </div>
      ) : hasVisibleEntries ? (
        <div className="gba:space-y-4">
          {flowData.triggerData ? (
            <TriggerDataCard triggerData={flowData.triggerData} accessToken={accessToken} />
          ) : null}
          {visibleSteps.map(step => {
            const stepData = stepDataMap.get(step.stepIndex)
            const tableRows = buildStepDataTableRows({
              step,
              stepData,
              stepAssignmentsByStepIndex,
              actorNames,
              employeeMap
            })

            return (
              <div
                key={step.id}
                className="gba:space-y-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4"
              >
                <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-3">
                  <div className="gba:min-w-0 gba:flex-1">
                    <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{step.title}</h3>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <Badge variant="outline" className="gba:text-xs">
                      {step.status}
                    </Badge>
                    <Badge variant="secondary" className="gba:text-xs">
                      {(stepData?.totalCount ?? 0) === 1 ? '1 record' : `${stepData?.totalCount ?? 0} records`}
                    </Badge>
                    {tableRows.length > 0 ? (
                      <Badge variant="outline" className="gba:text-xs">
                        {tableRows.length} {tableRows.length === 1 ? 'assignee' : 'assignees'}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {step.status !== 'COMPLETED' ? (
                  <Alert variant="default" className="gba:py-2">
                    <AlertCircle className="gba:h-4 gba:w-4" />
                    <div className="gba:text-sm">
                      Step is {step.status.toLowerCase().split('_').join(' ')} and currently shows captured partial
                      data.
                    </div>
                  </Alert>
                ) : null}

                <StepDataView
                  step={step}
                  stepData={stepData}
                  stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
                  actorNames={actorNames}
                  employeeMap={employeeMap}
                  accessToken={accessToken}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-4 gba:py-10 gba:text-center gba:text-sm gba:text-muted-foreground">
          <FileText className="gba:mx-auto gba:mb-2 gba:h-6 gba:w-6" />
          No step data captured yet.
        </div>
      )}
    </div>
  )
}
