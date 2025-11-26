import React from 'react'

interface InvestmentAccountLinkChipProps {
  investmentAccountId: string
  token: string
}

const InvestmentAccountLinkChip: React.FC<InvestmentAccountLinkChipProps> = ({ investmentAccountId }) => {
  const actualUrl = `/platform/irm/account-record?accountId=${investmentAccountId}`

  return (
    <a
      href={actualUrl}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
    >
      <svg className="gba:h-4 gba:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <span className="gba:leading-none">Account</span>
    </a>
  )
}

export default InvestmentAccountLinkChip
