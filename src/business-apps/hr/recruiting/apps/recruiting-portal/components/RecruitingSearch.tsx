import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RecruitingSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const RecruitingSearch: React.FC<RecruitingSearchProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="gba:relative gba:mb-6" data-testid="recruiting-search">
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
              'recruiting.search.placeholder',
              'Search by job title, department, location, or contract type...'
            )
          }
          className="gba:pl-10 gba:pr-4 gba:h-12 gba:text-base gba:bg-background gba:border-border focus:gba:border-primary gba:transition-colors"
          data-testid="recruiting-search-input"
        />
      </div>
    </div>
  )
}
