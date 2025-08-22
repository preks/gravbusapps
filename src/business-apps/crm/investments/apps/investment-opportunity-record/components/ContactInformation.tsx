import React from 'react';
import { Card } from 'antd';
import { Spinner, Alert } from '@newwork/nw-design-system';
import dayjs from 'dayjs';

interface ContactInformationProps {
  opportunity: any;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ 
  opportunity
}) => {

  const getContactField = (field: string): string => {
    const contact = opportunity?.contact;
    if (!contact) {
      return '-';
    }
    
    switch (field) {
      case 'email':
        return contact?.email || '-';
      case 'phone':
      case 'phoneNumber':
        return contact?.phone || contact?.phoneNumber || '-';
      case 'firstName':
        return contact?.firstName || '-';
      case 'lastName':
        return contact?.lastName || '-';
      case 'position':
      case 'jobTitle':
        return contact?.jobTitle || contact?.position || '-';
      case 'name':
        return contact?.name || '-';
      default:
        return contact[field] || '-';
    }
  };

  const getCreatedAt = (): string => {
    const createdAt = opportunity?.contact?.createdAt || opportunity?.createdAt;
    if (!createdAt) return '-';
    
    try {
      return dayjs(createdAt).format('MMM D, YYYY, h:mm A');
    } catch {
      return '-';
    }
  };



  return (
    <Card
      title="Contact"
      style={{ width: '100%', height: '100%' }}
      data-testid="opportunity-contact-information-card"
    >
      <div>
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-first-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getContactField('firstName')}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-last-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getContactField('lastName')}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-email">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email');
              if (email === '-') return '-';
              
              return (
                <a 
                  href={`mailto:${email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="opportunity-contact-email-link"
                >
                  {email}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-phone">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber');
              if (phone === '-') return '-';
              
              return (
                <a 
                  href={`tel:${phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="opportunity-contact-phone-link"
                >
                  {phone}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="opportunity-contact-job-title">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getContactField('jobTitle') || getContactField('position')}
          </div>
        </div>
        
        <div data-testid="opportunity-contact-created-at">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getCreatedAt()}
          </div>
        </div>
      </div>
    </Card>
  );
}; 