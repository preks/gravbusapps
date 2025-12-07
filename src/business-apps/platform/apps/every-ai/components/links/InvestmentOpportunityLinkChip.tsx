import React from 'react'

interface InvestmentOpportunityLinkChipProps {
  investmentOpportunityId: string
  token: string
}

const InvestmentOpportunityLinkChip: React.FC<InvestmentOpportunityLinkChipProps> = ({ investmentOpportunityId }) => {
  const actualUrl = `/platform/irm/opportunity-record?opportunityId=${investmentOpportunityId}`

  return (
    <a
      href={actualUrl}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-ai-secondary hover:gba:bg-ai-secondary/80 gba:text-sm gba:cursor-pointer gba:border gba:border-ai gba:transition-colors"
    >
      <svg className="gba:h-4 gba:w-4 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="gba:leading-none gba:text-ai">Opportunity</span>
    </a>
  )
}

export default InvestmentOpportunityLinkChip
