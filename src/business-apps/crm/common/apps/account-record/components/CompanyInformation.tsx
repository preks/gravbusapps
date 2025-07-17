import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert } from '@newwork/nw-design-system';
import { Account } from '../hooks/useAccountData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetAccountById } from '../queries/GetAccountByIdQueries';

interface CompanyInformationProps {
  account?: Account;
  accountData?: any;
  accountId?: string;
  context?: BusinessAppContextProps;
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ 
  account, 
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

  if (loading) {
    return (
      <Card className="gba:w-full gba:h-full">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-10">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:h-full">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <div className="gba:font-medium">Error Loading Company Information</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gba:w-full gba:h-full">
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ marginBottom: '24px' }}>
          {/* Company details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
            {/* Left Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.name || account?.name || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Legal Form</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.legalForm?.value || account?.legalForm || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Country</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.country?.value || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Industry</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.industry?.value || account?.industry || '-'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {(() => {
                    const address = accountData?.addresses?.[0] || account?.addresses?.[0];
                    if (!address) return '-';
                    
                    const parts = [
                      address.addressLine,
                      address.city,
                      address.postalCode,
                      address.region?.value,
                      address.country?.value
                    ].filter(Boolean);
                    
                    return parts.length > 0 ? parts.join(', ') : '-';
                  })()}
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Website</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {(() => {
                    const website = accountData?.website || account?.website;
                    if (!website) return '-';
                    
                    const fullUrl = website.includes('://') ? website : `https://${website}`;
                    return (
                      <a 
                        href={fullUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        {website}
                      </a>
                    );
                  })()}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {(() => {
                    const phone = accountData?.phone || accountData?.phoneNumber;
                    if (!phone) return '-';
                    
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
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Employees</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.numberOfEmployees?.value || account?.numberOfEmployees?.value || account?.size || '-'}
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Revenue</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.annualRevenue?.value || account?.annualRevenue?.value || account?.revenue || '-'}
                </div>
              </div>
              

            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 