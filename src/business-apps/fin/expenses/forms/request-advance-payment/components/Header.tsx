import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'

interface HeaderProps {
  'data-testid'?: string
}

const Header: React.FC<HeaderProps> = ({ 'data-testid': dataTestId = 'request-advance-payment-header' }) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mb-6" data-testid={dataTestId}>
      <h1 className="gba:text-2xl gba:font-bold gba:text-black gba:m-0 gba:pb-3 gba:text-center gba:flex-1 gba:flex gba:justify-center">
        {t('title')}
      </h1>
      <div className="gba:border-b gba:border-border"></div>
    </div>
  )
}

export default Header
