import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { Tags, User, Edit } from 'lucide-react';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Account } from '../hooks/useAccountData';
import type { InvestmentAccount } from '@/common/data/investment/types';
import { AiSummaryButton } from '@/common/components/common-relations/record-sections/header-section/ai-summary-button';
import { useAccountAiSummary } from '../hooks/useAccountAiSummary';

interface AccountHeaderProps {
  account: Account;
  accountData: InvestmentAccount | null;
  accountId: string;
  additionalData?: any;
  accessToken: string;
  onStatusUpdate?: () => void;
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
            <div className="gba:text-2xl gba:font-bold gba:mb-1">
              {account.name}
            </div>
            
            {/* Account-specific fields */}
            <div className="gba:text-gray-500 gba:text-sm gba:mb-2 gba:flex gba:flex-row gba:items-center gba:flex-nowrap">
              {(accountData?.industryClassLabel || account.industry) && (
                <>
                  <Tags className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
                  <span>Industry: {accountData?.industryClassLabel || account.industry}</span>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              <User className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
              <span>Owner: {accountData?.ownerDisplayName || account.accountOwner?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3">
          {accessToken && (
            <AiSummaryButton
              config={{
                entityType: 'account',
                loadingMessage: 'Generating AI Summary...',
                loadingSubtitle: 'Analyzing account data and activities'
              }}
              summaryHook={useAccountAiSummary(accountId, accessToken)}
              dataTestId={`account-update-button-${accountId}`}
            />
          )}
          {accessToken && (
            <AppActionButton
              data-testid="investment-account-record-action-button"
              size="default"
              contextsArray={[FlowContextName.investmentAccountEntity]}
              externalContextData={{
                accountId: accountId
              }}
              staticFlowData={[]}
              prefixDataTestId="investment-account-record-action"
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
  );
}; 