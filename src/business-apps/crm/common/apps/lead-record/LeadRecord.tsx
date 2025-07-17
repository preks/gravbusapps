import React, { useEffect, useMemo } from "react";
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useLeadData } from "./hooks/useLeadData";
import { LeadHeader } from "./components/LeadHeader";
import { StatusProgression } from "./components/StatusProgression";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";


interface LeadRecordContentProps extends BusinessAppContextProps {
  leadId: string;
  onBack: () => void;
}

const LeadRecordContent: React.FC<LeadRecordContentProps> = ({ leadId, onBack, ...props }) => {
  const { lead, leadData, loading, error, leadStatuses, loadingStatuses, refetchLeadData } = useLeadData(leadId, props.accessToken);

  const getBackButtonText = () => {
    return 'Back to Leads';
  };

  // Listen for process completion events to refresh lead data (including status updates)
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('LeadRecord: Process completion event received:', event);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('LeadRecord: Refreshing lead data...');
          refetchLeadData();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || response?.lead) {
          console.log('LeadRecord: Refreshing lead data from response...');
          refetchLeadData();
        }
      } catch (err) {
        console.error('Error handling process completion in LeadRecord:', err);
      }
    };

    // Listen to multiple possible event names for lead updates
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
  }, [leadId, refetchLeadData]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Lead not found'}</p>
          <button
            onClick={onBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded"
          >
            {getBackButtonText()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:lead-details-container" data-testid="lead-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
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

      {/* Lead header */}
      <LeadHeader lead={lead} leadData={leadData} leadId={leadId} additionalData={props} accessToken={props.accessToken} onStatusUpdate={refetchLeadData} />

      {/* Status Progression */}
      {!loadingStatuses && leadStatuses.length > 0 && lead && (
        <StatusProgression 
          currentStatus={leadData?.leadStatus?.value || lead?.status || 'New'} 
          statuses={leadStatuses}
          leadId={leadId}
          leadVersion={parseInt(lead.version) || 0}
          accessToken={props.accessToken}
          onStatusUpdate={refetchLeadData}
        />
      )}

      {/* Main content */}
      <div className="gba:lead-details-content" data-testid="lead-details-content">
        
        {/* First Row: Company Information + Contacts */}
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          {/* Company Information - 3/4 width */}
          <Col span={18} style={{ display: 'flex' }}>
            <CompanyInformation lead={lead} leadData={leadData} />
          </Col>

          {/* Contacts - 1/4 width */}
          <Col span={6} style={{ display: 'flex' }}>
            <ContactInformation leadData={leadData} />
          </Col>
        </Row>

        {/* Second Row: Activity Timeline + Tasks */}
        <Row gutter={24}>
          {/* Activity Timeline - 1/2 width */}
          <Col span={12}>
            <ActivityTimeline leadId={leadId} context={props} />
          </Col>

          {/* Tasks - 1/2 width */}
          <Col span={12}>
            <TasksSection leadId={leadId} context={props} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

interface LeadRecordProps extends BusinessAppContextProps {
  leadId?: string;
  source?: string;
  onBack?: () => void;
}

const LeadRecord: React.FC<LeadRecordProps> = (props) => {
  const leadId = props.leadId || new URLSearchParams(window.location.search).get('leadId');

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
          navigateTo('/platform/irm/investment-relations?view=leads');
          break;
        case 'customer-relations':
        default:
          navigateTo('/platform/crm/customer-relations?view=leads');
          break;
      }
    }
  };

  if (!leadId) {
    return (
      <div data-testid="lead-record-no-id">
        <p>No lead ID provided</p>
      </div>
    );
  }
  return (
    <LeadRecordContent
      {...props}
      leadId={leadId}
      onBack={handleBack}
    />
  );
};

export { LeadRecord, LeadRecordContent }; 

export default LeadRecord;
