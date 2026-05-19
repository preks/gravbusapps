import React from 'react'
import { Input, Spinner } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'

export interface GlobalSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  isLoading: boolean
}

export const GlobalSearchInput: React.FC<GlobalSearchInputProps> = ({ value, onChange, placeholder, isLoading }) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <MagnifyingGlassIcon size={16} className="gba:text-muted-foreground" />
      <Input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus
        className="gba:border-0 gba:shadow-none gba:focus-visible:ring-0"
        data-testid="GlobalSearchInput"
      />
      {isLoading && <Spinner size="sm" />}
    </div>
  )
}
