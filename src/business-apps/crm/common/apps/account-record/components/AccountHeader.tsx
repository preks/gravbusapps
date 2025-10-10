import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Tags, User, Edit } from 'lucide-react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Account } from '../hooks/useAccountData'

interface AccountHeaderProps {
  account: Account
  accountData: any
  accountId: string
  additionalData?: any
  accessToken: string
  onStatusUpdate?: () => void
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  accountData,
  accountId,
  additionalData,
  accessToken,
  onStatusUpdate
}) => {
  // Actions button is now empty - no flows or static actions

  return (
    <div className="gba:account-header gba:mb-6 gba:bg-white gba:rounded-lg gba:p-5">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div>
            <div className="gba:text-2xl gba:font-bold gba:mb-1">{account.name}</div>

            {/* Account-specific fields */}
            <div className="gba:text-gray-500 gba:text-sm gba:mb-2 gba:flex gba:flex-row gba:items-center gba:flex-nowrap">
              {(accountData?.industry?.value || account.industry) && (
                <>
                  <Tags className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
                  <span>Industry: {accountData?.industry?.value || account.industry}</span>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              <User className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
              <span>
                Owner:{' '}
                {accountData?.ownerEmployee
                  ? `${accountData.ownerEmployee.firstName} ${accountData.ownerEmployee.lastName}`
                  : account.accountOwner?.name || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3">
          {accessToken && (
            <AppActionButton
              data-testid="account-record-action-button"
              size="default"
              contextsArray={[FlowContextName.customerAccountEntity]}
              externalContextData={{
                accountId: accountId
              }}
              staticFlowData={[]}
              prefixDataTestId="account-record-action"
              accessToken={accessToken}
              emptyStateBehavior="hide"
              deferMainContextRequestsUntilClick={false}
            >
              Actions
            </AppActionButton>
          )}
        </div>
      </div>
    </div>
  )
}
