import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  catalogValue,
  commChannelValue,
  getField,
  getNum,
  getStr,
  personName,
  type ReferenceCardProps
} from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

/**
 * Rich lead card: name, company, status, source, and AI lead score/grade —
 * fetched by id via the shared `useCustomerLead` hook.
 */
export const LeadReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, intentLabel } = useReferenceCardI18n()
  const { lead, loading } = useCustomerLead(accessToken, reference.id)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const context = intentLabel(reference.intent)

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-lead"
      />
    )
  }

  const company = getStr(lead, 'companyName')
  const name = personName(lead) ?? company ?? reference.label ?? reference.id
  const firstName = getStr(lead, 'firstName') ?? name
  const lastName = getStr(lead, 'lastName') ?? ''
  const status = catalogValue(getField(lead, 'leadStatus'))
  const source = catalogValue(getField(lead, 'leadSource'))
  const rating = catalogValue(getField(lead, 'leadRating'))
  const aiScore = getNum(lead, 'aiLeadScore')
  const aiGrade = getStr(lead, 'aiLeadGrade')
  const owner = personName(getField(lead, 'ownerEmployee'))
  const channels = getField(lead, 'communicationChannels')
  const email = commChannelValue(channels, 'email')
  const phone = commChannelValue(channels, 'mobile') ?? commChannelValue(channels, 'phone')
  const geography = [
    catalogValue(getField(lead, 'region')) ?? getStr(lead, 'region'),
    catalogValue(getField(lead, 'country')) ?? getStr(lead, 'country')
  ]
    .filter(Boolean)
    .join(', ')

  const candidates: Array<{ label: string; value: string }> = []
  if (company) candidates.push({ label: field('company'), value: company })
  if (owner) candidates.push({ label: field('owner'), value: owner })
  if (source) candidates.push({ label: field('source'), value: source })
  if (rating) candidates.push({ label: field('rating'), value: rating })
  if (geography) candidates.push({ label: field('region'), value: geography })
  if (email) candidates.push({ label: field('email'), value: email })
  else if (phone) candidates.push({ label: field('phone'), value: phone })
  if (aiScore !== undefined || aiGrade) {
    const value = [aiGrade, aiScore !== undefined ? `${aiScore}` : undefined].filter(Boolean).join(' · ')
    candidates.push({ label: field('ai-score'), value })
  }
  const fields = candidates.slice(0, 4)

  const subtitleParts = [context, company].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      status={status}
      icon={<AvatarWithInitials firstName={firstName} lastName={lastName} size={40} />}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-lead"
    />
  )
}

export default LeadReferenceCard
