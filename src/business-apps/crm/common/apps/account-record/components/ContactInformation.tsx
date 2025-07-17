import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert } from '@newwork/nw-design-system';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAccountById } from '../queries/GetAccountByIdQueries';

interface ContactInformationProps {
  accountData?: any;
  accountId?: string;
  context?: BusinessAppContextProps;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({ 
  accountData: providedAccountData, 
  accountId,
  context 
}) => {
  const [fetchedAccountData, setFetchedAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use GraphQL query hook if context is provided
  const { fetchAccountById } = context ? useGetAccountById(context) : { fetchAccountById: null };
  
  // Use provided data or fetch from GraphQL
  const accountData = providedAccountData || fetchedAccountData;
  
  useEffect(() => {
    // Only fetch if we don't have provided data and we have the necessary props
    if (!providedAccountData && accountId && fetchAccountById) {
      const loadAccountData = async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await fetchAccountById({ id: accountId });
          setFetchedAccountData(result.Account?.[0] || null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load account data');
        } finally {
          setLoading(false);
        }
      };
      
      loadAccountData();
    }
  }, [providedAccountData, accountId, fetchAccountById]);

  const getContactField = (field: string): string => {
    const contact = accountData?.contact;
    if (!contact) {
      // If no contact object, try to get data directly from account
      switch (field) {
        case 'email':
          return accountData?.email || '-';
        case 'phone':
        case 'phoneNumber':
          return accountData?.phone || accountData?.phoneNumber || '-';
        case 'firstName':
          return accountData?.firstName || '-';
        case 'lastName':
          return accountData?.lastName || '-';
        case 'position':
        case 'jobTitle':
          return accountData?.position || accountData?.jobTitle || '-';
        default:
          return '-';
      }
    }
    
    // Handle both array and single contact
    const firstContact = Array.isArray(contact) ? contact[0] : contact;
    if (!firstContact) return '-';
    
    return firstContact[field] || '-';
  };

  if (loading) {
    return (
      <Card className="gba:w-full gba:h-full gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Personal Information</h3>
        <div className="gba:text-center gba:py-10">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:h-full gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Personal Information</h3>
        <Alert variant="destructive">
          <div className="gba:font-medium">Error Loading Personal Information</div>
          <div className="gba:text-sm gba:mt-1">{error}</div>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="gba:w-full gba:h-full gba:p-6">
      <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Personal Information</h3>
      <div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('firstName')}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('lastName')}</div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const email = getContactField('email');
              if (email === '-') return '-';
              
              return (
                <a 
                  href={`mailto:${email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  {email}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const phone = getContactField('phone') || getContactField('phoneNumber');
              if (phone === '-') return '-';
              
              return (
                <a 
                  href={`tel:${phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  {phone}
                </a>
              );
            })()}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>{getContactField('position') || getContactField('jobTitle')}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>
            {(() => {
              const contact = accountData?.contact;
              const firstContact = Array.isArray(contact) ? contact[0] : contact;
              const createdAt = firstContact?.createdAt || accountData?.createdAt || accountData?.dateCreated;
              if (!createdAt) return '-';
              
              try {
                return dayjs(createdAt).format('MMM D, YYYY, h:mm A');
              } catch {
                return '-';
              }
            })()}
          </div>
        </div>
      </div>
    </Card>
  );
}; 