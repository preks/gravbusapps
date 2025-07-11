import React from 'react';
import { Card, Avatar } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';

interface ContactInformationProps {
  opportunityData: any;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ opportunityData }) => {
  const contact = opportunityData?.contact;
  
  return (
    <Card
      title="Contact Information"
      style={{ width: '100%', height: '100%' }}
      data-testid="contact-information-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Contact Avatar and Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            size={48}
            src={contact?.pictureUrl}
            icon={!contact?.pictureUrl ? <UserOutlined /> : undefined}
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
              {contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : 'No Contact'}
            </div>
            {contact?.position && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {contact.position}
              </div>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MailOutlined style={{ color: '#6b7280', fontSize: '14px' }} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Email</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {contact?.email ? (
                  <a 
                    href={`mailto:${contact.email}`}
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    {contact.email}
                  </a>
                ) : '-'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneOutlined style={{ color: '#6b7280', fontSize: '14px' }} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Phone</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {contact?.phoneNumber ? (
                  <a 
                    href={`tel:${contact.phoneNumber}`}
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    {contact.phoneNumber}
                  </a>
                ) : '-'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BankOutlined style={{ color: '#6b7280', fontSize: '14px' }} />
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Job Title</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {contact?.position || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Contact Actions */}
        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          paddingTop: '12px', 
          marginTop: '8px' 
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {contact?.email && (
              <a
                href={`mailto:${contact.email}`}
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none', 
                  fontSize: '12px' 
                }}
              >
                Send Email
              </a>
            )}
            {contact?.phoneNumber && (
              <a
                href={`tel:${contact.phoneNumber}`}
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none', 
                  fontSize: '12px' 
                }}
              >
                Call Contact
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}; 