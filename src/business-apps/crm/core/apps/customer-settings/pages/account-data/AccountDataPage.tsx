import React, { useMemo } from 'react'
import { AccountSettingsLayout } from '@/common/components/common-relations/setting-pages/account'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AccountDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'priorities' | 'types'
}

const AccountDataPage: React.FC<AccountDataPageProps> = props => {
  const config = useMemo(
    () => ({
      priorityCatalog: 'CustomerAccountPriority',
      typeCatalog: 'CustomerAccountType',
      dataTestIdPrefix: 'CustomerAccountDataPage',
      headerTitle: 'Account Data',
      headerDescription: 'Manage account priorities and types'
    }),
    []
  )

  return <AccountSettingsLayout config={config} {...props} />
}

export default AccountDataPage
