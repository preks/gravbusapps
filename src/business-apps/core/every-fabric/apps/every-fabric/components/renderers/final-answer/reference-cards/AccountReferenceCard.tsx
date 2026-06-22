import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  catalogValue,
  commChannelValue,
  getField,
  getStr,
  personName,
  type ReferenceCardProps
} from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

/**
 * Rich account/company card: logo, name, industry, owner, priority — fetched
 * by id via the shared `useCustomerAccount` hook (also used by Customer-360).
 */
export const AccountReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, intentLabel } = useReferenceCardI18n()
  const { account, loading } = useCustomerAccount(accessToken, reference.id)

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
        data-testid="reference-card-account"
      />
    )
  }

  const name = getStr(account, 'name') ?? reference.label ?? reference.id
  const industry = catalogValue(getField(account, 'industryClass'))
  const priority = catalogValue(getField(account, 'accountPriority'))
  const owner = personName(getField(account, 'ownerEmployee'))
  const website = getStr(account, 'website')
  const logo = getStr(account, 'pictureThumbnail') ?? getStr(account, 'picture')

  const size = catalogValue(getField(account, 'companySize')) ?? catalogValue(getField(account, 'numberOfEmployees'))
  const revenue =
    catalogValue(getField(account, 'accountAnnualRevenueBand')) ?? catalogValue(getField(account, 'annualRevenue'))
  const addresses = getField(account, 'addresses')
  const firstAddress = Array.isArray(addresses) ? addresses[0] : undefined
  const location = [
    getStr(firstAddress, 'city') ?? getStr(firstAddress, 'locality'),
    catalogValue(getField(firstAddress, 'country')) ?? getStr(firstAddress, 'country')
  ]
    .filter(Boolean)
    .join(', ')
  const channels = getField(account, 'communicationChannels')
  const phone = commChannelValue(channels, 'phone')

  // Keep the card compact: surface the four most useful facts.
  const candidates: Array<{ label: string; value: string }> = []
  if (owner) candidates.push({ label: field('owner'), value: owner })
  if (location) candidates.push({ label: field('location'), value: location })
  if (size) candidates.push({ label: field('size'), value: size })
  if (revenue) candidates.push({ label: field('revenue'), value: revenue })
  if (phone) candidates.push({ label: field('phone'), value: phone })
  if (website) candidates.push({ label: field('website'), value: website })
  const fields = candidates.slice(0, 4)

  const subtitleParts = [context, industry].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      status={priority}
      icon={<AvatarWithInitials firstName={name} lastName="" pictureThumbnail={logo} size={40} />}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-account"
    />
  )
}

export default AccountReferenceCard
