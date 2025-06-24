import React from 'react';
import { JobPositionProvider } from './context/JobPositionContext';
import JobPositionForm from './components/JobPositionForm';
import { JobPositionFormValues } from './types';
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils';

interface JobPositionProps {
  initialValues?: Partial<JobPositionFormValues>;
  isEdit?: boolean;
  accessToken: string;
}

const JobPosition: React.FC<JobPositionProps> = ({ initialValues, isEdit, accessToken }) => {
  // Get the structureId from the BusinessAppContext
  const structureId = getCurrentActiveStructureId();

  if (!structureId) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No structure ID found. Please ensure you are in a valid organizational context.
        </div>
      </div>
    );
  }

  return (
    <JobPositionProvider 
      initialValues={initialValues} 
      isEdit={!!isEdit}
      accessToken={accessToken}
      structureId={structureId}
    >
      <JobPositionForm />
    </JobPositionProvider>
  );
};

export default JobPosition;
