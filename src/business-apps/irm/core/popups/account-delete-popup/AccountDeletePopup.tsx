import React, { useEffect } from 'react'
import { AccountDeletePopup as CommonAccountDeletePopup } from '@/common/components/common-relations/popups/account-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface AccountDeletePopupValues {
  accountId: string
}

export interface AccountDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<AccountDeletePopupValues>
}

/**
 * IRM Account Delete Popup
 * Uses useInvestmentAccount hook and passes data to common component
 */
const AccountDeletePopup: React.FC<AccountDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const accountId =
    props.additionalData?.accountId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId ||
    props.additionalData?.id ||
    initialValues?.accountId ||
    ''

  const { account, loading, error } = useInvestmentAccount(props.accessToken || '', accountId)

  useEffect(() => {
    const handleProcessComplete = (e: Event) => {
      if ((e as CustomEvent)?.detail?.resolution === 'success') {
        navigateTo('/platform/irm/investment-relations?view=accounts')
      }
    }
    window.addEventListener('com.newwork.process.processCompletion', handleProcessComplete)
    return () => window.removeEventListener('com.newwork.process.processCompletion', handleProcessComplete)
  }, [])

  return (
    <CommonAccountDeletePopup
      {...props}
      initialValues={initialValues}
      domain="investments"
      account={account}
      loading={loading}
      error={error}
    />
  )
}

export default AccountDeletePopup
export { AccountDeletePopup }
