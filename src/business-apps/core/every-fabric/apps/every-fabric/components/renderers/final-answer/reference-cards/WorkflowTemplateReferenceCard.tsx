import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useFlowTemplateReference } from './hooks/flowReferenceHooks'
import {
  countChip,
  dataStr,
  getField,
  getNum,
  getStr,
  relativeOrShortDate,
  type ReferenceCardProps
} from './referenceCardUtils'

const TEMPLATE_GLYPH = tileGlyph('M6 3h9l3 3v15H6V3zm3 7h6M9 14h6M9 18h3')

/**
 * Workflow template card: leads with the template name + a Draft badge, plus
 * step count and version — what you need to decide whether to launch it.
 */
export const WorkflowTemplateReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { data, loading } = useFlowTemplateReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={TEMPLATE_GLYPH} accent="indigo" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-workflow-template"
      />
    )
  }

  const template = getField(data, 'template')
  const metadata = getField(data, 'metadata')

  const title = getStr(template, 'name') ?? reference.label ?? dataStr(reference.data, 'title') ?? reference.id
  const description = getStr(template, 'description')
  const steps = getField(template, 'steps')
  const stepCount = Array.isArray(steps) ? steps.length : undefined
  const version = getNum(template, 'version')
  const isDraft = getField(metadata, 'isDraft') === true
  const updated = relativeOrShortDate(getStr(metadata, 'updatedAt'))

  const fields: Array<{ label: string; value: string }> = []
  const stepsLabel = countChip(stepCount, 'step')
  if (stepsLabel) fields.push({ label: 'Steps', value: stepsLabel })
  if (version !== undefined) fields.push({ label: 'Version', value: `v${version}` })
  if (updated) fields.push({ label: 'Updated', value: updated })

  return (
    <EntityCard
      title={title}
      subtitle="Workflow template"
      status={isDraft ? 'Draft' : undefined}
      description={description}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-workflow-template"
    />
  )
}

export default WorkflowTemplateReferenceCard
