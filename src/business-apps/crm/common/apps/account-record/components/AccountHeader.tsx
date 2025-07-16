import React from 'react';
import { Button } from 'antd';
import { TagsOutlined, BankOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
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
  const staticActions = [];
  
  // Add edit account action
  staticActions.push({
    key: 'edit-account',
    label: getTranslationFromI18nKeyAndLabel('crm:account.editAccount', 'Edit Account'),
    onClick: () => {
      // TODO: Implement edit account functionality
      console.log('Edit account clicked');
    },
    icon: 'EditOutlined',
    category: 'ACTION'
  });

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
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <TagsOutlined style={{ marginRight: '4px' }} />
              <span>Industry: {accountData?.industry?.value || account.industry || 'Unknown'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>Owner: {accountData?.ownerEmployee ? `${accountData.ownerEmployee.firstName} ${accountData.ownerEmployee.lastName}` : account.accountOwner?.name || 'Unknown'}</span>
            </div>
            
            {/* Links */}
            <div style={{ marginTop: '8px' }}>
              {account.website && (
                <a 
                  href={account.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ fontSize: '14px', marginRight: '16px' }}
                >
                  Website
                </a>
              )}
              {account.linkedin && (
                <a 
                  href={account.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ fontSize: '14px' }}
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="account-record-action-button"
              variant="primary"
              size="md"
              contextsArray={[FlowContextName.leadEntity]}
              externalContextData={{
                accountId: accountId
              }}
              staticFlowData={staticActions}
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