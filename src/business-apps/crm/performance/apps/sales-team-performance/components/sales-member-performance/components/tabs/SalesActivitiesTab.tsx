import React, { useState } from 'react'
import { ActivitiesStatistics, ActivitiesTable } from '../activities'
import { SalesActivitiesTabProps } from '../../types/activitiesTypes'

const DATA_TEST_ID_PREFIX = 'SalesActivitiesTab'

export const SalesActivitiesTab: React.FC<SalesActivitiesTabProps> = ({
  memberId,
  accessToken,
  userInfo,
  additionalData,
  ...context
}) => {
  const [activitiesTotal, setActivitiesTotal] = useState<number>(0)

  // Handle activities count change from table
  const handleActivitiesTotalChange = (total: number) => {
    setActivitiesTotal(total)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Activities Statistics Section */}
      <ActivitiesStatistics
        employeeId={memberId}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        {...context}
      />

      {/* Activities Table Section (with built-in toggle) */}
      <ActivitiesTable
        employeeId={memberId}
        accessToken={accessToken}
        userInfo={userInfo}
        onTotalChange={handleActivitiesTotalChange}
      />
    </div>
  )
}

export default SalesActivitiesTab
