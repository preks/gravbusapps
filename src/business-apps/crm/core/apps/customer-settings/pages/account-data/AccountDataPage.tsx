import React from 'react'
import { AccountSettings } from '@/common/components/common-relations/setting-pages/account/AccountSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface AccountDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'priorities' | 'types'
}

const DATA_TEST_ID = 'CustomerAccountDataPage'

const AccountDataPage: React.FC<AccountDataPageProps> = ({ prefixDataTestId, onBack, initialTab, ...context }) => {
  const priorities = useCatalogSettings(context, 'SalesAccountPriority')
  const types = useCatalogSettings(context, 'SalesAccountType')

  return (
    <AccountSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={initialTab}
      onBack={onBack}
      priorities={priorities}
      types={types}
    />
  )
}

export default AccountDataPage
