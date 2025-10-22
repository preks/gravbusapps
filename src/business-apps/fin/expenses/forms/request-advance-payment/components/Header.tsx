import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface HeaderProps {
  'data-testid'?: string
}

const Header: React.FC<HeaderProps> = ({ 'data-testid': dataTestId = 'request-advance-payment-header' }) => {
  return (
    <div className="gba:mb-6" data-testid={dataTestId}>
      <h1 className="gba:text-2xl gba:font-bold gba:text-black gba:m-0 gba:pb-3 gba:text-center gba:flex-1 gba:flex gba:justify-center">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
          'Request Advance Payment'
        )}
      </h1>
      <div className="gba:border-b gba:border-border"></div>
    </div>
  )
}

export default Header
