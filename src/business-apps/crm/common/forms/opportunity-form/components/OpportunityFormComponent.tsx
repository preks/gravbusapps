import React from 'react';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';
import { Button, Spinner } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import OpportunityInformationSection from './OpportunityInformationSection';
import SalesInformationSection from './SalesInformationSection';
import RelationshipInformationSection from './RelationshipInformationSection';
import BusinessInformationSection from './BusinessInformationSection';
import AdditionalInformationSection from './AdditionalInformationSection';

const prefixDataTestId = 'OpportunityForm';

const OpportunityFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
  } = useOpportunityFormContext();

  // Check if all mandatory fields are filled
  const isFormValid = 
    formValues.owner &&
    formValues.name &&
    formValues.opportunityStatus;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);
      
      // Determine if this is an update or create operation
      const isUpdate = formValues.id;
      
      // Prepare comprehensive opportunity payload following the API structure
      const opportunityPayload: any = {
        sourceApp: "CRM",
        name: toStringOrUndefined(formValues.name),
        opportunityStatusRef: toStringOrUndefined(formValues.opportunityStatus),
        pipelineRef: toStringOrUndefined(formValues.pipeline),
        salesPipelineStageRef: toStringOrUndefined(formValues.salesPipelineStage),
        stage: toStringOrUndefined(formValues.stage),
        status: toStringOrUndefined(formValues.status),
        estimatedAmount: formValues.estimatedAmount ? parseFloat(formValues.estimatedAmount) : undefined,
        currencyRef: toStringOrUndefined(formValues.currency),
        winningChance: formValues.winningChance ? parseFloat(formValues.winningChance) : undefined,
        closeDate: toStringOrUndefined(formValues.closeDate),
        accountId: toStringOrUndefined(formValues.account),
        leadId: toStringOrUndefined(formValues.lead),
        businessKey: toStringOrUndefined(formValues.businessKey),
        code: toStringOrUndefined(formValues.code),
        personal: formValues.personal,
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        lastInteraction: toStringOrUndefined(formValues.lastInteraction),
        ownerEmployeeId: toStringOrUndefined(formValues.owner),
        ownerOrganizationId: undefined, // Will be set by backend based on owner employee
      };

      // For updates, include the opportunity ID and version
      if (isUpdate) {
        opportunityPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          opportunityPayload.version = formValues.version;
        }
      }

      // Remove undefined fields
      Object.keys(opportunityPayload).forEach(key => {
        if (opportunityPayload[key] === undefined) {
          delete opportunityPayload[key];
        }
      });

      console.log('OpportunityForm: Prepared payload for submission:', opportunityPayload);

      // Dispatch process continue event with the opportunity payload
      dispatchProcessContinueEvent('processContinue', opportunityPayload);
      
    } catch (error) {
      console.error('OpportunityForm: Error during submission:', error);
    }
  };

  // Handle form cancellation  
  const handleCancel = async () => {
    try {
      await onCancel();
    } catch (error) {
      console.error('OpportunityForm: Error during cancellation:', error);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          
          {/* Opportunity Information Section */}
          <OpportunityInformationSection />

          {/* Sales Information Section */}
          <SalesInformationSection />

          {/* Relationship Information Section */}
          <RelationshipInformationSection />

          {/* Business Information Section */}
          <BusinessInformationSection />

          {/* Additional Information Section */}
          <AdditionalInformationSection />

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
          <Button
            variant="secondary"
            className="gba:flex-1"
            size="lg"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {formValues.id ? 'Update Opportunity' : 'Create Opportunity'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityFormComponent; 