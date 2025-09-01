import React, { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert, Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import { useGetAccountById } from '@/business-apps/crm/common/apps/account-record/queries/GetAccountByIdQueries';

interface AccountSectionProps extends Partial<BusinessAppContextProps> {
  accountId?: string;
  accountData?: any;
  account?: any;
  accounts?: any[];
  'data-testid'?: string;
}

const AccountSection: React.FC<AccountSectionProps> = ({ accountId, accountData, account, accounts, ...props }) => {
  const accountList = useMemo(() => {
    const arr = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return arr;
  }, [accounts]);

  const hasMultiple = accountList.length > 1;
  const initialSelected: any | null = account || (accountList.length === 1 ? accountList[0] : null);
  const [mode, setMode] = useState<'list' | 'detail'>(hasMultiple ? 'list' : 'detail');
  const [selectedAccount, setSelectedAccount] = useState<any | null>(initialSelected);

  const handleSelect = (a: any) => {
    setSelectedAccount(a);
    setMode('detail');
  };

  const handleBackToList = () => {
    setMode('list');
  };

  return (
    <div data-testid={props['data-testid'] || 'account-section'} className="gba:w-full">
      {mode === 'list' ? (
        <Card className="gba:w-full gba:h-full">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="accounts-list" role="list" className="gba:flex gba:flex-col gba:items-start gba:gap-2 gba:text-left">
              {accountList.map((a) => {
                const display = a.name || '-';
                const initials = `${(a.name || '').split(' ').map((s:any)=>s.charAt(0)).join('').slice(0,2)}`.toUpperCase() || '?';
                const rawSrc = (a as any).logoUrl || (a as any).pictureThumbnail || (a as any).avatar;
                const src = rawSrc ? (String(rawSrc).startsWith('data:') || String(rawSrc).startsWith('http') ? String(rawSrc) : `data:image/jpeg;base64,${rawSrc}`) : undefined;
                return (
                  <button
                    key={a.id}
                    data-testid={`accounts-list-item-${a.id}`}
                    onClick={() => handleSelect(a)}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <Avatar className="gba:h-8 gba:w-8">
                      {src ? <AvatarImage src={src} alt={display} /> : <AvatarFallback>{initials || '?'}</AvatarFallback>}
                    </Avatar>
                    <div className="gba:flex gba:flex-col gba:items-start">
                      <div>{display}</div>
                      {a.website ? <div className="gba:opacity-80">{a.website}</div> : a.phone ? <div className="gba:opacity-80">{a.phone}</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <AccountCompanyInformation 
          accountId={accountId}
          accountData={selectedAccount || accountData}
          account={selectedAccount || account}
          context={props as BusinessAppContextProps}
          canGoBack={accountList.length > 1}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
};

export default AccountSection;

// Inlined from '@/business-apps/crm/common/apps/account-record/components/CompanyInformation'
interface InlinedCompanyInformationProps {
  account?: any;
  accountData?: any;
  accountId?: string;
  context?: BusinessAppContextProps;
  canGoBack?: boolean;
  onBack?: () => void;
}

const AccountCompanyInformation: React.FC<InlinedCompanyInformationProps> = ({ 
  account, 
  accountData: providedAccountData, 
  accountId,
  context,
  canGoBack,
  onBack
}) => {
  const [fetchedAccountData, setFetchedAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchAccountById } = context ? useGetAccountById(context) : { fetchAccountById: null } as any;
  
  const accountData = providedAccountData || fetchedAccountData;
  
  useEffect(() => {
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
          <CardTitle>Account Information</CardTitle>
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
          <CardTitle>Account Information</CardTitle>
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
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Account Information</CardTitle>
          {canGoBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="accounts-back-to-list-button"
            >
              Back to Accounts
            </Button>
          ) : null}
        </div>
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
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Industry</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.industry?.value || account?.industry || '-'}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {accountData?.addressLine || '-'}
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
                    const phone = accountData?.phone || account?.phone;
                    if (!phone) return '-';
                    
                    return (
                      <a 
                        href={`tel:${phone}`} 
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                        data-testid="account-phone-link"
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
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }} data-testid="account-revenue-value">
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