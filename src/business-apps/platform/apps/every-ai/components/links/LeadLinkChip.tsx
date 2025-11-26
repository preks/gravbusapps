import React from 'react'

interface LeadLinkChipProps {
  leadId: string
  token: string
}

const LeadLinkChip: React.FC<LeadLinkChipProps> = ({ leadId }) => {
  return (
    <a
      href={`/platform/crm/lead-record?leadId=${leadId}`}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
    >
      <span>⚡</span>
      <span className="gba:leading-none">Lead</span>
    </a>
  )
}

export default LeadLinkChip
