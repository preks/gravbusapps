import React from 'react';
import { Button } from 'antd';
import { TagsOutlined, StarOutlined, UserOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';
import { Lead } from '../types';

interface LeadHeaderProps {
  lead: Lead;
  leadData: any;
  leadId: string;
  additionalData?: any;
}

export const LeadHeader: React.FC<LeadHeaderProps> = ({ lead, leadData, leadId, additionalData }) => {
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
          <div style={{
            backgroundColor: '#f0f7ff',
            color: '#1677ff',
            padding: '4px 16px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 'normal'
          }} data-testid="lead-status-badge">
            {lead.status || 'Qualified'}
          </div>
          
          <button 
            style={{
              borderColor: '#d9d9d9',
              color: '#000000',
              backgroundColor: 'white',
              height: '36px',
              padding: '0 16px',
              fontWeight: 'normal',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #d9d9d9'
            }}
            data-testid="edit-lead-button"
          >
            Edit
          </button>
          
          <button 
            style={{
              backgroundColor: '#000000',
              borderColor: '#000000',
              color: 'white',
              height: '36px',
              padding: '0 16px',
              fontWeight: 'normal',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #000000'
            }}
            data-testid="schedule-meeting-button"
          >
            Schedule Meeting
          </button>
          
          <Button 
            type="primary"
            style={{
              backgroundColor: '#000000',
              borderColor: '#000000',
              height: '36px',
              padding: '0 16px',
              fontWeight: 'normal',
              fontSize: '14px',
              borderRadius: '4px'
            }}
            data-testid="convert-to-opportunity-button"
            onClick={() => {
              startProcess({
                domain: 'customer-relations',
                processName: 'convertLeadToOpportunity',
                payload: {
                  leadId,
                  employeeId: additionalData?.employeeId
                },
                builderType: 'NATIVE_SCREEN',
              });
            }}
          >
            Convert to Opportunity
          </Button>
        </div>
      </div>
    </div>
  );
}; 