import React from 'react';
import { Button } from 'antd';
import { MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { ContactData } from '../queries/ContactQueries';

interface ContactHeaderProps {
  contact: ContactData;
  contactId: string;
  additionalData?: any;
  accessToken: string;
}

export const ContactHeader: React.FC<ContactHeaderProps> = ({ contact, contactId, additionalData, accessToken }) => {
  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact';
  
  return (
    <div className="gba:contact-header" style={{ 
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
              {fullName}
            </div>
            
            {/* Contact-specific fields */}
            <div style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '8px' }}>
              {contact.email && (
                <>
                  <MailOutlined style={{ marginRight: '4px' }} />
                  <span>{contact.email}</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                </>
              )}
              {contact.phone && (
                <>
                  <PhoneOutlined style={{ marginRight: '4px' }} />
                  <span>{contact.phone}</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                </>
              )}
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>Owner: {contact.ownerEmployee ? `${contact.ownerEmployee.firstName} ${contact.ownerEmployee.lastName}` : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {accessToken && (
            <AppActionButton
              data-testid="contact-record-action-button"
              variant="primary"
              size="md"
              contextsArray={[FlowContextName.employeeEntity]}
              externalContextData={{
                contactId: contactId
              }}
              prefixDataTestId="contact-record-action"
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