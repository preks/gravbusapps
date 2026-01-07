import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface InvestmentSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const InvestmentSearch: React.FC<InvestmentSearchProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="gba:relative gba:mb-6" data-testid="investment-search">
      <div className="gba:relative">
        <MagnifyingGlassIcon
          size={20}
          className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground gba:pointer-events-none"
          weight="duotone"
        />
        <Input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={
            placeholder ||
            getTranslationFromI18nKeyAndLabel(
              'investment.search.placeholder',
              'Search investments by name, code, or account...'
            )
          }
          className="gba:pl-10 gba:pr-4 gba:h-12 gba:text-base gba:bg-background gba:border-border focus:gba:border-primary gba:transition-colors"
          data-testid="investment-search-input"
        />
      </div>
    </div>
  )
}
