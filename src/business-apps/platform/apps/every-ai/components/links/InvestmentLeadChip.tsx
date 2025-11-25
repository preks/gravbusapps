import React from 'react'

interface InvestmentLeadChipProps {
  investmentLeadId: string
  token: string
}

const InvestmentLeadChip: React.FC<InvestmentLeadChipProps> = ({ investmentLeadId }) => {
  const actualUrl = `/platform/irm/lead-record?leadId=${investmentLeadId}`

  return (
    <a
      href={actualUrl}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-success-secondary hover:gba:bg-success-secondary/80 gba:text-sm gba:cursor-pointer gba:border gba:border-success gba:transition-colors"
    >
      <svg className="gba:h-4 gba:w-4 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span className="gba:leading-none gba:text-success">Lead</span>
    </a>
  )
}

export default InvestmentLeadChip
