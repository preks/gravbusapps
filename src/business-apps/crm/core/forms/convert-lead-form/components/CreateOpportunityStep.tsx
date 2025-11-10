import React from 'react'
import { Spinner, WizardFormStep } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import OpportunityFormWrapper from './OpportunityFormWrapper'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityFormValues } from '../../opportunity-form/types'

interface CreateOpportunityStepProps extends BusinessAppContextProps {
  loading: boolean
  leadData: any
  actualLeadId: string
  opportunityInitialValues: Partial<OpportunityFormValues>
  onFormChange: (values: Partial<OpportunityFormValues>) => void
  onSubmit: (values: OpportunityFormValues) => Promise<void>
}

export const CreateOpportunityStep: React.FC<CreateOpportunityStepProps> = ({
  accessToken,
  userInfo,
  additionalData,
  loading,
  leadData,
  actualLeadId,
  opportunityInitialValues,
  onFormChange,
  onSubmit
}) => {
  return (
    <WizardFormStep>
      <div data-testid="convert-lead-create-opportunity-step">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
          {getTranslationFromI18nKeyAndLabel('crm:convertLead.createOpportunityDetails', 'Create Opportunity Details')}
        </h3>

        {loading ? (
          <div className="gba:flex gba:justify-center gba:py-8">
            <Spinner size="lg" />
            <span className="gba:ml-2">Loading lead data...</span>
          </div>
        ) : (
          <OpportunityFormWrapper
            key={`opportunity-form-${actualLeadId}-${leadData?.id || 'no-data'}`}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={{
              ...additionalData,
              isLeadConversion: true, // Flag to prevent auto-selection of current user
              leadOwnerId: leadData?.ownerEmployeeId // Explicit lead owner for context
            }}
            initialValues={opportunityInitialValues}
            onFormChange={onFormChange}
            onSubmit={onSubmit}
            data-testid="opportunity-form-wrapper"
          />
        )}
      </div>
    </WizardFormStep>
  )
}
