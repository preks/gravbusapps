import React from 'react'
import type { BonusDisplayItem } from '../types'

interface BonusDetailsListProps {
  items: BonusDisplayItem[]
  dataTestIdPrefix: string
  t: (key: string, options?: { defaultValue?: string }) => string
}

/**
 * Simple display component for bonus details
 * Unlike salary adjustment, bonus granting doesn't need a comparison view
 */
export const BonusDetailsList: React.FC<BonusDetailsListProps> = ({ items, dataTestIdPrefix, t }) => {
  // Separate amount from other items for special display
  const amountItem = items.find(item => item.key === 'amount')
  const otherItems = items.filter(item => item.key !== 'amount')

  return (
    <div className="gba:space-y-3" data-testid={`${dataTestIdPrefix}-list`}>
      {/* Amount - Highlighted box matching salary review "Total Increase" style */}
      {amountItem && (
        <div
          className="gba:bg-card gba:text-card-foreground gba:border gba:border-foreground gba:p-3 gba:rounded-md"
          data-testid={`${dataTestIdPrefix}-${amountItem.key}`}
        >
          <div className="gba:text-sm gba:font-medium gba:mb-1">
            {t('grant-bonus-review-amount', { defaultValue: 'Amount' })}
          </div>
          <div className="gba:text-lg gba:font-semibold">{amountItem.value || '-'}</div>
        </div>
      )}

      {/* Other details - plain text style matching salary review */}
      {otherItems.map(item => (
        <div key={item.key} data-testid={`${dataTestIdPrefix}-${item.key}`}>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">{item.label}</div>
          <div className="gba:font-medium">{item.value || '-'}</div>
        </div>
      ))}
    </div>
  )
}
