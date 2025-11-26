import React from 'react'

interface AccountLinkChipProps {
  accountId: string
  token: string
}

const AccountLinkChip: React.FC<AccountLinkChipProps> = ({ accountId }) => {
  return (
    <a
      href={`/platform/crm/account-record?accountId=${accountId}`}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
    >
      <span>🏢</span>
      <span className="gba:leading-none">Account</span>
    </a>
  )
}

export default AccountLinkChip
