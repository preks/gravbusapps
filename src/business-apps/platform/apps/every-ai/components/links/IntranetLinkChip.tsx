import React from 'react'

interface IntranetLinkChipProps {
  url: string
  token: string
}

const IntranetLinkChip: React.FC<IntranetLinkChipProps> = ({ url }) => {
  const actualUrl = `/platform/knowledge/${url}`

  return (
    <a
      href={actualUrl}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-info-secondary hover:gba:bg-info-secondary/80 gba:text-sm gba:cursor-pointer gba:border gba:border-info gba:transition-colors"
    >
      <svg className="gba:h-4 gba:w-4 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="gba:leading-none gba:text-info">Article</span>
    </a>
  )
}

export default IntranetLinkChip
