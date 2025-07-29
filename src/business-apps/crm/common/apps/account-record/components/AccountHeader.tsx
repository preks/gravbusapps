import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { Tags, User, Edit } from 'lucide-react';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { Account } from '../hooks/useAccountData';

interface AccountHeaderProps {
  account: Account;
  accountData: any;
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
    <div className="gba:account-header" style={{ 
      marginBottom: '24px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      padding: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
              {account.name}
            </div>
            
            {/* Account-specific fields */}
            <div style={{ 
              color: '#8c8c8c', 
              fontSize: '14px', 
              marginBottom: '8px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'nowrap'
            }}>
              {(accountData?.industry?.value || account.industry) && (
                <>
                  <Tags className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
                  <span>Industry: {accountData?.industry?.value || account.industry}</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                </>
              )}
              <User className="gba:inline gba:w-4 gba:h-4 gba:mr-1" />
              <span>Owner: {accountData?.ownerEmployee ? `${accountData.ownerEmployee.firstName} ${accountData.ownerEmployee.lastName}` : account.accountOwner?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="account-record-action-button"
              variant="primary"
              size="md"
              contextsArray={[]}
              externalContextData={{
                accountId: accountId
              }}
              staticFlowData={[]}
              prefixDataTestId="account-record-action"
              accessToken={accessToken}
              emptyStateBehavior="enabled"
              deferMainContextRequestsUntilClick
            >
              Actions
            </AppActionButton>
          )}
        </div>
      </div>
    </div>
  );
}; 