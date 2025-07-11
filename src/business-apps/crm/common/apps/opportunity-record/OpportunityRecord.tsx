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

      <OpportunityHeader 
        opportunity={opportunity} 
        opportunityData={opportunityData} 
        opportunityId={opportunityId} 
        additionalData={props} 
        accessToken={props.accessToken} 
      />

      <div className="gba:opportunity-details-content" data-testid="opportunity-details-content">
        
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          <Col span={18} style={{ display: 'flex' }}>
            <CompanyInformation opportunity={opportunity} opportunityData={opportunityData} />
          </Col>

          <Col span={6} style={{ display: 'flex' }}>
            <ContactInformation opportunityData={opportunityData} />
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <ActivityTimeline 
              opportunityId={opportunityId}
              context={props} 
            />
          </Col>

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
  const urlParams = new URLSearchParams(window.location.search);
  const opportunityId = props.opportunityId || 
                       urlParams.get('opportunityId') ||
                       urlParams.get('id');
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      navigateTo('/platform/crm/opportunity-overview');
    }
  };

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">No opportunity ID provided</p>
          <p className="gba:text-gray-500 gba:mb-4">Please provide an opportunity ID via props or URL parameter</p>
          <button
            onClick={handleBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded"
          >
            Back to Opportunities Overview
          </button>
        </div>
      </div>
    );
  }
  
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