import React from 'react';
import { Tags, User, Bot } from 'lucide-react';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Account } from '../hooks/useAccountData';
import type { InvestmentAccount } from '@/common/data/investment/types';
import { AiActions, AiAction } from '@/common/components/common-relations/record-sections/header-section/ai-actions';
import { useAccountAiSummary } from '../hooks/useAccountAiSummary';
import { useGenerateAIBooklet } from '../hooks/useGenerateAIBooklet';

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
  accessToken
}) => {
  const aiSummaryHook = useAccountAiSummary(accountId, accessToken);
  const aiBookletHook = useGenerateAIBooklet(accountId, accessToken, {
    outputFileName: 'ma_booklet_generated.xlsx',
    maxQuestions: 14
  });

  const aiActions: AiAction[] = accessToken ? [
    {
      key: 'ai-summary',
      label: 'AI Summary',
      icon: <Bot size={16} />,
      hook: aiSummaryHook,
      config: {
        entityType: 'account',
        loadingMessage: 'Generating AI Summary...',
        loadingSubtitle: 'Analyzing account data and activities',
        emptyStateMessage: 'Click to generate intelligent insights about this account\'s performance and next steps'
      }
    },
    {
      key: 'ai-booklet',
      label: 'AI Booklet',
      icon: <Bot size={16} />,
      hook: aiBookletHook,
      config: {
        entityType: 'account',
        loadingMessage: 'Generating AI Booklet...',
        loadingSubtitle: 'Analyzing account documents for creating a booklet',
        emptyStateMessage: 'Click to generate an M&A booklet from account documents'
      }
    }
  ] : [];

  return (
    <div
      className="gba:account-header gba:mb-6 gba:bg-white gba:rounded-lg gba:p-5"
      data-testid="investment-account-header"
    >      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div>
            <div className="gba:text-2xl gba:font-bold gba:mb-1">
              {account.name}
            </div>
            
            {/* Account-specific fields */}
            <div className="gba:text-gray-500 gba:text-sm gba:mb-2 gba:flex gba:flex-row gba:items-center gba:flex-nowrap">
              {accountData?.email && (
                <>
                  <Tags className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
                  <span>Email: {accountData.email}</span>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              {accountData?.foundationDate && (
                <>
                  <Tags className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
                  <span>Founded: {new Date(accountData.foundationDate).toLocaleDateString()}</span>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              <User className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
              <span>Owner: {accountData?.ownerDisplayName || account.accountOwner?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {accessToken && (
            <AiActions
              actions={aiActions}
              dataTestId={`account-ai-actions-${accountId}`}
              buttonText="AI Actions"
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