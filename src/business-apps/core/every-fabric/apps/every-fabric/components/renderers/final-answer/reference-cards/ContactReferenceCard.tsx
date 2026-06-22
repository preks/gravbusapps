import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { commChannelValue, getField, getStr, personName, type ReferenceCardProps } from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

/**
 * Rich contact card: avatar, name, job title, account, email — fetched by id
 * via the shared `useCustomerContact` hook.
 */
export const ContactReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, intentLabel } = useReferenceCardI18n()
  const { contact, loading } = useCustomerContact(accessToken, reference.id)

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
        data-testid="reference-card-contact"
      />
    )
  }

  const name = personName(contact) ?? reference.label ?? reference.id
  const firstName = getStr(contact, 'firstName') ?? name
  const lastName = getStr(contact, 'lastName') ?? ''
  const jobTitle = getStr(contact, 'jobPosition') ?? getStr(contact, 'jobTitle')
  const photo = getStr(contact, 'pictureThumbnail') ?? getStr(contact, 'picture')

  const accountContacts = getField(contact, 'accountContacts')
  const firstAccount = Array.isArray(accountContacts) ? accountContacts[0] : undefined
  const accountName = getStr(getField(contact, 'account'), 'name') ?? getStr(getField(firstAccount, 'account'), 'name')

  // Email/phone live in `communicationChannels`, not as top-level scalars —
  // reading `contact.email` (as before) always came back empty.
  const channels = getField(contact, 'communicationChannels')
  const email = commChannelValue(channels, 'email')
  const phone = commChannelValue(channels, 'mobile') ?? commChannelValue(channels, 'phone')
  const owner = personName(getField(contact, 'ownerEmployee'))

  const opportunityContacts = getField(contact, 'opportunityContacts')
  const firstOpportunity = Array.isArray(opportunityContacts) ? opportunityContacts[0] : undefined
  const opportunityName = getStr(getField(firstOpportunity, 'opportunity'), 'name')

  const candidates: Array<{ label: string; value: string }> = []
  if (accountName) candidates.push({ label: field('account'), value: accountName })
  if (email) candidates.push({ label: field('email'), value: email })
  if (phone) candidates.push({ label: field('phone'), value: phone })
  if (opportunityName) candidates.push({ label: field('opportunity'), value: opportunityName })
  if (owner) candidates.push({ label: field('owner'), value: owner })
  const fields = candidates.slice(0, 4)

  const subtitleParts = [context, jobTitle].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      icon={<AvatarWithInitials firstName={firstName} lastName={lastName} pictureThumbnail={photo} size={40} />}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-contact"
    />
  )
}

export default ContactReferenceCard
