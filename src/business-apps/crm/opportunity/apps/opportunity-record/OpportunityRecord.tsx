import React from "react";
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useOpportunityData } from "./hooks/useOpportunityData";
import { OpportunityHeader } from "./components/OpportunityHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";


interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string;
  onBack: () => void;
}

const OpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({ opportunityId, onBack, ...props }) => {
  const { 
    opportunity, 
    opportunityData, 
    loading, 
    error, 
    opportunityStages, 
    opportunityStatuses,
    loadingStages,
    loadingStatuses,
    refetchOpportunityData
  } = useOpportunityData(opportunityId, props.accessToken);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Opportunity not found'}</p>
          <button
            onClick={onBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded"
          >
            Back to Opportunities Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:opportunity-details-container" data-testid="opportunity-record-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Opportunities Overview</span>
        </button>
      </div>

      {/* Opportunity header */}
      <OpportunityHeader 
        opportunity={opportunity} 
        opportunityData={opportunityData} 
        opportunityId={opportunityId} 
        additionalData={props} 
        accessToken={props.accessToken} 
      />

      {/* Stage Progression - Hidden for now since stage data is not available in API */}
      {/* TODO: Re-enable when stage data is available from the API
      {!loadingStages && opportunityStages.length > 0 && opportunity && (
        <StageProgression 
          currentStage={opportunityData?.opportunityStage?.value || opportunity?.stage || 'Discovery'} 
          stages={opportunityStages}
          opportunityId={opportunityId}
          opportunityVersion={parseInt(opportunity.version) || 0}
          accessToken={props.accessToken}
          onStageUpdate={refetchOpportunityData}
        />
      )}
      */}

      {/* Main content */}
      <div className="gba:opportunity-details-content" data-testid="opportunity-details-content">
        
        {/* First Row: Company Information + Contacts */}
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          {/* Company Information - 3/4 width */}
          <Col span={18} style={{ display: 'flex' }}>
            <CompanyInformation opportunity={opportunity} opportunityData={opportunityData} />
          </Col>

          {/* Contacts - 1/4 width */}
          <Col span={6} style={{ display: 'flex' }}>
            <ContactInformation opportunityData={opportunityData} />
          </Col>
        </Row>

        {/* Second Row: Activity Timeline + Tasks */}
        <Row gutter={24}>
          {/* Activity Timeline - 1/2 width */}
          <Col span={12}>
            <ActivityTimeline 
              opportunityId={opportunityId}
              context={props} 
            />
          </Col>

          {/* Tasks - 1/2 width */}
          <Col span={12}>
            <TasksSection 
              opportunityId={opportunityId}
              context={props} 
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

interface OpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string;
  onBack?: () => void;
}

const OpportunityRecord: React.FC<OpportunityRecordProps> = (props) => {
  // Default opportunity ID for testing purposes
  const defaultOpportunityId = '2cabb386-82b8-4a9b-8a91-e8d008b4b2e8';
  const opportunityId = props.opportunityId || 
                       new URLSearchParams(window.location.search).get('opportunityId') || 
                       defaultOpportunityId;
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back to opportunities overview
      navigateTo('/platform/crm/opportunity-overview');
    }
  };
  
  return (
    <OpportunityRecordContent
      {...props}
      opportunityId={opportunityId}
      onBack={handleBack}
    />
  );
};

export { OpportunityRecord, OpportunityRecordContent }; 

export default OpportunityRecord; 