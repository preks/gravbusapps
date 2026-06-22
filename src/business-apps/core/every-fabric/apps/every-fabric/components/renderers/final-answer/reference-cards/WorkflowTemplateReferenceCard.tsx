import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useFlowTemplateReference } from './hooks/flowReferenceHooks'
import { dataStr, getField, getNum, getStr, type ReferenceCardProps } from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

const TEMPLATE_GLYPH = tileGlyph('M6 3h9l3 3v15H6V3zm3 7h6M9 14h6M9 18h3')

/**
 * Workflow template card: leads with the template name + a Draft badge, plus
 * step count and version — what you need to decide whether to launch it.
 */
export const WorkflowTemplateReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, countChip, relativeOrShortDate, versionLabel, t } = useReferenceCardI18n()
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
  if (stepsLabel) fields.push({ label: field('steps'), value: stepsLabel })
  if (version !== undefined) fields.push({ label: field('version'), value: versionLabel(version) })
  if (updated) fields.push({ label: field('updated'), value: updated })

  return (
    <EntityCard
      title={title}
      subtitle={t('renderer-ref-type-workflow-template')}
      status={isDraft ? t('renderer-ref-status-draft') : undefined}
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
