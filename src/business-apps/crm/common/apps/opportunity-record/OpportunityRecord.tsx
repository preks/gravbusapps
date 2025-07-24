import React from "react";
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useOpportunityData } from "./hooks/useOpportunityData";
import { OpportunityHeader } from "./components/OpportunityHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactInformation } from "./components/ContactInformation";
import { OpportunityDetails } from "./components/OpportunityDetails";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { StageProgression } from "./components/StageProgression";


interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string;
  onBack: () => void;
  getBackButtonText: () => string;
}

const OpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({ opportunityId, onBack, getBackButtonText, ...props }) => {
  const { 
    opportunity, 
    opportunityData, 
    loading, 
    error, 
    opportunityStages, 
    opportunityStatuses,
    loadingStages,
    loadingStatuses,
    stagesError,
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
            {getBackButtonText()}
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
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      <OpportunityHeader 
        opportunity={opportunity} 
        opportunityData={opportunityData} 
        opportunityId={opportunityId} 
        additionalData={props} 
        accessToken={props.accessToken} 
      />

      {/* Stage Progression - Show filtered pipeline stages */}
      {!loadingStages && !stagesError && opportunityStages.length > 0 && opportunityData?.salesPipelineRef && (
        <StageProgression 
          currentStage={opportunityData?.salesPipelineStage?.value || 'Discovery'} 
          stages={opportunityStages}
          opportunityId={opportunityId}
          opportunityVersion={parseInt(opportunity.version) || 0}
          accessToken={props.accessToken}
          onStageUpdate={refetchOpportunityData}
        />
      )}

      {/* Show stages loading */}
      {loadingStages && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="small" />
          <span style={{ marginLeft: '8px' }}>Loading pipeline stages...</span>
        </div>
      )}

      {/* Show stages error */}
      {stagesError && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f' }}>
          <p>Failed to load pipeline stages: {stagesError}</p>
        </div>
      )}

      {/* Show info when no salesPipelineRef */}
      {!opportunityData?.salesPipelineRef && !loadingStages && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
          <p>No sales pipeline assigned to this opportunity</p>
        </div>
      )}

      <div className="gba:opportunity-details-content" data-testid="opportunity-details-content">
        
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          <Col span={12} style={{ display: 'flex' }}>
            <CompanyInformation opportunity={opportunity} opportunityData={opportunityData} />
          </Col>

          <Col span={6} style={{ display: 'flex', width: '100%' }}>
            <OpportunityDetails 
              opportunityData={opportunityData} 
              opportunityId={opportunityId}
              context={props}
            />
          </Col>

          <Col span={6} style={{ display: 'flex' }}>
            <ContactInformation 
              opportunityData={opportunityData} 
              opportunityId={opportunityId}
              context={props}
            />
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
  source?: string;
  onBack?: () => void;
}

const OpportunityRecord: React.FC<OpportunityRecordProps> = (props) => {
  const urlParams = new URLSearchParams(window.location.search);
  const opportunityId = props.opportunityId || 
                       urlParams.get('opportunityId') ||
                       urlParams.get('id');

  const source = props.source || urlParams.get('source');

  const getBackButtonText = () => {
    return 'Back to Opportunities';
  };
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back based on source
      switch (source) {
        case 'investments':
          navigateTo('/platform/irm/investment-relations?view=opportunities');
          break;
        case 'customer-relations':
        default:
          navigateTo('/platform/crm/customer-relations?view=opportunities');
          break;
      }
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
            {getBackButtonText()}
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
      getBackButtonText={getBackButtonText}
    />
  );
};

export { OpportunityRecord, OpportunityRecordContent }; 

export default OpportunityRecord; 