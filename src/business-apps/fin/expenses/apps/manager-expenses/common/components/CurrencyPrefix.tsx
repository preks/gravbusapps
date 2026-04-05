import React from 'react'
import type { Icon } from '@phosphor-icons/react'

interface CurrencyPrefixProps {
  icon?: Icon
  currency: string
  iconSize?: number
}

export const CurrencyPrefix = React.memo(function CurrencyPrefix({
  icon: IconComponent,
  currency,
  iconSize = 16
}: CurrencyPrefixProps) {
  return (
    <span className="gba:flex gba:items-center gba:gap-1.5">
      {IconComponent && <IconComponent size={iconSize} />}
      <span className="gba:font-medium">{currency}</span>
    </span>
  )
})
