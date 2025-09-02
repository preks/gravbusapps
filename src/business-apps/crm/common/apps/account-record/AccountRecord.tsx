import React, { useState, useEffect, useMemo } from 'react';
import { Button, Spinner, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system';
import { ArrowLeftOutlined, UserOutlined, BarChartOutlined, FileOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useAccountData } from "./hooks/useAccountData";
import { AccountHeader } from "./components/AccountHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { AccountOpportunities } from "./components";
import { FileManager } from "@/components/file-manager";

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string;
  onBack: () => void;
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { account: accountData, loading: dataLoading, error: dataError, refetchAccountData } = useAccountData(accountId, props.accessToken);

  const getBackButtonText = () => {
    return 'Back to Accounts';
  };

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
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:contact-details-container" data-testid="contact-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
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

      {/* Main content with tabs */}
      <div className="gba:contact-details-content" data-testid="contact-details-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="opportunities-tab">
              <BarChartOutlined className="gba:mr-2" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">
              <FileOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="overview-content">
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
          </TabsContent>

          <TabsContent value="opportunities" data-testid="opportunities-content">
            <AccountOpportunities 
              accountId={accountId} 
              context={props} 
            />
          </TabsContent>

          <TabsContent value="documents" data-testid="documents-content">
            <FileManager
              context={props}
              entity={{ type: 'account', id: accountId }}
              ui={{ title: 'Documents' }}
              data-testid="account-file-manager"
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

interface AccountRecordProps extends BusinessAppContextProps {
  accountId?: string;
  source?: string;
  onBack?: () => void;
}

const AccountRecord: React.FC<AccountRecordProps> = (props) => {
  const accountId = useMemo(() => {
    const fromProps = props.accountId;
    const fromQuery = new URLSearchParams(window.location.search).get('accountId');
    if (fromProps) return fromProps;
    if (fromQuery) return fromQuery;
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    return isLocal ? '79e8f1a9-f9cd-4135-b03e-008b7589b41c' : undefined;
  }, [props.accountId]);

  const source = useMemo(() => {
    return props.source || new URLSearchParams(window.location.search).get('source');
  }, [props.source]);
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back based on source
      switch (source) {
        case 'investments':
          navigateTo('/platform/irm/investment-relations?view=accounts');
          break;
        case 'customer-relations':
        default:
      navigateTo('/platform/crm/customer-relations?view=accounts');
          break;
      }
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
