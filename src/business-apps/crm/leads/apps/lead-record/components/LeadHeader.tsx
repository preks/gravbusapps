import React from 'react';
import { Button } from 'antd';
import { TagsOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { startProcess } from '@/common/utils/start-process';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useMarkLeadAsLost } from '../hooks/useMarkLeadAsLost';
import { Lead } from '../types';

interface LeadHeaderProps {
  lead: Lead;
  leadData: any;
  leadId: string;
  additionalData?: any;
  accessToken: string;
  onStatusUpdate?: () => void;
}

export const LeadHeader: React.FC<LeadHeaderProps> = ({ lead, leadData, leadId, additionalData, accessToken, onStatusUpdate }) => {
  const { markAsLost, isLoading } = useMarkLeadAsLost({ accessToken } as any);

  const handleMarkAsLost = async () => {
    await markAsLost(leadId, lead.version, onStatusUpdate);
  };

  const handleConvertLead = () => {
    startProcess({
      domain: 'customer-relations',
      processName: 'convertLead',
      payload: {
        leadId,
        employeeId: additionalData?.employeeId
      },
      builderType: 'NATIVE_SCREEN',
    });
  };

  const staticActions = [];
  
  // Add "Mark as Lost" action if conditions are met
  if (lead.status?.toLowerCase() !== 'lost' && !lead.convertedOpportunityId) {
    staticActions.push({
      key: 'mark-as-lost',
      label: getTranslationFromI18nKeyAndLabel('crm:lead.markAsLost', 'Mark as Lost'),
      onClick: handleMarkAsLost,
      icon: 'StopOutlined',
      loading: isLoading,
      category: 'ACTION'
    });
  }

  // Add "Convert Lead" action if not already converted
  if (!lead.convertedOpportunityId) {
    staticActions.push({
      key: 'convert-lead',
      label: getTranslationFromI18nKeyAndLabel('crm:lead.convertLead', 'Convert Lead'),
      onClick: handleConvertLead,
      icon: 'ArrowRightOutlined',
      category: 'ACTION'
    });
  }

  return (
    <div className="gba:lead-header" style={{ 
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
              {lead.name}
            </div>
            
            {/* Lead-specific fields */}
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              <TagsOutlined style={{ marginRight: '4px' }} />
              <span>Source: {leadData?.leadSource?.value || 'Unknown'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <StarOutlined style={{ marginRight: '4px' }} />
              <span>Rating: {leadData?.leadRating?.value || 'Unknown'}</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>Owner: {leadData?.ownerEmployee ? `${leadData.ownerEmployee.firstName} ${leadData.ownerEmployee.lastName}` : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="lead-record-action-button"
              variant="primary"
              size="md"
              contextsArray={[FlowContextName.leadEntity]}
              externalContextData={{
                leadId: leadId
              }}
              staticFlowData={staticActions}
              prefixDataTestId="lead-record-action"
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