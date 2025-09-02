import React from 'react';
import { Button } from 'antd';
import { DollarOutlined, StarOutlined, UserOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Opportunity } from '../types';
import { formatCurrency, extractCurrencyCode } from '@/business-apps/crm/common/utils/currencyUtils';

interface OpportunityHeaderProps {
  opportunity: Opportunity;
  opportunityData: any;
  opportunityId: string;
  additionalData?: any;
  accessToken: string;
}

export const OpportunityHeader: React.FC<OpportunityHeaderProps> = ({ 
  opportunity, 
  opportunityData, 
  opportunityId, 
  additionalData, 
  accessToken 
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="gba:opportunity-header" style={{ 
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {opportunity.name}
              </div>
              {opportunityData?.estimatedAmount && (
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px', 
                  padding: '8px 12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#389e0d'
                }}>
                  <DollarOutlined style={{ marginRight: '6px' }} />
                  {formatCurrency(
                    opportunityData.estimatedAmount, 
                    opportunityData?.currency?.id || opportunity?.currency?.id || 'Currency:v1:EUR'
                  )}
                </div>
              )}
            </div>
            
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <StarOutlined style={{ marginRight: '4px' }} />
              <span>Status: {opportunityData?.opportunityStatus?.value || opportunity.status}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Currency: {opportunityData?.currency?.code || extractCurrencyCode(opportunity?.currency?.id || 'Currency:v1:EUR')}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Estimated Amount: {
                opportunity.value ? 
                  formatCurrency(opportunity.value, opportunity.currency.id) : 
                  'Not set'
              }</span>

            </div>

            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>Owner: {opportunity.ownerEmployee ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}` : 'Not assigned'}</span>
              {opportunityData?.createdAt && (
                <>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  <span>Creation Date: {formatDate(opportunityData.createdAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="opportunity-record-action-button"
              size="lg"
              contextsArray={[FlowContextName.customerOpportunityEntity]}
              externalContextData={{
                opportunityId: opportunityId
              }}
              prefixDataTestId="opportunity-record-action"
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