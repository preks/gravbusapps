import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getField, getStr, intentLabel, personName, type ReferenceCardProps } from './referenceCardUtils'

/**
 * Rich contact card: avatar, name, job title, account, email — fetched by id
 * via the shared `useCustomerContact` hook.
 */
export const ContactReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { contact, loading } = useCustomerContact(accessToken, reference.id)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const context = intentLabel(reference.intent)

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
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
  const email = getStr(contact, 'email')

  const fields: Array<{ label: string; value: string }> = []
  if (accountName) fields.push({ label: 'Account', value: accountName })
  if (email) fields.push({ label: 'Email', value: email })

  const subtitleParts = [context, jobTitle].filter(Boolean)

  return (
    <EntityCard
      title={name}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      icon={<AvatarWithInitials firstName={firstName} lastName={lastName} pictureThumbnail={photo} size={44} />}
      fields={fields.length ? fields : undefined}
      onClick={open}
      data-testid="reference-card-contact"
    />
  )
}

export default ContactReferenceCard
