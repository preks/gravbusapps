import React from 'react';
import { Card, Typography, Avatar } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Contact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  name?: string;
  position?: string;
}

interface ContactInformationProps {
  accountData: any;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ accountData }) => {
  const getContacts = (): Contact[] => {
    if (!accountData?.contact) return [];
    
    // Handle both array and single contact
    const contacts = Array.isArray(accountData.contact) ? accountData.contact : [accountData.contact];
    
    return contacts.map((contact: any) => ({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone || contact.phoneNumber,
      name: contact.name || (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : ''),
      position: contact.position || contact.jobTitle || ''
    }));
  };

  const getDisplayName = (contact: Contact): string => {
    if (contact.name) return contact.name;
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    }
    return 'Unknown Contact';
  };

  const contacts = getContacts();

  return (
    <Card 
      className="gba:h-full" 
      style={{ 
        height: '100%',
        backgroundColor: '#fafafa',
        border: '1px solid #e8e8e8'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#262626'
      }}>
        <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        Contacts
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {contacts.length > 0 ? (
          contacts.map((contact, index) => (
            <div key={index} style={{ 
              padding: '12px', 
              backgroundColor: 'white', 
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Avatar 
                  size={32} 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: '#1890ff' }} 
                />
                <div>
                  <Text style={{ fontWeight: '500', fontSize: '14px' }}>
                    {getDisplayName(contact)}
                  </Text>
                  {contact.position && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {contact.position}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
              
              {contact.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <MailOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                  <a href={`mailto:${contact.email}`} style={{ fontSize: '12px' }}>
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                  <a href={`tel:${contact.phone}`} style={{ fontSize: '12px' }}>
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: '#8c8c8c',
            fontSize: '14px'
          }}>
            No contacts available
          </div>
        )}
      </div>
    </Card>
  );
}; 