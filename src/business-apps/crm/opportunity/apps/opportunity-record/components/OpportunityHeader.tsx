import React from 'react';
import { Button } from 'antd';
import { DollarOutlined, StarOutlined, UserOutlined, CalendarOutlined, TrophyOutlined, PercentageOutlined } from '@ant-design/icons';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Opportunity } from '../types';

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
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const extractCurrencyCode = (currencyId: string): string => {
    return currencyId.split(':').pop() || 'EUR';
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
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
              {opportunity.name}
            </div>
            
            {/* First line - Status, Currency, Estimated Amount, Winning Chance */}
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <StarOutlined style={{ marginRight: '4px' }} />
              <span>Status: {opportunityData?.opportunityStatus?.value || opportunity.status}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Currency: {extractCurrencyCode(opportunity.currency.id)}</span>
              {opportunity.value > 0 && (
                <>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <DollarOutlined style={{ marginRight: '4px' }} />
                  <span>Estimated Amount: {formatCurrency(opportunity.value, extractCurrencyCode(opportunity.currency.id))}</span>
                </>
              )}
              <span style={{ margin: '0 8px' }}>•</span>
              <PercentageOutlined style={{ marginRight: '4px' }} />
              <span>Winning Chance: {opportunity.probability ? `${opportunity.probability}%` : 'Not set'}</span>
            </div>

            {/* Second line - Close Date, Owner, Creation Date */}
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <CalendarOutlined style={{ marginRight: '4px' }} />
              <span>Close Date: {formatDate(opportunity.expectedCloseDate)}</span>
              <span style={{ margin: '0 8px' }}>•</span>
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
              variant="primary"
              size="md"
              contextsArray={[FlowContextName.opportunityEntity]}
              externalContextData={{
                opportunityId: opportunityId
              }}
              prefixDataTestId="opportunity-record-action"
              accessToken={accessToken}
              emptyStateBehavior="enabled"
              deferMainContextRequestsUntilClick
            >
              Actions
            </AppActionButton>
          )}
          
          <Button 
            type="default"
            data-testid="edit-opportunity-button"
            onClick={() => {
              // TODO: Implement edit functionality
              console.log('Edit opportunity:', opportunityId);
            }}
          >
            Edit Opportunity
          </Button>
        </div>
      </div>
    </div>
  );
}; 