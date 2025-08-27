import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { InvestmentAccount } from '@/common/data/investment/types';

interface ContactInformationProps {
  accountData?: InvestmentAccount | null;
  accountId?: string;
  context?: BusinessAppContextProps;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ 
  accountData: providedAccountData, 
  accountId,
  context 
}) => {
  // Get the first primary contact from investment account data
  const primaryContact = providedAccountData?.investmentAccountContact?.[0]?.contact || null;

  const getContactField = (field: string): string => {
    if (!primaryContact) {
      return '-';
    }
    
    switch (field) {
      case 'email':
        return primaryContact.email || '-';
      case 'phone':
      case 'phoneNumber':
        return primaryContact.phone || '-';
      case 'firstName':
        return primaryContact.firstName || '-';
      case 'lastName':
        return primaryContact.lastName || '-';
      case 'position':
      case 'jobTitle':
        return primaryContact.jobPosition || '-';
      default:
        return '-';
    }
  };

  const getCreatedAt = (): string => {
    const createdAt = providedAccountData?.createdAt;
    if (!createdAt) return '-';
    
    try {
      return dayjs(createdAt).format('MMM D, YYYY, h:mm A');
    } catch {
      return '-';
    }
  };



  return (
    <Card className="gba:w-full gba:h-full" data-testid="investment-account-contact-information-card">
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: '16px' }} data-testid="investment-account-contact-first-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('firstName')}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="investment-account-contact-last-name">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('lastName')}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="investment-account-contact-email">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email');
              if (email === '-') return '-';
              
              return (
                <a 
                  href={`mailto:${email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                                          data-testid="investment-account-contact-email-link"
                >
                  {email}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="investment-account-contact-phone">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber');
              if (phone === '-') return '-';
              
              return (
                <a 
                  href={`tel:${phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                                          data-testid="investment-account-contact-phone-link"
                >
                  {phone}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }} data-testid="investment-account-contact-job-title">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('jobTitle')}</div>
        </div>
        
        <div data-testid="investment-account-contact-created-at">
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {getCreatedAt()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 