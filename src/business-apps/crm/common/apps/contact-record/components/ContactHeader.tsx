import React from 'react';
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
    <div className="gba:contact-header gba:mb-6 gba:bg-white gba:rounded-lg gba:p-5">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div>
            <div className="gba:text-2xl gba:font-bold gba:mb-1">
              {fullName}
            </div>
            
            {/* Contact-specific fields */}
            <div className="gba:text-gray-500 gba:text-sm gba:mb-2">
              {contact.email && (
                <>
                  <MailOutlined className="gba:mr-1" />
                  <a 
                    href={`mailto:${contact.email}`}
                    className="gba:text-blue-600 gba:no-underline"
                    data-testid="contact-header-email-link"
                  >
                    {contact.email}
                  </a>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              {contact.phone && (
                <>
                  <PhoneOutlined className="gba:mr-1" />
                  <a 
                    href={`tel:${contact.phone}`}
                    className="gba:text-blue-600 gba:no-underline"
                  >
                    {contact.phone}
                  </a>
                  <span className="gba:mx-2">•</span>
                </>
              )}
              <UserOutlined className="gba:mr-1" />
              <span>Owner: {contact.ownerEmployee ? `${contact.ownerEmployee.firstName} ${contact.ownerEmployee.lastName}` : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3">
          {accessToken && (
            <AppActionButton
              data-testid="contact-record-action-button"
              size="default"
              contextsArray={[FlowContextName.customerContactEntity]}
              externalContextData={{
                contactId: contactId
              }}
              prefixDataTestId="contact-record-action"
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