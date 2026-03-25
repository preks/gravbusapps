import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { renderLoadingState, renderErrorState, renderDeleteWarning } from '../utils/deletePopupHelpers'
import { useDeleteRedirect } from '../utils/useDeleteRedirect'
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

const AccountDeletePopup: React.FC<AccountDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  account,
  loading,
  error,
  ...props
}) => {
  const prefixDataTestId = domain === 'investments' ? 'irm-account-delete-popup' : 'crm-account-delete-popup'

  const accountId =
    props.additionalData?.accountId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId ||
    props.additionalData?.id ||
    initialValues?.accountId ||
    ''

  const handleSubmit = async () => {
    if (!account) {
      throw new Error(getTranslationFromI18nKeyAndLabel('account.delete.error.noData', 'Account data not loaded'))
    }

    const deletePayload =
      domain === 'investments'
        ? {
            investmentAccount: {
              id: account.id,
              version: account.version,
              isDeleted: true
            }
          }
        : {
            account: {
              id: account.id,
              version: account.version,
              isDeleted: true
            }
          }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!account) {
      return [getTranslationFromI18nKeyAndLabel('account.delete.error.noData', 'Account data not loaded')]
    }
    return null
  }

  // Setup redirect after delete (only if deleting the current account record)
  useDeleteRedirect({
    domain,
    entityType: 'accounts',
    recordUrlPattern: '/account-record',
    entityId: accountId
  })

  if (loading) {
    return renderLoadingState(prefixDataTestId, 'account')
  }

  if (error || !account) {
    return renderErrorState(prefixDataTestId, 'account', error || '')
  }

  const displayName = account.name || 'Unnamed Account'
  const ownerName = account.ownerEmployee
    ? `${account.ownerEmployee.firstName} ${account.ownerEmployee.lastName}`
    : getTranslationFromI18nKeyAndLabel('common.notAssigned', 'Not Assigned')

  const title =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel('account.delete.title', 'Delete Investment Account')
      : getTranslationFromI18nKeyAndLabel('account.delete.title', 'Delete Account')

  const confirmationQuestion =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel(
          'account.delete.confirmation.question',
          'Are you sure you want to delete this investment account?'
        )
      : getTranslationFromI18nKeyAndLabel(
          'account.delete.confirmation.question',
          'Are you sure you want to delete this account?'
        )

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ accountId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {title}
          </h2>
        </div>

        {renderDeleteWarning(prefixDataTestId, confirmationQuestion, displayName, account.createdAt, ownerName)}
      </div>
    </AppActionForm>
  )
}

export default AccountDeletePopup
export { AccountDeletePopup }
