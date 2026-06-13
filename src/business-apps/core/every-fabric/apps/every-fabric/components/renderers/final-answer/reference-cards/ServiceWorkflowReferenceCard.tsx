import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useFlowReference } from './hooks/flowReferenceHooks'
import {
  dataStr,
  getField,
  getNum,
  getStr,
  humanizeToken,
  relativeOrShortDate,
  type ReferenceCardProps
} from './referenceCardUtils'

const WORKFLOW_GLYPH = tileGlyph(
  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
)

/**
 * Running workflow card: leads with flow name + status, and a progress bar
 * footer showing how many steps are complete — the most useful at-a-glance
 * signal for an in-flight process.
 */
export const ServiceWorkflowReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { data: flow, loading } = useFlowReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={WORKFLOW_GLYPH} accent="violet" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-service-workflow"
      />
    )
  }

  const title = getStr(flow, 'name') ?? reference.label ?? dataStr(reference.data, 'title') ?? reference.id
  const status = humanizeToken(getStr(flow, 'status'))
  const created = relativeOrShortDate(getStr(flow, 'createdAt'))

  const progress = getField(flow, 'progress')
  const completedSteps = getNum(progress, 'completedSteps')
  const totalSteps = getNum(progress, 'totalSteps')
  const percentage =
    getNum(progress, 'percentage') ??
    (completedSteps !== undefined && totalSteps ? Math.round((completedSteps / totalSteps) * 100) : undefined)

  const fields: Array<{ label: string; value: string }> = []
  if (created) fields.push({ label: 'Started', value: created })

  const footer =
    completedSteps !== undefined && totalSteps ? (
      <div className="gba:space-y-1.5">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
            Progress
          </span>
          <span className="gba:text-xs gba:font-semibold gba:text-foreground">
            {completedSteps} of {totalSteps} steps
          </span>
        </div>
        <div className="gba:h-1.5 gba:w-full gba:rounded-full gba:bg-violet-100 gba:overflow-hidden">
          <div
            className="gba:h-full gba:rounded-full gba:bg-violet-500 gba:transition-all"
            style={{ width: `${Math.max(0, Math.min(100, percentage ?? 0))}%` }}
          />
        </div>
      </div>
    ) : undefined

  return (
    <EntityCard
      title={title}
      subtitle="Workflow"
      status={status}
      icon={icon}
      fields={fields.length ? fields : undefined}
      footer={footer}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-service-workflow"
    />
  )
}

export default ServiceWorkflowReferenceCard
