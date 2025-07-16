import React, { useEffect } from "react";
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useAccountData } from "./hooks/useAccountData";
import { AccountHeader } from "./components/AccountHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { ActivityTimeline } from "./components/ActivityTimeline";

interface AccountRecordContentProps extends BusinessAppContextProps {
  accountId: string;
  onBack: () => void;
}

const AccountRecordContent: React.FC<AccountRecordContentProps> = ({ accountId, onBack, ...props }) => {
  const { account, accountData, loading, error, refetchAccountData } = useAccountData(accountId, props.accessToken);

  // Listen for process completion events to refresh account data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('AccountRecord: Process completion event received:', event);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('AccountRecord: Refreshing account data...');
          refetchAccountData();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || response?.account) {
          console.log('AccountRecord: Refreshing account data from response...');
          refetchAccountData();
        }
      } catch (err) {
        console.error('Error handling process completion in AccountRecord:', err);
      }
    };

    // Listen to multiple possible event names for account updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [accountId, refetchAccountData]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Account not found'}</p>
          <button
            onClick={onBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded"
          >
            Back to Customer Relations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:account-details-container" data-testid="account-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Customer Relations</span>
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

      {/* Main content */}
      <div className="gba:account-details-content" data-testid="account-details-content">
        
        {/* First Row: Company Information + Contacts */}
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          {/* Company Information - 3/4 width */}
          <Col span={18} style={{ display: 'flex' }}>
            <CompanyInformation account={account} accountData={accountData} />
          </Col>

          {/* Contacts - 1/4 width */}
          <Col span={6} style={{ display: 'flex' }}>
            <ContactInformation accountData={accountData} />
          </Col>
        </Row>

        {/* Second Row: Activity Timeline */}
        <Row gutter={24}>
          {/* Activity Timeline - Full width for now */}
          <Col span={24}>
            <ActivityTimeline accountId={accountId} context={props} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

interface AccountRecordProps extends BusinessAppContextProps {
  accountId?: string;
  onBack?: () => void;
}

const AccountRecord: React.FC<AccountRecordProps> = (props) => {
  // For testing, use hardcoded ID if no accountId provided
  const accountId = props.accountId || new URLSearchParams(window.location.search).get('accountId') || 'b58eee23-54b1-4eb3-a0fe-aa59d2a3751c';
  
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
      <div data-testid="account-record-no-id">
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
