"use client";

import React from 'react';
import { PositionTerminationProvider } from './context/PositionTerminationContext';
import { PositionTerminationForm } from './components/PositionTerminationForm';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface PositionTerminationProps extends BusinessAppContextProps {
  // The jobPositionId should come from additionalData.id (complete job position object) or could be passed directly
  jobPositionId?: string;
}

export const PositionTermination: React.FC<PositionTerminationProps> = ({
  accessToken,
  userInfo,
  additionalData,
  jobPositionId: directJobPositionId,
  ...otherProps
}) => {
  // Get jobPositionId from direct prop or additionalData.id (JSON format)
  const jobPositionId = directJobPositionId || additionalData?.id;

  // Show error message if no jobPositionId is provided
  if (!jobPositionId) {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{ 
             backgroundColor: 'var(--color-muted)',
             padding: 'var(--spacing-4)'
           }}>
        <div className="text-center"
             style={{ color: 'var(--color-muted-foreground)' }}>
          <h2 className="text-lg font-semibold mb-2">Position Not Found</h2>
          <p>No job position ID was provided for termination.</p>
          <p className="text-sm mt-2">Complete job position object should be passed via additionalData.id field.</p>
        </div>
      </div>
    );
  }

  return (
    <PositionTerminationProvider
      jobPositionId={jobPositionId}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
    >
      <PositionTerminationForm />
    </PositionTerminationProvider>
  );
}; 