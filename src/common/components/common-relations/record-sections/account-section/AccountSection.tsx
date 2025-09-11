import React, { useState, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import { useGetAccountById } from '@/business-apps/crm/common/apps/account-record/queries/GetAccountByIdQueries';
import { PiBank, PiGear, PiGlobe, PiPhone, PiUsers, PiCurrencyDollar, PiMapPin, PiCaretLeft, PiCaretRight } from 'react-icons/pi';

interface AccountSectionProps extends Partial<BusinessAppContextProps> {
  accountId?: string;
  accountData?: any;
  account?: any;
  accounts?: any[];
  className?: string;
  'data-testid'?: string;
}

const AccountSection: React.FC<AccountSectionProps> = ({ accountId, accountData, account, accounts, className = '', ...props }) => {
  const accountList = useMemo(() => {
    const arr = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return arr;
  }, [accounts]);

  const hasMultiple = accountList.length > 1;
  const initialSelected: any | null = account || (accountList.length > 0 ? accountList[0] : null);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(initialSelected);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update selected account when accountList changes
  useEffect(() => {
    if (accountList.length > 0 && !selectedAccount) {
      setSelectedAccount(accountList[0]);
      setCurrentIndex(0);
    }
  }, [accountList, selectedAccount]);

  // Carousel navigation
  const handlePrevious = () => {
    if (hasMultiple) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : accountList.length - 1;
      setCurrentIndex(newIndex);
      setSelectedAccount(accountList[newIndex]);
    }
  };

  const handleNext = () => {
    if (hasMultiple) {
      const newIndex = currentIndex < accountList.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(newIndex);
      setSelectedAccount(accountList[newIndex]);
    }
  };

  // Use the correct account data source
  const displayAccount = hasMultiple ? selectedAccount : (accountData || account || initialSelected);

  return (
    <div data-testid={props['data-testid'] || 'account-section'} className="gba:w-full">
      <AccountCompanyInformation
        account={displayAccount}
        accountData={accountData}
        accountId={accountId}
        context={props as BusinessAppContextProps}
        hasMultiple={hasMultiple}
        currentIndex={currentIndex}
        totalCount={accountList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        className={className}
      />
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
  hasMultiple?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

const AccountCompanyInformation: React.FC<InlinedCompanyInformationProps> = ({ 
  account, 
  accountData: providedAccountData, 
  accountId,
  context,
  hasMultiple,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
  className = ''
}) => {
  const [fetchedAccountData, setFetchedAccountData] = useState<any>(null);
  
  const { fetchAccountById } = context ? useGetAccountById(context) : { fetchAccountById: null } as any;
  
  const accountData = providedAccountData || fetchedAccountData;
  
  useEffect(() => {
    if (!providedAccountData && accountId && fetchAccountById) {
      const loadAccountData = async () => {
        try {
          const result = await fetchAccountById({ id: accountId });
          setFetchedAccountData(result.Account?.[0] || null);
        } catch (err) {
          console.error('Failed to load account data:', err);
          setFetchedAccountData(null);
        }
      };
      
      loadAccountData();
    }
  }, [providedAccountData, accountId, fetchAccountById]);

  const cardClassName = `gba:w-full ${className}`.trim();
  
  return (
    <Card className={cardClassName}>
      <CardHeader className="gba:flex gba:items-center gba:justify-between">

          <CardTitle className="gba:text-base">
            Account Information
            {hasMultiple && (
              <span className="gba:text-xs gba:opacity-60 gba:ml-2">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
          </CardTitle>
          {hasMultiple && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                data-testid="accounts-carousel-prev"
                className="gba:p-1 gba:h-6 gba:w-6"
              >
                <PiCaretLeft style={{ fontSize: '12px' }} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                data-testid="accounts-carousel-next"
                className="gba:p-1 gba:h-6 gba:w-6"
              >
                <PiCaretRight style={{ fontSize: '12px' }} />
              </Button>
            </div>
          )}
      </CardHeader>
      <CardContent className="gba:pt-0 gba:pb-4 gba:px-4">
        {/* Company details with carousel navigation - v4.0 */}
        <div>
          {/* Company Name */}
          <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Show company logo if available, otherwise show icon */}
            {(accountData?.logoUrl || account?.logoUrl) ? (
              <Avatar className="gba:h-7 gba:w-7">
                <AvatarImage src={accountData?.logoUrl || account?.logoUrl} alt="Company logo" />
                <AvatarFallback>
                  <PiBank style={{ fontSize: '14px' }} />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="gba:h-7 gba:w-7 gba:flex gba:items-center gba:justify-center gba:bg-orange-50 gba:rounded-full">
                <PiBank 
                  style={{ fontSize: '14px', color: '#ea580c' }} 
                  title="Company name"
                />
              </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {accountData?.name || account?.name || '-'}
            </div>
          </div>

          {/* Legal Form and Industry combined */}
          {((accountData?.legalForm?.value || account?.legalForm) || (accountData?.industry?.value || account?.industry)) && (
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PiGear 
              style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
              title="Legal form and industry"
            />
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                {[
                  accountData?.legalForm?.value || account?.legalForm,
                  accountData?.industry?.value || account?.industry
                ].filter(Boolean).join(' • ')}
              </div>
            </div>
          )}

          {/* Contact info row */}
          <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
            {(accountData?.website || account?.website) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiGlobe 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Company website"
                />
                {(() => {
                  const website = accountData?.website || account?.website;
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
            )}
            
            {(accountData?.phone || account?.phone) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <PiPhone 
                   style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                   title="Phone number"
                 />
                <a 
                  href={`tel:${accountData?.phone || account?.phone}`} 
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="account-phone-link"
                >
                  {accountData?.phone || account?.phone}
                </a>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ marginBottom: accountData?.addressLine ? '6px' : '0', display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
            {(accountData?.numberOfEmployees?.value || account?.numberOfEmployees?.value || account?.size) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiUsers 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Number of employees"
                />
                <span style={{ color: '#111827', fontWeight: '500' }}>
                  {accountData?.numberOfEmployees?.value || account?.numberOfEmployees?.value || account?.size}
                </span>
              </div>
            )}
            
            {(accountData?.annualRevenue?.value || account?.annualRevenue?.value || account?.revenue) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiCurrencyDollar 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Annual revenue"
                />
                <span style={{ color: '#111827', fontWeight: '500' }} data-testid="account-revenue-value">
                  {accountData?.annualRevenue?.value || account?.annualRevenue?.value || account?.revenue}
                </span>
              </div>
            )}
          </div>

          {/* Address */}
          {accountData?.addressLine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PiMapPin 
                style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                title="Company address"
              />
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {accountData.addressLine}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};