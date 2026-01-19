import React from 'react'

interface SummarySectionProps {
  title?: string
  children?: React.ReactNode
  'data-testid'?: string
}

const SummarySection: React.FC<SummarySectionProps> = ({ title = 'AI Summary', children, ...rest }) => {
  return (
    <div data-testid={rest['data-testid'] || 'summary-section'} className="gba:w-full">
      <div className="gba:text-lg gba:font-medium gba:mb-3">{title}</div>
      <div>{children}</div>
    </div>
  )
}

export default SummarySection
