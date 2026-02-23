import React from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'

interface Space {
  id: string
  name: string
}

import deskTranslations from '../../_i18n'

interface ScopeSelectorProps {
  scope: 'all' | 'space'
  selectedSpaceId: string | null
  spaces: Space[]
  onScopeChange: (scope: 'all' | 'space') => void
  onSpaceChange: (spaceId: string | null) => void
  disabled?: boolean
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  scope,
  selectedSpaceId,
  spaces,
  onScopeChange,
  onSpaceChange,
  disabled = false
}) => {
  const { t } = useTranslation(deskTranslations)
  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onScopeChange('all')
      onSpaceChange(null)
    } else {
      onScopeChange('space')
      onSpaceChange(value)
    }
  }

  const currentValue = scope === 'all' ? 'all' : selectedSpaceId || 'all'

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:w-full">
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className="gba:w-full gba:h-8 gba:rounded-xl gba:text-sm" data-testid="scope-selector-trigger">
          <SelectValue placeholder={t('scope-all')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="scope-selector-option-all">
            {t('scope-all')}
          </SelectItem>
          {spaces.map(space => (
            <SelectItem key={space.id} value={space.id} data-testid={`scope-selector-option-space-${space.id}`}>
              {space.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
