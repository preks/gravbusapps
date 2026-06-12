import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import {
  getEntityIcon,
  getDefaultIcon
} from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityIcons'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  catalogValue,
  formatAmount,
  formatDate,
  getField,
  getNum,
  getStr,
  intentLabel,
  type ReferenceCardProps
} from './referenceCardUtils'

/**
 * Rich opportunity card: name, amount, pipeline stage, close date, win chance,
 * and AI deal grade — fetched by id via the shared `useCustomerOpportunity`
 * hook.
 */
export const OpportunityReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { opportunity, loading } = useCustomerOpportunity(accessToken, reference.id)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const context = intentLabel(reference.intent)
  const icon = getEntityIcon('opportunity')?.icon ?? getDefaultIcon()

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-opportunity"
      />
    )
  }

  const name = getStr(opportunity, 'name') ?? reference.label ?? reference.id
  const stage = catalogValue(getField(opportunity, 'opportunityPipelineStage'))
  const status = catalogValue(getField(opportunity, 'opportunityStatus'))
  const amount = formatAmount(getNum(opportunity, 'estimatedAmount'), catalogValue(getField(opportunity, 'currency')))
  const closeDate = formatDate(getStr(opportunity, 'closeDate'))
  const winChance = getNum(opportunity, 'winningChance')
  const aiGrade = getStr(opportunity, 'aiOpportunityGrade')

  const fields: Array<{ label: string; value: string }> = []
  if (amount) fields.push({ label: 'Amount', value: amount })
  if (closeDate) fields.push({ label: 'Close', value: closeDate })
  if (winChance !== undefined) fields.push({ label: 'Win', value: `${winChance}%` })
  if (aiGrade) fields.push({ label: 'AI grade', value: aiGrade })

  const subtitleParts = [context, stage].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      status={status}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-opportunity"
    />
  )
}

export default OpportunityReferenceCard
