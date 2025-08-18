import React from 'react';
import { message } from 'antd';
import FeedbackForm from './FeedbackForm';
import { FeedbackFormValues } from './types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

interface FeedbackFormScreenProps extends BusinessAppContextProps {
  preSelectedEmployeeId?: string;
}

const FeedbackFormScreen: React.FC<FeedbackFormScreenProps> = ({
  accessToken,
  userInfo,
  additionalData,
  preSelectedEmployeeId
}) => {
  // Extract employeeId from additionalData following the same pattern as other forms
  const employeeId = additionalData?.employeeId || 
                    additionalData?.flowContext?.employeeId || 
                    additionalData?.contextData?.employeeId ||
                    additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
                    preSelectedEmployeeId;

  const handleSubmitFeedback = async (values: FeedbackFormValues) => {
    // Feedback submission is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual submission happens in the context
  };

  const handleCancelFeedback = async () => {
    // Feedback cancellation is now handled by Kogito process via dispatchProcessContinueEvent
    // This function is kept for backward compatibility but the actual cancellation happens in the context
  };

  return (
    <div 
      className="gba:h-full gba:w-full"
      data-testid={formatDataTestId("FeedbackFormScreen", "Container")}
    >
      <FeedbackForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        onSubmit={handleSubmitFeedback}
        onCancel={handleCancelFeedback}
        preSelectedEmployeeId={employeeId}
      />
    </div>
  );
};

export default FeedbackFormScreen;
