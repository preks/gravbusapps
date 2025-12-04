import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenericDeletePopup } from '../utils/GenericDeletePopup'
import type { Account } from '@/common/data/relations/types/accountTypes'

export interface AccountDeletePopupValues {
  accountId: string
}

export interface AccountDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<AccountDeletePopupValues>
  domain?: 'crm' | 'investments'
  account: Account | null
  loading: boolean
  error: string | null
}

/**
 * Account Delete Popup Component
 * Uses GenericDeletePopup for all common functionality
 */
const AccountDeletePopup: React.FC<AccountDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  account,
  loading,
  error,
  ...props
}) => {
  const getDisplayName = (entity: Account): string => {
    return entity.name || 'Unnamed Account'
  }

  const getPayloadKey = (domain: 'crm' | 'investments'): string => {
    return domain === 'investments' ? 'investmentAccount' : 'account'
  }

  return (
    <GenericDeletePopup
      {...props}
      initialValues={initialValues}
      domain={domain}
      entityType="accounts"
      entityData={account}
      loading={loading}
      error={error}
      getDisplayName={getDisplayName}
      getPayloadKey={getPayloadKey}
    />
  )
}

export default AccountDeletePopup
export { AccountDeletePopup }
