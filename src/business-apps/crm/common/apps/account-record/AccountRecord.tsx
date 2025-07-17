import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner } from '@newwork/nw-design-system';
import { ArrowLeft } from 'lucide-react';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useAccountData } from "./hooks/useAccountData";
import { AccountHeader } from "./components/AccountHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string;
  onBack: () => void;
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { account: accountData, loading: dataLoading, error: dataError, refetchAccountData } = useAccountData(accountId, props.accessToken);

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!accountId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        if (accountData) {
          setAccount(accountData);
        } else if (dataError) {
          setError(dataError);
        }
      } catch (err) {
        console.error('Error fetching account:', err);
        setError(err instanceof Error ? err.message : 'Failed to load account');
      } finally {
        setLoading(false);
      }
    };

    if (!dataLoading) {
      fetchAccountData();
    }
  }, [accountId, accountData, dataLoading, dataError]);

  // Update loading state based on data loading
  useEffect(() => {
    setLoading(dataLoading);
  }, [dataLoading]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Account not found'}</p>
          <Button
            onClick={onBack}
            className="gba:mt-4"
            variant="default"
          >
            Back to Customer Relations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:contact-details-container" data-testid="contact-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <Button
          onClick={onBack}
          variant="ghost"
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeft className="gba:mr-2 gba:w-4 gba:h-4" />
          <span>Back to Customer Relations</span>
        </Button>
      </div>

      {/* Account header */}
      <AccountHeader 
        account={account} 
        accountData={accountData} 
        accountId={accountId} 
        additionalData={props} 
        accessToken={props.accessToken} 
        onStatusUpdate={refetchAccountData} 
      />

      {/* Main content */}
      <div className="gba:contact-details-content" data-testid="contact-details-content">
        
        {/* First Row: Company Information + Personal Info */}
        <div className="gba:grid gba:grid-cols-4 gba:gap-6 gba:mb-6">
          {/* Company Information - 3/4 width */}
          <div className="gba:col-span-3 gba:flex">
            <CompanyInformation 
              account={account} 
              accountData={accountData} 
              accountId={accountId}
              context={props}
            />
          </div>

          {/* Personal Information - 1/4 width */}
          <div className="gba:col-span-1 gba:flex">
            <ContactInformation 
              accountData={accountData} 
              accountId={accountId}
              context={props}
            />
          </div>
        </div>

        {/* Second Row: Activity Timeline + Tasks */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-6">
          {/* Activity Timeline - 1/2 width */}
          <div>
            <ActivityTimeline accountId={accountId} context={props} />
          </div>

          {/* Tasks - 1/2 width */}
          <div>
            <TasksSection accountId={accountId} context={props} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface AccountRecordProps extends BusinessAppContextProps {
  accountId?: string;
  onBack?: () => void;
}

const AccountRecord: React.FC<AccountRecordProps> = (props) => {
  const accountId = useMemo(() => {
    return props.accountId || new URLSearchParams(window.location.search).get('accountId');
  }, [props.accountId]);
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back to customer relations
      navigateTo('/platform/crm/customer-relations?view=accounts');
    }
  };

  if (!accountId) {
    return (
      <div data-testid="contact-record-no-id">
        <p>No account ID provided</p>
      </div>
    );
  }
  
  return (
    <AccountRecordContent
      {...props}
      accountId={accountId}
      onBack={handleBack}
    />
  );
};

export { AccountRecord, AccountRecordContent }; 

export default AccountRecord;
