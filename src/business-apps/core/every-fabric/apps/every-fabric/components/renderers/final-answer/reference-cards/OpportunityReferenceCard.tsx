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
  personName,
  type ReferenceCardProps
} from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

/**
 * Rich opportunity card: name, amount, pipeline stage, close date, win chance,
 * and AI deal grade — fetched by id via the shared `useCustomerOpportunity`
 * hook.
 */
export const OpportunityReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, intentLabel } = useReferenceCardI18n()
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
  const aiScore = getNum(opportunity, 'aiOpportunityScore')
  const owner = personName(getField(opportunity, 'ownerEmployee'))
  const forecast = catalogValue(getField(opportunity, 'forecastCategory'))

  const opportunityAccounts = getField(opportunity, 'opportunityAccounts')
  const firstAccount = Array.isArray(opportunityAccounts) ? opportunityAccounts[0] : undefined
  const accountName =
    getStr(getField(firstAccount, 'account'), 'name') ?? getStr(getField(opportunity, 'account'), 'name')

  const candidates: Array<{ label: string; value: string }> = []
  if (accountName) candidates.push({ label: field('account'), value: accountName })
  if (amount) candidates.push({ label: field('amount'), value: amount })
  if (closeDate) candidates.push({ label: field('close'), value: closeDate })
  if (winChance !== undefined) candidates.push({ label: field('win'), value: `${winChance}%` })
  if (owner) candidates.push({ label: field('owner'), value: owner })
  if (forecast) candidates.push({ label: field('forecast'), value: forecast })
  if (aiGrade || aiScore !== undefined) {
    const value = [aiGrade, aiScore !== undefined ? `${aiScore}` : undefined].filter(Boolean).join(' · ')
    candidates.push({ label: field('ai-grade'), value })
  }
  const fields = candidates.slice(0, 4)

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
