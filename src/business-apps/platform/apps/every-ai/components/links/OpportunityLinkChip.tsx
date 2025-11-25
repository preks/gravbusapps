import React from 'react'

interface OpportunityLinkChipProps {
  opportunityId: string
  token: string
}

const OpportunityLinkChip: React.FC<OpportunityLinkChipProps> = ({ opportunityId }) => {
  return (
    <a
      href={`/platform/crm/opportunity-record?opportunityId=${opportunityId}`}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
    >
      <span>💰</span>
      <span className="gba:leading-none">Opportunity</span>
    </a>
  )
}

export default OpportunityLinkChip
