import React from 'react'

interface ContactLinkChipProps {
  contactId: string
  token: string
}

const ContactLinkChip: React.FC<ContactLinkChipProps> = ({ contactId }) => {
  return (
    <a
      href={`/platform/crm/contact-record?contactId=${contactId}`}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
    >
      <span>👥</span>
      <span className="gba:leading-none">Contact</span>
    </a>
  )
}

export default ContactLinkChip
