import React from 'react'
import { JobPositionProvider } from './context/JobPositionContext'
import JobPositionForm from './components/JobPositionForm'
import { JobPositionFormValues } from './types'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface JobPositionProps {
  initialValues?: Partial<JobPositionFormValues>
}

const JobPosition: React.FC<BusinessAppContextProps & JobPositionProps> = ({
  initialValues,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Get the structureId from the BusinessAppContext
  const structureId = getCurrentActiveStructureId()

  if (!structureId) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-destructive">
          Error: No structure ID found. Please ensure you are in a valid organizational context.
        </div>
      </div>
    )
  }

  return (
    <JobPositionProvider
      initialValues={initialValues}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      structureId={structureId}
    >
      <JobPositionForm />
    </JobPositionProvider>
  )
}

export default JobPosition
