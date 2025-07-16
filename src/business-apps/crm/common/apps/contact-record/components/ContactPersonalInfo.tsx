import React from 'react';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { ContactData } from '../queries/ContactQueries';

interface ContactPersonalInfoProps {
  contact: ContactData;
}

export const ContactPersonalInfo: React.FC<ContactPersonalInfoProps> = ({ contact }) => {
  return (
    <Card
      title="Personal Information"
      style={{ width: '100%', height: '100%' }}
    >
      <div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.firstName || '-'}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.lastName || '-'}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
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
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {contact?.phone ? (
              <a 
                href={`tel:${contact.phone}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                {contact.phone}
              </a>
            ) : '-'}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.jobTitle || '-'}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {contact?.createdAt ? dayjs(contact.createdAt).format('MMM D, YYYY, h:mm A') : '-'}
          </div>
        </div>
      </div>
    </Card>
  );
}; 