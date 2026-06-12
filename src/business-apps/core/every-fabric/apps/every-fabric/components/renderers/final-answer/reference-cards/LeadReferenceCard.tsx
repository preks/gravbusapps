import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  catalogValue,
  getField,
  getNum,
  getStr,
  intentLabel,
  personName,
  type ReferenceCardProps
} from './referenceCardUtils'

/**
 * Rich lead card: name, company, status, source, and AI lead score/grade —
 * fetched by id via the shared `useCustomerLead` hook.
 */
export const LeadReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { lead, loading } = useCustomerLead(accessToken, reference.id)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const context = intentLabel(reference.intent)

  if (loading) {
    return (
      <EntityCard title={reference.label || reference.id} isLoading onClick={open} data-testid="reference-card-lead" />
    )
  }

  const company = getStr(lead, 'companyName')
  const name = personName(lead) ?? company ?? reference.label ?? reference.id
  const firstName = getStr(lead, 'firstName') ?? name
  const lastName = getStr(lead, 'lastName') ?? ''
  const status = catalogValue(getField(lead, 'leadStatus'))
  const source = catalogValue(getField(lead, 'leadSource'))
  const aiScore = getNum(lead, 'aiLeadScore')
  const aiGrade = getStr(lead, 'aiLeadGrade')

  const fields: Array<{ label: string; value: string }> = []
  if (company) fields.push({ label: 'Company', value: company })
  if (source) fields.push({ label: 'Source', value: source })
  if (aiScore !== undefined || aiGrade) {
    const value = [aiGrade, aiScore !== undefined ? `${aiScore}` : undefined].filter(Boolean).join(' · ')
    fields.push({ label: 'AI score', value })
  }

  const subtitleParts = [context, company].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      status={status}
      icon={<AvatarWithInitials firstName={firstName} lastName={lastName} size={44} />}
      fields={fields.length ? fields : undefined}
      onClick={open}
      data-testid="reference-card-lead"
    />
  )
}

export default LeadReferenceCard
